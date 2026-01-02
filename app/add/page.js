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
  { slug: 'mobiles', name: 'جوالات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'animals', name: 'حيوانات وطيور' },
  { slug: 'networks', name: 'نت وشبكات' },
  { slug: 'electronics', name: 'إلكترونيات' },
  { slug: 'services', name: 'خدمات' },
  { slug: 'maintenance', name: 'صيانة' },
];

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
  const [catsLoading, setCatsLoading] = useState(true);

  // ✅ تحميل الأقسام من Firestore (categories) بشكل صحيح:
  // - slug = Document ID
  // - name = field "name"
  useEffect(() => {
    const unsub = db.collection('categories').onSnapshot(
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              slug: d.id, // ✅ هذا هو الصحيح
              name: String(data.name || '').trim(),
              active: data.active,
            };
          })
          .filter((c) => c.slug && c.name && c.active !== false);

        // ترتيب بسيط بالاسم العربي
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        if (arr.length) {
          setCats(arr);
          // إذا القسم الحالي غير موجود ضمن الأقسام الجديدة، خلّه أول قسم
          if (!arr.some((x) => x.slug === category)) {
            setCategory(arr[0].slug);
          }
        } else {
          // إذا ما لقى أقسام، يرجع الافتراضي
          setCats(DEFAULT_CATEGORIES);
          if (!DEFAULT_CATEGORIES.some((x) => x.slug === category)) {
            setCategory(DEFAULT_CATEGORIES[0].slug);
          }
        }

        setCatsLoading(false);
      },
      (err) => {
        console.error('Failed to load categories:', err);
        setCats(DEFAULT_CATEGORIES);
        setCatsLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
  };

  const uploadImages = async () => {
    if (!images.length) return [];
    const out = [];

    for (const file of images) {
      const safeName = String(file.name || 'img').replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }

    return out;
  };

  const submit = async () => {
    if (!user) {
      alert('سجل دخول أولاً');
      return;
    }
    if (!title.trim()) {
      alert('اكتب عنوان');
      return;
    }
    if (!price) {
      alert('اكتب سعر');
      return;
    }

    setBusy(true);
    try {
      const priceYER = toYER(price, currency, rates);

      const imageUrls = await uploadImages();

      const endAt = auctionEnabled
        ? firebase.firestore.Timestamp.fromMillis(
            Date.now() + Math.max(1, Number(auctionMinutes || 60)) * 60 * 1000
          )
        : null;

      await db.collection('listings').add({
        title: title.trim(),
        description: desc.trim(),
        city: city.trim(),
        category,
        phone: phone.trim() || null,
        isWhatsapp: !!isWhatsapp,

        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        coords: coords ? [coords[0], coords[1]] : null,
        locationLabel: locationLabel || null,

        images: imageUrls,

        userId: user.uid,
        userEmail: user.email || null,
        userName: user.displayName || null,

        views: 0,
        likes: 0,
        isActive: true,

        auctionEnabled: !!auctionEnabled,
        auctionEndAt: endAt,
        currentBidYER: auctionEnabled ? Number(priceYER) : null,

        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert('تم نشر الإعلان');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      alert('حصل خطأ أثناء النشر');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">إضافة إعلان</span>
        </div>

        {loading ? (
          <div className="card muted" style={{ marginTop: 12 }}>
            جاري التحميل...
          </div>
        ) : null}

        {!loading && !user ? (
          <div className="card" style={{ marginTop: 12 }}>
            سجل دخول أولاً (زر Google في الأعلى)
          </div>
        ) : null}

        <div
          className="grid"
          style={{
            marginTop: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}
        >
          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              بيانات الإعلان
            </div>

            <label className="muted">العنوان</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div style={{ height: 10 }} />

            <label className="muted">الوصف</label>
            <textarea
              className="input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              style={{ resize: 'vertical' }}
            />

            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="muted">المدينة</label>
                <input
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: صنعاء"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label className="muted">القسم</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    {catsLoading ? 'جاري تحميل الأقسام...' : 'اختر القسم'}
                  </option>

                  {cats.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {!catsLoading && cats.length === 0 ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    لا توجد أقسام في categories
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="muted">السعر</label>
                <input
                  className="input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div style={{ width: 160 }}>
                <label className="muted">العملة</label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="YER">YER</option>
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div className="row">
              <div style={{ flex: 1 }}>
                <label className="muted">رقم الجوال</label>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 770000000"
                />
              </div>
              <div style={{ width: 160 }}>
                <label className="muted">واتساب</label>
                <select
                  className="input"
                  value={isWhatsapp ? 'yes' : 'no'}
                  onChange={(e) => setIsWhatsapp(e.target.value === 'yes')}
                >
                  <option value="yes">نعم</option>
                  <option value="no">لا</option>
                </select>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <label className="muted">صور (اختياري)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
            />

            <hr />

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 900 }}>🔨 تفعيل المزاد</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  إذا فعلته، يبدأ المزاد من سعر الإعلان
                </div>
              </div>
              <input
                type="checkbox"
                checked={auctionEnabled}
                onChange={(e) => setAuctionEnabled(e.target.checked)}
              />
            </div>

            {auctionEnabled ? (
              <div className="row" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  value={auctionMinutes}
                  onChange={(e) => setAuctionMinutes(e.target.value)}
                  inputMode="numeric"
                />
                <span className="muted">مدة المزاد (دقائق)</span>
              </div>
            ) : null}

            <div style={{ height: 12 }} />
            <button
              className="btn btnPrimary"
              onClick={submit}
              disabled={!user || busy}
            >
              {busy ? 'جاري النشر...' : 'نشر الإعلان'}
            </button>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>
              اختر موقع الإعلان
            </div>

            <div
              style={{
                width: '100%',
                minHeight: 420,
                height: 420,
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
              }}
            >
              <LocationPicker value={coords} onChange={onPick} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
