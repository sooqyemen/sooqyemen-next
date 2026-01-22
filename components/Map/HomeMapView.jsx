// components/Map/HomeMapView.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ Taxonomy (هرمية الأقسام)
import {
  inferListingTaxonomy,
  CAR_MAKES,
  getCarModelsByMake,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,

  // أنواع/فئات لبقية الأقسام
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
} from '@/lib/taxonomy';

// ✅ مصدر واحد للتطبيع
import { normalizeCategoryKey as normalizeCategoryKeyLib } from '@/lib/categories';

// Fix Leaflet default icon paths (Next.js)
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

// LocalStorage key
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

// ✅ توحيد ID
function getListingId(listing) {
  return (
    listing?.id ??
    listing?._id ??
    listing?.docId ??
    listing?.uid ??
    listing?.slug ??
    listing?.listingId ??
    null
  );
}

// ✅ توحيد القسم (root)
function getListingCategoryValue(listing) {
  return (
    listing?.category ??
    listing?.section ??
    listing?.cat ??
    listing?.categoryKey ??
    listing?.category_id ??
    listing?.categoryId ??
    listing?.type ??
    'other'
  );
}

// ✅ توحيد الإحداثيات
function normalizeCoords(listing) {
  const toNum = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  // 1) coords: [lat,lng]
  if (Array.isArray(listing?.coords) && listing.coords.length === 2) {
    const lat = toNum(listing.coords[0]);
    const lng = toNum(listing.coords[1]);
    if (lat != null && lng != null) return [lat, lng];
  }

  // 2) coords: {lat,lng}
  if (listing?.coords?.lat != null && listing?.coords?.lng != null) {
    const lat = toNum(listing.coords.lat);
    const lng = toNum(listing.coords.lng);
    if (lat != null && lng != null) return [lat, lng];
  }

  // 3) lat/lng مباشرة
  if (listing?.lat != null && (listing?.lng != null || listing?.lon != null)) {
    const lat = toNum(listing.lat);
    const lng = toNum(listing.lng ?? listing.lon);
    if (lat != null && lng != null) return [lat, lng];
  }

  // 4) latitude/longitude
  if (listing?.latitude != null && listing?.longitude != null) {
    const lat = toNum(listing.latitude);
    const lng = toNum(listing.longitude);
    if (lat != null && lng != null) return [lat, lng];
  }

  // 5) location / geo
  if (listing?.location?.lat != null && listing?.location?.lng != null) {
    const lat = toNum(listing.location.lat);
    const lng = toNum(listing.location.lng);
    if (lat != null && lng != null) return [lat, lng];
  }
  if (listing?.geo?.lat != null && (listing?.geo?.lng != null || listing?.geo?.lon != null)) {
    const lat = toNum(listing.geo.lat);
    const lng = toNum(listing.geo.lng ?? listing.geo.lon);
    if (lat != null && lng != null) return [lat, lng];
  }

  return null;
}

function inYemen([lat, lng]) {
  return (
    lat >= YEMEN_BOUNDS[0][0] &&
    lat <= YEMEN_BOUNDS[1][0] &&
    lng >= YEMEN_BOUNDS[0][1] &&
    lng <= YEMEN_BOUNDS[1][1]
  );
}

// ✅ توحيد اسم القسم (rootKey) — مصدر واحد فقط: lib/categories.js
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

// ✅ ترتيب ثابت لعرض الأقسام (حتى لو ما فيه إعلانات)
const ROOT_ORDER = [
  'cars',
  'realestate',
  'phones',
  'electronics',
  'motorcycles',
  'heavy_equipment',
  'solar',
  'networks',
  'maintenance',
  'furniture',
  'home_tools',
  'clothes',
  'animals',
  'jobs',
  'services',
  'other',
];

// ✅ إعدادات الفئات/الأنواع لبقية الأقسام (غير: سيارات/عقارات/جوالات)
const ROOT_TYPE_CONFIG = {
  electronics: { items: ELECTRONICS_TYPES, taxField: 'electronicsType', label: 'الفئة' },
  motorcycles: { items: MOTORCYCLE_BRANDS, taxField: 'motorcycleBrand', label: 'الماركة' },
  heavy_equipment: { items: HEAVY_EQUIPMENT_TYPES, taxField: 'heavyEquipmentType', label: 'النوع' },
  solar: { items: SOLAR_TYPES, taxField: 'solarType', label: 'النوع' },
  networks: { items: NETWORK_TYPES, taxField: 'networkType', label: 'النوع' },
  maintenance: { items: MAINTENANCE_TYPES, taxField: 'maintenanceType', label: 'النوع' },
  furniture: { items: FURNITURE_TYPES, taxField: 'furnitureType', label: 'النوع' },
  home_tools: { items: HOME_TOOLS_TYPES, taxField: 'homeToolsType', label: 'النوع' },
  clothes: { items: CLOTHES_TYPES, taxField: 'clothesType', label: 'النوع' },
  animals: { items: ANIMAL_TYPES, taxField: 'animalType', label: 'النوع' },
  jobs: { items: JOB_TYPES, taxField: 'jobType', label: 'النوع' },
  services: { items: SERVICE_TYPES, taxField: 'serviceType', label: 'النوع' },
};

function getCatStyle(categoryValue) {
  const key = normalizeCategoryKeyLib(categoryValue) || 'other';
  return CAT_STYLE[key] || CAT_STYLE.other;
}

// ✅ بناء دبوس HTML
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

// ✅ صورة الإعلان
function pickImage(listing) {
  const imgs = listing?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return first.url || first.src || first.path || null;
  }
  return listing?.image || listing?.cover || listing?.thumbnail || listing?.mainImage || listing?.imageUrl || null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 520px)').matches);
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

export default function HomeMapView({ listings = [], forcedRootKey = '' }) {
  const [seen, setSeen] = useState(() => new Set());

  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  // ✅ خريطتين منفصلتين: واحدة داخل الصفحة + واحدة ملء الشاشة
  const [pageMap, setPageMap] = useState(null);
  const [fsMap, setFsMap] = useState(null);

  // ✅ فلتر هرمي
  const pathname = usePathname();

  // ✅ قفل القسم الجذري تلقائياً في صفحات الأقسام (مثل /cars) بدون تعديل باقي الصفحات
  const lockedRootKey = useMemo(() => {
    const forced = typeof forcedRootKey === 'string' ? forcedRootKey.trim() : '';
    if (forced && ROOT_ORDER.includes(forced)) return forced;

    if (!pathname) return '';
    const seg = String(pathname)
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean)[0] || '';

    if (!seg) return '';
    const segLower = seg.toLowerCase();

    // صفحات لا نعتبرها أقسام
    const ignore = new Set([
      'listings',
      'listing',
      'add',
      'edit-listing',
      'login',
      'signup',
      'profile',
      'account',
      'chat',
      'api',
    ]);
    if (ignore.has(segLower)) return '';

    if (ROOT_ORDER.includes(segLower)) return segLower;

    const norm = normalizeCategoryKeyLib(segLower);
    if (norm && ROOT_ORDER.includes(norm)) return norm;

    return '';
  }, [pathname, forcedRootKey]);

  const [activeRoot, setActiveRoot] = useState(() => lockedRootKey || 'all');
 // all | cars | realestate | phones | ...
  const [activeCarMake, setActiveCarMake] = useState(''); // toyota...
  const [activeCarModel, setActiveCarModel] = useState(''); // camry...
  const [activePhoneBrand, setActivePhoneBrand] = useState(''); // apple...
  const [activeDealType, setActiveDealType] = useState(''); // sale/rent
  const [activePropertyType, setActivePropertyType] = useState(''); // land/house...

  // ✅ إذا كنا داخل صفحة قسم (مثل /cars) نقفل القسم على هذا المسار ونخفي شريط الأقسام العامة
  useEffect(() => {
    // داخل صفحة قسم: قفل على القسم
    if (lockedRootKey) {
      setActiveRoot(lockedRootKey);

      // تصفير الفلاتر الثانوية عند الانتقال لقسم مختلف (احتياطي)
      setActiveTypeKey('');
      setActiveCarMake('');
      setActiveCarModel('');
      setActivePhoneBrand('');
      setActiveDealType('');
      setActivePropertyType('');
      return;
    }

    // خرجنا من صفحة قسم مقفلة (مثلاً رجعنا /listings): نرجّع الوضع الافتراضي
    setActiveRoot('all');
  }, [lockedRootKey]);
// ✅ فلتر عام لبقية الأقسام (نوع/فئة/ماركة حسب القسم)
  const [activeTypeKey, setActiveTypeKey] = useState('');

  // ✅ فلتر عام لفئات الأقسام الأخرى (إلكترونيات/دراجات/...)
  

  // فلترة القريب
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null); // [[south, west],[north,east]]

  // ملء الشاشة عبر Portal
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // ✅ قفل تمرير الصفحة أثناء ملء الشاشة
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isFullscreen]);

  // ✅ مزامنة العرض بين الخريطتين (عند فتح/إغلاق)
  useEffect(() => {
    if (!isFullscreen) return;
    if (!pageMap || !fsMap) return;
    try {
      fsMap.setView(pageMap.getCenter(), pageMap.getZoom(), { animate: false });
    } catch {}
  }, [isFullscreen, pageMap, fsMap]);

  useEffect(() => {
    if (isFullscreen) return;
    if (!pageMap || !fsMap) return;
    try {
      pageMap.setView(fsMap.getCenter(), fsMap.getZoom(), { animate: false });
    } catch {}
  }, [isFullscreen, pageMap, fsMap]);

  // ✅ invalidateSize للماب الحالي
  useEffect(() => {
    const m = isFullscreen ? fsMap : pageMap;
    if (!m) return;

    const tick = () => {
      try {
        m.invalidateSize();
      } catch {}
    };

    const t1 = setTimeout(tick, 0);
    const t2 = setTimeout(tick, 250);

    window.addEventListener('resize', tick);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', tick);
    };
  }, [pageMap, fsMap, isFullscreen]);

  const points = useMemo(() => {
    return (listings || [])
      .map((l) => {
        const id = getListingId(l);
        if (!id) return null;

        const c = normalizeCoords(l);
        if (!c) return null;
        if (!inYemen(c)) return null;

        const categoryValue = getListingCategoryValue(l);
        const catKey = normalizeCategoryKeyLib(categoryValue) || 'other';

        // ✅ استنتاج الفروع (سيارات/عقارات/جوالات)
        const _tax = inferListingTaxonomy(l, catKey);

        return {
          ...l,
          _id: String(id),
          _coords: c,
          _categoryValue: categoryValue,
          _catKey: catKey,
          _tax,
        };
      })
      .filter(Boolean);
  }, [listings]);

  // كاش للأيقونات
  const iconCache = useMemo(() => new Map(), []);
  const getMarkerIcon = (categoryValue, isSeenFlag) => {
    const key = normalizeCategoryKeyLib(categoryValue) || 'other';
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

  // ✅ فلترة حسب القريب أولاً (نستخدمها لبناء خيارات الفلاتر)
  const nearbyFilteredPoints = useMemo(() => {
    if (!nearbyOn || !boundsObj) return points;
    return points.filter((p) => boundsObj.contains(L.latLng(p._coords[0], p._coords[1])));
  }, [points, nearbyOn, boundsObj]);

  // ✅ Counts للأقسام الرئيسية
  const rootCounts = useMemo(() => {
    const m = new Map();
    for (const p of nearbyFilteredPoints) {
      const k = p._catKey || 'other';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints]);

  const availableRoots = useMemo(() => {
    const keys = Object.keys(CAT_STYLE);
    return keys.filter((k) => (rootCounts.get(k) || 0) > 0);
  }, [rootCounts]);

  // ✅ Counts للفروع حسب القسم
  const carsMakeCounts = useMemo(() => {
    const m = new Map();
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== 'cars') continue;
      const mk = p?._tax?.carMake || '';
      if (!mk) continue;
      m.set(mk, (m.get(mk) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints]);

  // ✅ Counts لموديلات السيارات حسب الماركة المختارة
  const carsModelCounts = useMemo(() => {
    const m = new Map();
    if (!activeCarMake) return m;
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== 'cars') continue;
      if ((p?._tax?.carMake || '') !== activeCarMake) continue;
      const mdl = p?._tax?.carModel || '';
      if (!mdl) continue;
      m.set(mdl, (m.get(mdl) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints, activeCarMake]);

  // ✅ حماية: بعض الماركات قد ترجع موديلات غير مصفوفة (تمنع صفحة الخطأ)
  const carModels = useMemo(() => {
    if (!activeCarMake) return [];
    const arr = getCarModelsByMake(activeCarMake);
    return Array.isArray(arr) ? arr : [];
  }, [activeCarMake]);

  const phonesBrandCounts = useMemo(() => {
    const m = new Map();
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== 'phones') continue;
      const bk = p?._tax?.phoneBrand || '';
      if (!bk) continue;
      m.set(bk, (m.get(bk) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints]);

  const realestateDealCounts = useMemo(() => {
    const m = new Map();
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== 'realestate') continue;
      const dk = p?._tax?.dealType || '';
      if (!dk) continue;
      m.set(dk, (m.get(dk) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints]);

  const realestatePropCounts = useMemo(() => {
    const m = new Map();
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== 'realestate') continue;
      if (activeDealType && (p?._tax?.dealType || '') !== activeDealType) continue;

      const pk = p?._tax?.propertyType || '';
      if (!pk) continue;
      m.set(pk, (m.get(pk) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints, activeDealType]);

  // ✅ Counts لفئات/أنواع بقية الأقسام
  const typeCounts = useMemo(() => {
    const m = new Map();
    const cfg = ROOT_TYPE_CONFIG[activeRoot];
    if (!cfg) return m;
    const field = cfg.taxField;
    for (const p of nearbyFilteredPoints) {
      if (p._catKey !== activeRoot) continue;
      const v = String(p?._tax?.[field] || '').trim();
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return m;
  }, [nearbyFilteredPoints, activeRoot]);

  // ✅ الفلاتر الأساسية + الهرمية
  const filteredPoints = useMemo(() => {
    let arr = nearbyFilteredPoints;

    if (activeRoot !== 'all') {
      arr = arr.filter((p) => p._catKey === activeRoot);
    }

    if (activeRoot === 'cars' && activeCarMake) {
      arr = arr.filter((p) => (p?._tax?.carMake || '') === activeCarMake);
    }

    if (activeRoot === 'cars' && activeCarMake && activeCarModel) {
      arr = arr.filter((p) => (p?._tax?.carModel || '') === activeCarModel);
    }

    if (activeRoot === 'phones' && activePhoneBrand) {
      arr = arr.filter((p) => (p?._tax?.phoneBrand || '') === activePhoneBrand);
    }

    if (activeRoot === 'realestate') {
      if (activeDealType) arr = arr.filter((p) => (p?._tax?.dealType || '') === activeDealType);
      if (activePropertyType) arr = arr.filter((p) => (p?._tax?.propertyType || '') === activePropertyType);
    }

    const cfg = ROOT_TYPE_CONFIG[activeRoot];
    if (cfg && activeTypeKey) {
      const field = cfg.taxField;
      arr = arr.filter((p) => (p?._tax?.[field] || '') === activeTypeKey);
    }

    return arr;
  }, [
    nearbyFilteredPoints,
    activeRoot,
    activeCarMake,
    activeCarModel,
    activePhoneBrand,
    activeDealType,
    activePropertyType,
    activeTypeKey,
  ]);

  // ✅ تطبيق قريب حسب حدود الخريطة الحالية
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

  // ✅ زر تحديد الموقع (في ملء الشاشة فقط)
  const locateMe = () => {
    const m = fsMap;
    if (!m) return;

    // Toggle: لو القريب شغال اضغط مرة ثانية يلغي
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

  // ✅ فتح ملء الشاشة (زر/اختصار)
  const openFullscreen = (ev) => {
    if (ev?.preventDefault) ev.preventDefault();
    if (isFullscreen) return;
    setIsFullscreen(true);
  };

  // ✅ فتح ملء الشاشة: للجوال فقط عبر النقر على الخريطة (تجنب فتحها بالخطأ على الكمبيوتر)
  const openFullscreenFromMap = (e) => {
    if (isFullscreen) return;

    const t = e?.target;
    if (t && t.closest) {
      if (
        t.closest('.sooq-mapOverlay') || t.closest('.sooq-chips') ||
        t.closest('.leaflet-control') ||
        t.closest('.leaflet-popup') ||
        t.closest('.leaflet-marker-icon') ||
        t.closest('.leaflet-marker-shadow') ||
        t.closest('a') ||
        t.closest('button')
      ) return;
    }

    openFullscreen(e);
  };

  const closeFullscreen = (ev) => {
    if (ev?.preventDefault) ev.preventDefault();
    setIsFullscreen(false);
  };

  useEffect(() => {
    if (!isFullscreen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // ✅ اختيارات الفلاتر
  const chooseRoot = (k) => {
    // إذا الصفحة داخل قسم: لا تسمح بالخروج من القسم، فقط صفّر الفروع
    const target = lockedRootKey ? lockedRootKey : k;
    setActiveRoot(target);

    // تصفير الفروع عند تبديل القسم أو عند إعادة الضبط داخل القسم المقفل
    setActiveCarMake('');
    setActiveCarModel('');
    setActivePhoneBrand('');
    setActiveDealType('');
    setActivePropertyType('');
    setActiveTypeKey('');
  };

  // ✅ تصفير الفلاتر الرئيسية/الفرعية
  const resetFilters = () => {
    chooseRoot(lockedRootKey ? lockedRootKey : 'all');
  };

  // ✅ رجوع للأقسام (إذا ما فيه قفل) أو تصفير داخل القسم (إذا فيه قفل)
  const backToRoots = () => {
    if (lockedRootKey) {
      resetFilters();
      return;
    }
    chooseRoot('all');
  };

  // ✅ تطبيق "قريب" حسب حدود الخريطة الحالية (صفحة أو ملء الشاشة)
  const applyNearbyFromCurrentMap = () => {
    const m = isFullscreen ? fsMap : pageMap;
    if (!m) return;
    applyNearbyFromMap(m);
  };

  const backCarsToMakes = () => {
    setActiveCarMake('');
    setActiveCarModel('');
  };

  const backRealestateToDeal = () => {
    setActiveDealType('');
    setActivePropertyType('');
  };

  // ✅ Overlay chips (هرمي)
  const ChipsOverlay = (
    <div
      className="sooq-mapOverlay"
      // مهم: منع فتح ملء الشاشة عند لمس الشيبس (كان يسبب "ترمش" وما يختار)
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sooq-chips" role="tablist" aria-label="فلترة الأقسام">
        {/* أدوات سريعة (بنفس تصميم الشيبس) */}
        <button type="button" className="sooq-chip" onClick={resetFilters} title="تصفير الفلاتر">
          ⟲ تصفير
        </button>

        <button
          type="button"
          className={`sooq-chip ${nearbyOn ? 'isActive' : ''}`}
          onClick={() => (nearbyOn ? resetNearby() : applyNearbyFromCurrentMap())}
          title={nearbyOn ? 'إلغاء القريب' : 'هذه المنطقة'}
        >
          {nearbyOn ? '✕ القريب' : '📍 هذه المنطقة'}
        </button>

        {lockedRootKey ? (
          <button type="button" className="sooq-chip isActive" disabled title="القسم مقفل حسب الصفحة">
            🔒 {CAT_STYLE[lockedRootKey]?.label || lockedRootKey}
          </button>
        ) : null}
        {/* المستوى الأول */}
        {activeRoot === 'all' ? (
          <>
            <button
              type="button"
              className={`sooq-chip isActive`}
              onClick={() => chooseRoot('all')}
            >
              الكل <span className="sooq-chipCount">{nearbyFilteredPoints.length}</span>
            </button>

            {ROOT_ORDER.map((k) => {
              const s = CAT_STYLE[k] || CAT_STYLE.other;
              const c = rootCounts.get(k) || 0;
              return (
                <button
                  key={k}
                  type="button"
                  className={`sooq-chip ${c === 0 ? 'isDisabled' : ''}`}
                  onClick={() => chooseRoot(k)}
                  title={s.label}
                  disabled={c === 0}
                >
                  <span className="sooq-chipDot" style={{ background: s.color }} />
                  <span className="sooq-chipText">{s.label}</span>
                  <span className="sooq-chipCount">{c}</span>
                </button>
              );
            })}
          </>
        ) : null}

        {/* سيارات -> ماركات -> موديلات */}
        {activeRoot === 'cars' ? (
          <>
            {!lockedRootKey && (
            <button type="button" className="sooq-chip" onClick={backToRoots} title="رجوع للأقسام">
              ⬅︎ الأقسام
            </button>
          )}

            {/* عند عدم اختيار ماركة: أعرض الماركات */}
            {!activeCarMake ? (
              <>
                <button
                  type="button"
                  className={`sooq-chip ${activeCarMake === '' ? 'isActive' : ''}`}
                  onClick={() => {
                    setActiveCarMake('');
                    setActiveCarModel('');
                  }}
                  title="كل السيارات"
                >
                  الكل <span className="sooq-chipCount">{rootCounts.get('cars') || 0}</span>
                </button>

                {CAR_MAKES.map((x) => {
                  const c = carsMakeCounts.get(x.key) || 0;
                  return (
                    <button
                      key={x.key}
                      type="button"
                      className={`sooq-chip ${activeCarMake === x.key ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                      onClick={() => {
                        setActiveCarMake(x.key);
                        setActiveCarModel('');
                      }}
                      title={x.label}
                      disabled={c === 0}
                    >
                      <span className="sooq-chipText">{x.label}</span>
                      <span className="sooq-chipCount">{c}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {/* رجوع خطوة للماركات */}
                <button type="button" className="sooq-chip" onClick={backCarsToMakes} title="رجوع للماركات">
                  ⬅︎ الماركات
                </button>

                <button
                  type="button"
                  className={`sooq-chip ${activeCarModel === '' ? 'isActive' : ''}`}
                  onClick={() => setActiveCarModel('')}
                  title="كل موديلات هذه الماركة"
                >
                  الكل <span className="sooq-chipCount">{carsMakeCounts.get(activeCarMake) || 0}</span>
                </button>

                {carModels.map((modelKey) => {
                  const c = carsModelCounts.get(modelKey) || 0;
                  return (
                    <button
                      key={modelKey}
                      type="button"
                      className={`sooq-chip ${activeCarModel === modelKey ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                      onClick={() => setActiveCarModel(modelKey)}
                      title={modelKey}
                      disabled={c === 0}
                    >
                      <span className="sooq-chipText">{modelKey}</span>
                      <span className="sooq-chipCount">{c}</span>
                    </button>
                  );
                })}
              </>
            )}
          </>
        ) : null}

        {/* المستوى الثاني: جوالات -> ماركات */}
        {activeRoot === 'phones' ? (
          <>
            {!lockedRootKey && (
            <button type="button" className="sooq-chip" onClick={backToRoots} title="رجوع للأقسام">
              ⬅︎ الأقسام
            </button>
          )}

            <button
              type="button"
              className={`sooq-chip ${activePhoneBrand === '' ? 'isActive' : ''}`}
              onClick={() => setActivePhoneBrand('')}
              title="كل الجوالات"
            >
              الكل <span className="sooq-chipCount">{rootCounts.get('phones') || 0}</span>
            </button>

            {PHONE_BRANDS.map((x) => {
              const c = phonesBrandCounts.get(x.key) || 0;
              return (
                <button
                  key={x.key}
                  type="button"
                  className={`sooq-chip ${activePhoneBrand === x.key ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                  onClick={() => setActivePhoneBrand(x.key)}
                  title={x.label}
                  disabled={c === 0}
                >
                  <span className="sooq-chipText">{x.label}</span>
                  <span className="sooq-chipCount">{c}</span>
                </button>
              );
            })}
          </>
        ) : null}

        {/* المستوى الثاني والثالث: عقارات -> بيع/إيجار -> نوع */}
        {activeRoot === 'realestate' ? (
          <>
            {/* رجوع للأقسام */}
            {!lockedRootKey && (
            <button type="button" className="sooq-chip" onClick={backToRoots} title="رجوع للأقسام">
              ⬅︎ الأقسام
            </button>
          )}

            {/* مستوى بيع/إيجار */}
            {!activeDealType ? (
              <>
                {DEAL_TYPES.map((x) => {
                  const c = realestateDealCounts.get(x.key) || 0;
                  return (
                  <button
                    key={x.key}
                    type="button"
                    disabled={c === 0}
                    className={`sooq-chip ${activeDealType === x.key ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                    onClick={() => {
                      setActiveDealType(x.key);
                      setActivePropertyType('');
                    }}
                    title={x.label}
                  >
                    <span className="sooq-chipText">{x.label}</span>
                    <span className="sooq-chipCount">{c}</span>
                  </button>
                  );
                })}
              </>
            ) : (
              <>
                {/* رجوع خطوة لبيع/إيجار */}
                <button type="button" className="sooq-chip" onClick={backRealestateToDeal} title="رجوع">
                  ⬅︎ بيع/إيجار
                </button>

                {/* كل الأنواع */}
                <button
                  type="button"
                  className={`sooq-chip ${activePropertyType === '' ? 'isActive' : ''}`}
                  onClick={() => setActivePropertyType('')}
                  title="كل الأنواع"
                >
                  الكل
                  <span className="sooq-chipCount">
                    {nearbyFilteredPoints.filter(
                      (p) =>
                        p._catKey === 'realestate' &&
                        (p?._tax?.dealType || '') === activeDealType
                    ).length || 0}
                  </span>
                </button>

                {PROPERTY_TYPES.map((x) => {
                  const c = realestatePropCounts.get(x.key) || 0;
                  return (
                    <button
                      key={x.key}
                      type="button"
                      disabled={c === 0}
                      className={`sooq-chip ${activePropertyType === x.key ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                      onClick={() => setActivePropertyType(x.key)}
                      title={x.label}
                    >
                      <span className="sooq-chipText">{x.label}</span>
                      <span className="sooq-chipCount">{c}</span>
                    </button>
                  );
                })}
              </>
            )}
          </>
        ) : null}

        {/* المستوى الثاني: أقسام أخرى -> فئات/أنواع */}
        {activeRoot !== 'all' &&
        activeRoot !== 'cars' &&
        activeRoot !== 'phones' &&
        activeRoot !== 'realestate' &&
        ROOT_TYPE_CONFIG[activeRoot] ? (
          <>
            {!lockedRootKey && (
            <button type="button" className="sooq-chip" onClick={backToRoots} title="رجوع للأقسام">
              ⬅︎ الأقسام
            </button>
          )}

            <button
              type="button"
              className={`sooq-chip ${!activeTypeKey ? 'isActive' : ''}`}
              onClick={() => setActiveTypeKey('')}
              title="الكل"
            >
              <span className="sooq-chipText">الكل</span>
              <span className="sooq-chipCount">{rootCounts.get(activeRoot) || 0}</span>
            </button>

            {ROOT_TYPE_CONFIG[activeRoot].options.map((x) => {
              const c = typeCounts.get(x.key) || 0;
              return (
                <button
                  key={x.key}
                  type="button"
                  disabled={c === 0}
                  className={`sooq-chip ${activeTypeKey === x.key ? 'isActive' : ''} ${c === 0 ? 'isDisabled' : ''}`}
                  onClick={() => setActiveTypeKey(x.key)}
                  title={x.label}
                >
                  <span className="sooq-chipText">{x.label}</span>
                  <span className="sooq-chipCount">{c}</span>
                </button>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );

  const MapBody = ({ mode }) => (
    <>
      {ChipsOverlay}

      <MapContainer
        whenCreated={mode === 'fs' ? setFsMap : setPageMap}
        center={DEFAULT_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        zoomControl={!isTouch} // ✅ +/− فقط لغير اللمس
        style={{ height: '100%', width: '100%' }}
        maxBounds={YEMEN_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {filteredPoints.map((l) => {
          const img = pickImage(l);
          const isSeenFlag = seen.has(String(l._id));
          const cat = getCatStyle(l._categoryValue || l._catKey);

          return (
            <Marker key={l._id} position={l._coords} icon={getMarkerIcon(l._categoryValue || l._catKey, isSeenFlag)}>
              <Popup>
                <div className="sooq-popupMini">
                  {img ? (
                    <img className="sooq-popupMiniImg" src={img} alt={l.title || 'صورة'} loading="lazy" />
                  ) : null}
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

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="sooq-mapHeader">
        <div className="sooq-mapTitle">🗺️ عرض الإعلانات على الخريطة</div>
        <div className="sooq-mapActions">
          <button type="button" className="sooq-actionBtn" onClick={openFullscreen} title="ملء الشاشة">
            ⛶ ملء الشاشة
          </button>
        </div>
      </div>

      {/* خريطة داخل الصفحة */}
      <div
        className="sooq-mapWrap"
        onClick={openFullscreenFromMap} // ✅ الآن دائماً يفتح ملء الشاشة على الجوال عند النقر
        style={{
          width: '100%',
          height: 'min(520px, 70vh)',
          minHeight: 360,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <MapBody mode="page" />
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {filteredPoints.length
          ? `✅ الظاهر على الخريطة: ${filteredPoints.length} إعلان${nearbyOn ? ' • (قريب من موقعي)' : ''}`
          : 'لا توجد إعلانات مطابقة للفلتر/أو لا توجد إعلانات لها موقع داخل اليمن.'}
      </div>

      {/* ملء الشاشة */}
      {portalReady && isFullscreen
          ? createPortal(
              <div className="sooq-fsOverlay" role="dialog" aria-label="الخريطة" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) closeFullscreen(e); }} onTouchStart={(e) => { if (e.target === e.currentTarget) closeFullscreen(e); }}>
                <div className="sooq-fsCard">
                  <button
                    type="button"
                    className="sooq-fsCloseOnly"
                    onClick={closeFullscreen}
                    aria-label="إغلاق"
                    title="إغلاق"
                  >
                    ✕
                  </button>

                  <button
                    type="button"
                    className={`sooq-locateBtn ${nearbyOn ? 'active' : ''}`}
                    onClick={locateMe}
                    title={nearbyOn ? 'إيقاف القريب مني' : 'القريب مني'}
                    aria-label={nearbyOn ? 'إيقاف القريب مني' : 'القريب مني'}
                  >
                    🎯
                    <span className="sooq-nearBadge">{nearbyOn ? 'تشغيل' : 'قريب'}</span>
                  </button>

                  <div className="sooq-fsMap" >
                    <MapBody mode="fs" />
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}

      <style jsx global>{`/* === Map Layout === */
.sooq-mapWrap {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
}
.sooq-mapWrap.isFullscreen {
  border-radius: 0;
  border: none;
}
.sooq-map {
  width: 100%;
  height: 100%;
}
.leaflet-container {
  width: 100%;
  height: 100%;
}

/* === Overlay / Chips === */
.sooq-mapOverlay {
  position: absolute;
  z-index: 500;
  left: 12px;
  right: 12px;
  top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}
.sooq-overlayBtn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 24px rgba(0,0,0,0.12);
  cursor: pointer;
  user-select: none;
}
.sooq-overlayBtnText {
  font-size: 13px;
  font-weight: 700;
}
.sooq-overlayBtnSmall {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 10px 24px rgba(0,0,0,0.12);
  cursor: pointer;
  user-select: none;
}
.sooq-chips {
  position: absolute;
  z-index: 500;
  left: 12px;
  right: 12px;
  top: 64px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.sooq-chips::-webkit-scrollbar { display: none; }

.sooq-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.84);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 18px rgba(0,0,0,0.10);
  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, box-shadow .12s ease;
}
.sooq-chip:hover { transform: translateY(-1px); }
.sooq-chip.isDisabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.sooq-chip.isActive {
  border-color: rgba(0,0,0,0.18);
  box-shadow: 0 12px 26px rgba(0,0,0,0.16);
}
.sooq-chipDot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #111;
  opacity: 0.85;
}
.sooq-chipText {
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}
.sooq-chipCount {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.65;
}

/* === Custom Pin Icon === */
.sooq-pin {
  position: relative;
  width: 34px;
  height: 34px;
}
.sooq-pinDot {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #111;
  box-shadow: 0 10px 20px rgba(0,0,0,0.22);
  border: 2px solid rgba(255,255,255,0.95);
}
.sooq-pinIcon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

/* === Popup mini card === */
.sooq-popupMini {
  width: 220px;
  max-width: 240px;
  display: grid;
  gap: 8px;
}
.sooq-popupMiniImg {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
}
.sooq-popupMiniTitle {
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  max-height: 2.7em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sooq-popupMiniMeta {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.70;
}
.sooq-popupMiniBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 900;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(0,0,0,0.04);
  text-decoration: none;
}

/* === Fullscreen Overlay === */
.sooq-fsOverlay {
position: fixed;
inset: 0;
z-index: 999999;
background: rgba(0,0,0,0.55);
display: flex;
align-items: center;
justify-content: center;
padding: 2.5vh 2.5vw;
}

.sooq-fsCard {
position: relative;
inset: auto;
width: min(1600px, 95vw);
height: 95vh;
background: #fff;
border-radius: 18px;
overflow: hidden;
box-shadow: 0 24px 60px rgba(0,0,0,0.35);
}

.sooq-fsMap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.sooq-fsCloseOnly {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: 12px;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.90);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.18);
  cursor: pointer;
  z-index: 10010;
}
.sooq-locateBtn {
  position: absolute;
  right: 12px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.10);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 14px 34px rgba(0,0,0,0.20);
  cursor: pointer;
  z-index: 10010;
  user-select: none;
}
.sooq-locateBtn.active {
  border-color: rgba(0,0,0,0.18);
  box-shadow: 0 18px 40px rgba(0,0,0,0.26);
}
.sooq-nearBadge {
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.06);
}

/* In fullscreen, push overlays below the close button */
.sooq-fsCard .sooq-mapOverlay { top: 64px; }
.sooq-fsCard .sooq-chips { top: 116px; }
/* Mobile: true full-screen (no margins) */
@media (max-width: 640px){
  .sooq-fsOverlay{
    background: #fff;
    padding: 0;
  }
  .sooq-fsCard{
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    box-shadow: none;
  }
  .sooq-fsCard .sooq-mapOverlay{ top: calc(env(safe-area-inset-top, 0px) + 64px); }
  .sooq-fsCard .sooq-chips{ top: calc(env(safe-area-inset-top, 0px) + 116px); }
}


.sooq-fsCard {
    position: relative;
    inset: auto;
    width: min(1600px, 96vw);
    height: min(980px, 92vh);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 22px 70px rgba(0,0,0,0.40);
    border: 1px solid rgba(255,255,255,0.22);
  }
  .sooq-fsCloseOnly {
    top: 12px;
    right: 12px;
  }
  .sooq-locateBtn {
    right: 12px;
    bottom: 12px;
  }
  .sooq-fsCard .sooq-mapOverlay { top: 60px; }
  .sooq-fsCard .sooq-chips { top: 110px; }
}`}</style>
    </div>
  );
}
