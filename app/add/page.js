// app/add/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';
import Link from 'next/link';

const LocationPicker = dynamic(
  () => import('@/components/Map/LocationPicker'),
  { ssr: false }
);

const DEFAULT_CATEGORIES = [
  { slug: 'cars', name: 'سيارات' },
  { slug: 'real_estate', name: 'عقارات' },
  { slug: 'phones', name: 'جوالات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'yemeni_products', name: 'منتجات يمنية' },
];

// ✅ تحويل آمن لأي رقم مكتوب (يدعم الأرقام العربية والفواصل)
function normalizeNumber(input) {
  if (input == null) return 0;

  let s = String(input).trim();

  // أرقام عربية -> إنجليزية
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  s = s
    .split('')
    .map((ch) => {
      const a = arabic.indexOf(ch);
      if (a !== -1) return String(a);
      const e = eastern.indexOf(ch);
      if (e !== -1) return String(e);
      return ch;
    })
    .join('');

  // حذف أي شيء غير رقم/نقطة/فاصلة
  s = s.replace(/[^\d.,-]/g, '');

  // إذا فيه فواصل آلاف، نحذفها
  // مثال: 1,234.50 أو 1.234,50
  // نقرر آخر فاصل عشري ونحول للباقي
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastComma > lastDot) {
    // الفاصلة هي العشري
    s = s.replace(/\./g, ''); // حذف نقاط الآلاف
    s = s.replace(',', '.');  // تحويل العشري لنقطة
    s = s.replace(/,/g, '');  // أي فواصل أخرى
  } else {
    // النقطة هي العشري
    s = s.replace(/,/g, '');  // حذف فواصل الآلاف
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ✅ تصحيح ترتيب الإحداثيات إذا كانت مقلوبة (lng/lat بدلاً من lat/lng)
function normalizeCoords(c) {
  if (!Array.isArray(c) || c.length < 2) return null;

  let a = Number(c[0]);
  let b = Number(c[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  // المتوقع: lat بين -90 و 90، lng بين -180 و 180
  const looksLikeLatLng = Math.abs(a) <= 90 && Math.abs(b) <= 180;
  const looksLikeLngLat = Math.abs(a) <= 180 && Math.abs(b) <= 90;

  // إذا واضح إنها [lng,lat] نقلبها
  if (!looksLikeLatLng && looksLikeLngLat) {
    return [b, a]; // [lat,lng]
  }

  // إذا الاثنين ممكنين (نادر)، نخليها كما هي
  return [a, b];
}

export default function AddPage() {
  const { user, loading } = useAuth();
  const rates = useRates();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('solar');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [images, setImages] = useState([]);
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionMinutes, setAuctionMinutes] = useState('60');
  const [busy, setBusy] = useState(false);

  const [cats, setCats] = useState(DEFAULT_CATEGORIES);

  // تحميل الأقسام من Firestore إن وجدت
  useMemo(() => {
    const unsub = db
      .collection('categories')
      .orderBy('order', 'asc')
      .onSnapshot((snap) => {
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => c.active !== false);
        if (arr.length) setCats(arr.map((c) => ({ slug: c.slug, name: c.name })));
      });

    return () => unsub();
  }, []);

  // ✅ إذا LocationPicker يرجّع إحداثيات مقلوبة نصلحها هنا فوراً
  const onPick = (c, lbl) => {
    const fixed = normalizeCoords(c);
    setCoords(fixed);
    setLocationLabel(lbl || '');
  };

  const uploadImages = async () => {
    if (!images.length) return [];
    const out = [];
    for (const file of images) {
      const safeName = String(file.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }
    return out;
  };

  const submit = async () => {
    if (!user) return alert('سجل دخول أولاً');
    if (!title.trim()) return alert('اكتب عنوان');
    if (!price) return alert('اكتب سعر');

    // ✅ رقم السعر بشكل صحيح
    const numericPrice = normalizeNumber(price);
    if (!numericPrice || numericPrice <= 0) {
      return alert('السعر غير صحيح. اكتب رقم مثل: 200 أو 1500');
    }

    // ✅ لازم تكون الخريطة محددة (اختياري - إذا تبغاها إلزامية قلّي)
    // لو تبغى إلزامية: فعّل هذا
    // if (!coords) return alert('اختر موقع الإعلان من الخريطة');

    setBusy(true);
    try {
      // ✅ نفس أسعار العرض
      const priceYER = toYER(numericPrice, currency, rates);

      const imageUrls = await uploadImages();

      const endAt = auctionEnabled
        ? firebase.firestore.Timestamp.fromMillis(
            Date.now() + Math.max(1, Number(auctionMinutes || 60)) * 60 * 1000
          )
        : null;

      await db.collection('listings').add({
