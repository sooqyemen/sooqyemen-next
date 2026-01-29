// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebaseClient';
import { normalizeCategoryKey, getCategoryLabel } from '@/lib/categories';
import ListingCard from '@/components/ListingCard';

// ✅ دالة تنسيق الأسعار
function formatPrice(price, currency = 'ريال') {
  if (!price && price !== 0) return 'غير محدد';
  const num = Number(price);
  if (isNaN(num)) return 'غير محدد';
  
  if (num === 0) return 'مجاناً';
  
  if (num < 1000) {
    return `${Math.round(num).toLocaleString('ar-YE')} ${currency}`;
  }
  
  if (num < 1000000) {
    const thousands = num / 1000;
    let formatted;
    
    if (thousands >= 100) {
      formatted = Math.round(thousands);
    } else if (thousands >= 10) {
      formatted = thousands.toFixed(1);
    } else {
      formatted = thousands.toFixed(2);
    }
    
    formatted = formatted.toString().replace(/(\.0*|0+)$/, '');
    return `${formatted} ألف ${currency}`;
  }
  
  const millions = num / 1000000;
  let formatted;
  
  if (millions >= 100) {
    formatted = Math.round(millions);
  } else if (millions >= 10) {
    formatted = millions.toFixed(1);
  } else {
    formatted = millions.toFixed(2);
  }
  
  formatted = formatted.toString().replace(/(\.0*|0+)$/, '');
  return `${formatted} مليون ${currency}`;
}

// ✅ دالة تنسيق التاريخ
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('ar-YE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

// ✅ Taxonomy (الفروع الهرمية)
import {
  inferListingTaxonomy,
  CAR_MAKES,
  CAR_MODELS_BY_MAKE,
  carMakeLabel,
  carModelLabel,
  PHONE_BRANDS,
  phoneBrandLabel,
  DEAL_TYPES,
  PROPERTY_TYPES,
  dealTypeLabel,
  propertyTypeLabel,
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

// ✅ خيارات الترتيب
const SORT_OPTIONS = [
  { key: 'newest', label: 'الأحدث', icon: '🕒' },
  { key: 'price_low', label: 'الأقل سعراً', icon: '💰' },
  { key: 'price_high', label: 'الأعلى سعراً', icon: '💰' },
  { key: 'most_viewed', label: 'الأكثر مشاهدة', icon: '👁️' },
  { key: 'featured', label: 'المميز أولاً', icon: '⭐' }
];

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

  for (const p of Array.isArray(preset) ? preset : []) {
    const k = safeStr(p?.key);
    if (!k) continue;
    used.add(k);
    const c = safeMap.get(k) || 0;
    const label = safeStr(p?.label) || k;
    const color = p?.color;
    out.push([k, c, label, color]);
  }

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
    carMake: inferred.carMake || safeStr(listing?.carMake) || '',
    carModel: inferred.carModel || safeStr(listing?.carModel) || '',
    phoneBrand: inferred.phoneBrand || safeStr(listing?.phoneBrand) || '',
    dealType: inferred.dealType || safeStr(listing?.dealType) || '',
    propertyType: inferred.propertyType || safeStr(listing?.propertyType) || '',
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
    } else {
      out.carModel = '';
    }
  }

  if (root === 'phones') {
    out.phoneBrand = out.phoneBrand || 'other';
  }

  if (root === 'realestate') {
    const v =
      listing?.electronicsType ??
      listing?.electronics ??
      listing?.electronicType ??
      listing?.type ??
      '';
    out.electronicsType = normalizeElectronicsType(v) || detectElectronicsTypeFromText(text) || 'other';
  }

  if (root === 'motorcycles') {
    const v =
      listing?.motorcycleBrand ??
      listing?.bikeBrand ??
      listing?.brand ??
      '';
    out.motorcycleBrand = normalizeMotorcycleBrand(v) || detectMotorcycleBrandFromText(text) || 'other';
  }

  if (root === 'heavy_equipment') {
    const v =
      listing?.heavyEquipmentType ??
      listing?.equipmentType ??
      listing?.type ??
      '';
    out.heavyEquipmentType = normalizeHeavyEquipmentType(v) || detectHeavyEquipmentTypeFromText(text) || 'other';
  }

  if (root === 'solar') {
    const v =
      listing?.solarType ??
      listing?.type ??
      '';
    out.solarType = normalizeSolarType(v) || detectSolarTypeFromText(text) || 'other';
  }

  if (root === 'networks') {
    const v =
      listing?.networkType ??
      listing?.type ??
      '';
    out.networkType = normalizeNetworkType(v) || detectNetworkTypeFromText(text) || 'other';
  }

  if (root === 'maintenance') {
    const v =
      listing?.maintenanceType ??
      listing?.type ??
      '';
    out.maintenanceType = normalizeMaintenanceType(v) || detectMaintenanceTypeFromText(text) || 'other';
  }

  if (root === 'furniture') {
    const v =
      listing?.furnitureType ??
      listing?.type ??
      '';
    out.furnitureType = normalizeFurnitureType(v) || detectFurnitureTypeFromText(text) || 'other';
  }

  if (root === 'home_tools') {
    const v =
      listing?.homeToolsType ??
      listing?.home_tools_type ??
      listing?.type ??
      '';
    out.homeToolsType = normalizeHomeToolsType(v) || detectHomeToolsTypeFromText(text) || 'other';
  }

  if (root === 'clothes') {
    const v =
      listing?.clothesType ??
      listing?.type ??
      '';
    out.clothesType = normalizeClothesType(v) || detectClothesTypeFromText(text) || 'other';
  }

  if (root === 'animals') {
    const v =
      listing?.animalType ??
      listing?.type ??
      '';
    out.animalType = normalizeAnimalType(v) || detectAnimalTypeFromText(text) || 'other';
  }

  if (root === 'jobs') {
    const v =
      listing?.jobType ??
      listing?.type ??
      '';
    out.jobType = normalizeJobType(v) || detectJobTypeFromText(text) || 'other';
  }

  if (root === 'services') {
    const v =
      listing?.serviceType ??
      listing?.type ??
      '';
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


const CATEGORY_SEO = {
  cars: {
    icon: '🚗',
    description: 'إعلانات السيارات في اليمن: بيع وشراء وتمويل وتقسيط. فلترة حسب الماركة، الموديل، المدينة والسعر.',
  },
  realestate: {
    icon: '🏠',
    description: 'عقارات للبيع والإيجار في اليمن: شقق، أراضي، فلل ومحلات. فلترة حسب المدينة ونوع العقار والسعر.',
  },
  phones: {
    icon: '📱',
    description: 'هواتف للبيع والشراء في اليمن: آيفون، سامسونج وغيرها. فلترة حسب الشركة، الحالة والسعر.',
  },
  electronics: {
    icon: '💻',
    description: 'إلكترونيات للبيع والشراء في اليمن: لابتوبات، شاشات، أجهزة منزلية وغيرها. فلترة حسب النوع والسعر.',
  },
  motorcycles: {
    icon: '🏍️',
    description: 'دراجات نارية للبيع والشراء في اليمن. فلترة حسب الماركة، الموديل، المدينة والسعر.',
  },
  heavy_equipment: {
    icon: '🚜',
    description: 'معدات ثقيلة للبيع والشراء في اليمن: حفارات، شيولات، رافعات وغيرها. فلترة حسب النوع والمدينة والسعر.',
  },
  solar: {
    icon: '☀️',
    description: 'قسم الطاقة الشمسية في اليمن: ألواح، بطاريات، إنفرترات وملحقات. فلترة حسب النوع والسعر.',
  },
  networks: {
    icon: '📡',
    description: 'شبكات وإنترنت في اليمن: راوترات، مقويات، أجهزة بث وملحقات. فلترة حسب النوع والسعر.',
  },
  maintenance: {
    icon: '🛠️',
    description: 'خدمات الصيانة في اليمن: كهرباء، سباكة، تكييف وغيرها. فلترة حسب نوع الخدمة والمدينة.',
  },
  furniture: {
    icon: '🛋️',
    description: 'أثاث منزلي ومكتبي في اليمن: غرف نوم، مجالس، مطابخ وغيرها. فلترة حسب النوع والسعر.',
  },
  home_tools: {
    icon: '🧰',
    description: 'أدوات منزلية ومتنوعة للبيع في اليمن. فلترة حسب النوع والسعر.',
  },
  clothes: {
    icon: '👕',
    description: 'ملابس وإكسسوارات للبيع في اليمن: رجالي/نسائي/أطفال. فلترة حسب النوع والسعر.',
  },
  animals: {
    icon: '🐑',
    description: 'مواشي وحيوانات للبيع والشراء في اليمن. فلترة حسب النوع والمدينة والسعر.',
  },
  jobs: {
    icon: '💼',
    description: 'وظائف في اليمن: فرص عمل وإعلانات توظيف. فلترة حسب المجال والمدينة.',
  },
  services: {
    icon: '🧾',
    description: 'خدمات متنوعة في اليمن: نقل، تعليم، تصميم وغيرها. فلترة حسب نوع الخدمة والمدينة.',
  },
};

function getCategorySeo(root) {
  return CATEGORY_SEO[root] || {
    icon: '🛒',
    description: 'تصفّح أحدث الإعلانات في سوق اليمن مع فلترة حسب المدينة والسعر والتفاصيل.',
  };
}


export default function CategoryListings({ category, initialListings = [] }) {
  const PAGE_SIZE = 24;

  const [view, setView] = useState('grid');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const searchParams = useSearchParams();

  const [items, setItems] = useState(() => (Array.isArray(initialListings) ? initialListings : []));
  const [loading, setLoading] = useState(() =>
    Array.isArray(initialListings) ? initialListings.length === 0 : true
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef(null);
  const cursorReadyRef = useRef(false);
  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);
  const usedInitialRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ detect mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // ✅ lock body scroll when sheet open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobile && showFilters) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
  }, [isMobile, showFilters]);

  useEffect(() => {
    const qp = safeStr(searchParams?.get('q'));
    if (!qp) return;
    setQ((prev) => (safeStr(prev) === qp ? prev : qp));
  }, [searchParams]);

  const catsRaw = Array.isArray(category) ? category : [category];
  const cats = catsRaw.map(normalizeCategoryKey).filter(Boolean);
  const single = cats.length === 1 ? cats[0] : '';

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
  const [govKey, setGovKey] = useState('');
  const [govOptions, setGovOptions] = useState([]);
  const [govLoading, setGovLoading] = useState(false);

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
    const raw = safeStr(l?.govKey || l?.governorateKey || l?.governorate || l?.gov);
    if (raw) return raw.toLowerCase();

    const cityName = safeStr(l?.city);
    const cityLower = cityName.toLowerCase();
    if (!cityLower) return '';

    const mapped = govNameToKey.get(cityLower);
    if (mapped) return mapped.toLowerCase();

    if (/^[a-z0-9_]+$/.test(cityLower)) return cityLower;

    return '';
  };

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
    setPriceRange({ min: '', max: '' });
    usedInitialRef.current = false;
  }, [single]);

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

        const finalRows = rows.length
          ? rows
          : [
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
              { key: 'socotra', nameAr: 'أرخبيل سقطرى', order: 22 }
            ];

        if (!cancelled) setGovOptions(finalRows);
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
            { key: 'socotra', nameAr: 'أرخبيل سقطرى', order: 22 }
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
    
    // تنسيق السعر للعرض
    if (l.price !== undefined) {
      l.formattedPrice = formatPrice(l.price);
    }
    
    // تنسيق التاريخ
    if (l.createdAt) {
      l.formattedDate = formatDate(l.createdAt);
    }
    
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
      let ref = db
        .collection('listings')
        .where('category', '==', single);
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
      const isIndex = (e?.code === 'failed-precondition') || /index/i.test(msg);
      setErr(isIndex ? '⚠️ الاستعلام يحتاج إنشاء Index في Firestore. افتح Firestore > Indexes أو اضغط رابط Create index الذي يظهر في Console ثم أعد المحاولة.' : msg);
      setLoading(false);
      setHasMore(false);
    }
  }

  async function ensureCursorReady() {
    if (cursorReadyRef.current) return;
    if (!single) return;

    try {
      let ref = db
        .collection('listings')
        .where('category', '==', single);
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

      let ref = db
        .collection('listings')
        .where('category', '==', single);
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
      const isIndex = (e?.code === 'failed-precondition') || /index/i.test(msg);
      setErr(isIndex ? '⚠️ الاستعلام يحتاج إنشاء Index في Firestore. افتح Firestore > Indexes أو اضغط رابط Create index الذي يظهر في Console ثم أعد المحاولة.' : msg);
      setLoadingMore(false);
    }
  }

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
  }, [single, govKey]);

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
  }, [view, hasMore, loading, loadingMore, single, govKey]);

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

  // فلتر حسب المحافظة ونطاق السعر
  const filtered = useMemo(() => {
    const catKey = single || '';
    const query = safeStr(q).toLowerCase();
    let arr = itemsWithTax;
    
    const selGov = safeStr(govKey).toLowerCase();
    if (selGov) {
      arr = arr.filter((l) => getListingGovKey(l) === selGov);
    }
    
    if (catKey === 'cars') {
      const selMake = safeStr(carMake);
      const selModel = safeStr(carModel);
      if (selMake) arr = arr.filter((l) => safeStr(l?._tax?.carMake || 'other') === selMake);
      if (selMake && selModel) arr = arr.filter((l) => safeStr(l?._tax?.carModel || 'other') === selModel);
    }
    
    if (catKey === 'phones') {
      const sel = safeStr(phoneBrand);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.phoneBrand || 'other') === sel);
    }
    
    if (catKey === 'realestate') {
      const selDeal = safeStr(dealType);
      const selProp = safeStr(propertyType);
      if (selDeal) arr = arr.filter((l) => safeStr(l?._tax?.dealType) === selDeal);
      if (selProp) arr = arr.filter((l) => safeStr(l?._tax?.propertyType || 'other') === selProp);
    }
    
    const singleFacetFilters = [
      { cat: 'electronics', state: electronicsType, key: 'electronicsType' },
      { cat: 'motorcycles', state: motorcycleBrand, key: 'motorcycleBrand' },
      { cat: 'heavy_equipment', state: heavyEquipmentType, key: 'heavyEquipmentType' },
      { cat: 'solar', state: solarType, key: 'solarType' },
      { cat: 'networks', state: networkType, key: 'networkType' },
      { cat: 'maintenance', state: maintenanceType, key: 'maintenanceType' },
      { cat: 'furniture', state: furnitureType, key: 'furnitureType' },
      { cat: 'home_tools', state: homeToolsType, key: 'homeToolsType' },
      { cat: 'clothes', state: clothesType, key: 'clothesType' },
      { cat: 'animals', state: animalType, key: 'animalType' },
      { cat: 'jobs', state: jobType, key: 'jobType' },
      { cat: 'services', state: serviceType, key: 'serviceType' },
    ];
    
    singleFacetFilters.forEach(({ cat, state, key }) => {
      if (catKey === cat && state) {
        arr = arr.filter((l) => safeStr(l?._tax?.[key] || 'other') === state);
      }
    });
    
    // فلتر نطاق السعر
    if (priceRange.min !== '') {
      const min = Number(priceRange.min);
      if (!isNaN(min)) {
        arr = arr.filter(item => (item.price || 0) >= min);
      }
    }
    
    if (priceRange.max !== '') {
      const max = Number(priceRange.max);
      if (!isNaN(max)) {
        arr = arr.filter(item => (item.price || 0) <= max);
      }
    }
    
    if (!query) return arr;
    
    return arr.filter((l) => {
      const title = safeStr(l.title).toLowerCase();
      const city = safeStr(l.city || l.region || l.locationLabel).toLowerCase();
      const desc = safeStr(l.description).toLowerCase();
      return title.includes(query) || city.includes(query) || desc.includes(query);
    });
  }, [
    itemsWithTax, single, q, carMake, carModel, phoneBrand, dealType, propertyType,
    electronicsType, motorcycleBrand, heavyEquipmentType, solarType, networkType,
    maintenanceType, furnitureType, homeToolsType, clothesType, animalType, jobType,
    serviceType, govKey, priceRange
  ]);

  // الترتيب
  const sortedListings = useMemo(() => {
    const list = [...filtered];
    
    switch (sortBy) {
      case 'price_low':
        return list.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return list.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'most_viewed':
        return list.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'featured':
        return list.sort((a, b) => 
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
          (b.views || 0) - (a.views || 0)
        );
      case 'newest':
      default:
        return list.sort((a, b) => 
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
    }
  }, [filtered, sortBy]);

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
      {icon ? <span className="sooq-chipIcon" aria-hidden="true">{icon}</span> : null}
      <span className="sooq-chipText">{text}</span>
      {typeof count === 'number' ? <span className="sooq-chipCount">{count}</span> : null}
    </button>
  );

  const resetAllFilters = () => {
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
    setPriceRange({ min: '', max: '' });
    setQ('');
  };

  const TaxonomySection = () => {
    if (!single) return null;

    if (single === 'cars') {
      const mk = safeStr(carMake);
      const md = safeStr(carModel);
      const mkLabel = mk ? carMakeLabel(mk) : '';

      return (
        <>
          <div style={{ marginBottom: '16px' }}>
            <div className="mLabel" style={{ marginBottom: '8px' }}>🚗 ماركة السيارة</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className={`mBtn ${!carMake ? 'active' : ''}`}
                onClick={() => {
                  setCarMake('');
                  setCarModel('');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: !carMake ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                  background: !carMake ? 'var(--accent, #CE1126)' : 'white',
                  color: !carMake ? 'white' : '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                الكل
              </button>
              {carMakeOptions.map(([k, c]) => (
                <button
                  key={k}
                  type="button"
                  className={`mBtn ${carMake === k ? 'active' : ''}`}
                  onClick={() => {
                    setCarMake(k);
                    setCarModel('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: carMake === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                    background: carMake === k ? 'var(--accent, #CE1126)' : 'white',
                    color: carMake === k ? 'white' : '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {carMakeLabel(k) || k} {c > 0 ? `(${c})` : ''}
                </button>
              ))}
            </div>
          </div>

          {mk && (
            <div style={{ marginBottom: '16px' }}>
              <div className="mLabel" style={{ marginBottom: '8px' }}>🚗 موديل {mkLabel}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className={`mBtn ${!carModel ? 'active' : ''}`}
                  onClick={() => setCarModel('')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: !carModel ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                    background: !carModel ? 'var(--accent, #CE1126)' : 'white',
                    color: !carModel ? 'white' : '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  كل الموديلات
                </button>
                {carModelOptions.map(([k, c]) => (
                  <button
                    key={k}
                    type="button"
                    className={`mBtn ${carModel === k ? 'active' : ''}`}
                    onClick={() => setCarModel(k)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: carModel === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                      background: carModel === k ? 'var(--accent, #CE1126)' : 'white',
                      color: carModel === k ? 'white' : '#475569',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {k === 'other' ? 'أخرى' : (carModelLabel(mk, k) || k)} {c > 0 ? `(${c})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    if (single === 'phones') {
      return (
        <div style={{ marginBottom: '16px' }}>
          <div className="mLabel" style={{ marginBottom: '8px' }}>📱 ماركة الجوال</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className={`mBtn ${!phoneBrand ? 'active' : ''}`}
              onClick={() => setPhoneBrand('')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: !phoneBrand ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                background: !phoneBrand ? 'var(--accent, #CE1126)' : 'white',
                color: !phoneBrand ? 'white' : '#475569',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              الكل
            </button>
            {phoneBrandOptions.map(([k, c]) => (
              <button
                key={k}
                type="button"
                className={`mBtn ${phoneBrand === k ? 'active' : ''}`}
                onClick={() => setPhoneBrand(k)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: phoneBrand === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                  background: phoneBrand === k ? 'var(--accent, #CE1126)' : 'white',
                  color: phoneBrand === k ? 'white' : '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {k === 'other' ? 'أخرى' : (phoneBrandLabel(k) || k)} {c > 0 ? `(${c})` : ''}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (single === 'realestate') {
      return (
        <>
          <div style={{ marginBottom: '16px' }}>
            <div className="mLabel" style={{ marginBottom: '8px' }}>🏡 نوع العملية</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className={`mBtn ${!dealType ? 'active' : ''}`}
                onClick={() => {
                  setDealType('');
                  setPropertyType('');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: !dealType ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                  background: !dealType ? 'var(--accent, #CE1126)' : 'white',
                  color: !dealType ? 'white' : '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                الكل
              </button>
              {dealTypeOptions.map(([k, c]) => (
                <button
                  key={k}
                  type="button"
                  className={`mBtn ${dealType === k ? 'active' : ''}`}
                  onClick={() => {
                    setDealType(k);
                    setPropertyType('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: dealType === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                    background: dealType === k ? 'var(--accent, #CE1126)' : 'white',
                    color: dealType === k ? 'white' : '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {dealTypeLabel(k) || k} {c > 0 ? `(${c})` : ''}
                </button>
              ))}
            </div>
          </div>

          {dealType && (
            <div style={{ marginBottom: '16px' }}>
              <div className="mLabel" style={{ marginBottom: '8px' }}>🏡 نوع العقار</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className={`mBtn ${!propertyType ? 'active' : ''}`}
                  onClick={() => setPropertyType('')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: !propertyType ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                    background: !propertyType ? 'var(--accent, #CE1126)' : 'white',
                    color: !propertyType ? 'white' : '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  كل الأنواع
                </button>
                {propertyTypeOptions.map(([k, c]) => (
                  <button
                    key={k}
                    type="button"
                    className={`mBtn ${propertyType === k ? 'active' : ''}`}
                    onClick={() => setPropertyType(k)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: propertyType === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                      background: propertyType === k ? 'var(--accent, #CE1126)' : 'white',
                      color: propertyType === k ? 'white' : '#475569',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {k === 'other' ? 'أخرى' : (propertyTypeLabel(k) || k)} {c > 0 ? `(${c})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    const renderSingleCategory = (title, icon, state, setState, options, labelFn) => (
      <div style={{ marginBottom: '16px' }}>
        <div className="mLabel" style={{ marginBottom: '8px' }}>{icon} {title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className={`mBtn ${!state ? 'active' : ''}`}
            onClick={() => setState('')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: !state ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
              background: !state ? 'var(--accent, #CE1126)' : 'white',
              color: !state ? 'white' : '#475569',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            الكل
          </button>
          {options.map(([k, c]) => (
            <button
              key={k}
              type="button"
              className={`mBtn ${state === k ? 'active' : ''}`}
              onClick={() => setState(k)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: state === k ? '1px solid var(--accent, #CE1126)' : '1px solid #e2e8f0',
                background: state === k ? 'var(--accent, #CE1126)' : 'white',
                color: state === k ? 'white' : '#475569',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {labelFn ? labelFn(k) : k} {c > 0 ? `(${c})` : ''}
            </button>
          ))}
        </div>
      </div>
    );

    if (single === 'electronics') {
      return renderSingleCategory(
        'فئة الإلكترونيات',
        '💻',
        electronicsType,
        setElectronicsType,
        electronicsTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (electronicsTypeLabel(k) || k)
      );
    }

    if (single === 'motorcycles') {
      return renderSingleCategory(
        'ماركة الدراجة',
        '🏍️',
        motorcycleBrand,
        setMotorcycleBrand,
        motorcycleBrandOptions,
        (k) => k === 'other' ? 'أخرى' : (motorcycleBrandLabel(k) || k)
      );
    }

    if (single === 'heavy_equipment') {
      return renderSingleCategory(
        'نوع المعدة',
        '🏗️',
        heavyEquipmentType,
        setHeavyEquipmentType,
        heavyEquipmentTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (heavyEquipmentTypeLabel(k) || k)
      );
    }

    if (single === 'solar') {
      return renderSingleCategory(
        'فئة الطاقة الشمسية',
        '☀️',
        solarType,
        setSolarType,
        solarTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (solarTypeLabel(k) || k)
      );
    }

    if (single === 'networks') {
      return renderSingleCategory(
        'فئة الشبكات',
        '📡',
        networkType,
        setNetworkType,
        networkTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (networkTypeLabel(k) || k)
      );
    }

    if (single === 'maintenance') {
      return renderSingleCategory(
        'نوع الصيانة',
        '🛠️',
        maintenanceType,
        setMaintenanceType,
        maintenanceTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (maintenanceTypeLabel(k) || k)
      );
    }

    if (single === 'furniture') {
      return renderSingleCategory(
        'نوع الأثاث',
        '🛋️',
        furnitureType,
        setFurnitureType,
        furnitureTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (furnitureTypeLabel(k) || k)
      );
    }

    if (single === 'home_tools') {
      return renderSingleCategory(
        'نوع الأدوات المنزلية',
        '🏠',
        homeToolsType,
        setHomeToolsType,
        homeToolsTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (homeToolsTypeLabel(k) || k)
      );
    }

    if (single === 'clothes') {
      return renderSingleCategory(
        'نوع الملابس',
        '👕',
        clothesType,
        setClothesType,
        clothesTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (clothesTypeLabel(k) || k)
      );
    }

    if (single === 'animals') {
      return renderSingleCategory(
        'نوع الحيوانات',
        '🐑',
        animalType,
        setAnimalType,
        animalTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (animalTypeLabel(k) || k)
      );
    }

    if (single === 'jobs') {
      return renderSingleCategory(
        'نوع الوظيفة',
        '💼',
        jobType,
        setJobType,
        jobTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (jobTypeLabel(k) || k)
      );
    }

    if (single === 'services') {
      return renderSingleCategory(
        'نوع الخدمة',
        '🧰',
        serviceType,
        setServiceType,
        serviceTypeOptions,
        (k) => k === 'other' ? 'أخرى' : (serviceTypeLabel(k) || k)
      );
    }

    return null;
  };

  const categoryLabel = useMemo(() => (single ? getCategoryLabel(single) : ''), [single]);
  const catSeo = useMemo(() => getCategorySeo(single), [single]);

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          background: 'var(--surface, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border, #e2e8f0)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f1f5f9',
            borderTopColor: 'var(--accent, #CE1126)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px',
          }}
        />
        <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '8px', color: 'var(--text, #1e293b)' }}>
          جاري تحميل إعلانات القسم...
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted, #64748b)' }}>
          {initialListings.length > 0 ? 'جاري تحديث القائمة' : 'جاري تحميل الإعلانات'}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (err && items.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '24px',
          border: '1px solid rgba(220,38,38,0.2)',
          background: '#fef2f2',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontWeight: '900', fontSize: '18px', color: '#991b1b', marginBottom: '8px' }}>حدث خطأ</div>
        <div style={{ fontSize: '15px', color: 'var(--muted, #64748b)', marginBottom: '16px' }}>{err}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--accent, #CE1126)',
            color: 'white',
            fontWeight: '900',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          🔄 إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        {/* العنوان الرئيسي */}
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '16px',
            background: `linear-gradient(135deg, #0b1a2a 0%, ${CAT_COLOR} 100%)`,
            color: 'white',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 18px 45px rgba(2,6,23,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* خط هوية خفيف */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: '#d11f2b',
              opacity: 0.95,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div
              aria-hidden="true"
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)',
              }}
            >
              {catSeo?.icon || '🛒'}
            </div>

            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <h1 style={{ fontWeight: 950, fontSize: '24px', margin: 0, lineHeight: 1.1 }}>
                {categoryLabel || 'قسم'}
              </h1>
              <div style={{ fontSize: '14px', opacity: 0.92, marginTop: 6 }}>
                {catSeo?.description}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            تصفّح {items.length.toLocaleString('ar-YE')} إعلان مع بحث وعرض شبكة/قائمة/خريطة
          </div>
        </div>

        {/* شريط الأدوات */}
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '20px',
            borderRadius: '14px',
            border: '1px solid var(--border, #e2e8f0)',
            background: 'var(--surface, #fff)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ✅ Views row */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  background: 'var(--soft-bg, #f8fafc)',
                  padding: '6px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #e2e8f0)',
                  flex: 1,
                  minWidth: 220,
                }}
              >
                <button
                  className={`view-btn ${view === 'grid' ? 'active' : ''}`}
                  onClick={() => setView('grid')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'grid' ? 'var(--accent, #CE1126)' : 'transparent',
                    color: view === 'grid' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">◼️</span>
                  <span className="vLabel">شبكة</span>
                </button>

                <button
                  className={`view-btn ${view === 'list' ? 'active' : ''}`}
                  onClick={() => setView('list')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'list' ? 'var(--accent, #CE1126)' : 'transparent',
                    color: view === 'list' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">☰</span>
                  <span className="vLabel">قائمة</span>
                </button>

                <button
                  className={`view-btn ${view === 'map' ? 'active' : ''}`}
                  onClick={() => setView('map')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'map' ? 'var(--accent, #CE1126)' : 'transparent',
                    color: view === 'map' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">🗺️</span>
                  <span className="vLabel">خريطة</span>
                </button>
              </div>

              <button
                className="filters-btn"
                onClick={() => setShowFilters(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--surface, #fff)',
                  color: 'var(--muted, #475569)',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  minWidth: 140,
                }}
              >
                ⚙️ ترتيب/فلاتر
              </button>
            </div>

            {/* Search */}
            <div style={{ width: '100%', position: 'relative' }}>
              <input
                className="search-input"
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #e2e8f0)',
                  fontSize: '15px',
                  background: 'var(--soft-bg, #f8fafc)',
                  transition: 'all 0.2s ease',
                }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="🔍 ابحث في العناوين، الوصف، أو المدينة..."
              />
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  opacity: 0.6,
                }}
              >
                🔍
              </div>
            </div>

            {/* Count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '14px', color: 'var(--muted, #64748b)' }}>
                <span style={{ fontWeight: '900', color: 'var(--accent, #CE1126)' }}>
                  {sortedListings.length.toLocaleString('ar-YE')}
                </span>{' '}
                إعلان متاح
              </div>

              <div style={{ fontSize: '13px', color: 'var(--muted, #64748b)' }}>
                {q && (
                  <span>
                    نتائج البحث عن: "<strong>{q}</strong>"
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Mobile/All Bottom Sheet */}
        {showFilters && (
          <div className="mSheetWrap" role="dialog" aria-modal="true" aria-label="ترتيب/فلاتر">
            <div className="mSheetBackdrop" onClick={() => setShowFilters(false)} />
            <div className="mSheet">
              <div className="mSheetHeader">
                <div style={{ fontWeight: 1000, fontSize: 16 }}>⚙️ ترتيب وفلاتر القسم</div>
                <button className="mSheetClose" onClick={() => setShowFilters(false)} aria-label="إغلاق">
                  ✕
                </button>
              </div>

              <div className="mSheetBody">
                <div style={{ marginBottom: '16px' }}>
                  <div className="mLabel" style={{ marginBottom: '8px' }}>المحافظة</div>
                  <select
                    className="mSelect"
                    value={govKey}
                    onChange={(e) => setGovKey(e.target.value)}
                  >
                    <option value="">{govLoading ? 'جاري التحميل...' : 'الكل'}</option>
                    {govOptions.map((g) => (
                      <option key={g.key} value={g.key}>{g.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="mLabel" style={{ marginBottom: '8px' }}>ترتيب حسب</div>
                  <select className="mSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="mLabel" style={{ marginBottom: '8px' }}>نطاق السعر (ريال يمني)</div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      className="mSelect"
                      placeholder="الحد الأدنى"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      className="mSelect"
                      placeholder="الحد الأقصى"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <TaxonomySection />

                <div className="mActions">
                  <button className="mBtn" onClick={resetAllFilters}>
                    🗑️ مسح الكل
                  </button>
                  <button className="mBtnPrimary" onClick={() => setShowFilters(false)}>
                    ✅ تطبيق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* المحتوى */}
        {sortedListings.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--surface, #fff)',
              borderRadius: '12px',
              border: '1px solid var(--border, #e2e8f0)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontWeight: '900', fontSize: '18px', marginBottom: '8px' }}>لا توجد نتائج مطابقة</div>
            <div style={{ fontSize: '15px', color: 'var(--muted, #64748b)', marginBottom: '24px', maxWidth: 400, margin: '0 auto 24px' }}>
              {q ? `لم نعثر على إعلانات تطابق "${q}"` : 'لا توجد إعلانات متاحة حالياً'}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setQ('')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--surface, #fff)',
                  color: 'var(--muted, #475569)',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🗑️ مسح البحث
              </button>
              <Link
                href="/add"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent, #CE1126)',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                ➕ أضف إعلان جديد
              </Link>
            </div>
          </div>
        ) : view === 'map' ? (
          <HomeMapView listings={sortedListings} />
        ) : view === 'list' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedListings.map((l) => (
                <ListingCard key={l.id} listing={l} variant="list" />
              ))}
            </div>
            <div ref={loadMoreRef} style={{ height: '1px', margin: '20px 0' }} />
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {sortedListings.map((l) => (
                <ListingCard key={l.id} listing={l} variant="grid" />
              ))}
            </div>
            <div ref={loadMoreRef} style={{ height: '1px', margin: '20px 0' }} />
          </>
        )}
      </div>

      <style jsx>{`
        /* ====== الأنماط الأساسية ====== */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .card {
          background: var(--surface, #fff);
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          overflow: hidden;
        }

        /* ====== الهاشتاقات ====== */
        .sooq-hashtagsBox {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 12px;
        }

        .sooq-hashtags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sooq-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border, #cbd5e1);
          background: var(--surface, #fff);
          border-radius: 20px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 900;
          font-size: 14px;
        }
        .sooq-tag:hover {
          border-color: var(--accent, #CE1126);
          background: rgba(59,130,246,0.08);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .sooq-tagCount {
          color: #64748b;
          font-weight: 900;
          font-size: 12px;
          padding-left: 8px;
          border-left: 1px solid #e2e8f0;
        }
        .sooq-tagText {
          white-space: nowrap;
        }

        /* ====== Bottom Sheet ====== */
        .mSheetWrap {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .mSheetBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
        }
        .mSheet {
          position: relative;
          width: 100%;
          max-width: 520px;
          background: #fff;
          border-top-left-radius: 18px;
          border-top-right-radius: 18px;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
          padding: 14px 14px 18px;
          max-height: 85vh;
          overflow-y: auto;
        }
        .mSheetHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
        }
        .mSheetClose {
          border: 1px solid var(--border, #e2e8f0);
          background: #fff;
          border-radius: 10px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 800;
          color: #334155;
        }
        .mSheetBody {
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mLabel {
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          margin-bottom: 6px;
        }
        .mSelect {
          width: 100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          background: #fff;
          font-size: 15px;
        }
        .mActions {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .mBtn {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border, #e2e8f0);
          background: #fff;
          color: #334155;
          font-weight: 900;
          cursor: pointer;
        }
        .mBtnPrimary {
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: var(--accent, #CE1126);
          color: #fff;
          font-weight: 1000;
          cursor: pointer;
        }

        /* ====== تحسينات للجوال ====== */
        @media (max-width: 768px) {
          .container {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          
          .mSheetBody {
            padding-top: 10px;
          }
          
          .mBtn, .mBtnPrimary {
            padding: 10px;
          }
        }

        @media (max-width: 640px) {
          .view-btn {
            padding: 8px 10px !important;
            font-size: 13px !important;
            min-width: 0 !important;
          }
          .view-btn .vLabel {
            display: none !important;
          }
          .view-btn .vIcon {
            font-size: 16px;
          }

          .filters-btn {
            width: 100%;
            justify-content: center;
          }
        }
      

        /* ====== Dark mode fixes (scoped) ====== */
        @media (prefers-color-scheme: dark) {
          .card {
            background: var(--surface, #0b1220);
            border-color: var(--border, rgba(148, 163, 184, 0.18));
          }

          .sooq-hashtagsBox {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%);
            border-color: rgba(148, 163, 184, 0.22);
          }

          .sooq-tag {
            background: var(--surface, #0b1220);
            border-color: rgba(148, 163, 184, 0.22);
            color: var(--text, #f8fafc);
          }
          .sooq-tag:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: var(--accent, #CE1126);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          }
          .sooq-tagCount {
            color: var(--muted, #cbd5e1);
            border-left-color: rgba(148, 163, 184, 0.22);
          }

          .mSheetBackdrop {
            background: rgba(0, 0, 0, 0.6);
          }
        }
`}</style>
    </div>
  );
}
