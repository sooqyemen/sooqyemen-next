'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ taxonomy (اللي أضفتوه قبل)
import {
  inferListingTaxonomy,
  CAR_MAKES,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
} from '@/lib/taxonomy';

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

// ✅ توحيد ID - محسّن للتعامل مع أنواع مختلفة
function getListingId(listing) {
  if (!listing) return null;
  
  // جرب جميع الحقول الممكنة
  const possibleIdFields = [
    'id', '_id', 'docId', 'uid', 'slug', 
    'listingId', 'adId', 'postId', 'itemId'
  ];
  
  for (const field of possibleIdFields) {
    if (listing[field] != null && listing[field] !== '') {
      return String(listing[field]);
    }
  }
  
  // إذا لم يوجد ID، نولد واحدًا مؤقتًا بناءً على المحتوى
  return `temp_${JSON.stringify(listing).hashCode()}`;
}

// ✅ دالة مساعدة لإنشاء hash من النص
String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// ✅ توحيد القسم - محسّن لالتقاط جميع الأنماط
function getListingCategoryValue(listing) {
  if (!listing) return 'other';
  
  // جرب جميع الحقول الممكنة للقسم
  const possibleCategoryFields = [
    'rootCategory', 'category', 'section', 'cat',
    'categoryKey', 'category_id', 'categoryId',
    'type', 'mainCategory', 'subCategory', 'group'
  ];
  
  for (const field of possibleCategoryFields) {
    if (listing[field] != null && listing[field] !== '') {
      const value = listing[field];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim();
      }
    }
  }
  
  return 'other';
}

// ✅ توحيد الإحداثيات - محسّن للتعامل مع تنسيقات متنوعة
function normalizeCoords(listing) {
  if (!listing) return null;
  
  const toNum = (v) => {
    if (v == null) return null;
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    return Number.isFinite(n) ? n : null;
  };

  // أولاً: تحقق من الحقول المباشرة
  const lat = toNum(listing.lat ?? listing.latitude ?? listing.latitud);
  const lng = toNum(listing.lng ?? listing.lon ?? listing.long ?? listing.longitude);
  
  if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return [lat, lng];
  }

  // ثانياً: تحقق من كائن coords
  if (listing.coords) {
    if (Array.isArray(listing.coords) && listing.coords.length >= 2) {
      const lat = toNum(listing.coords[0]);
      const lng = toNum(listing.coords[1]);
      if (lat != null && lng != null) return [lat, lng];
    }
    if (listing.coords.lat != null && listing.coords.lng != null) {
      const lat = toNum(listing.coords.lat);
      const lng = toNum(listing.coords.lng);
      if (lat != null && lng != null) return [lat, lng];
    }
  }

  // ثالثاً: تحقق من كائن location
  if (listing.location) {
    const lat = toNum(listing.location.lat ?? listing.location.latitude);
    const lng = toNum(listing.location.lng ?? listing.location.lon ?? listing.location.longitude);
    if (lat != null && lng != null) return [lat, lng];
  }

  // رابعاً: تحقق من كائن geo
  if (listing.geo) {
    const lat = toNum(listing.geo.lat ?? listing.geo.latitude);
    const lng = toNum(listing.geo.lng ?? listing.geo.lon ?? listing.geo.longitude);
    if (lat != null && lng != null) return [lat, lng];
  }

  // خامساً: تحقق من حقل address إذا كان يحتوي على إحداثيات
  if (listing.address && typeof listing.address === 'string') {
    const coordMatch = listing.address.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = toNum(coordMatch[1]);
      const lng = toNum(coordMatch[2]);
      if (lat != null && lng != null) return [lat, lng];
    }
  }

  return null;
}

// ✅ توسيع حدود اليمن لتشمل جميع المناطق
const YEMEN_EXPANDED_BOUNDS = [
  [11.0, 40.0], // جنوب غرب موسع
  [20.0, 55.0], // شمال شرق موسع
];

function inYemen([lat, lng]) {
  return (
    lat >= YEMEN_EXPANDED_BOUNDS[0][0] &&
    lat <= YEMEN_EXPANDED_BOUNDS[1][0] &&
    lng >= YEMEN_EXPANDED_BOUNDS[0][1] &&
    lng <= YEMEN_EXPANDED_BOUNDS[1][1]
  );
}

// ✅ توحيد اسم القسم - محسّن مع المزيد من المرادفات
function normalizeCategoryKey(v) {
  if (v == null) return 'other';
  
  const raw = String(v).trim().toLowerCase();
  if (!raw) return 'other';
  
  // تنظيف النص
  const cleaned = raw
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^\w\u0600-\u06FF_]/g, '') // إزالة الرموز الخاصة مع الحفاظ على العربية
    .trim();

  // قاموس موسع للمرادفات
  const synonymMap = {
    // سيارات
    'سيارات': 'cars',
    'سيارة': 'cars',
    'سياره': 'cars',
    'car': 'cars',
    'automotive': 'cars',
    'مركبات': 'cars',
    
    // عقارات
    'عقارات': 'realestate',
    'عقار': 'realestate',
    'عقارية': 'realestate',
    'real_estate': 'realestate',
    'realestate': 'realestate',
    'property': 'realestate',
    'properties': 'realestate',
    
    // جوالات
    'جوالات': 'phones',
    'جوال': 'phones',
    'موبايل': 'phones',
    'موبيل': 'phones',
    'mobiles': 'phones',
    'mobile': 'phones',
    'هواتف': 'phones',
    'هاتف': 'phones',
    
    // إلكترونيات
    'إلكترونيات': 'electronics',
    'الكترونيات': 'electronics',
    'الكتروني': 'electronics',
    'electronic': 'electronics',
    'electronics': 'electronics',
    'اجهزة': 'electronics',
    'أجهزة': 'electronics',
    
    // دراجات
    'دراجات_نارية': 'motorcycles',
    'دراجات': 'motorcycles',
    'دراجة': 'motorcycles',
    'motorbikes': 'motorcycles',
    'motorcycles': 'motorcycles',
    'bikes': 'motorcycles',
    
    // معدات ثقيلة
    'معدات_ثقيلة': 'heavy_equipment',
    'معداتثقيلة': 'heavy_equipment',
    'معدات': 'heavy_equipment',
    'equipment': 'heavy_equipment',
    'heavy_equipment': 'heavy_equipment',
    'heavyequipment': 'heavy_equipment',
    'مكائن': 'heavy_equipment',
    
    // طاقة شمسية
    'طاقة_شمسية': 'solar',
    'طاقةشمسية': 'solar',
    'شمسية': 'solar',
    'solar': 'solar',
    'solar_energy': 'solar',
    
    // نت وشبكات
    'نت_وشبكات': 'networks',
    'نت_و_شبكات': 'networks',
    'نتوشبكات': 'networks',
    'شبكات': 'networks',
    'network': 'networks',
    'networks': 'networks',
    'انترنت': 'networks',
    
    // صيانة
    'صيانة': 'maintenance',
    'maintenance': 'maintenance',
    'تصليح': 'maintenance',
    'اصلاح': 'maintenance',
    'repair': 'maintenance',
    
    // أثاث
    'أثاث': 'furniture',
    'اثاث': 'furniture',
    'furniture': 'furniture',
    'أثاث_منزلي': 'furniture',
    'اثاث_منزلي': 'furniture',
    
    // أدوات منزلية
    'أدوات_منزلية': 'home_tools',
    'ادوات_منزلية': 'home_tools',
    'أدواتمنزلية': 'home_tools',
    'ادواتمنزلية': 'home_tools',
    'أدوات': 'home_tools',
    'ادوات': 'home_tools',
    'tools': 'home_tools',
    
    // ملابس
    'ملابس': 'clothes',
    'clothes': 'clothes',
    'clothing': 'clothes',
    'أزياء': 'clothes',
    'ازياء': 'clothes',
    'fashion': 'clothes',
    
    // حيوانات
    'حيوانات_وطيور': 'animals',
    'حيوانات': 'animals',
    'animals': 'animals',
    'pets': 'animals',
    'طيور': 'animals',
    'birds': 'animals',
    
    // وظائف
    'وظائف': 'jobs',
    'وظيفة': 'jobs',
    'jobs': 'jobs',
    'employment': 'jobs',
    'عمل': 'jobs',
    'وظيفه': 'jobs',
    
    // خدمات
    'خدمات': 'services',
    'service': 'services',
    'services': 'services',
    
    // أخرى
    'اخرى': 'other',
    'أخرى': 'other',
    'other': 'other',
    'متنوع': 'other',
    'مختلف': 'other',
    'general': 'other',
  };

  // أولاً: ابحث عن تطابق مباشر
  if (synonymMap[cleaned]) {
    return synonymMap[cleaned];
  }

  // ثانياً: ابحث عن تطابق جزئي
  for (const [key, value] of Object.entries(synonymMap)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return value;
    }
  }

  return 'other';
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

// ✅ جميع الأقسام المتاحة
const ALL_CATEGORIES = Object.keys(CAT_STYLE);

function getCatStyle(categoryValue) {
  const key = normalizeCategoryKey(categoryValue);
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
  if (!listing) return null;
  
  // جرب عدة حقول للصورة
  const imageFields = [
    'image', 'cover', 'thumbnail', 'mainImage', 'imageUrl',
    'photo', 'picture', 'img', 'featuredImage'
  ];
  
  for (const field of imageFields) {
    if (listing[field]) {
      if (typeof listing[field] === 'string') return listing[field];
      if (typeof listing[field] === 'object' && listing[field].url) {
        return listing[field].url;
      }
    }
  }
  
  // تحقق من مصفوفة الصور
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    const firstImg = listing.images[0];
    if (typeof firstImg === 'string') return firstImg;
    if (firstImg && typeof firstImg === 'object') {
      return firstImg.url || firstImg.src || firstImg.path || null;
    }
  }
  
  if (Array.isArray(listing.photos) && listing.photos.length > 0) {
    const firstPhoto = listing.photos[0];
    if (typeof firstPhoto === 'string') return firstPhoto;
    if (firstPhoto && typeof firstPhoto === 'object') {
      return firstPhoto.url || firstPhoto.src || firstPhoto.path || null;
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

export default function HomeMapView({ listings = [] }) {
  const [seen, setSeen] = useState(() => new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [filteredOutListings, setFilteredOutListings] = useState([]);

  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  const [pageMap, setPageMap] = useState(null);
  const [fsMap, setFsMap] = useState(null);

  const [activeCat, setActiveCat] = useState('all');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');

  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isFullscreen]);

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

  const handleMapClick = () => {
    if (isMobile && openedOnce) return;
    setIsFullscreen(true);
    if (isMobile) setOpenedOnce(true);
  };

  const points = useMemo(() => {
    const filteredOut = [];
    const processed = (listings || [])
      .map((l, index) => {
        const id = getListingId(l);
        
        if (!id) {
          filteredOut.push({
            listing: l,
            reason: 'لا يوجد ID',
            index
          });
          return null;
        }

        const c = normalizeCoords(l);
        
        if (!c) {
          filteredOut.push({
            listing: l,
            reason: 'لا توجد إحداثيات صالحة',
            id,
            index
          });
          return null;
        }
        
        if (!inYemen(c)) {
          filteredOut.push({
            listing: l,
            reason: 'خارج حدود اليمن',
            coords: c,
            id,
            index
          });
          return null;
        }

        const categoryValue = getListingCategoryValue(l);
        const catKey = normalizeCategoryKey(categoryValue);
        
        let tax = null;
        try {
          tax = inferListingTaxonomy(l, catKey);
        } catch {
          tax = null;
        }

        return {
          ...l,
          _id: String(id),
          _coords: c,
          _categoryValue: categoryValue,
          _catKey: catKey,
          _tax: tax,
          _originalIndex: index,
        };
      })
      .filter(Boolean);
    
    if (debugMode) {
      setFilteredOutListings(filteredOut);
      console.log('✅ الإعلانات المعالجة:', processed.length);
      console.log('❌ الإعلانات المستبعدة:', filteredOut);
      console.log('📊 الإجمالي:', listings.length);
    }
    
    return processed;
  }, [listings, debugMode]);

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

  const availableCats = useMemo(() => {
    return ALL_CATEGORIES;
  }, []);

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

  const baseFilteredPoints = useMemo(() => {
    let arr = points;
    if (activeCat !== 'all') arr = arr.filter((p) => p._catKey === activeCat);

    if (nearbyOn && boundsObj) {
      arr = arr.filter((p) => boundsObj.contains(L.latLng(p._coords[0], p._coords[1])));
    }
    return arr;
  }, [points, activeCat, nearbyOn, boundsObj]);

  const subCounts = useMemo(() => {
    const out = {
      carMake: new Map(),
      phoneBrand: new Map(),
      dealType: new Map(),
      propertyType: new Map(),
    };

    for (const p of baseFilteredPoints) {
      const t = p._tax;
      if (!t) continue;

      if (p._catKey === 'cars' && t.carMake) {
        out.carMake.set(t.carMake, (out.carMake.get(t.carMake) || 0) + 1);
      }
      if (p._catKey === 'phones' && t.phoneBrand) {
        out.phoneBrand.set(t.phoneBrand, (out.phoneBrand.get(t.phoneBrand) || 0) + 1);
      }
      if (p._catKey === 'realestate') {
        if (t.dealType) out.dealType.set(t.dealType, (out.dealType.get(t.dealType) || 0) + 1);
        if (t.propertyType)
          out.propertyType.set(t.propertyType, (out.propertyType.get(t.propertyType) || 0) + 1);
      }
    }
    return out;
  }, [baseFilteredPoints]);

  const filteredPoints = useMemo(() => {
    let arr = baseFilteredPoints;

    if (activeCat === 'cars' && sub1) {
      arr = arr.filter((p) => p._tax?.carMake === sub1);
    }
    if (activeCat === 'phones' && sub1) {
      arr = arr.filter((p) => p._tax?.phoneBrand === sub1);
    }
    if (activeCat === 'realestate') {
      if (sub1) arr = arr.filter((p) => p._tax?.dealType === sub1);
      if (sub2) arr = arr.filter((p) => p._tax?.propertyType === sub2);
    }

    return arr;
  }, [baseFilteredPoints, activeCat, sub1, sub2]);

  useEffect(() => {
    setSub1('');
    setSub2('');
  }, [activeCat]);

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

  const ChipsOverlay = ({ isFullscreenMode = false }) => (
    <div className={`sooq-mapOverlay ${isFullscreenMode ? 'sooq-mapOverlay--fullscreen' : ''}`}>
      <div className="sooq-chips" role="tablist" aria-label="فلترة الأقسام">
        <button
          type="button"
          className={`sooq-chip ${activeCat === 'all' ? 'isActive' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          الكل <span className="sooq-chipCount">{points.length}</span>
        </button>

        {availableCats.map((k) => {
          const s = CAT_STYLE[k] || CAT_STYLE.other;
          const c = catCounts.get(k) || 0;
          const hasListings = c > 0;
          
          return (
            <button
              key={k}
              type="button"
              className={`sooq-chip ${activeCat === k ? 'isActive' : ''} ${!hasListings ? 'sooq-chip--disabled' : ''}`}
              onClick={() => hasListings && setActiveCat(k)}
              title={hasListings ? s.label : `${s.label} (لا توجد إعلانات)`}
              disabled={!hasListings}
            >
              <span className="sooq-chipDot" style={{ background: s.color }} />
              <span className="sooq-chipText">{s.label}</span>
              <span className="sooq-chipCount">{c}</span>
            </button>
          );
        })}
      </div>

      {activeCat === 'cars' && subCounts.carMake.size > 0 ? (
        <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة ماركات السيارات">
          {sub1 ? (
            <button type="button" className="sooq-chip" onClick={() => setSub1('')}>
              ↩ رجوع
            </button>
          ) : null}

          {CAR_MAKES.filter((m) => subCounts.carMake.get(m.key)).map((m) => (
            <button
              key={m.key}
              type="button"
              className={`sooq-chip ${sub1 === m.key ? 'isActive' : ''}`}
              onClick={() => setSub1(m.key)}
            >
              <span className="sooq-chipText">{m.label}</span>
              <span className="sooq-chipCount">{subCounts.carMake.get(m.key)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCat === 'phones' && subCounts.phoneBrand.size > 0 ? (
        <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة ماركات الجوالات">
          {sub1 ? (
            <button type="button" className="sooq-chip" onClick={() => setSub1('')}>
              ↩ رجوع
            </button>
          ) : null}

          {PHONE_BRANDS.filter((b) => subCounts.phoneBrand.get(b.key)).map((b) => (
            <button
              key={b.key}
              type="button"
              className={`sooq-chip ${sub1 === b.key ? 'isActive' : ''}`}
              onClick={() => setSub1(b.key)}
            >
              <span className="sooq-chipText">{b.label}</span>
              <span className="sooq-chipCount">{subCounts.phoneBrand.get(b.key)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCat === 'realestate' && (subCounts.dealType.size > 0 || subCounts.propertyType.size > 0) ? (
        <>
          <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة بيع/إيجار">
            {(sub1 || sub2) ? (
              <button
                type="button"
                className="sooq-chip"
                onClick={() => {
                  setSub1('');
                  setSub2('');
                }}
              >
                ↩ رجوع
              </button>
            ) : null}

            {DEAL_TYPES.filter((d) => subCounts.dealType.get(d.key)).map((d) => (
              <button
                key={d.key}
                type="button"
                className={`sooq-chip ${sub1 === d.key ? 'isActive' : ''}`}
                onClick={() => {
                  setSub1(d.key);
                  setSub2('');
                }}
              >
                <span className="sooq-chipText">{d.label}</span>
                <span className="sooq-chipCount">{subCounts.dealType.get(d.key)}</span>
              </button>
            ))}
          </div>

          {sub1 ? (
            <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة نوع العقار">
              {PROPERTY_TYPES.filter((p) => subCounts.propertyType.get(p.key)).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`sooq-chip ${sub2 === p.key ? 'isActive' : ''}`}
                  onClick={() => setSub2(p.key)}
                >
                  <span className="sooq-chipText">{p.label}</span>
                  <span className="sooq-chipCount">{subCounts.propertyType.get(p.key)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  const MapBody = ({ mode }) => (
    <>
      <MapContainer
        whenCreated={mode === 'fs' ? setFsMap : setPageMap}
        center={DEFAULT_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        zoomControl={!isTouch}
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

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>🗺️ عرض الإعلانات على الخريطة</div>
        <button 
          onClick={() => setDebugMode(!debugMode)}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            background: debugMode ? '#dc2626' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {debugMode ? 'إيقاف التصحيح' : 'تفعيل وضع التصحيح'}
        </button>
      </div>

      {debugMode && filteredOutListings.length > 0 && (
        <div style={{
          background: '#fee2e2',
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
          fontSize: 12,
          border: '1px solid #fecaca'
        }}>
          <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: 5 }}>
            ⚠️ {filteredOutListings.length} إعلان مستبعد من الخريطة:
          </div>
          <div style={{ maxHeight: 100, overflowY: 'auto' }}>
            {filteredOutListings.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 3 }}>
                <strong>#{item.index}:</strong> {item.reason}
                {item.coords && ` (${item.coords[0]}, ${item.coords[1]})`}
              </div>
            ))}
          </div>
        </div>
      )}

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
        {availableCats.length > 0 ? <ChipsOverlay /> : null}
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
              <ChipsOverlay isFullscreenMode={true} />

              {/* زر الإغلاق في أعلى اليسار - تم إصلاح موقعه */}
              <button 
                type="button" 
                className="sooq-fsCloseBtn" 
                onClick={() => setIsFullscreen(false)}
                aria-label="إغلاق الخريطة"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="sooq-fsMap">
                <MapBody mode="fs" />
              </div>

              {/* مجموعة التحكم في أعلى اليمين - تم إصلاح تصميمها */}
              <div className="sooq-map-controls">
                {/* زر تحديد الموقع - أيقونة جديدة */}
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
              </div>
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
        }

        .sooq-mapOverlay--fullscreen .sooq-chips {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
          padding: 10px;
          min-height: 50px;
        }

        .sooq-chips--sub {
          margin-top: 8px;
        }

        .sooq-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
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

        .sooq-chip:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
        }

        .sooq-chip.isActive {
          border-color: rgba(0, 0, 0, 0.18);
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
        }

        .sooq-chipText {
          font-weight: 800;
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
        }

        .sooq-chip--disabled .sooq-chipCount {
          background: rgba(0, 0, 0, 0.04);
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

        /* زر الإغلاق - أعلى اليسار - تم إصلاح موقعه */
        .sooq-fsCloseBtn {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1000001;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }

        .sooq-fsCloseBtn:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .sooq-fsCloseBtn svg {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 768px) {
          .sooq-fsCloseBtn {
            top: calc(env(safe-area-inset-top, 0px) + 10px);
            left: 10px;
            width: 40px;
            height: 40px;
          }
          .sooq-fsCloseBtn svg {
            width: 18px;
            height: 18px;
          }
        }

        /* مجموعة التحكم في أعلى اليمين - تم إصلاح تصميمها */
        .sooq-map-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .sooq-map-controls {
            top: calc(env(safe-area-inset-top, 0px) + 10px);
            right: 10px;
            gap: 8px;
          }
        }

        /* زر تحديد الموقع - أيقونة جديدة */
        .sooq-locateBtn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }

        .sooq-locateBtn:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .sooq-locateBtn.isActive {
          background: #3b82f6;
          color: white;
        }

        .sooq-locateBtn svg {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 768px) {
          .sooq-locateBtn {
            width: 40px;
            height: 40px;
          }
          
          .sooq-locateBtn svg {
            width: 18px;
            height: 18px;
          }
        }

        /* تحسين عرض عناصر التحكم الخاصة بـ Leaflet */
        .leaflet-top.leaflet-right {
          top: 80px !important;
          right: 20px !important;
        }

        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-radius: 12px !important;
          overflow: hidden;
          backdrop-filter: blur(8px);
          background: rgba(255, 255, 255, 0.95) !important;
        }

        .leaflet-control-zoom a {
          width: 44px !important;
          height: 44px !important;
          line-height: 44px !important;
          background: transparent !important;
          color: #333 !important;
          border: none !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
        }

        .leaflet-control-zoom a:hover {
          background: rgba(0, 0, 0, 0.05) !important;
        }

        .leaflet-control-zoom a:first-child {
          border-top-left-radius: 12px !important;
          border-top-right-radius: 12px !important;
        }

        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
          border-bottom-left-radius: 12px !important;
          border-bottom-right-radius: 12px !important;
        }

        @media (max-width: 768px) {
          .leaflet-top.leaflet-right {
            top: 140px !important;
            right: 10px !important;
          }
          
          .leaflet-control-zoom a {
            width: 40px !important;
            height: 40px !important;
            line-height: 40px !important;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          .leaflet-control-zoom {
            display: flex !important;
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
      `}</style>
    </div>
  );
}
