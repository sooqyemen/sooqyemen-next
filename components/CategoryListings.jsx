// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

// ✅ Taxonomy (الفروع الهرمية)
import {
  inferListingTaxonomy,
  carMakeLabel,
  phoneBrandLabel,
  dealTypeLabel,
  propertyTypeLabel,
  
  // المتغيرات التي كانت ناقصة في الاستيراد وتستخدم في الكود
  CAR_MAKES_PRESET,
  CAR_MODELS_BY_MAKE,

  // ✅ Single-facet categories
  ELECTRONICS_TYPES,
  electronicsTypeLabel,

  HEAVY_EQUIPMENT_TYPES,
  heavyEquipmentTypeLabel,

  SOLAR_TYPES,
  solarTypeLabel,

  NETWORK_TYPES,
  networkTypeLabel,

  MAINTENANCE_TYPES,
  maintenanceTypeLabel,

  FURNITURE_TYPES,
  furnitureTypeLabel,

  HOME_TOOLS_TYPES,
  homeToolsTypeLabel,

  CLOTHES_TYPES,
  clothesTypeLabel,

  ANIMAL_TYPES,
  animalTypeLabel,

  JOB_TYPES,
  jobTypeLabel,

  SERVICE_TYPES,
  serviceTypeLabel,

  MOTORCYCLE_BRANDS,
  motorcycleBrandLabel,
} from '@/lib/taxonomy';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
});

// ✅ خرائط توافق (عربي/إنجليزي/اختلافات شائعة)
const ALIASES = {
  real_estate: 'realestate',
  'heavy-equipment': 'heavy_equipment',
  heavyEquipment: 'heavy_equipment',
  net: 'networks',
  network: 'networks',

  // عربي -> سلاج
  عقارات: 'realestate',
  العقارات: 'realestate',
  سيارات: 'cars',
  السيارات: 'cars',
  جوالات: 'phones',
  الجوالات: 'phones',
  الكترونيات: 'electronics',
  إلكترونيات: 'electronics',
  الإلكترونيات: 'electronics',
  شبكات: 'networks',
  صيانة: 'maintenance',
  خدمات: 'services',
  وظائف: 'jobs',
  'طاقة شمسية': 'solar',
};

function normalizeSlug(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const mapped = ALIASES[raw] || raw;

  return String(mapped)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

// ✅ وضع صارم: يطابق category قيمة القسم الرسمية فقط (بدون توسعة لقيَم قديمة)
const STRICT_CATEGORY_MATCH = true;

// ✅ لتفادي ظهور أقسام "فاضية" بسبب اختلافات حفظ قيمة category في الإعلانات القديمة
function categoryVariants(single) {
  const s = normalizeSlug(single);
  if (!s) return [];
  if (STRICT_CATEGORY_MATCH) return [s];

  const variantsMap = {
    realestate: ['realestate', 'real_estate', 'real-estate', 'real estate', 'عقارات', 'العقارات'],
    cars: ['cars', 'car', 'سيارات', 'السيارات'],
    phones: ['phones', 'phone', 'mobiles', 'mobile', 'جوالات', 'الجوالات', 'موبايلات'],
    electronics: ['electronics', 'electronic', 'إلكترونيات', 'الكترونيات', 'الإلكترونيات'],
    motorcycles: ['motorcycles', 'motorcycle', 'دراجات', 'دراجات نارية', 'دراجات_نارية'],
    heavy_equipment: [
      'heavy_equipment',
      'heavy-equipment',
      'heavy equipment',
      'heavyequipment',
      'معدات ثقيلة',
      'معدات_ثقيلة',
    ],
    solar: ['solar', 'طاقة شمسية', 'طاقة_شمسية'],
    networks: ['networks', 'network', 'net', 'شبكات', 'نت وشبكات', 'نت_وشبكات', 'نت_و_شبكات'],
    maintenance: ['maintenance', 'صيانة'],
    furniture: ['furniture', 'أداث', 'اثاث', 'أثاث'],
    home_tools: ['home_tools', 'home tools', 'hometools', 'أدوات منزلية', 'ادوات منزلية', 'أدوات_منزلية', 'ادوات_منزلية'],
    clothes: ['clothes', 'ملابس'],
    animals: ['animals', 'animals_birds', 'animals-birds', 'حيوانات', 'حيوانات وطيور', 'حيوانات_وطيور'],
    jobs: ['jobs', 'وظائف'],
    services: ['services', 'خدمات'],
    other: ['other', 'أخرى', 'اخرى'],
  };

  const list = variantsMap[s] || [s];
  const uniq = [];
  const seen = new Set();
  for (const v of list) {
    const nv = normalizeSlug(v);
    if (!nv) continue;
    if (seen.has(nv)) continue;
    seen.add(nv);
    uniq.push(nv);
    if (uniq.length >= 10) break;
  }
  return uniq.length ? uniq : [s];
}

// تطبيق فلترة القسم على استعلام Firestore
function applyCategoryWhere(q, categoryKey) {
  const key = normalizeSlug(categoryKey);
  if (!key) return q;
  if (STRICT_CATEGORY_MATCH) return q.where('category', '==', key);
  const vars = categoryVariants(key);
  if (!vars.length) return q.where('category', '==', key);
  if (vars.length === 1) return q.where('category', '==', vars[0]);
  return q.where('category', 'in', vars);
}

function safeStr(v) {
  return String(v || '').trim();
}

// ✅ ألوان ثابتة للفلاتر (ماركات/موديلات) - توزيع تلقائي من Palette
const TAX_PALETTE = [
  '#2563eb', '#16a34a', '#7c3aed', '#0ea5e9', '#f59e0b', '#f97316',
  '#ef4444', '#db2777', '#8b5cf6', '#14b8a6', '#84cc16', '#a16207', '#64748b'
];

function colorForKey(key) {
  const s = safeStr(key).toLowerCase();
  if (!s) return '#64748b';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TAX_PALETTE[h % TAX_PALETTE.length];
}

// ✅ تم إصلاح هذه الدالة: كانت مفتوحة وغير مغلقة في الكود الأصلي
function pickTaxonomy(listing, categoryKey) {
  return inferListingTaxonomy(listing || {}, categoryKey) || {};
}

function carModelLabelLocal(makeKey, modelKey) {
  const mk = safeStr(makeKey).toLowerCase();
  const md = safeStr(modelKey).toLowerCase();
  const arr = CAR_MODELS_BY_MAKE ? (CAR_MODELS_BY_MAKE[mk] || []) : [];
  const found = arr.find((x) => safeStr(x.key).toLowerCase() === md);
  return found?.label || modelKey || 'أخرى';
}

// ✅ محاولة استنتاج موديل السيارة من الحقول أو من العنوان/الوصف (fallback)
function detectCarModel(listing, makeKey) {
  const mk = safeStr(makeKey).toLowerCase();
  if (!mk) return '';

  const raw =
    listing?.carModel ??
    listing?.model ??
    listing?.vehicleModel ??
    listing?.subModel ??
    listing?.subType ??
    listing?.modelName ??
    '';

  const normalize = (v) =>
    safeStr(v)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/__+/g, '_');

  const rawNorm = normalize(raw);
  if (rawNorm) return rawNorm;

  const txt = `${safeStr(listing?.title)} ${safeStr(listing?.description)}`.toLowerCase();
  const presets = CAR_MODELS_BY_MAKE ? (CAR_MODELS_BY_MAKE[mk] || []) : [];

  for (const it of presets) {
    const key = safeStr(it.key).toLowerCase();
    const label = safeStr(it.label).toLowerCase();
    const variants = [key, label];

    // مرادفات انجليزي شائعة لبعض الموديلات
    if (key === 'land_cruiser') variants.push('landcruiser', 'land cruiser', 'lc');
    if (key === 'hilux') variants.push('hi lux');
    if (key === 'xtrail') variants.push('x-trail', 'xtrail');
    if (key === 'crv') variants.push('cr-v', 'crv');
    if (key === 'mazda3') variants.push('mazda 3');
    if (key === 'mazda6') variants.push('mazda 6');

    for (const v of variants) {
      const vv = String(v || '').trim();
      if (vv && txt.includes(vv)) return key;
    }
  }

  return '';
}

const PHONE_BRANDS_PRESET = [
  { key: 'iphone', label: 'آيفون' },
  { key: 'samsung', label: 'سامسونج' },
  { key: 'xiaomi', label: 'ريدمي/شاومي' },
  { key: 'huawei', label: 'هواوي' },
  { key: 'oppo', label: 'أوبو' },
  { key: 'realme', label: 'ريلمي' },
  { key: 'infinix', label: 'إنفنكس' },
  { key: 'tecno', label: 'تكنو' },
  { key: 'nokia', label: 'نوكيا' },
  { key: 'other', label: 'أخرى' },
];

// ✅ أنواع العقار + ألوان (تظهر حتى لو 0)
const PROPERTY_TYPES_PRESET = [
  { key: 'land', label: 'أرض', color: '#0ea5e9' },
  { key: 'apartment', label: 'شقة', color: '#7c3aed' },
  { key: 'house', label: 'بيت', color: '#16a34a' },
  { key: 'villa', label: 'فيلا', color: '#f97316' },
  { key: 'building', label: 'عمارة', color: '#a16207' },
  { key: 'farm', label: 'مزرعة', color: '#84cc16' },
  { key: 'shop', label: 'محل', color: '#db2777' },
  { key: 'warehouse', label: 'مستودع', color: '#64748b' },
  { key: 'office', label: 'مكتب', color: '#334155' },
  { key: 'room', label: 'غرفة', color: '#14b8a6' },
  { key: 'other', label: 'أخرى', color: '#475569' },
];

function presetMergeWithCounts(preset, countsMap) {
  const safeMap = countsMap && typeof countsMap.get === 'function' && typeof countsMap.entries === 'function' ? countsMap : new Map();

  const used = new Set();
  const out = [];

  // 1) preset in desired order
  for (const p of (Array.isArray(preset) ? preset : [])) {
    const k = safeStr(p?.key);
    if (!k) continue;
    used.add(k);
    const c = safeMap.get(k) || 0;
    const label = safeStr(p?.label) || k;
    const color = p?.color;
    // IMPORTANT: return an ARRAY so it can be destructured like ([k,c])
    out.push([k, c, label, color]);
  }

  // 2) add any extra keys discovered in data but not in preset
  const extras = [];
  for (const [k, c] of safeMap.entries()) {
    const kk = safeStr(k);
    if (!kk || used.has(kk)) continue;
    used.add(kk);
    extras.push([kk, c || 0, kk, undefined]);
  }

  // Sort extras by count (desc)
  extras.sort((a, b) => (b?.[1] || 0) - (a?.[1] || 0));
  return out.concat(extras);
}


export default function CategoryListings({ category, initialListings = [] }) {
  const PAGE_SIZE = 24;

  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');

  const [items, setItems] = useState(() => (Array.isArray(initialListings) ? initialListings : []));
  const [loading, setLoading] = useState(() => (Array.isArray(initialListings) ? initialListings.length === 0 : true));
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef(null);
  const cursorReadyRef = useRef(false);

  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const catsRaw = Array.isArray(category) ? category : [category];
  const cats = catsRaw.map(normalizeSlug).filter(Boolean);
  const single = cats.length === 1 ? cats[0] : '';
  const variants = useMemo(() => categoryVariants(single), [single]);

  // ✅ States للفروع الهرمية
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  // '' = الكل
  const [phoneBrand, setPhoneBrand] = useState('');
  const [dealType, setDealType] = useState(''); // '' = الكل
  const [propertyType, setPropertyType] = useState('');
  const [electronicsType, setElectronicsType] = useState('');
  const [motorcycleBrand, setMotorcycleBrand] = useState('');
  const [heavyEquipmentType, setHeavyEquipmentType] = useState('');
  const [solarType, setSolarType] = useState('');
  const [networkType, setNetworkType] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [furnitureType, setFurnitureType] = useState('');
  const [homeToolsType, setHomeToolsType] = useState('');
  const [clothesType, setClothesType] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [jobType, setJobType] = useState('');
  const [serviceType, setServiceType] = useState('');


  useEffect(() => {
    setCarMake('');
    setCarModel('');
    setPhoneBrand('');
    setDealType('');
    setPropertyType('');

    setElectronicsType('');
    setMotorcycleBrand('');
    setHeavyEquipmentType('');
    setSolarType('');
    setNetworkType('');
    setMaintenanceType('');
    setFurnitureType('');
    setHomeToolsType('');
    setClothesType('');
    setAnimalType('');
    setJobType('');
    setServiceType('');
  }, [single]);

  const normalizeListing = (d) => {
    const l = { id: d?.id || d?._id || d?.docId || d?.uid || d?.listingId, ...(d || {}) };
    if (!l.id) return null;
    if (l.isActive === false || l.hidden === true) return null;
    return l;
  };

  async function fetchFirstPage() {
    setErr('');
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    cursorReadyRef.current = false;

    if (!cats.length) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (!single) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      setErr('إعدادات القسم غير واضحة (أكثر من اسم للقسم).');
      return;
    }

    try {
      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);

      if (!aliveRef.current) return;

      setItems(data);

      const last = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = last;
      cursorReadyRef.current = true;

      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      setErr(e?.message || 'فشل تحميل إعلانات القسم');
      setLoading(false);
      setHasMore(false);
    }
  }

  async function ensureCursorReady() {
    if (cursorReadyRef.current) return;
    if (!single) return;

    try {
      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      cursorReadyRef.current = true;

      const page1 = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);
      if (!aliveRef.current) return;

      // merge without duplicates
      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...page1.filter((x) => !existing.has(x.id))];
      });

      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMore() {
    if (!hasMore || loadingMore) return;
    if (!single) return;

    setLoadingMore(true);
    setErr('');

    try {
      await ensureCursorReady();

      const lastDoc = lastDocRef.current;
      if (!lastDoc) {
        if (!aliveRef.current) return;
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .startAfter(lastDoc)
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);

      if (!aliveRef.current) return;

      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...data.filter((x) => !existing.has(x.id))];
      });

      const newLast = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = newLast;

      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      setErr(e?.message || 'فشل تحميل المزيد');
      setLoadingMore(false);
    }
  }

  // ✅ initial SSR vs client fetch
  useEffect(() => {
    if (Array.isArray(initialListings) && initialListings.length > 0) {
      setItems(initialListings.map(normalizeListing).filter(Boolean));
      setLoading(false);
      setErr('');
      setHasMore(true);
      lastDocRef.current = null;
      cursorReadyRef.current = false;
      return;
    }
    fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single]);

  // ✅ Infinite scroll (نوقفه في وضع الخريطة)
  useEffect(() => {
    if (view === 'map') return;

    const el = loadMoreRef.current;
    if (!el) return;
    if (!hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { root: null, rootMargin: '800px 0px', threshold: 0 }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hasMore, loading, loadingMore, single]);

  // ✅ Taxonomy enrich
  const itemsWithTax = useMemo(() => {
    const catKey = single || '';
    return items
      .map((l) => {
        const tax = catKey ? pickTaxonomy(l, catKey) : { root: catKey };
        return { ...l, _tax: tax };
      })
      .filter(Boolean);
  }, [items, single]);

  const taxonomyCounts = useMemo(() => {
    const catKey = single || '';
    const out = {
      carMakes: new Map(),
      carModels: new Map(),
      phoneBrands: new Map(),
      dealTypes: new Map(),
      propertyTypes: new Map(),

      electronicsTypes: new Map(),
      motorcycleBrands: new Map(),
      heavyEquipmentTypes: new Map(),
      solarTypes: new Map(),
      networkTypes: new Map(),
      maintenanceTypes: new Map(),
      furnitureTypes: new Map(),
      homeToolsTypes: new Map(),
      clothesTypes: new Map(),
      animalTypes: new Map(),
      jobTypes: new Map(),
      serviceTypes: new Map(),
    };
    if (!catKey) return out;

    const inc = (m, k) => {
      const kk = safeStr(k);
      if (!kk) return;
      m.set(kk, (m.get(kk) || 0) + 1);
    };

    for (const l of itemsWithTax) {
      const t = l._tax || {};

      if (catKey === 'cars') inc(out.carMakes, t.carMake || 'other');
      if (catKey === 'phones') inc(out.phoneBrands, t.phoneBrand || 'other');

      if (catKey === 'realestate') inc(out.dealTypes, t.dealType || '');

      if (catKey === 'electronics') inc(out.electronicsTypes, t.electronicsType || 'other');
      if (catKey === 'motorcycles') inc(out.motorcycleBrands, t.motorcycleBrand || 'other');
      if (catKey === 'heavy_equipment') inc(out.heavyEquipmentTypes, t.heavyEquipmentType || 'other');
      if (catKey === 'solar') inc(out.solarTypes, t.solarType || 'other');
      if (catKey === 'networks') inc(out.networkTypes, t.networkType || 'other');
      if (catKey === 'maintenance') inc(out.maintenanceTypes, t.maintenanceType || 'other');
      if (catKey === 'furniture') inc(out.furnitureTypes, t.furnitureType || 'other');
      if (catKey === 'home_tools') inc(out.homeToolsTypes, t.homeToolsType || 'other');
      if (catKey === 'clothes') inc(out.clothesTypes, t.clothesType || 'other');
      if (catKey === 'animals') inc(out.animalTypes, t.animalType || 'other');
      if (catKey === 'jobs') inc(out.jobTypes, t.jobType || 'other');
      if (catKey === 'services') inc(out.serviceTypes, t.serviceType || 'other');
    }

    // carModels: نعرضها فقط عندما تختار ماركة
    if (catKey === 'cars') {
      const mk = safeStr(carMake);
      if (mk) {
        for (const l of itemsWithTax) {
          const t = l._tax || {};
          if (safeStr(t.carMake || 'other') !== mk) continue;
          inc(out.carModels, t.carModel || 'other');
        }
      }
    }

    if (catKey === 'realestate') {
      const dealFilter = safeStr(dealType);
      for (const l of itemsWithTax) {
        const t = l._tax || {};
        if (dealFilter && safeStr(t.dealType) !== dealFilter) continue;
        inc(out.propertyTypes, t.propertyType || 'other');
      }
    }

    return out;
  }, [itemsWithTax, single, dealType, carMake]);

  const filtered = useMemo(() => {
    const catKey = single || '';
    const query = safeStr(q).toLowerCase();
    let arr = itemsWithTax;

    if (catKey === 'cars') {
      const selMake = safeStr(carMake);
      const selModel = safeStr(carModel);

      if (selMake) arr = arr.filter((l) => safeStr(l?._tax?.carMake || 'other') === selMake);
      if (selMake && selModel) {
        arr = arr.filter((l) => safeStr(l?._tax?.carModel || 'other') === selModel);
      }
    }
    if (catKey === 'phones') {
      const sel = safeStr(phoneBrand);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.phoneBrand || 'other') === sel);
    }
    if (catKey === 'electronics') {
      const sel = safeStr(electronicsType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.electronicsType || 'other') === sel);
    }

    if (catKey === 'motorcycles') {
      const sel = safeStr(motorcycleBrand);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.motorcycleBrand || 'other') === sel);
    }
    if (catKey === 'heavy_equipment') {
      const sel = safeStr(heavyEquipmentType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.heavyEquipmentType || 'other') === sel);
    }
    if (catKey === 'solar') {
      const sel = safeStr(solarType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.solarType || 'other') === sel);
    }
    if (catKey === 'networks') {
      const sel = safeStr(networkType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.networkType || 'other') === sel);
    }
    if (catKey === 'maintenance') {
      const sel = safeStr(maintenanceType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.maintenanceType || 'other') === sel);
    }
    if (catKey === 'furniture') {
      const sel = safeStr(furnitureType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.furnitureType || 'other') === sel);
    }
    if (catKey === 'home_tools') {
      const sel = safeStr(homeToolsType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.homeToolsType || 'other') === sel);
    }
    if (catKey === 'clothes') {
      const sel = safeStr(clothesType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.clothesType || 'other') === sel);
    }
    if (catKey === 'animals') {
      const sel = safeStr(animalType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.animalType || 'other') === sel);
    }
    if (catKey === 'jobs') {
      const sel = safeStr(jobType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.jobType || 'other') === sel);
    }
    if (catKey === 'services') {
      const sel = safeStr(serviceType);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.serviceType || 'other') === sel);
    }

    if (catKey === 'realestate') {
      const selDeal = safeStr(dealType);
      const selProp = safeStr(propertyType);
      if (selDeal) arr = arr.filter((l) => safeStr(l?._tax?.dealType) === selDeal);
      if (selProp) arr = arr.filter((l) => safeStr(l?._tax?.propertyType || 'other') === selProp);
    }

    if (!query) return arr;

    return arr.filter((l) => {
      const title = safeStr(l.title).toLowerCase();
      const city = safeStr(l.city || l.region || l.locationLabel).toLowerCase();
      const desc = safeStr(l.description).toLowerCase();
      return title.includes(query) || city.includes(query) || desc.includes(query);
    });
  }, [itemsWithTax, single, q, carMake, carModel, phoneBrand, dealType, propertyType, electronicsType, motorcycleBrand, heavyEquipmentType, solarType, networkType, maintenanceType, furnitureType, homeToolsType, clothesType, animalType, jobType, serviceType]);

  const showCarsTax = single === 'cars' && taxonomyCounts.carMakes.size > 0;
  const showPhonesTax = single === 'phones' && taxonomyCounts.phoneBrands.size > 0;
  const showRealTax = single === 'realestate' && taxonomyCounts.dealTypes.size > 0;

  const showElectronicsTax = single === 'electronics' && taxonomyCounts.electronicsTypes.size > 0;
  const showMotorcyclesTax = single === 'motorcycles' && taxonomyCounts.motorcycleBrands.size > 0;
  const showHeavyTax = single === 'heavy_equipment' && taxonomyCounts.heavyEquipmentTypes.size > 0;
  const showSolarTax = single === 'solar' && taxonomyCounts.solarTypes.size > 0;
  const showNetworksTax = single === 'networks' && taxonomyCounts.networkTypes.size > 0;
  const showMaintenanceTax = single === 'maintenance' && taxonomyCounts.maintenanceTypes.size > 0;
  const showFurnitureTax = single === 'furniture' && taxonomyCounts.furnitureTypes.size > 0;
  const showHomeToolsTax = single === 'home_tools' && taxonomyCounts.homeToolsTypes.size > 0;
  const showClothesTax = single === 'clothes' && taxonomyCounts.clothesTypes.size > 0;
  const showAnimalsTax = single === 'animals' && taxonomyCounts.animalTypes.size > 0;
  const showJobsTax = single === 'jobs' && taxonomyCounts.jobTypes.size > 0;
  const showServicesTax = single === 'services' && taxonomyCounts.serviceTypes.size > 0;

  const carMakeOptions = useMemo(() => {
    // ✅ افتراض أن CAR_MAKES_PRESET مستوردة أو معرفة
    const preset = CAR_MAKES_PRESET || []; 
    const merged = presetMergeWithCounts(preset, taxonomyCounts.carMakes);
    // نعرض حتى 0 عشان تبقى واجهة فخمة وثابتة
    return merged.slice(0, 40);
  }, [taxonomyCounts.carMakes]);

  const carModelOptions = useMemo(() => {
    const mk = safeStr(carMake);
    if (!mk) return [];
    const preset = CAR_MODELS_BY_MAKE ? (CAR_MODELS_BY_MAKE[mk] || []) : [];
    const merged = presetMergeWithCounts(preset, taxonomyCounts.carModels);
    return merged.slice(0, 80);
  }, [carMake, taxonomyCounts.carModels]);

  const phoneBrandOptions = useMemo(() => {
    const merged = presetMergeWithCounts(PHONE_BRANDS_PRESET, taxonomyCounts.phoneBrands);
    return merged.slice(0, 40);
  }, [taxonomyCounts.phoneBrands]);

  // ✅ تم إصلاح الإغلاق الناقص هنا (كان مفقود ] )
  const electronicsTypeOptions = useMemo(() => {
    const preset = (Array.isArray(ELECTRONICS_TYPES) ? ELECTRONICS_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.electronicsTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.electronicsTypes]);

  const motorcycleBrandOptions = useMemo(() => {
    const preset = (Array.isArray(MOTORCYCLE_BRANDS) ? MOTORCYCLE_BRANDS : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.motorcycleBrands);
    return merged.slice(0, 60);
  }, [taxonomyCounts.motorcycleBrands]);

  const heavyEquipmentTypeOptions = useMemo(() => {
    const preset = (Array.isArray(HEAVY_EQUIPMENT_TYPES) ? HEAVY_EQUIPMENT_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.heavyEquipmentTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.heavyEquipmentTypes]);

  const solarTypeOptions = useMemo(() => {
    const preset = (Array.isArray(SOLAR_TYPES) ? SOLAR_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.solarTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.solarTypes]);

  const networkTypeOptions = useMemo(() => {
    const preset = (Array.isArray(NETWORK_TYPES) ? NETWORK_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.networkTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.networkTypes]);

  const maintenanceTypeOptions = useMemo(() => {
    const preset = (Array.isArray(MAINTENANCE_TYPES) ? MAINTENANCE_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.maintenanceTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.maintenanceTypes]);

  const furnitureTypeOptions = useMemo(() => {
    const preset = (Array.isArray(FURNITURE_TYPES) ? FURNITURE_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.furnitureTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.furnitureTypes]);

  const homeToolsTypeOptions = useMemo(() => {
    const preset = (Array.isArray(HOME_TOOLS_TYPES) ? HOME_TOOLS_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.homeToolsTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.homeToolsTypes]);

  const clothesTypeOptions = useMemo(() => {
    const preset = (Array.isArray(CLOTHES_TYPES) ? CLOTHES_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.clothesTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.clothesTypes]);

  const animalTypeOptions = useMemo(() => {
    const preset = (Array.isArray(ANIMAL_TYPES) ? ANIMAL_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.animalTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.animalTypes]);

  const jobTypeOptions = useMemo(() => {
    const preset = (Array.isArray(JOB_TYPES) ? JOB_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.jobTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.jobTypes]);

  const serviceTypeOptions = useMemo(() => {
    const preset = (Array.isArray(SERVICE_TYPES) ? SERVICE_TYPES : []).map((x) => ({
      key: x.key,
      label: x.label,
      color: x.color,
    }));
    const merged = presetMergeWithCounts(preset, taxonomyCounts.serviceTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.serviceTypes]);

  const dealTypeOptions = useMemo(() => {
    return Array.from(taxonomyCounts.dealTypes.entries())
      .map(([k, c]) => [safeStr(k), c])
      .filter(([k]) => k === 'sale' || k === 'rent')
      .sort((a, b) => (b[1] || 0) - (a[1] || 0));
  }, [taxonomyCounts.dealTypes]);

  const propertyTypeOptions = useMemo(() => {
    const merged = presetMergeWithCounts(PROPERTY_TYPES_PRESET, taxonomyCounts.propertyTypes);
    return merged.slice(0, 60);
  }, [taxonomyCounts.propertyTypes]);


  // ====== UI Chips (ستايل احترافي مثل الخريطة) ======
  const CAT_COLOR = useMemo(() => {
    if (single === 'cars') return '#2563eb';
    if (single === 'phones') return '#7c3aed';
    if (single === 'realestate') return '#16a34a';
    if (single === 'electronics') return '#0ea5e9';
    if (single === 'motorcycles') return '#f97316';
    if (single === 'heavy_equipment') return '#a16207';
    if (single === 'solar') return '#f59e0b';
    if (single === 'networks') return '#0ea5e9';
    if (single === 'maintenance') return '#ef4444';
    if (single === 'furniture') return '#8b5cf6';
    if (single === 'home_tools') return '#14b8a6';
    if (single === 'clothes') return '#db2777';
    if (single === 'animals') return '#16a34a';
    if (single === 'jobs') return '#64748b';
    if (single === 'services') return '#334155';
    return '#475569';
  }, [single]);

  const Chip = ({ active, disabled, onClick, icon, text, count, dotColor, title }) => (
    <button
      type="button"
      className={`sooq-chip ${active ? 'isActive' : ''} ${disabled ? 'isDisabled' : ''}`}
      style={{ borderColor: active ? (dotColor || CAT_COLOR) : undefined }}
      onClick={disabled ? undefined : onClick}
      disabled={!!disabled}
      title={title || text}
    >
      <span className="sooq-chipDot" style={{ background: dotColor || CAT_COLOR }} />
      {icon ? (
        <span className="sooq-chipIcon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="sooq-chipText">{text}</span>
      {typeof count === 'number' ? <span className="sooq-chipCount">{count}</span> : null}
    </button>
  );


  const TaxonomyInner = () => {
    if (!single) return null;

    // سيارات
    if (showCarsTax) {
      const mk = safeStr(carMake);
      const md = safeStr(carModel);
      const mkLabel = mk ? carMakeLabel(mk) : '';
      const modelsTotal = Array.from(taxonomyCounts.carModels.values()).reduce((a, b) => a + Number(b || 0), 0);

      // 1) اختيار الماركة
      if (!mk) {
        return (
          <div className="sooq-taxSection" aria-label="فلترة ماركة السيارة">
            <div className="sooq-taxTitle">🚗 اختر ماركة السيارة</div>
            <div className="sooq-chips" role="tablist">
              <Chip
                active={!mk}
                onClick={() => {
                  setCarMake('');
                  setCarModel('');
                }}
                text="الكل"
                count={itemsWithTax.length}
                dotColor={CAT_COLOR}
              />
              {carMakeOptions.map(([k, c]) => (
                <Chip
                  key={k}
                  active={mk === k}
                  onClick={() => {
                    setCarMake(k);
                    setCarModel('');
                  }}
                  text={carMakeLabel(k)}
                  count={c}
                  dotColor={colorForKey(k)}
                  title={`سيارات ${carMakeLabel(k)}`}
                />
              ))}
            </div>
          </div>
        );
      }

      // 2) اختيار الموديل داخل الماركة
      return (
        <div className="sooq-taxSection" aria-label="فلترة موديل السيارة">
          <div className="sooq-taxTitle">🚗 {mkLabel} — اختر الموديل</div>
          <div className="sooq-chips" role="tablist">
            <Chip
              active={false}
              onClick={() => {
                setCarMake('');
                setCarModel('');
              }}
              text="رجوع"
              icon="⬅️"
              count={undefined}
              dotColor={CAT_COLOR}
              title="رجوع لقائمة الماركات"
            />

            <Chip
              active={!md}
              onClick={() => setCarModel('')}
              text={`كل موديلات ${mkLabel}`}
              count={modelsTotal || undefined}
              dotColor={colorForKey(mk)}
              title={`عرض كل موديلات ${mkLabel}`}
            />

            {carModelOptions
              .filter(([k]) => safeStr(k) && safeStr(k) !== 'other')
              .map(([k, c]) => (
                <Chip
                  key={k}
                  active={md === k}
                  onClick={() => setCarModel(k)}
                  text={carModelLabelLocal(mk, k)}
                  count={c}
                  dotColor={colorForKey(`${mk}:${k}`)}
                  title={`${mkLabel} ${carModelLabelLocal(mk, k)}`}
                />
              ))}

            {/* أخرى */}
            {carModelOptions.some(([k]) => safeStr(k) === 'other') ? (
              <Chip
                active={md === 'other'}
                onClick={() => setCarModel('other')}
                text="أخرى"
                count={taxonomyCounts.carModels?.get('other') || 0}
                dotColor={colorForKey(`${mk}:other`)}
                title="موديلات أخرى"
              />
            ) : null}
          </div>
        </div>
      );
    }

    // جوالات
    if (showPhonesTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة ماركة الجوال">
          <div className="sooq-taxTitle">📱 اختر الماركة</div>
          <div className="sooq-chips" role="tablist" aria-label="ماركات الجوالات">
            <Chip active={!phoneBrand} onClick={() => setPhoneBrand('')} text="الكل" count={itemsWithTax.length} />
            {phoneBrandOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (phoneBrandLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={phoneBrand === k}
                  onClick={() => setPhoneBrand(k)}
                  text={label}
                  count={c}
                  icon="📱"
                  dotColor={colorForKey(k)}
                />
              );
            })}
          </div>
        </div>
      );
    }


    // إلكترونيات
    if (showElectronicsTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الإلكترونيات">
          <div className="sooq-taxTitle">💻 اختر فئة الإلكترونيات</div>
          <div className="sooq-chips" role="tablist" aria-label="فئات الإلكترونيات">
            <Chip
              active={!electronicsType}
              onClick={() => setElectronicsType('')}
              text="الكل"
              count={itemsWithTax.length}
              dotColor={CAT_COLOR}
            />
            {electronicsTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (electronicsTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={electronicsType === k}
                  onClick={() => setElectronicsType(k)}
                  text={label}
                  count={c}
                  icon="💻"
                  dotColor={colorForKey(`electronics:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    
    // دراجات نارية
    if (showMotorcyclesTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الدراجات النارية">
          <div className="sooq-taxTitle">🏍️ اختر ماركة الدراجة</div>
          <div className="sooq-chips" role="tablist" aria-label="ماركات الدراجات">
            <Chip active={!motorcycleBrand} onClick={() => setMotorcycleBrand('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {motorcycleBrandOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (motorcycleBrandLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={motorcycleBrand === k}
                  onClick={() => setMotorcycleBrand(k)}
                  text={label}
                  count={c}
                  icon="🏍️"
                  dotColor={colorForKey(`moto:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // معدات ثقيلة
    if (showHeavyTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة المعدات الثقيلة">
          <div className="sooq-taxTitle">🏗️ اختر نوع المعدة</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع المعدات الثقيلة">
            <Chip active={!heavyEquipmentType} onClick={() => setHeavyEquipmentType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {heavyEquipmentTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (heavyEquipmentTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={heavyEquipmentType === k}
                  onClick={() => setHeavyEquipmentType(k)}
                  text={label}
                  count={c}
                  icon="🏗️"
                  dotColor={colorForKey(`heavy:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // طاقة شمسية
    if (showSolarTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الطاقة الشمسية">
          <div className="sooq-taxTitle">☀️ اختر فئة الطاقة الشمسية</div>
          <div className="sooq-chips" role="tablist" aria-label="فئات الطاقة الشمسية">
            <Chip active={!solarType} onClick={() => setSolarType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {solarTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (solarTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={solarType === k}
                  onClick={() => setSolarType(k)}
                  text={label}
                  count={c}
                  icon="☀️"
                  dotColor={colorForKey(`solar:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // نت وشبكات
    if (showNetworksTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الشبكات">
          <div className="sooq-taxTitle">📡 اختر فئة الشبكات</div>
          <div className="sooq-chips" role="tablist" aria-label="فئات الشبكات">
            <Chip active={!networkType} onClick={() => setNetworkType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {networkTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (networkTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={networkType === k}
                  onClick={() => setNetworkType(k)}
                  text={label}
                  count={c}
                  icon="📡"
                  dotColor={colorForKey(`net:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // صيانة
    if (showMaintenanceTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الصيانة">
          <div className="sooq-taxTitle">🛠️ اختر نوع الصيانة</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الصيانة">
            <Chip active={!maintenanceType} onClick={() => setMaintenanceType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {maintenanceTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (maintenanceTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={maintenanceType === k}
                  onClick={() => setMaintenanceType(k)}
                  text={label}
                  count={c}
                  icon="🛠️"
                  dotColor={colorForKey(`maint:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // أثاث
    if (showFurnitureTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الأثاث">
          <div className="sooq-taxTitle">🛋️ اختر نوع الأثاث</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الأثاث">
            <Chip active={!furnitureType} onClick={() => setFurnitureType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {furnitureTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (furnitureTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={furnitureType === k}
                  onClick={() => setFurnitureType(k)}
                  text={label}
                  count={c}
                  icon="🛋️"
                  dotColor={colorForKey(`furn:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // أدوات منزلية
    if (showHomeToolsTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الأدوات المنزلية">
          <div className="sooq-taxTitle">🏠 اختر نوع الأدوات المنزلية</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الأدوات المنزلية">
            <Chip active={!homeToolsType} onClick={() => setHomeToolsType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {homeToolsTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (homeToolsTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={homeToolsType === k}
                  onClick={() => setHomeToolsType(k)}
                  text={label}
                  count={c}
                  icon="🏠"
                  dotColor={colorForKey(`home:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // ملابس
    if (showClothesTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الملابس">
          <div className="sooq-taxTitle">👕 اختر نوع الملابس</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الملابس">
            <Chip active={!clothesType} onClick={() => setClothesType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {clothesTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (clothesTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={clothesType === k}
                  onClick={() => setClothesType(k)}
                  text={label}
                  count={c}
                  icon="👕"
                  dotColor={colorForKey(`clothes:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // حيوانات وطيور
    if (showAnimalsTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الحيوانات">
          <div className="sooq-taxTitle">🐑 اختر نوع الحيوانات</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الحيوانات">
            <Chip active={!animalType} onClick={() => setAnimalType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {animalTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (animalTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={animalType === k}
                  onClick={() => setAnimalType(k)}
                  text={label}
                  count={c}
                  icon="🐑"
                  dotColor={colorForKey(`animal:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // وظائف
    if (showJobsTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الوظائف">
          <div className="sooq-taxTitle">💼 اختر نوع الوظيفة</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الوظائف">
            <Chip active={!jobType} onClick={() => setJobType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {jobTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (jobTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={jobType === k}
                  onClick={() => setJobType(k)}
                  text={label}
                  count={c}
                  icon="💼"
                  dotColor={colorForKey(`job:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }

    // خدمات
    if (showServicesTax) {
      return (
        <div className="sooq-taxSection" aria-label="فلترة الخدمات">
          <div className="sooq-taxTitle">🧰 اختر نوع الخدمة</div>
          <div className="sooq-chips" role="tablist" aria-label="أنواع الخدمات">
            <Chip active={!serviceType} onClick={() => setServiceType('')} text="الكل" count={itemsWithTax.length} dotColor={CAT_COLOR} />
            {serviceTypeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (serviceTypeLabel(k) || k);
              return (
                <Chip
                  key={k}
                  active={serviceType === k}
                  onClick={() => setServiceType(k)}
                  text={label}
                  count={c}
                  icon="🧰"
                  dotColor={colorForKey(`service:${k}`)}
                />
              );
            })}
          </div>
        </div>
      );
    }


// عقارات
    if (showRealTax) {
      const hasDeal = !!safeStr(dealType);

      // ✅ إذا اخترت (بيع) نخفي (إيجار) والعكس
      const visibleDealOptions = hasDeal ? dealTypeOptions.filter(([k]) => k === dealType) : dealTypeOptions;

      const dealDot = (k) => (k === 'sale' ? '#0ea5e9' : k === 'rent' ? '#f59e0b' : CAT_COLOR);

      const propertyTypeDot = (k) => {
        const kk = String(k || '').trim();
        const found = PROPERTY_TYPES_PRESET.find((x) => String(x?.key || '').trim() === kk);
        return found?.color || colorForKey(`property:${kk}`) || CAT_COLOR;
      };

      return (
        <div className="sooq-taxSection" aria-label="فلترة العقارات">
          <div className="sooq-taxTitle">🏡 فلترة العقارات</div>

          <div className="sooq-taxSub">نوع العملية</div>
          <div className="sooq-chips" role="tablist" aria-label="بيع أو إيجار">
            <Chip
              active={!dealType}
              onClick={() => {
                setDealType('');
                setPropertyType('');
              }}
              text="الكل"
              count={itemsWithTax.length}
            />

            {visibleDealOptions.map(([k, c]) => {
              const label = dealTypeLabel(k) || (k === 'sale' ? 'بيع' : k === 'rent' ? 'إيجار' : k);
              return (
                <Chip
                  key={k}
                  active={dealType === k}
                  onClick={() => {
                    setDealType(k);
                    setPropertyType('');
                  }}
                  text={label}
                  count={c}
                  icon="🏷️"
                  dotColor={dealDot(k)}
                />
              );
            })}
          </div>

          {hasDeal && propertyTypeOptions.length > 0 ? (
            <>
              <div className="sooq-taxSub" style={{ marginTop: 10 }}>نوع العقار</div>
              <div className="sooq-chips" role="tablist" aria-label="نوع العقار">
                <Chip active={!propertyType} onClick={() => setPropertyType('')} text="كل الأنواع" />
                {propertyTypeOptions.map(([k, c]) => {
                  const label = k === 'other' ? 'أخرى' : (propertyTypeLabel(k) || k);
                  return (
                    <Chip
                      key={k}
                      active={propertyType === k}
                      onClick={() => setPropertyType(k)}
                      text={label}
                      count={c}
                      icon="🏡"
                      dotColor={propertyTypeDot(k)}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      );
    }

    return null;
  };


  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="muted">جاري تحميل إعلانات القسم...</div>
      </div>
    );
  }

  if (err && items.length === 0) {
    return (
      <div className="card" style={{ padding: 16, border: '1px solid #fecaca' }}>
        <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️ حدث خطأ</div>
        <div className="muted" style={{ marginTop: 6 }}>{err}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sooq-filterShell">
        <TaxonomyInner />

        <div className="sooq-controlsRow">
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 8 }}>
              <button className={`btn ${view === 'grid' ? 'btnPrimary' : ''}`} onClick={() => setView('grid')}>
                ◼️ شبكة
              </button>
              <button className={`btn ${view === 'list' ? 'btnPrimary' : ''}`} onClick={() => setView('list')}>
                ☰ قائمة
              </button>
              <button className={`btn ${view === 'map' ? 'btnPrimary' : ''}`} onClick={() => setView('map')}>
                🗺️ خريطة
              </button>
            </div>

            <input
              className="input sooq-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث داخل القسم..."
            />
          </div>
        </div>
      </div>


      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات مطابقة</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب تغيير الفلاتر أو البحث.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/add">➕ أضف إعلان</Link>
          </div>
        </div>
      ) : view === 'map' ? (
        <HomeMapView listings={filtered} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr',
              gap: 12,
            }}
          >
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>

          <div ref={loadMoreRef} style={{ height: 1 }} />

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {loadingMore ? (
              <div className="muted" style={{ padding: 10 }}>...جاري تحميل المزيد</div>
            ) : hasMore ? (
              <div className="muted" style={{ padding: 10 }}>انزل لأسفل لتحميل المزيد</div>
            ) : (
              <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
            )}
          </div>

          {err && items.length > 0 ? (
            <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️</div>
              <div className="muted" style={{ marginTop: 6 }}>{err}</div>
            </div>
          ) : null}
        </>
      )}

      <style jsx>{`
        .tax-wrap {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
        }
        .tax-title {
          font-weight: 900;
          margin-bottom: 8px;
        }
        .tax-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .tax-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fff;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
        }
        .tax-chip.isActive {
          border-color: rgba(0, 0, 0, 0.22);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.1);
        }
        .tax-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          font-size: 12px;
          font-weight: 900;
        }


        /* ====== Filter shell (نفس شكل الخريطة للشبكة/القائمة) ====== */
        .sooq-filterShell {
          margin-bottom: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.10);
        }
        .sooq-taxSection {
          margin-bottom: 10px;
        }
        .sooq-controlsRow {
          margin-top: 10px;
        }
        .sooq-search {
          flex: 1;
          min-width: 180px;
        }

        /* ====== Taxonomy bar (مثل الخريطة) ====== */
        .sooq-taxWrap {
          margin-bottom: 12px;
          padding: 10px 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(8px);
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.08);
        }
        .sooq-taxTitle {
          font-weight: 900;
          margin-bottom: 8px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .sooq-taxSub {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.85;
          margin: 6px 0 6px;
        }

        .sooq-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(6px);
          align-items: center;
        }

        .sooq-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          background: #fff;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
          font-weight: 900;
        }
        .sooq-chip.isDisabled {
          opacity: 0.55;
          filter: grayscale(0.15);
          cursor: not-allowed;
        }
        .sooq-chip:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .sooq-chip.isActive {
          border-color: rgba(0, 0, 0, 0.20);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.10);
        }

        .sooq-chipDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex: 0 0 10px;
        }
        .sooq-chipIcon {
          font-size: 14px;
          line-height: 1;
        }
        .sooq-chipText {
          font-weight: 900;
        }
        .sooq-chipCount {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          font-size: 12px;
          font-weight: 900;
        }

        @media (max-width: 520px) {
          .sooq-taxWrap { padding: 10px 8px; }
          .sooq-chips { padding: 6px; }
          .sooq-chip { padding: 8px 9px; font-size: 12px; }
        }

      `}</style>
    </div>
  );
}
