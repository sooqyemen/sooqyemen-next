// components/Map/HomeMapView.jsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { normalizeCategoryKey } from '@/lib/categories';
import { db } from '@/lib/firebaseClient';

// ✅ استيراد كل تصنيفاتك
import {
  inferListingTaxonomy,
  CAR_MAKES,
  CAR_MODELS_BY_MAKE,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
  ELECTRONICS_TYPES,
  HEAVY_EQUIPMENT_TYPES,
  SOLAR_TYPES,
  NETWORK_TYPES,
  MAINTENANCE_TYPES,
  FURNITURE_TYPES,
  HOME_TOOLS_TYPES,
  CLOTHES_TYPES,
  ANIMAL_TYPES,
  JOB_TYPES,
  SERVICE_TYPES,
  MOTORCYCLE_BRANDS,
  MOTORCYCLE_MODELS_BY_BRAND,
} from '@/lib/taxonomy';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const YEMEN_BOUNDS = [
  [12.0, 41.0],
  [19.5, 54.7],
];

const DEFAULT_CENTER = [15.3694, 44.1910];

const GOV_FALLBACK = [
  { key: 'amanat_al_asimah', nameAr: 'أمانة العاصمة', order: 1 },
  { key: 'sanaa', nameAr: 'صنعاء', order: 2 },
  { key: 'aden', nameAr: 'عدن', order: 3 },
  { key: 'taiz', nameAr: 'تعز', order: 4 },
  { key: 'ibb', nameAr: 'إب', order: 5 },
  { key: 'al_hudaydah', nameAr: 'الحديدة', order: 6 },
  { key: 'hadramout', nameAr: 'حضرموت', order: 7 },
  { key: 'dhamar', nameAr: 'ذمار', order: 8 },
  { key: 'hajjah', nameAr: 'حجة', order: 9 },
  { key: 'amran', nameAr: 'عمران', order: 10 },
  { key: 'marib', nameAr: 'مأرب', order: 11 },
  { key: 'shabwah', nameAr: 'شبوة', order: 12 },
  { key: 'abyan', nameAr: 'أبين', order: 13 },
  { key: 'lahj', nameAr: 'لحج', order: 14 },
  { key: 'al_dhalea', nameAr: 'الضالع', order: 15 },
  { key: 'al_bayda', nameAr: 'البيضاء', order: 16 },
  { key: 'al_jawf', nameAr: 'الجوف', order: 17 },
  { key: 'saada', nameAr: 'صعدة', order: 18 },
  { key: 'al_mahwit', nameAr: 'المحويت', order: 19 },
  { key: 'raymah', nameAr: 'ريمة', order: 20 },
  { key: 'al_mahrah', nameAr: 'المهرة', order: 21 },
  { key: 'socotra', nameAr: 'سقطرى', order: 22 },
];

const SEEN_KEY = 'sooq_seen_listings_v1';

function readSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getListingId(listing) {
  if (!listing) return null;
  
  const possibleIdFields = ['id', '_id', 'docId', 'uid', 'slug', 'listingId', 'adId'];
  
  for (const field of possibleIdFields) {
    if (listing[field] != null && listing[field] !== '') {
      return String(listing[field]);
    }
  }
  
  return `temp_${JSON.stringify(listing).hashCode()}`;
}

String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

function getListingCategoryValue(listing) {
  if (!listing) return 'other';

  const possibleCategoryFields = [
    'rootCategory', 'rootCategorySlug', 'category', 'categorySlug', 
    'categoryKey', 'section', 'cat', 'category_id', 'type', 'mainCategory'
  ];

  for (const field of possibleCategoryFields) {
    if (listing[field] != null && listing[field] !== '') {
      return listing[field];
    }
  }

  return 'other';
}

function normalizeGovKey(v) {
  if (!v && v !== 0) return '';
  return String(v).trim().toLowerCase();
}

function getListingGovKey(listing, nameToKey) {
  if (!listing) return '';

  const direct = ['govKey', 'governorateKey', 'governorate_id', 'gov', 'governorate'];

  for (const k of direct) {
    const val = listing[k];
    if (!val) continue;

    if (typeof val === 'object') {
      const maybe = val.key || val.id || val.value || val.slug;
      const n = normalizeGovKey(maybe);
      if (n) return n;
      continue;
    }

    const n = normalizeGovKey(val);
    if (n) return n;
  }

  const nameFields = ['governorateNameAr', 'govNameAr', 'governorateAr', 'nameAr'];
  for (const k of nameFields) {
    const n = listing[k];
    if (typeof n === 'string' && n.trim()) {
      const trimmed = n.trim();
      const key = nameToKey?.get(trimmed);
      if (key) return normalizeGovKey(key);
    }
  }

  if (typeof listing.city === 'string' && listing.city.trim()) {
    const trimmedCity = listing.city.trim();
    const key = nameToKey?.get(trimmedCity);
    if (key) return normalizeGovKey(key);
  }

  return '';
}

function normalizeCoords(listing) {
  if (!listing) return null;
  
  const toNum = (v) => {
    if (v == null) return null;
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    return Number.isFinite(n) ? n : null;
  };

  const lat = toNum(listing.lat ?? listing.latitude);
  const lng = toNum(listing.lng ?? listing.lon ?? listing.longitude);
  
  if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return [lat, lng];
  }

  if (listing.coords) {
    if (Array.isArray(listing.coords) && listing.coords.length >= 2) {
      const lat = toNum(listing.coords[0]);
      const lng = toNum(listing.coords[1]);
      if (lat != null && lng != null) return [lat, lng];
    }
    if (listing.coords.latitude != null && listing.coords.longitude != null) {
      const lat = toNum(listing.coords.latitude);
      const lng = toNum(listing.coords.longitude);
      if (lat != null && lng != null) return [lat, lng];
    }
    if (listing.coords.lat != null && listing.coords.lng != null) {
      const lat = toNum(listing.coords.lat);
      const lng = toNum(listing.coords.lng);
      if (lat != null && lng != null) return [lat, lng];
    }
  }

  return null;
}

const YEMEN_EXPANDED_BOUNDS = [
  [11.0, 40.0],
  [20.0, 55.0],
];

function inYemen([lat, lng]) {
  return (
    lat >= YEMEN_EXPANDED_BOUNDS[0][0] &&
    lat <= YEMEN_EXPANDED_BOUNDS[1][0] &&
    lng >= YEMEN_EXPANDED_BOUNDS[0][1] &&
    lng <= YEMEN_EXPANDED_BOUNDS[1][1]
  );
}

// ✅ ألوان + أيقونات لكل قسم
const CAT_STYLE = {
  cars: { color: '#2563eb', icon: '🚗', label: 'سيارات' },
  realestate: { color: '#16a34a', icon: '🏡', label: 'عقارات' },
  phones: { color: '#7c3aed', icon: '📱', label: 'جوالات' },
  electronics: { color: '#0ea5e9', icon: '💻', label: 'إلكترونيات' },
  motorcycles: { color: '#f97316', icon: '🏍️', label: 'دراجات' },
  heavy_equipment: { color: '#a16207', icon: '🚜', label: 'معدات' },
  solar: { color: '#f59e0b', icon: '☀️', label: 'طاقة شمسية' },
  networks: { color: '#14b8a6', icon: '📡', label: 'نت وشبكات' },
  maintenance: { color: '#64748b', icon: '🛠️', label: 'صيانة' },
  furniture: { color: '#c2410c', icon: '🛋️', label: 'أثاث' },
  home_tools: { color: '#22c55e', icon: '🧹', label: 'أدوات' },
  clothes: { color: '#db2777', icon: '👕', label: 'ملابس' },
  animals: { color: '#84cc16', icon: '🐑', label: 'حيوانات' },
  jobs: { color: '#334155', icon: '💼', label: 'وظائف' },
  services: { color: '#0f172a', icon: '🧰', label: 'خدمات' },
  other: { color: '#475569', icon: '📦', label: 'أخرى' },
};

// ✅ جميع الأقسام الرئيسية
const ALL_CATEGORIES = Object.keys(CAT_STYLE);

function getCatStyle(categoryValue) {
  const key = normalizeCategoryKey(categoryValue);
  return CAT_STYLE[key] || CAT_STYLE.other;
}

function buildDivIcon({ color, icon }, isSeen) {
  return L.divIcon({
    className: `sooq-marker${isSeen ? ' sooq-marker--seen' : ''}`,
    html: `
      <div class="sooq-pin" style="--pin:${color}">
        <div class="sooq-pin__icon">${icon}</div>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -42],
  });
}

function pickImage(listing) {
  if (!listing) return null;
  
  const imageFields = ['image', 'cover', 'thumbnail', 'mainImage', 'imageUrl', 'photo'];
  
  for (const field of imageFields) {
    if (listing[field]) {
      if (typeof listing[field] === 'string') return listing[field];
      if (typeof listing[field] === 'object' && listing[field].url) {
        return listing[field].url;
      }
    }
  }
  
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    const firstImg = listing.images[0];
    if (typeof firstImg === 'string') return firstImg;
    if (firstImg && typeof firstImg === 'object') {
      return firstImg.url || firstImg.src || null;
    }
  }
  
  return null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const check = () => {
      const touch =
        typeof window !== 'undefined' &&
        (('ontouchstart' in window) ||
          (navigator && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0));
      setIsTouch(!!touch);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isTouch;
}

// ✅ تعريف هيكل التصنيف الهرمي
const CATEGORY_HIERARCHY = {
  // المستوى 0: الأقسام الرئيسية
  root: ALL_CATEGORIES,
  
  // المستوى 1: الفئات الفرعية لكل قسم
  cars: CAR_MAKES,
  phones: PHONE_BRANDS,
  realestate: DEAL_TYPES,
  electronics: ELECTRONICS_TYPES,
  motorcycles: MOTORCYCLE_BRANDS,
  heavy_equipment: HEAVY_EQUIPMENT_TYPES,
  solar: SOLAR_TYPES,
  networks: NETWORK_TYPES,
  maintenance: MAINTENANCE_TYPES,
  furniture: FURNITURE_TYPES,
  home_tools: HOME_TOOLS_TYPES,
  clothes: CLOTHES_TYPES,
  animals: ANIMAL_TYPES,
  jobs: JOB_TYPES,
  services: SERVICE_TYPES,
  other: [],
};

// ✅ المستوى 2: الفئات الفرعية الثانية (إذا وجدت)
const SUB_CATEGORY_HIERARCHY = {
  // سيارات: الموديلات لكل ماركة
  cars: (make) => CAR_MODELS_BY_MAKE[make] || [],
  
  // عقارات: نوع العقار بعد اختيار البيع/الإيجار
  realestate: (dealType) => PROPERTY_TYPES,
  
  // دراجات: الموديلات لكل ماركة
  motorcycles: (brand) => MOTORCYCLE_MODELS_BY_BRAND[brand] || [],
  
  // بقية الأقسام ليس لها مستوى ثالث
  phones: () => [],
  electronics: () => [],
  heavy_equipment: () => [],
  solar: () => [],
  networks: () => [],
  maintenance: () => [],
  furniture: () => [],
  home_tools: () => [],
  clothes: () => [],
  animals: () => [],
  jobs: () => [],
  services: () => [],
  other: () => [],
};

export default function HomeMapView({ listings = [] }) {
  const [seen, setSeen] = useState(() => new Set());
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  const [pageMap, setPageMap] = useState(null);
  const [fsMap, setFsMap] = useState(null);

  // ✅ المحافظات
  const [govOptions, setGovOptions] = useState(GOV_FALLBACK);
  const [activeGov, setActiveGov] = useState('all');

  // ✅ نظام التصفية الهرمي الجديد
  const [filterPath, setFilterPath] = useState([]); // مثل: ['cars'] أو ['cars', 'toyota'] أو ['realestate', 'sale']
  const [selectedSub2, setSelectedSub2] = useState(''); // للفئة الثالثة (مثل: موديل السيارة أو نوع العقار)

  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // تحميل المحافظات من Firestore
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const snap = await db.collection('taxonomy_governorates').get();
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              key: String(d.id || '').trim(),
              nameAr: String(data.nameAr || data.name || d.id || '').trim(),
              order: typeof data.order === 'number' ? data.order : Number(data.order || 999),
              enabled: data.enabled !== false,
            };
          })
          .filter((g) => g.key && g.enabled)
          .sort((a, b) => (a.order || 999) - (b.order || 999));

        if (alive && arr.length) {
          setGovOptions(arr);
        }
      } catch {}
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ الحصول على العناصر المعروضة في المستوى الحالي
  const getCurrentLevelItems = () => {
    if (filterPath.length === 0) {
      // المستوى 0: عرض جميع الأقسام الرئيسية
      return ALL_CATEGORIES.map(cat => ({
        type: 'category',
        key: cat,
        label: CAT_STYLE[cat]?.label || cat,
        icon: CAT_STYLE[cat]?.icon,
        color: CAT_STYLE[cat]?.color,
        count: catCounts.get(cat) || 0,
      }));
    }

    const currentCategory = filterPath[0];
    
    if (filterPath.length === 1) {
      // المستوى 1: عرض الفئات الفرعية للقسم المختار
      const subItems = CATEGORY_HIERARCHY[currentCategory] || [];
      return subItems.map(item => ({
        type: 'sub1',
        key: item.key,
        label: item.label,
        count: subCounts[currentCategory]?.get(item.key) || 0,
      }));
    }

    if (filterPath.length === 2) {
      // المستوى 2: عرض الفئات الفرعية الثانية (الموديلات)
      const sub2Items = SUB_CATEGORY_HIERARCHY[currentCategory](filterPath[1]) || [];
      return sub2Items.map(item => ({
        type: 'sub2',
        key: item.key,
        label: item.label,
        count: sub2Counts[filterPath[1]]?.get(item.key) || 0,
      }));
    }

    return [];
  };

  const govNameToKey = useMemo(() => {
    const m = new Map();
    for (const g of govOptions || []) {
      if (g?.nameAr) m.set(String(g.nameAr).trim(), g.key);
    }
    for (const g of GOV_FALLBACK) {
      if (g?.nameAr && !m.has(String(g.nameAr).trim())) m.set(String(g.nameAr).trim(), g.key);
    }
    return m;
  }, [govOptions]);

  const govKeyToName = useMemo(() => {
    const m = new Map();
    for (const g of govOptions || []) {
      if (g?.key) m.set(String(g.key), g.nameAr || g.key);
    }
    for (const g of GOV_FALLBACK) {
      if (g?.key && !m.has(String(g.key))) m.set(String(g.key), g.nameAr || g.key);
    }
    return m;
  }, [govOptions]);

  const points = useMemo(() => {
    return (listings || [])
      .map((l) => {
        const id = getListingId(l);
        if (!id) return null;

        const c = normalizeCoords(l);
        if (!c || !inYemen(c)) return null;

        const categoryValue = getListingCategoryValue(l);
        const catKey = normalizeCategoryKey(categoryValue);
        
        let tax = null;
        try {
          tax = inferListingTaxonomy(l, catKey);
        } catch {
          tax = null;
        }

        const govKey = getListingGovKey(l, govNameToKey);

        return {
          ...l,
          _id: String(id),
          _coords: c,
          _categoryValue: categoryValue,
          _catKey: catKey,
          _govKey: govKey,
          _tax: tax,
        };
      })
      .filter(Boolean);
  }, [listings, govNameToKey]);

  const iconCache = useMemo(() => new Map(), []);
  const getMarkerIcon = (categoryValue, isSeenFlag) => {
    const key = normalizeCategoryKey(categoryValue);
    const cacheKey = `${key}:${isSeenFlag ? 'seen' : 'new'}`;
    const cached = iconCache.get(cacheKey);
    if (cached) return cached;

    const style = CAT_STYLE[key] || CAT_STYLE.other;
    const ic = buildDivIcon(style, isSeenFlag);
    iconCache.set(cacheKey, ic);
    return ic;
  };

  const markSeen = (id) => {
    const sid = String(id);
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(sid);
      writeSeen(next);
      return next;
    });
  };

  const govCounts = useMemo(() => {
    const m = new Map();
    for (const g of govOptions || []) {
      if (g?.key) m.set(String(g.key), 0);
    }
    for (const g of GOV_FALLBACK) {
      if (g?.key && !m.has(String(g.key))) m.set(String(g.key), 0);
    }
    for (const p of points) {
      const k = p._govKey;
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [points, govOptions]);

  const catCounts = useMemo(() => {
    const m = new Map();
    ALL_CATEGORIES.forEach(cat => {
      m.set(cat, 0);
    });
    for (const p of points) {
      const k = p._catKey || 'other';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [points]);

  // ✅ عدادات الفئات الفرعية (المستوى 1)
  const subCounts = useMemo(() => {
    const counts = {};
    
    ALL_CATEGORIES.forEach(cat => {
      counts[cat] = new Map();
    });

    for (const p of points) {
      const cat = p._catKey;
      const tax = p._tax;
      if (!tax) continue;

      // عد الفئات الفرعية حسب القسم
      if (cat === 'cars' && tax.carMake) {
        counts.cars.set(tax.carMake, (counts.cars.get(tax.carMake) || 0) + 1);
      }
      else if (cat === 'phones' && tax.phoneBrand) {
        counts.phones.set(tax.phoneBrand, (counts.phones.get(tax.phoneBrand) || 0) + 1);
      }
      else if (cat === 'realestate' && tax.dealType) {
        counts.realestate.set(tax.dealType, (counts.realestate.get(tax.dealType) || 0) + 1);
      }
      else if (cat === 'electronics' && tax.electronicsType) {
        counts.electronics.set(tax.electronicsType, (counts.electronics.get(tax.electronicsType) || 0) + 1);
      }
      else if (cat === 'motorcycles' && tax.motorcycleBrand) {
        counts.motorcycles.set(tax.motorcycleBrand, (counts.motorcycles.get(tax.motorcycleBrand) || 0) + 1);
      }
      else if (cat === 'heavy_equipment' && tax.heavyEquipmentType) {
        counts.heavy_equipment.set(tax.heavyEquipmentType, (counts.heavy_equipment.get(tax.heavyEquipmentType) || 0) + 1);
      }
      else if (cat === 'solar' && tax.solarType) {
        counts.solar.set(tax.solarType, (counts.solar.get(tax.solarType) || 0) + 1);
      }
      else if (cat === 'networks' && tax.networkType) {
        counts.networks.set(tax.networkType, (counts.networks.get(tax.networkType) || 0) + 1);
      }
      else if (cat === 'maintenance' && tax.maintenanceType) {
        counts.maintenance.set(tax.maintenanceType, (counts.maintenance.get(tax.maintenanceType) || 0) + 1);
      }
      else if (cat === 'furniture' && tax.furnitureType) {
        counts.furniture.set(tax.furnitureType, (counts.furniture.get(tax.furnitureType) || 0) + 1);
      }
      else if (cat === 'home_tools' && tax.homeToolsType) {
        counts.home_tools.set(tax.homeToolsType, (counts.home_tools.get(tax.homeToolsType) || 0) + 1);
      }
      else if (cat === 'clothes' && tax.clothesType) {
        counts.clothes.set(tax.clothesType, (counts.clothes.get(tax.clothesType) || 0) + 1);
      }
      else if (cat === 'animals' && tax.animalType) {
        counts.animals.set(tax.animalType, (counts.animals.get(tax.animalType) || 0) + 1);
      }
      else if (cat === 'jobs' && tax.jobType) {
        counts.jobs.set(tax.jobType, (counts.jobs.get(tax.jobType) || 0) + 1);
      }
      else if (cat === 'services' && tax.serviceType) {
        counts.services.set(tax.serviceType, (counts.services.get(tax.serviceType) || 0) + 1);
      }
    }

    return counts;
  }, [points]);

  // ✅ عدادات الفئات الفرعية الثانية (المستوى 2)
  const sub2Counts = useMemo(() => {
    const counts = {};
    
    for (const p of points) {
      const cat = p._catKey;
      const tax = p._tax;
      if (!tax) continue;

      // عد الموديلات للسيارات
      if (cat === 'cars' && tax.carMake && tax.carModel) {
        if (!counts[tax.carMake]) counts[tax.carMake] = new Map();
        counts[tax.carMake].set(tax.carModel, (counts[tax.carMake].get(tax.carModel) || 0) + 1);
      }
      
      // عد أنواع العقار بعد اختيار البيع/الإيجار
      if (cat === 'realestate' && tax.dealType && tax.propertyType) {
        if (!counts[tax.dealType]) counts[tax.dealType] = new Map();
        counts[tax.dealType].set(tax.propertyType, (counts[tax.dealType].get(tax.propertyType) || 0) + 1);
      }
      
      // عد موديلات الدراجات
      if (cat === 'motorcycles' && tax.motorcycleBrand && tax.motorcycleModel) {
        if (!counts[tax.motorcycleBrand]) counts[tax.motorcycleBrand] = new Map();
        counts[tax.motorcycleBrand].set(tax.motorcycleModel, (counts[tax.motorcycleBrand].get(tax.motorcycleModel) || 0) + 1);
      }
    }

    return counts;
  }, [points]);

  const boundsObj = useMemo(() => {
    if (!nearbyBounds) return null;
    try {
      return L.latLngBounds(
        L.latLng(nearbyBounds[0][0], nearbyBounds[0][1]),
        L.latLng(nearbyBounds[1][0], nearbyBounds[1][1])
      );
    } catch {
      return null;
    }
  }, [nearbyBounds]);

  // ✅ تطبيق الفلترة بناءً على المسار المختار
  const filteredPoints = useMemo(() => {
    let arr = points;

    // فلترة حسب المحافظة
    if (activeGov !== 'all') {
      arr = arr.filter((p) => p._govKey === activeGov);
    }

    // فلترة حسب المنطقة القريبة
    if (nearbyOn && boundsObj) {
      arr = arr.filter((p) => boundsObj.contains(L.latLng(p._coords[0], p._coords[1])));
    }

    // ✅ التصفية الهرمية بناءً على filterPath
    if (filterPath.length > 0) {
      const category = filterPath[0];
      
      // فلترة حسب القسم
      arr = arr.filter((p) => p._catKey === category);
      
      // فلترة حسب الفئة الفرعية الأولى
      if (filterPath.length >= 2) {
        const sub1Key = filterPath[1];
        
        if (category === 'cars') {
          arr = arr.filter((p) => p._tax?.carMake === sub1Key);
        }
        else if (category === 'phones') {
          arr = arr.filter((p) => p._tax?.phoneBrand === sub1Key);
        }
        else if (category === 'realestate') {
          arr = arr.filter((p) => p._tax?.dealType === sub1Key);
        }
        else if (category === 'electronics') {
          arr = arr.filter((p) => p._tax?.electronicsType === sub1Key);
        }
        else if (category === 'motorcycles') {
          arr = arr.filter((p) => p._tax?.motorcycleBrand === sub1Key);
        }
        else if (category === 'heavy_equipment') {
          arr = arr.filter((p) => p._tax?.heavyEquipmentType === sub1Key);
        }
        else if (category === 'solar') {
          arr = arr.filter((p) => p._tax?.solarType === sub1Key);
        }
        else if (category === 'networks') {
          arr = arr.filter((p) => p._tax?.networkType === sub1Key);
        }
        else if (category === 'maintenance') {
          arr = arr.filter((p) => p._tax?.maintenanceType === sub1Key);
        }
        else if (category === 'furniture') {
          arr = arr.filter((p) => p._tax?.furnitureType === sub1Key);
        }
        else if (category === 'home_tools') {
          arr = arr.filter((p) => p._tax?.homeToolsType === sub1Key);
        }
        else if (category === 'clothes') {
          arr = arr.filter((p) => p._tax?.clothesType === sub1Key);
        }
        else if (category === 'animals') {
          arr = arr.filter((p) => p._tax?.animalType === sub1Key);
        }
        else if (category === 'jobs') {
          arr = arr.filter((p) => p._tax?.jobType === sub1Key);
        }
        else if (category === 'services') {
          arr = arr.filter((p) => p._tax?.serviceType === sub1Key);
        }
      }
      
      // فلترة حسب الفئة الفرعية الثانية (إذا مختارة)
      if (selectedSub2 && filterPath.length >= 2) {
        const category = filterPath[0];
        const sub1Key = filterPath[1];
        
        if (category === 'cars') {
          arr = arr.filter((p) => p._tax?.carMake === sub1Key && p._tax?.carModel === selectedSub2);
        }
        else if (category === 'realestate') {
          arr = arr.filter((p) => p._tax?.dealType === sub1Key && p._tax?.propertyType === selectedSub2);
        }
        else if (category === 'motorcycles') {
          arr = arr.filter((p) => p._tax?.motorcycleBrand === sub1Key && p._tax?.motorcycleModel === selectedSub2);
        }
      }
    }

    return arr;
  }, [points, activeGov, nearbyOn, boundsObj, filterPath, selectedSub2]);

  // ✅ دالة للتعامل مع النقر على عنصر التصفية
  const handleFilterClick = (item) => {
    if (item.type === 'category') {
      // اختيار قسم رئيسي
      setFilterPath([item.key]);
      setSelectedSub2('');
    } 
    else if (item.type === 'sub1') {
      // اختيار فئة فرعية
      setFilterPath([filterPath[0], item.key]);
      setSelectedSub2('');
    }
    else if (item.type === 'sub2') {
      // اختيار فئة فرعية ثانية
      setSelectedSub2(item.key);
    }
  };

  // ✅ دالة للرجوع خطوة للخلف
  const handleBackClick = () => {
    if (selectedSub2) {
      // إذا كان هناك فئة ثانية مختارة، أزل اختيارها
      setSelectedSub2('');
    } else if (filterPath.length > 1) {
      // إذا كان في المستوى 2، ارجع للمستوى 1
      setFilterPath([filterPath[0]]);
      setSelectedSub2('');
    } else if (filterPath.length === 1) {
      // إذا كان في المستوى 1، ارجع للجذر
      setFilterPath([]);
      setSelectedSub2('');
    }
  };

  // ✅ دالة لمسح كل الفلاتر
  const handleClearFilters = () => {
    setFilterPath([]);
    setSelectedSub2('');
    setActiveGov('all');
    setNearbyOn(false);
    setNearbyBounds(null);
  };

  const applyNearbyFromMap = (m) => {
    if (!m) return;
    try {
      const b = m.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      setNearbyBounds([
        [sw.lat, sw.lng],
        [ne.lat, ne.lng],
      ]);
      setNearbyOn(true);
    } catch {}
  };

  const resetNearby = () => {
    setNearbyOn(false);
    setNearbyBounds(null);
  };

  const locateMe = () => {
    const m = fsMap;
    if (!m) return;

    if (nearbyOn) {
      resetNearby();
      return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          m.setView([lat, lng], 13, { animate: true });
        } catch {
          try {
            m.setView([lat, lng], 13);
          } catch {}
        }

        setTimeout(() => {
          applyNearbyFromMap(m);
        }, 350);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // ✅ مكون شريط التصفية الديناميكي
  const DynamicFilterBar = ({ isFullscreenMode = false }) => {
    const stop = (e) => {
      try { e.stopPropagation(); } catch {}
    };
    
    const currentItems = getCurrentLevelItems();
    const showBackButton = filterPath.length > 0 || selectedSub2;
    const currentCategory = filterPath[0] ? CAT_STYLE[filterPath[0]] : null;
    const govList = (govOptions && govOptions.length) ? govOptions : GOV_FALLBACK;

    return (
      <div className={`sooq-mapOverlay ${isFullscreenMode ? 'sooq-mapOverlay--fullscreen' : ''}`}>
        {/* فلترة المحافظات */}
        <div className="sooq-govRow" onClick={stop} onPointerDown={stop} onTouchStart={stop}>
          <select
            className="sooq-govSelect"
            value={activeGov}
            onChange={(e) => setActiveGov(e.target.value)}
            aria-label="فلترة حسب المحافظة"
          >
            <option value="all">كل المحافظات ({points.length})</option>
            {govList.map((g) => {
              const c = govCounts.get(String(g.key)) || 0;
              return (
                <option key={g.key} value={g.key} disabled={!c}>
                  {(g.nameAr || g.key)} ({c})
                </option>
              );
            })}
          </select>

          {activeGov !== 'all' ? (
            <button type="button" className="sooq-govClear" onClick={() => setActiveGov('all')}>
              إزالة
            </button>
          ) : null}
        </div>

        {/* شريط التصفية الرئيسي */}
        <div className="sooq-chips" onClick={stop} onPointerDown={stop} onTouchStart={stop} role="tablist" aria-label="فلترة الأقسام">
          {/* زر الرجوع */}
          {showBackButton && (
            <button
              type="button"
              className="sooq-chip sooq-chip--back"
              onClick={handleBackClick}
              title="رجوع"
            >
              ↩ رجوع
            </button>
          )}

          {/* زر عرض الكل */}
          {filterPath.length === 0 ? (
            <button
              type="button"
              className={`sooq-chip ${filterPath.length === 0 ? 'isActive' : ''}`}
              onClick={() => setFilterPath([])}
            >
              الكل <span className="sooq-chipCount">{points.length}</span>
            </button>
          ) : (
            <button
              type="button"
              className="sooq-chip"
              onClick={handleClearFilters}
            >
              الكل ({points.length})
            </button>
          )}

          {/* العناصر الحالية */}
          {currentItems.map((item) => {
            const isActive = 
              (item.type === 'category' && filterPath[0] === item.key) ||
              (item.type === 'sub1' && filterPath[1] === item.key) ||
              (item.type === 'sub2' && selectedSub2 === item.key);
            
            const hasListings = item.count > 0;

            return (
              <button
                key={`${item.type}-${item.key}`}
                type="button"
                className={`sooq-chip ${isActive ? 'isActive' : ''} ${!hasListings ? 'sooq-chip--disabled' : ''}`}
                onClick={() => hasListings && handleFilterClick(item)}
                disabled={!hasListings}
                title={!hasListings ? `${item.label} (لا توجد إعلانات)` : item.label}
              >
                {item.type === 'category' && (
                  <span className="sooq-chipDot" style={{ background: item.color }} />
                )}
                {item.type === 'category' && item.icon && (
                  <span className="sooq-chipIcon">{item.icon}</span>
                )}
                <span className="sooq-chipText">{item.label}</span>
                {item.count > 0 && (
                  <span className="sooq-chipCount">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* عرض المسار الحالي (Breadcrumb) */}
        {filterPath.length > 0 && (
          <div className="sooq-breadcrumb" onClick={stop} onPointerDown={stop} onTouchStart={stop}>
            <span className="sooq-breadcrumb-text">
              المسار: 
              <button type="button" onClick={() => setFilterPath([])} className="sooq-breadcrumb-item">
                الرئيسية
              </button>
              {filterPath.map((key, index) => {
                let label = '';
                if (index === 0) {
                  label = CAT_STYLE[key]?.label || key;
                } else {
                  // البحث عن التسمية في الفئات الفرعية
                  const categoryItems = CATEGORY_HIERARCHY[filterPath[0]] || [];
                  const found = categoryItems.find(item => item.key === key);
                  label = found?.label || key;
                }
                
                return (
                  <span key={index} className="sooq-breadcrumb-separator"> › </span>
                  <button 
                    type="button" 
                    onClick={() => setFilterPath(filterPath.slice(0, index + 1))}
                    className="sooq-breadcrumb-item"
                  >
                    {label}
                  </button>
                );
              })}
              {selectedSub2 && (
                <>
                  <span className="sooq-breadcrumb-separator"> › </span>
                  <span className="sooq-breadcrumb-item">
                    {SUB_CATEGORY_HIERARCHY[filterPath[0]](filterPath[1])?.find(item => item.key === selectedSub2)?.label || selectedSub2}
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    );
  };

  const MapBody = ({ mode, hideZoomControls = false }) => (
    <>
      <MapContainer
        whenCreated={mode === 'fs' ? setFsMap : setPageMap}
        center={DEFAULT_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        zoomControl={!hideZoomControls && !isTouch}
        style={{ height: '100%', width: '100%' }}
        maxBounds={YEMEN_EXPANDED_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {filteredPoints.map((l) => {
          const img = pickImage(l);
          const isSeenFlag = seen.has(String(l._id));
          const cat = getCatStyle(l._categoryValue || l._catKey);

          return (
            <Marker key={l._id} position={l._coords} icon={getMarkerIcon(l._categoryValue || l._catKey, isSeenFlag)}>
              <Popup>
                <div className="sooq-popupMini">
                  {img ? <img className="sooq-popupMiniImg" src={img} alt={l.title || 'صورة'} loading="lazy" /> : null}
                  <div className="sooq-popupMiniTitle" title={l.title || ''}>
                    {l.title || 'بدون عنوان'}
                  </div>
                  <Link
                    href={`/listing/${l._id}`}
                    onClick={() => markSeen(l._id)}
                    className="sooq-popupMiniBtn"
                    style={{ '--btn': isSeenFlag ? '#64748b' : cat.color }}
                  >
                    فتح
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );

  const handleMapClick = () => {
    setIsFullscreen(true);
  };

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>🗺️ عرض الإعلانات على الخريطة</div>
      </div>

      <div
        className="sooq-mapWrap"
        onClick={handleMapClick}
        onPointerDown={handleMapClick}
        onTouchStart={handleMapClick}
        style={{
          width: '100%',
          height: 'min(520px, 70vh)',
          minHeight: 360,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div className="sooq-open-fs-hint">
          انقر لفتح الخريطة كاملة الشاشة
        </div>
        <DynamicFilterBar />
        <MapBody mode="page" />
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {filteredPoints.length
          ? `✅ الظاهر على الخريطة: ${filteredPoints.length} إعلان${nearbyOn ? ' • (قريب من موقعي)' : ''}`
          : 'لا توجد إعلانات مطابقة للفلتر/أو لا توجد إعلانات لها موقع داخل اليمن.'}
      </div>

      {portalReady && isFullscreen
        ? createPortal(
            <div className="sooq-fsOverlay" role="dialog" aria-label="الخريطة">
              <DynamicFilterBar isFullscreenMode={true} />

              <button 
                type="button" 
                className="sooq-fsCloseBtn" 
                onClick={() => setIsFullscreen(false)}
                aria-label="إغلاق الخريطة"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="sooq-fsMap">
                <MapBody mode="fs" hideZoomControls={true} />
              </div>

              <button
                type="button"
                className={`sooq-locateBtn ${nearbyOn ? 'isActive' : ''}`}
                onClick={locateMe}
                aria-label={nearbyOn ? 'إلغاء القريب من موقعي' : 'تحديد موقعي'}
                title={nearbyOn ? 'عرض الكل' : 'تحديد موقعي'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor"/>
                </svg>
              </button>
            </div>,
            document.body
          )
        : null}

      <style jsx global>{`
        .sooq-mapWrap {
          position: relative;
          background: #fff;
        }

        .sooq-open-fs-hint {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1005;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          border: 1px solid rgba(0, 0, 0, 0.1);
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 768px) {
          .sooq-open-fs-hint {
            display: none;
          }
        }

        .sooq-mapOverlay {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          z-index: 1004;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .sooq-mapOverlay--fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: 12px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 999999;
          pointer-events: auto;
          max-height: 200px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .sooq-mapOverlay--fullscreen {
            padding: 8px;
            top: env(safe-area-inset-top, 0px) !important;
            max-height: 180px;
          }
        }

        .sooq-chips {
          pointer-events: auto;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
          align-items: center;
          min-height: 44px;
          margin-top: 8px;
        }

        .sooq-mapOverlay--fullscreen .sooq-chips {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: 10px;
          min-height: 50px;
        }

        .sooq-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
          transition: all 0.2s ease;
        }

        .sooq-chip--back {
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
        }

        .sooq-chip:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
        }

        .sooq-chip.isActive {
          border-color: rgba(0, 0, 0, 0.18);
          background: var(--active-bg, #f1f5f9);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
          font-weight: 900;
        }

        .sooq-chip--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
        }

        .sooq-chip--disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .sooq-chipDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sooq-chipIcon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .sooq-chipText {
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
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
          font-weight: 800;
          flex-shrink: 0;
        }

        .sooq-chip--disabled .sooq-chipCount {
          background: rgba(0, 0, 0, 0.04);
          color: #94a3b8;
        }

        .sooq-breadcrumb {
          pointer-events: auto;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border-radius: 10px;
          margin-top: 8px;
          font-size: 12px;
        }

        .sooq-breadcrumb-text {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
        }

        .sooq-breadcrumb-item {
          background: none;
          border: none;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          color: #3b82f6;
          font-weight: 600;
        }

        .sooq-breadcrumb-item:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .sooq-breadcrumb-separator {
          color: #94a3b8;
        }

        .sooq-popupMini {
          width: 140px;
          display: grid;
          gap: 6px;
        }

        .sooq-popupMiniImg {
          width: 100%;
          height: 52px;
          object-fit: cover;
          border-radius: 10px;
          display: block;
        }

        .sooq-popupMiniTitle {
          font-weight: 900;
          font-size: 12px;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sooq-popupMiniBtn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 6px 10px;
          border-radius: 10px;
          background: var(--btn);
          color: #fff;
          text-decoration: none;
          font-weight: 900;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .sooq-popupMiniBtn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .sooq-popupMini {
            width: 120px;
          }
          .sooq-popupMiniImg {
            height: 46px;
          }
          .leaflet-popup-content {
            margin: 8px 10px !important;
          }
        }

        .sooq-fsOverlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #fff;
          display: flex;
          flex-direction: column;
        }

        .sooq-fsMap {
          position: relative;
          flex: 1;
          width: 100%;
          height: 100vh;
          margin-top: 0;
        }

        @media (max-width: 768px) {
          .sooq-fsMap {
            height: calc(100vh - 180px);
            margin-top: 180px;
          }
        }

        .sooq-fsCloseBtn {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 1000001;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.7;
        }

        .sooq-fsCloseBtn:hover {
          background: rgba(0, 0, 0, 0.5);
          opacity: 1;
          transform: scale(1.1);
        }

        .sooq-fsCloseBtn svg {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          .sooq-fsCloseBtn {
            top: calc(env(safe-area-inset-top, 0px) + 5px);
            left: 5px;
            width: 28px;
            height: 28px;
          }
          .sooq-fsCloseBtn svg {
            width: 14px;
            height: 14px;
          }
        }

        .sooq-locateBtn {
          position: fixed;
          left: 20px;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
          z-index: 1000000;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: white;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .sooq-locateBtn:hover {
          background: #f8f9fa;
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }

        .sooq-locateBtn.isActive {
          background: #3b82f6;
          color: white;
        }

        .sooq-locateBtn svg {
          width: 24px;
          height: 24px;
        }

        @media (max-width: 768px) {
          .sooq-locateBtn {
            left: 15px;
            bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
            width: 44px;
            height: 44px;
          }
          
          .sooq-locateBtn svg {
            width: 20px;
            height: 20px;
          }
        }

        .leaflet-control-zoom {
          display: none !important;
        }

        @media (hover: none) and (pointer: coarse) {
          .leaflet-control-zoom {
            display: none !important;
          }
        }

        .sooq-marker {
          background: transparent !important;
          border: 0 !important;
        }

        .sooq-pin {
          position: relative;
          width: 34px;
          height: 46px;
        }

        .sooq-pin::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 2px;
          width: 28px;
          height: 28px;
          background: var(--pin);
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.92);
        }

        .sooq-pin::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 12px;
          width: 14px;
          height: 14px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          transform: translateX(-50%);
        }

        .sooq-pin__icon {
          position: absolute;
          left: 50%;
          top: 9px;
          transform: translateX(-50%);
          z-index: 2;
          font-size: 14px;
          line-height: 1;
        }

        .sooq-marker--seen .sooq-pin {
          opacity: 0.72;
          filter: grayscale(0.25);
        }

        .sooq-chips::-webkit-scrollbar {
          height: 6px;
        }

        .sooq-chips::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        .sooq-chips::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .sooq-chips::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .sooq-mapOverlay--fullscreen::-webkit-scrollbar {
          width: 6px;
        }

        .sooq-mapOverlay--fullscreen::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        .sooq-mapOverlay--fullscreen::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .sooq-mapOverlay--fullscreen::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .sooq-govRow{
          display:flex;
          gap:8px;
          align-items:center;
          padding:10px 10px 0;
          pointer-events:auto;
        }

        .sooq-govSelect{
          flex:1;
          height:34px;
          border-radius:10px;
          border:1px solid rgba(0,0,0,.10);
          background:rgba(255,255,255,.95);
          font-size:13px;
          padding:0 10px;
        }

        .sooq-govClear{
          height:34px;
          border-radius:10px;
          border:1px solid rgba(0,0,0,.10);
          background:rgba(255,255,255,.95);
          padding:0 10px;
          font-size:13px;
          cursor:pointer;
        }

        .sooq-govClear:active{ transform: translateY(1px); }
      `}</style>
    </div>
  );
}
