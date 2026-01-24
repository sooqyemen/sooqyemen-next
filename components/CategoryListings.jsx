// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebaseClient';
import { normalizeCategoryKey, getCategoryLabel } from '@/lib/categories';
import ListingCard from '@/components/ListingCard';

// ✅ Taxonomy (الفروع الهرمية)
import {
  // base inference (cars/phones/realestate)
  inferListingTaxonomy,

  // cars
  CAR_MAKES,
  CAR_MODELS_BY_MAKE,
  carMakeLabel,
  carModelLabel,

  // phones
  PHONE_BRANDS,
  phoneBrandLabel,

  // realestate
  DEAL_TYPES,
  PROPERTY_TYPES,
  dealTypeLabel,
  propertyTypeLabel,

  // other single-facet categories
  ELECTRONICS_TYPES,
  electronicsTypeLabel,
  normalizeElectronicsType,
  detectElectronicsTypeFromText,

  MOTORCYCLE_BRANDS,
  motorcycleBrandLabel,
  normalizeMotorcycleBrand,
  detectMotorcycleBrandFromText,

  HEAVY_EQUIPMENT_TYPES,
  heavyEquipmentTypeLabel,
  normalizeHeavyEquipmentType,
  detectHeavyEquipmentTypeFromText,

  SOLAR_TYPES,
  solarTypeLabel,
  normalizeSolarType,
  detectSolarTypeFromText,

  NETWORK_TYPES,
  networkTypeLabel,
  normalizeNetworkType,
  detectNetworkTypeFromText,

  MAINTENANCE_TYPES,
  maintenanceTypeLabel,
  normalizeMaintenanceType,
  detectMaintenanceTypeFromText,

  FURNITURE_TYPES,
  furnitureTypeLabel,
  normalizeFurnitureType,
  detectFurnitureTypeFromText,

  HOME_TOOLS_TYPES,
  homeToolsTypeLabel,
  normalizeHomeToolsType,
  detectHomeToolsTypeFromText,

  CLOTHES_TYPES,
  clothesTypeLabel,
  normalizeClothesType,
  detectClothesTypeFromText,

  ANIMAL_TYPES,
  animalTypeLabel,
  normalizeAnimalType,
  detectAnimalTypeFromText,

  JOB_TYPES,
  jobTypeLabel,
  normalizeJobType,
  detectJobTypeFromText,

  SERVICE_TYPES,
  serviceTypeLabel,
  normalizeServiceType,
  detectServiceTypeFromText,
} from '@/lib/taxonomy';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), { ssr: false });

// ✅ تطبيع أن keys الأقسام يتم حصراً عبر lib/categories.js
function safeStr(v) {
  return String(v || '').trim();
}

// ✅ ألوان ثابتة للفلاتر - توزيع تلقائي من Palette
const TAX_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#7c3aed',
  '#0ea5e9',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#db2777',
  '#8b5cf6',
  '#14b8a6',
  '#84cc16',
  '#a16207',
  '#64748b',
];

function colorForKey(key) {
  const s = safeStr(key).toLowerCase();
  if (!s) return '#64748b';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TAX_PALETTE[h % TAX_PALETTE.length];
}

function presetMergeWithCounts(preset, countsMap) {
  const safeMap =
    countsMap &&
    typeof countsMap.get === 'function' &&
    typeof countsMap.entries === 'function'
      ? countsMap
      : new Map();

  const used = new Set();
  const out = [];

  // 1) preset in desired order
  for (const p of Array.isArray(preset) ? preset : []) {
    const k = safeStr(p?.key);
    if (!k) continue;
    used.add(k);
    const c = safeMap.get(k) || 0;
    const label = safeStr(p?.label) || k;
    const color = p?.color;
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

  extras.sort((a, b) => (b?.[1] || 0) - (a?.[1] || 0));
  return out.concat(extras);
}

function pickTaxonomy(listing, categoryKey) {
  const root = String(categoryKey || '').trim();
  const inferred = inferListingTaxonomy(listing || {}, root) || {};

  const title = safeStr(listing?.title).toLowerCase();
  const desc = safeStr(listing?.description).toLowerCase();
  const text = `${title} ${desc}`.trim();

  const out = {
    root,

    // cars
    carMake: inferred.carMake || safeStr(listing?.carMake) || '',
    carModel: inferred.carModel || safeStr(listing?.carModel) || '',

    // phones
    phoneBrand: inferred.phoneBrand || safeStr(listing?.phoneBrand) || '',

    // realestate
    dealType: inferred.dealType || safeStr(listing?.dealType) || '',
    propertyType: inferred.propertyType || safeStr(listing?.propertyType) || '',

    // other (single facet)
    electronicsType: '',
    motorcycleBrand: '',
    heavyEquipmentType: '',
    solarType: '',
    networkType: '',
    maintenanceType: '',
    furnitureType: '',
    homeToolsType: '',
    clothesType: '',
    animalType: '',
    jobType: '',
    serviceType: '',
  };

  if (root === 'cars') {
    out.carMake = out.carMake || 'other';
    if (out.carMake && out.carMake !== 'other') {
      const mk = out.carMake;
      const rawModel = safeStr(listing?.carModel || inferred.carModel || listing?.model || '');
      out.carModel = safeStr(rawModel) || '';
      void mk;
    } else {
      out.carModel = '';
    }
  }

  if (root === 'phones') {
    out.phoneBrand = out.phoneBrand || 'other';
  }

  if (root === 'electronics') {
    const v =
      listing?.electronicsType ??
      listing?.electronics ??
      listing?.electronicType ??
      listing?.type ??
      '';
    out.electronicsType =
      normalizeElectronicsType(v) || detectElectronicsTypeFromText(text) || 'other';
  }

  if (root === 'motorcycles') {
    const v = listing?.motorcycleBrand ?? listing?.bikeBrand ?? listing?.brand ?? '';
    out.motorcycleBrand =
      normalizeMotorcycleBrand(v) || detectMotorcycleBrandFromText(text) || 'other';
  }

  if (root === 'heavy_equipment') {
    const v = listing?.heavyEquipmentType ?? listing?.equipmentType ?? listing?.type ?? '';
    out.heavyEquipmentType =
      normalizeHeavyEquipmentType(v) || detectHeavyEquipmentTypeFromText(text) || 'other';
  }

  if (root === 'solar') {
    const v = listing?.solarType ?? listing?.type ?? '';
    out.solarType = normalizeSolarType(v) || detectSolarTypeFromText(text) || 'other';
  }

  if (root === 'networks') {
    const v = listing?.networkType ?? listing?.type ?? '';
    out.networkType = normalizeNetworkType(v) || detectNetworkTypeFromText(text) || 'other';
  }

  if (root === 'maintenance') {
    const v = listing?.maintenanceType ?? listing?.type ?? '';
    out.maintenanceType =
      normalizeMaintenanceType(v) || detectMaintenanceTypeFromText(text) || 'other';
  }

  if (root === 'furniture') {
    const v = listing?.furnitureType ?? listing?.type ?? '';
    out.furnitureType = normalizeFurnitureType(v) || detectFurnitureTypeFromText(text) || 'other';
  }

  if (root === 'home_tools') {
    const v = listing?.homeToolsType ?? listing?.home_tools_type ?? listing?.type ?? '';
    out.homeToolsType =
      normalizeHomeToolsType(v) || detectHomeToolsTypeFromText(text) || 'other';
  }

  if (root === 'clothes') {
    const v = listing?.clothesType ?? listing?.type ?? '';
    out.clothesType = normalizeClothesType(v) || detectClothesTypeFromText(text) || 'other';
  }

  if (root === 'animals') {
    const v = listing?.animalType ?? listing?.type ?? '';
    out.animalType = normalizeAnimalType(v) || detectAnimalTypeFromText(text) || 'other';
  }

  if (root === 'jobs') {
    const v = listing?.jobType ?? listing?.type ?? '';
    out.jobType = normalizeJobType(v) || detectJobTypeFromText(text) || 'other';
  }

  if (root === 'services') {
    const v = listing?.serviceType ?? listing?.type ?? '';
    out.serviceType = normalizeServiceType(v) || detectServiceTypeFromText(text) || 'other';
  }

  return out;
}

function getCategoryBaseColor(root) {
  if (root === 'cars') return '#2563eb';
  if (root === 'phones') return '#7c3aed';
  if (root === 'realestate') return '#16a34a';
  if (root === 'electronics') return '#0ea5e9';
  if (root === 'motorcycles') return '#f97316';
  if (root === 'heavy_equipment') return '#a16207';
  if (root === 'solar') return '#f59e0b';
  if (root === 'networks') return '#0ea5e9';
  if (root === 'maintenance') return '#ef4444';
  if (root === 'furniture') return '#8b5cf6';
  if (root === 'home_tools') return '#14b8a6';
  if (root === 'clothes') return '#db2777';
  if (root === 'animals') return '#16a34a';
  if (root === 'jobs') return '#64748b';
  if (root === 'services') return '#334155';
  return '#475569';
}

export default function CategoryListings({ category, initialListings = [] }) {
  const PAGE_SIZE = 24;

  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const searchParams = useSearchParams();

  const [items, setItems] = useState(() => (Array.isArray(initialListings) ? initialListings : []));
  const [loading, setLoading] = useState(() =>
    Array.isArray(initialListings) ? initialListings.length === 0 : true
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // ✅ States للفروع الهرمية
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');

  const [phoneBrand, setPhoneBrand] = useState('');
  const [dealType, setDealType] = useState('');
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

  // ✅ فلتر المحافظة (Governorate)
  const [govKey, setGovKey] = useState('');
  const [govOptions, setGovOptions] = useState([]);
  const [govLoading, setGovLoading] = useState(false);

  const lastDocRef = useRef(null);
  const cursorReadyRef = useRef(false);
  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);
  const usedInitialRef = useRef(false);

  // ✅ alive guard
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ sync search query from URL (?q=...)
  useEffect(() => {
    const qp = safeStr(searchParams?.get('q'));
    if (!qp) return;
    setQ((prev) => (safeStr(prev) === qp ? prev : qp));
  }, [searchParams]);

  // ✅ sync governorate from URL (?gov=aden) optional
  useEffect(() => {
    const g = safeStr(searchParams?.get('gov') || searchParams?.get('g'));
    if (!g) return;
    setGovKey((prev) => (safeStr(prev) === g ? prev : g));
  }, [searchParams]);

  const catsRaw = Array.isArray(category) ? category : [category];
  const cats = catsRaw.map(normalizeCategoryKey).filter(Boolean);
  const single = cats.length === 1 ? cats[0] : '';

  // ✅ Map nameAr -> key (علشان الفلتر يشتغل حتى لو الإعلان القديم ما فيه govKey)
  const govNameToKey = useMemo(() => {
    const m = new Map();
    (govOptions || []).forEach((g) => {
      const key = safeStr(g?.key).toLowerCase();
      const name = safeStr(g?.nameAr).toLowerCase();
      if (key && name) m.set(name, key);
    });
    return m;
  }, [govOptions]);

  const getListingGovKey = (l) => {
    // 1) prefer explicit keys
    const raw = safeStr(l?.govKey || l?.governorateKey || l?.governorate || l?.gov);
    if (raw) return raw.toLowerCase();

    // 2) try to map Arabic city/governorate name -> key
    const cityName = safeStr(l?.city);
    const cityLower = cityName.toLowerCase();
    if (!cityLower) return '';

    const mapped = govNameToKey.get(cityLower);
    if (mapped) return mapped.toLowerCase();

    // 3) sometimes city is already stored as key
    if (/^[a-z0-9_]+$/.test(cityLower)) return cityLower;

    return '';
  };

  // ✅ reset when category changes
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
    setGovKey('');

    usedInitialRef.current = false;
  }, [single]);

  // ✅ Load governorates from Firestore (taxonomy_governorates) for filtering
  useEffect(() => {
    let cancelled = false;

    async function loadGovs() {
      setGovLoading(true);
      try {
        const snap = await db.collection('taxonomy_governorates').orderBy('order', 'asc').get();
        const rows = snap.docs
          .map((d) => ({ key: d.id, ...(d.data() || {}) }))
          .map((g) => ({
            key: safeStr(g.key),
            nameAr: safeStr(g.nameAr || g.name || g.title || g.label),
            order: typeof g.order === 'number' ? g.order : Number(g.order || 0),
            enabled: g.enabled !== false,
          }))
          .filter((g) => g.key && g.nameAr && g.enabled);

        const fallback = [
          { key: 'amanat_al_asimah', nameAr: 'أمانة العاصمة', order: 1 },
          { key: 'sanaa', nameAr: 'صنعاء', order: 2 },
          { key: 'aden', nameAr: 'عدن', order: 3 },
          { key: 'taiz', nameAr: 'تعز', order: 4 },
          { key: 'ibb', nameAr: 'إب', order: 5 },
          { key: 'al_hudaydah', nameAr: 'الحديدة', order: 6 },
          { key: 'hadramaut', nameAr: 'حضرموت', order: 7 },
          { key: 'dhamar', nameAr: 'ذمار', order: 8 },
          { key: 'hajjah', nameAr: 'حجة', order: 9 },
          { key: 'amran', nameAr: 'عمران', order: 10 },
          { key: 'marib', nameAr: 'مأرب', order: 11 },
          { key: 'shabwah', nameAr: 'شبوة', order: 12 },
          { key: 'abyan', nameAr: 'أبين', order: 13 },
          { key: 'lahij', nameAr: 'لحج', order: 14 },
          { key: 'al_dhale', nameAr: 'الضالع', order: 15 },
          { key: 'al_bayda', nameAr: 'البيضاء', order: 16 },
          { key: 'al_jawf', nameAr: 'الجوف', order: 17 },
          { key: 'saada', nameAr: 'صعدة', order: 18 },
          { key: 'al_mahwit', nameAr: 'المحويت', order: 19 },
          { key: 'raymah', nameAr: 'ريمة', order: 20 },
          { key: 'al_mahrah', nameAr: 'المهرة', order: 21 },
          { key: 'socotra', nameAr: 'أرخبيل سقطرى', order: 22 },
        ];

        if (!cancelled) setGovOptions(rows.length ? rows : fallback);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setGovOptions([
            { key: 'amanat_al_asimah', nameAr: 'أمانة العاصمة', order: 1 },
            { key: 'sanaa', nameAr: 'صنعاء', order: 2 },
            { key: 'aden', nameAr: 'عدن', order: 3 },
            { key: 'taiz', nameAr: 'تعز', order: 4 },
            { key: 'ibb', nameAr: 'إب', order: 5 },
            { key: 'al_hudaydah', nameAr: 'الحديدة', order: 6 },
            { key: 'hadramaut', nameAr: 'حضرموت', order: 7 },
            { key: 'dhamar', nameAr: 'ذمار', order: 8 },
            { key: 'hajjah', nameAr: 'حجة', order: 9 },
            { key: 'amran', nameAr: 'عمران', order: 10 },
            { key: 'marib', nameAr: 'مأرب', order: 11 },
            { key: 'shabwah', nameAr: 'شبوة', order: 12 },
            { key: 'abyan', nameAr: 'أبين', order: 13 },
            { key: 'lahij', nameAr: 'لحج', order: 14 },
            { key: 'al_dhale', nameAr: 'الضالع', order: 15 },
            { key: 'al_bayda', nameAr: 'البيضاء', order: 16 },
            { key: 'al_jawf', nameAr: 'الجوف', order: 17 },
            { key: 'saada', nameAr: 'صعدة', order: 18 },
            { key: 'al_mahwit', nameAr: 'المحويت', order: 19 },
            { key: 'raymah', nameAr: 'ريمة', order: 20 },
            { key: 'al_mahrah', nameAr: 'المهرة', order: 21 },
            { key: 'socotra', nameAr: 'أرخبيل سقطرى', order: 22 },
          ]);
        }
      } finally {
        if (!cancelled) setGovLoading(false);
      }
    }

    loadGovs();
    return () => {
      cancelled = true;
    };
  }, []);

  const CAT_COLOR = useMemo(() => getCategoryBaseColor(single), [single]);

  const normalizeListing = (d) => {
    const l = {
      id: d?.id || d?._id || d?.docId || d?.uid || d?.listingId,
      ...(d || {}),
    };
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

    if (!cats.length || !single) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      if (!single && cats.length) setErr('إعدادات القسم غير واضحة (أكثر من اسم للقسم).');
      return;
    }

    try {
      let ref = db.collection('listings').where('category', '==', single);
      ref = ref.orderBy('createdAt', 'desc').limit(PAGE_SIZE);

      const snap = await ref.get();
      const data = snap.docs
        .map((d) => normalizeListing({ id: d.id, ...d.data() }))
        .filter(Boolean);

      if (!aliveRef.current) return;

      setItems(data);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      cursorReadyRef.current = true;

      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      const msg = e?.message || 'فشل تحميل إعلانات القسم';
      const isIndex = e?.code === 'failed-precondition' || /index/i.test(msg);
      setErr(
        isIndex
          ? '⚠️ الاستعلام يحتاج إنشاء Index في Firestore. افتح Firestore > Indexes أو اضغط رابط Create index الذي يظهر في Console ثم أعد المحاولة.'
          : msg
      );
      setLoading(false);
      setHasMore(false);
    }
  }

  async function ensureCursorReady() {
    if (cursorReadyRef.current) return;
    if (!single) return;

    try {
      let ref = db.collection('listings').where('category', '==', single);
      ref = ref.orderBy('createdAt', 'desc').limit(PAGE_SIZE);

      const snap = await ref.get();
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      cursorReadyRef.current = true;

      const page1 = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);
      if (!aliveRef.current) return;

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
    if (!hasMore || loadingMore || !single) return;

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

      let ref = db.collection('listings').where('category', '==', single);
      ref = ref.orderBy('createdAt', 'desc').startAfter(lastDoc).limit(PAGE_SIZE);

      const snap = await ref.get();
      const data = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);

      if (!aliveRef.current) return;

      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...data.filter((x) => !existing.has(x.id))];
      });

      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      const msg = e?.message || 'فشل تحميل المزيد';
      const isIndex = e?.code === 'failed-precondition' || /index/i.test(msg);
      setErr(
        isIndex
          ? '⚠️ الاستعلام يحتاج إنشاء Index في Firestore. افتح Firestore > Indexes أو اضغط رابط Create index الذي يظهر في Console ثم أعد المحاولة.'
          : msg
      );
      setLoadingMore(false);
    }
  }

  // ✅ initial SSR vs client fetch
  useEffect(() => {
    if (!govKey && !usedInitialRef.current && Array.isArray(initialListings) && initialListings.length > 0) {
      usedInitialRef.current = true;
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
  }, [single, govKey]);

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
  }, [view, hasMore, loading, loadingMore, single, govKey]);

  // ✅ Taxonomy enrich
  const itemsWithTax = useMemo(() => {
    const catKey = single || '';
    return items
      .map((l) => {
        const nl = normalizeListing(l);
        if (!nl) return null;
        const tax = catKey ? pickTaxonomy(nl, catKey) : { root: catKey };
        return { ...nl, _tax: tax };
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

    // propertyTypes: يعتمد على dealType المختار
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

    // ✅ governorate filter (يدعم الإعلانات القديمة اللي ما فيها govKey)
    const selGov = safeStr(govKey).toLowerCase();
    if (selGov) {
      arr = arr.filter((l) => getListingGovKey(l) === selGov);
    }

    // cars
    if (catKey === 'cars') {
      const selMake = safeStr(carMake);
      const selModel = safeStr(carModel);

      if (selMake) arr = arr.filter((l) => safeStr(l?._tax?.carMake || 'other') === selMake);
      if (selMake && selModel)
        arr = arr.filter((l) => safeStr(l?._tax?.carModel || 'other') === selModel);
    }

    // phones
    if (catKey === 'phones') {
      const sel = safeStr(phoneBrand);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.phoneBrand || 'other') === sel);
    }

    // realestate
    if (catKey === 'realestate') {
      const selDeal = safeStr(dealType);
      const selProp = safeStr(propertyType);
      if (selDeal) arr = arr.filter((l) => safeStr(l?._tax?.dealType) === selDeal);
      if (selProp) arr = arr.filter((l) => safeStr(l?._tax?.propertyType || 'other') === selProp);
    }

    // single facet categories
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

    if (!query) return arr;

    return arr.filter((l) => {
      const title = safeStr(l.title).toLowerCase();
      const city = safeStr(l.city || l.region || l.locationLabel).toLowerCase();
      const desc = safeStr(l.description).toLowerCase();
      return title.includes(query) || city.includes(query) || desc.includes(query);
    });
  }, [
    itemsWithTax,
    single,
    q,
    carMake,
    carModel,
    phoneBrand,
    dealType,
    propertyType,
    electronicsType,
    motorcycleBrand,
    heavyEquipmentType,
    solarType,
    networkType,
    maintenanceType,
    furnitureType,
    homeToolsType,
    clothesType,
    animalType,
    jobType,
    serviceType,
    govKey,
    govNameToKey,
  ]);

  // ====== options for chips ======
  const carMakeOptions = useMemo(() => {
    return presetMergeWithCounts(CAR_MAKES, taxonomyCounts.carMakes).slice(0, 40);
  }, [taxonomyCounts.carMakes]);

  const carModelOptions = useMemo(() => {
    const mk = safeStr(carMake);
    if (!mk) return [];
    const preset = CAR_MODELS_BY_MAKE[mk] || [];
    return presetMergeWithCounts(preset, taxonomyCounts.carModels).slice(0, 80);
  }, [carMake, taxonomyCounts.carModels]);

  const phoneBrandOptions = useMemo(() => {
    return presetMergeWithCounts(PHONE_BRANDS, taxonomyCounts.phoneBrands).slice(0, 40);
  }, [taxonomyCounts.phoneBrands]);

  const dealTypeOptions = useMemo(() => {
    const merged = presetMergeWithCounts(DEAL_TYPES, taxonomyCounts.dealTypes);
    return merged.filter(([k]) => k === 'sale' || k === 'rent');
  }, [taxonomyCounts.dealTypes]);

  const propertyTypeOptions = useMemo(() => {
    return presetMergeWithCounts(PROPERTY_TYPES, taxonomyCounts.propertyTypes).slice(0, 60);
  }, [taxonomyCounts.propertyTypes]);

  const electronicsTypeOptions = useMemo(() => {
    return presetMergeWithCounts(ELECTRONICS_TYPES, taxonomyCounts.electronicsTypes).slice(0, 60);
  }, [taxonomyCounts.electronicsTypes]);

  const motorcycleBrandOptions = useMemo(() => {
    return presetMergeWithCounts(MOTORCYCLE_BRANDS, taxonomyCounts.motorcycleBrands).slice(0, 60);
  }, [taxonomyCounts.motorcycleBrands]);

  const heavyEquipmentTypeOptions = useMemo(() => {
    return presetMergeWithCounts(HEAVY_EQUIPMENT_TYPES, taxonomyCounts.heavyEquipmentTypes).slice(0, 60);
  }, [taxonomyCounts.heavyEquipmentTypes]);

  const solarTypeOptions = useMemo(() => {
    return presetMergeWithCounts(SOLAR_TYPES, taxonomyCounts.solarTypes).slice(0, 60);
  }, [taxonomyCounts.solarTypes]);

  const networkTypeOptions = useMemo(() => {
    return presetMergeWithCounts(NETWORK_TYPES, taxonomyCounts.networkTypes).slice(0, 60);
  }, [taxonomyCounts.networkTypes]);

  const maintenanceTypeOptions = useMemo(() => {
    return presetMergeWithCounts(MAINTENANCE_TYPES, taxonomyCounts.maintenanceTypes).slice(0, 60);
  }, [taxonomyCounts.maintenanceTypes]);

  const furnitureTypeOptions = useMemo(() => {
    return presetMergeWithCounts(FURNITURE_TYPES, taxonomyCounts.furnitureTypes).slice(0, 60);
  }, [taxonomyCounts.furnitureTypes]);

  const homeToolsTypeOptions = useMemo(() => {
    return presetMergeWithCounts(HOME_TOOLS_TYPES, taxonomyCounts.homeToolsTypes).slice(0, 60);
  }, [taxonomyCounts.homeToolsTypes]);

  const clothesTypeOptions = useMemo(() => {
    return presetMergeWithCounts(CLOTHES_TYPES, taxonomyCounts.clothesTypes).slice(0, 60);
  }, [taxonomyCounts.clothesTypes]);

  const animalTypeOptions = useMemo(() => {
    return presetMergeWithCounts(ANIMAL_TYPES, taxonomyCounts.animalTypes).slice(0, 60);
  }, [taxonomyCounts.animalTypes]);

  const jobTypeOptions = useMemo(() => {
    return presetMergeWithCounts(JOB_TYPES, taxonomyCounts.jobTypes).slice(0, 60);
  }, [taxonomyCounts.jobTypes]);

  const serviceTypeOptions = useMemo(() => {
    return presetMergeWithCounts(SERVICE_TYPES, taxonomyCounts.serviceTypes).slice(0, 60);
  }, [taxonomyCounts.serviceTypes]);

  // ====== UI Chips ======
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

  const renderSingleFacet = ({ title, icon, selected, setSelected, options, labelOf, prefix }) => (
    <div className="sooq-taxSection" aria-label={title}>
      <div className="sooq-taxTitle">{title}</div>
      <div className="sooq-chips" role="tablist" aria-label={title}>
        <Chip
          active={!selected}
          onClick={() => setSelected('')}
          text="الكل"
          count={itemsWithTax.length}
          dotColor={CAT_COLOR}
        />
        {options.map(([k, c]) => {
          const label = labelOf(k) || k;
          return (
            <Chip
              key={k}
              active={selected === k}
              onClick={() => setSelected(k)}
              text={label}
              count={c}
              icon={icon}
              dotColor={colorForKey(`${prefix}:${k}`)}
            />
          );
        })}
      </div>
    </div>
  );

  const TaxonomyInner = () => {
    if (!single) return null;

    // cars (make -> model)
    if (single === 'cars') {
      const mk = safeStr(carMake);
      const md = safeStr(carModel);
      const mkLabel = mk ? carMakeLabel(mk) : '';

      if (!mk) {
        return (
          <div className="sooq-taxSection" aria-label="فلترة سيارات">
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
                  text={carMakeLabel(k) || k}
                  count={c}
                  dotColor={colorForKey(`make:${k}`)}
                />
              ))}
            </div>
          </div>
        );
      }

      const modelsTotal = Array.from(taxonomyCounts.carModels.values()).reduce(
        (a, b) => a + Number(b || 0),
        0
      );

      return (
        <div className="sooq-taxSection" aria-label="فلترة موديلات السيارات">
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
              dotColor={CAT_COLOR}
            />

            <Chip
              active={!md}
              onClick={() => setCarModel('')}
              text={`كل موديلات ${mkLabel}`}
              count={modelsTotal || undefined}
              dotColor={colorForKey(`make:${mk}`)}
            />

            {carModelOptions.map(([k, c]) => (
              <Chip
                key={k}
                active={md === k}
                onClick={() => setCarModel(k)}
                text={k === 'other' ? 'أخرى' : carModelLabel(mk, k) || k}
                count={c}
                dotColor={colorForKey(`model:${mk}:${k}`)}
              />
            ))}
          </div>
        </div>
      );
    }

    // phones
    if (single === 'phones') {
      return renderSingleFacet({
        title: '📱 اختر ماركة الجوال',
        icon: '📱',
        selected: phoneBrand,
        setSelected: setPhoneBrand,
        options: phoneBrandOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : phoneBrandLabel(k) || k),
        prefix: 'phone',
      });
    }

    // realestate (deal -> property)
    if (single === 'realestate') {
      const hasDeal = !!safeStr(dealType);
      const visibleDealOptions = hasDeal ? dealTypeOptions.filter(([k]) => k === dealType) : dealTypeOptions;

      const dealDot = (k) => (k === 'sale' ? '#0ea5e9' : k === 'rent' ? '#f59e0b' : CAT_COLOR);

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
              dotColor={CAT_COLOR}
            />

            {visibleDealOptions.map(([k, c]) => (
              <Chip
                key={k}
                active={dealType === k}
                onClick={() => {
                  setDealType(k);
                  setPropertyType('');
                }}
                text={dealTypeLabel(k) || k}
                count={c}
                icon="🏷️"
                dotColor={dealDot(k)}
              />
            ))}
          </div>

          {hasDeal ? (
            <>
              <div className="sooq-taxSub" style={{ marginTop: 10 }}>
                نوع العقار
              </div>
              <div className="sooq-chips" role="tablist" aria-label="نوع العقار">
                <Chip
                  active={!propertyType}
                  onClick={() => setPropertyType('')}
                  text="كل الأنواع"
                  dotColor={CAT_COLOR}
                />
                {propertyTypeOptions.map(([k, c]) => (
                  <Chip
                    key={k}
                    active={propertyType === k}
                    onClick={() => setPropertyType(k)}
                    text={k === 'other' ? 'أخرى' : propertyTypeLabel(k) || k}
                    count={c}
                    icon="🏡"
                    dotColor={colorForKey(`property:${k}`)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      );
    }

    // electronics
    if (single === 'electronics') {
      return renderSingleFacet({
        title: '💻 اختر فئة الإلكترونيات',
        icon: '💻',
        selected: electronicsType,
        setSelected: setElectronicsType,
        options: electronicsTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : electronicsTypeLabel(k) || k),
        prefix: 'electronics',
      });
    }

    // motorcycles
    if (single === 'motorcycles') {
      return renderSingleFacet({
        title: '🏍️ اختر ماركة الدراجة',
        icon: '🏍️',
        selected: motorcycleBrand,
        setSelected: setMotorcycleBrand,
        options: motorcycleBrandOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : motorcycleBrandLabel(k) || k),
        prefix: 'moto',
      });
    }

    // heavy equipment
    if (single === 'heavy_equipment') {
      return renderSingleFacet({
        title: '🏗️ اختر نوع المعدة',
        icon: '🏗️',
        selected: heavyEquipmentType,
        setSelected: setHeavyEquipmentType,
        options: heavyEquipmentTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : heavyEquipmentTypeLabel(k) || k),
        prefix: 'heavy',
      });
    }

    // solar
    if (single === 'solar') {
      return renderSingleFacet({
        title: '☀️ اختر فئة الطاقة الشمسية',
        icon: '☀️',
        selected: solarType,
        setSelected: setSolarType,
        options: solarTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : solarTypeLabel(k) || k),
        prefix: 'solar',
      });
    }

    // networks
    if (single === 'networks') {
      return renderSingleFacet({
        title: '📡 اختر فئة الشبكات',
        icon: '📡',
        selected: networkType,
        setSelected: setNetworkType,
        options: networkTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : networkTypeLabel(k) || k),
        prefix: 'net',
      });
    }

    // maintenance
    if (single === 'maintenance') {
      return renderSingleFacet({
        title: '🛠️ اختر نوع الصيانة',
        icon: '🛠️',
        selected: maintenanceType,
        setSelected: setMaintenanceType,
        options: maintenanceTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : maintenanceTypeLabel(k) || k),
        prefix: 'maint',
      });
    }

    // furniture
    if (single === 'furniture') {
      return renderSingleFacet({
        title: '🛋️ اختر نوع الأثاث',
        icon: '🛋️',
        selected: furnitureType,
        setSelected: setFurnitureType,
        options: furnitureTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : furnitureTypeLabel(k) || k),
        prefix: 'furn',
      });
    }

    // home tools
    if (single === 'home_tools') {
      return renderSingleFacet({
        title: '🏠 اختر نوع الأدوات المنزلية',
        icon: '🏠',
        selected: homeToolsType,
        setSelected: setHomeToolsType,
        options: homeToolsTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : homeToolsTypeLabel(k) || k),
        prefix: 'home',
      });
    }

    // clothes
    if (single === 'clothes') {
      return renderSingleFacet({
        title: '👕 اختر نوع الملابس',
        icon: '👕',
        selected: clothesType,
        setSelected: setClothesType,
        options: clothesTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : clothesTypeLabel(k) || k),
        prefix: 'clothes',
      });
    }

    // animals
    if (single === 'animals') {
      return renderSingleFacet({
        title: '🐑 اختر نوع الحيوانات',
        icon: '🐑',
        selected: animalType,
        setSelected: setAnimalType,
        options: animalTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : animalTypeLabel(k) || k),
        prefix: 'animal',
      });
    }

    // jobs
    if (single === 'jobs') {
      return renderSingleFacet({
        title: '💼 اختر نوع الوظيفة',
        icon: '💼',
        selected: jobType,
        setSelected: setJobType,
        options: jobTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : jobTypeLabel(k) || k),
        prefix: 'job',
      });
    }

    // services
    if (single === 'services') {
      return renderSingleFacet({
        title: '🧰 اختر نوع الخدمة',
        icon: '🧰',
        selected: serviceType,
        setSelected: setServiceType,
        options: serviceTypeOptions,
        labelOf: (k) => (k === 'other' ? 'أخرى' : serviceTypeLabel(k) || k),
        prefix: 'service',
      });
    }

    return null;
  };

  // ====== Popular + Hashtags (مثل حراج) ======
  const categoryLabel = useMemo(() => (single ? getCategoryLabel(single) : ''), [single]);

  const hashtagOptions = useMemo(() => {
    const max = 18;

    let opts = [];
    if (single === 'cars') opts = carMakeOptions;
    else if (single === 'realestate') opts = propertyTypeOptions;
    else if (single === 'phones') opts = phoneBrandOptions;
    else if (single === 'electronics') opts = electronicsTypeOptions;
    else if (single === 'motorcycles') opts = motorcycleBrandOptions;
    else if (single === 'heavy_equipment') opts = heavyEquipmentTypeOptions;
    else if (single === 'solar') opts = solarTypeOptions;
    else if (single === 'networks') opts = networkTypeOptions;
    else if (single === 'maintenance') opts = maintenanceTypeOptions;
    else if (single === 'furniture') opts = furnitureTypeOptions;
    else if (single === 'home_tools') opts = homeToolsTypeOptions;
    else if (single === 'clothes') opts = clothesTypeOptions;
    else if (single === 'animals') opts = animalTypeOptions;
    else if (single === 'jobs') opts = jobTypeOptions;
    else if (single === 'services') opts = serviceTypeOptions;

    const cleaned = (opts || [])
      .filter((o) => Array.isArray(o) && o[0] && o[0] !== 'other')
      .map(([key, count, label]) => ({
        key: String(key),
        label: String(label || key),
        count: Number(count || 0),
      }));

    const hasCounts = cleaned.some((o) => o.count > 0);
    const sorted = hasCounts
      ? [...cleaned].sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), 'ar'))
      : cleaned;

    return sorted.slice(0, max);
  }, [
    single,
    carMakeOptions,
    propertyTypeOptions,
    phoneBrandOptions,
    electronicsTypeOptions,
    motorcycleBrandOptions,
    heavyEquipmentTypeOptions,
    solarTypeOptions,
    networkTypeOptions,
    maintenanceTypeOptions,
    furnitureTypeOptions,
    homeToolsTypeOptions,
    clothesTypeOptions,
    animalTypeOptions,
    jobTypeOptions,
    serviceTypeOptions,
  ]);

  const popularListings = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return [...list]
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(b.views || 0) - Number(a.views || 0) ||
          Number(b.likes || 0) - Number(a.likes || 0)
      )
      .slice(0, 8);
  }, [items]);

  const applyHashtag = (key) => {
    const k = safeStr(key);
    if (!single || !k) return;

    setQ('');

    if (single === 'cars') {
      setCarMake(k === 'all' ? '' : k);
      setCarModel('');
      return;
    }
    if (single === 'realestate') {
      setPropertyType(k === 'all' ? '' : k);
      return;
    }
    if (single === 'phones') {
      setPhoneBrand(k === 'all' ? '' : k);
      return;
    }
    if (single === 'electronics') return setElectronicsType(k === 'all' ? '' : k);
    if (single === 'motorcycles') return setMotorcycleBrand(k === 'all' ? '' : k);
    if (single === 'heavy_equipment') return setHeavyEquipmentType(k === 'all' ? '' : k);
    if (single === 'solar') return setSolarType(k === 'all' ? '' : k);
    if (single === 'networks') return setNetworkType(k === 'all' ? '' : k);
    if (single === 'maintenance') return setMaintenanceType(k === 'all' ? '' : k);
    if (single === 'furniture') return setFurnitureType(k === 'all' ? '' : k);
    if (single === 'home_tools') return setHomeToolsType(k === 'all' ? '' : k);
    if (single === 'clothes') return setClothesType(k === 'all' ? '' : k);
    if (single === 'animals') return setAnimalType(k === 'all' ? '' : k);
    if (single === 'jobs') return setJobType(k === 'all' ? '' : k);
    if (single === 'services') return setServiceType(k === 'all' ? '' : k);
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
        <div className="muted" style={{ marginTop: 6 }}>
          {err}
        </div>
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

            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="muted" style={{ fontWeight: 900 }}>
                المحافظة:
              </span>
              <select
                className="input"
                value={govKey}
                onChange={(e) => setGovKey(e.target.value)}
                style={{ minWidth: 170 }}
              >
                <option value="">{govLoading ? 'جاري التحميل...' : 'الكل'}</option>
                {govOptions.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
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
          <div className="muted" style={{ marginTop: 6 }}>
            جرّب تغيير الفلاتر أو البحث.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/add">
              ➕ أضف إعلان
            </Link>
          </div>
        </div>
      ) : view === 'map' ? (
        <HomeMapView listings={filtered} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(210px, 1fr))' : '1fr',
              gap: 10,
            }}
          >
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} variant={view === 'list' ? 'list' : 'grid'} />
            ))}
          </div>

          <div ref={loadMoreRef} style={{ height: 1 }} />

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {loadingMore ? (
              <div className="muted" style={{ padding: 10 }}>
                ...جاري تحميل المزيد
              </div>
            ) : hasMore ? (
              <div className="muted" style={{ padding: 10 }}>
                انزل لأسفل لتحميل المزيد
              </div>
            ) : (
              <div className="muted" style={{ padding: 10 }}>
                لا يوجد المزيد
              </div>
            )}
          </div>

          {/* ✅ الأكثر رواجًا + وسوم (مثل حراج) */}
          {view !== 'map' && popularListings.length >= 4 ? (
            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>🔥 الإعلانات الأكثر رواجًا</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {popularListings.map((p) => (
                  <ListingCard key={p.id} listing={p} variant="grid" />
                ))}
              </div>
            </div>
          ) : null}

          {view !== 'map' && single && hashtagOptions.length ? (
            <div className="card sooq-hashtagsBox" style={{ padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}># وسوم شائعة في {categoryLabel || 'القسم'}</div>

              <div className="sooq-hashtags">
                {hashtagOptions.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className="sooq-tag"
                    onClick={() => applyHashtag(t.key)}
                    title={`فلترة: ${t.label}`}
                  >
                    <span className="sooq-tagText">#{t.label}</span>
                    <span className="sooq-tagCount">{Number(t.count || 0).toLocaleString('en-US')}</span>
                  </button>
                ))}
              </div>

              <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                تصفح إعلانات {categoryLabel || 'القسم'} في اليمن، واستخدم الوسوم أعلاه للوصول بسرعة إلى الفئات المطلوبة.
              </div>
            </div>
          ) : null}

          {err && items.length > 0 ? (
            <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {err}
              </div>
            </div>
          ) : null}
        </>
      )}

      <style jsx>{`
        /* ====== Filter shell (نفس شكل الخريطة للشبكة/القائمة) ====== */
        .sooq-filterShell {
          margin-bottom: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.1);
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
          border: 1px solid rgba(0, 0, 0, 0.1);
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
          border-color: rgba(0, 0, 0, 0.2);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.1);
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
          .sooq-chips {
            padding: 6px;
          }
          .sooq-chip {
            padding: 8px 9px;
            font-size: 12px;
          }
        }

        .sooq-hashtags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sooq-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 999px;
          padding: 8px 10px;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          font-weight: 800;
          font-size: 13px;
        }
        .sooq-tag:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
        }
        .sooq-tagCount {
          color: #64748b;
          font-weight: 900;
          font-size: 12px;
          border-left: 1px solid #e2e8f0;
          padding-left: 8px;
        }
        .sooq-tagText {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
