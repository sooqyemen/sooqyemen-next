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

// ✅ توحيد القسم
function getListingCategoryValue(listing) {
  return (
    listing?.rootCategory ??
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

// ✅ توحيد اسم القسم
function normalizeCategoryKey(v) {
  const raw = String(v || '').trim();
  if (!raw) return 'other';
  const lowered = raw.toLowerCase();
  const norm = lowered.replace(/\s+/g, '_').replace(/-/g, '_').replace(/__+/g, '_');

  const map = {
    real_estate: 'realestate',
    realestate: 'realestate',
    mobiles: 'phones',
    mobile: 'phones',
    phones: 'phones',
    phone: 'phones',
    animals_birds: 'animals',
    animalsbirds: 'animals',
    animals: 'animals',
    heavy_equipment: 'heavy_equipment',
    heavyequipment: 'heavy_equipment',
    'heavy equipment': 'heavy_equipment',
    network: 'networks',
    networks: 'networks',
    maintenance: 'maintenance',
    home_tools: 'home_tools',
    hometools: 'home_tools',
    'home tools': 'home_tools',
    cars: 'cars',
    electronics: 'electronics',
    motorcycles: 'motorcycles',
    solar: 'solar',
    furniture: 'furniture',
    clothes: 'clothes',
    jobs: 'jobs',
    services: 'services',
    other: 'other',

    // عربي
    سيارات: 'cars',
    عقارات: 'realestate',
    جوالات: 'phones',
    إلكترونيات: 'electronics',
    الكترونيات: 'electronics',
    دراجات_نارية: 'motorcycles',
    دراجات: 'motorcycles',
    معدات_ثقيلة: 'heavy_equipment',
    طاقة_شمسية: 'solar',
    نت_وشبكات: 'networks',
    نت_و_شبكات: 'networks',
    صيانة: 'maintenance',
    أثاث: 'furniture',
    اثاث: 'furniture',
    ملابس: 'clothes',
    حيوانات_وطيور: 'animals',
    حيوانات: 'animals',
    وظائف: 'jobs',
    خدمات: 'services',
    اخرى: 'other',
    أخرى: 'other',
    أدوات_منزلية: 'home_tools',
    ادوات_منزلية: 'home_tools',
    'أدوات منزلية': 'home_tools',
    'ادوات منزلية': 'home_tools',
  };

  return map[norm] || map[raw] || norm || 'other';
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
  home_tools: { color: '#22c55e', icon: '🧹', label: 'أدوات منزلية' },
  clothes: { color: '#db2777', icon: '👕', label: 'ملابس' },
  animals: { color: '#84cc16', icon: '🐑', label: 'حيوانات' },
  jobs: { color: '#334155', icon: '💼', label: 'وظائف' },
  services: { color: '#0f172a', icon: '🧰', label: 'خدمات' },
  other: { color: '#475569', icon: '📦', label: 'أخرى' },
};

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

export default function HomeMapView({ listings = [] }) {
  const [seen, setSeen] = useState(() => new Set());

  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  // ✅ خريطتين منفصلتين: واحدة داخل الصفحة + واحدة ملء الشاشة
  const [pageMap, setPageMap] = useState(null);
  const [fsMap, setFsMap] = useState(null);

  // فلتر الأقسام
  const [activeCat, setActiveCat] = useState('all');

  // ✅ فلاتر هرمية
  const [sub1, setSub1] = useState(''); // cars: carMake | phones: phoneBrand | realestate: dealType
  const [sub2, setSub2] = useState(''); // realestate: propertyType

  // فلترة القريب
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null); // [[south, west],[north,east]]

  // ملء الشاشة عبر Portal
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // فتح تلقائي للجوال عند أول تفاعل
  const [openedOnce, setOpenedOnce] = useState(false);

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

  // ✅ فتح ملء الشاشة عند النقر على الخريطة
  const handleMapClick = () => {
    if (isMobile && openedOnce) return;
    setIsFullscreen(true);
    if (isMobile) setOpenedOnce(true);
  };

  const points = useMemo(() => {
    return (listings || [])
      .map((l) => {
        const id = getListingId(l);
        if (!id) return null;

        const c = normalizeCoords(l);
        if (!c) return null;
        if (!inYemen(c)) return null;

        const categoryValue = getListingCategoryValue(l);
        const catKey = normalizeCategoryKey(categoryValue);

        // ✅ infer taxonomy للفروع (حتى لو بيانات قديمة)
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
        };
      })
      .filter(Boolean);
  }, [listings]);

  // كاش للأيقونات
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

  // counts للأقسام
  const catCounts = useMemo(() => {
    const m = new Map();
    for (const p of points) {
      const k = p._catKey || 'other';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [points]);

  const availableCats = useMemo(() => {
    const keys = Object.keys(CAT_STYLE);
    return keys.filter((k) => (catCounts.get(k) || 0) > 0);
  }, [catCounts]);

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

  // ✅ أول فلترة: القسم + قريب
  const baseFilteredPoints = useMemo(() => {
    let arr = points;
    if (activeCat !== 'all') arr = arr.filter((p) => p._catKey === activeCat);

    if (nearbyOn && boundsObj) {
      arr = arr.filter((p) => boundsObj.contains(L.latLng(p._coords[0], p._coords[1])));
    }
    return arr;
  }, [points, activeCat, nearbyOn, boundsObj]);

  // ✅ استخراج المتاح للفروع (من البيانات الحالية فقط)
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

  // ✅ فلترة نهائية: تطبيق الهرمي
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

  // ✅ تصفير الفروع عند تغيير القسم
  useEffect(() => {
    setSub1('');
    setSub2('');
  }, [activeCat]);

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

  const ChipsOverlay = (
    <div className="sooq-mapOverlay">
      {/* الشريط الأساسي (مثل القديم) */}
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
          return (
            <button
              key={k}
              type="button"
              className={`sooq-chip ${activeCat === k ? 'isActive' : ''}`}
              onClick={() => setActiveCat(k)}
              title={s.label}
            >
              <span className="sooq-chipDot" style={{ background: s.color }} />
              <span className="sooq-chipText">{s.label}</span>
              <span className="sooq-chipCount">{c}</span>
            </button>
          );
        })}
      </div>

      {/* ✅ الفلاتر الهرمية (تظهر تحت الشريط الأساسي) */}
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
      {availableCats.length > 0 ? ChipsOverlay : null}

      <MapContainer
        whenCreated={mode === 'fs' ? setFsMap : setPageMap}
        center={DEFAULT_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        zoomControl={!isTouch}
        style={{ height: '100%', width: '100%' }}
        maxBounds={YEMEN_BOUNDS}
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
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🗺️ عرض الإعلانات على الخريطة</div>

      {/* خريطة داخل الصفحة - الآن قابلة للنقر لفتح ملء الشاشة */}
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
            <div className="sooq-fsOverlay" role="dialog" aria-label="الخريطة">
              <button 
                type="button" 
                className="sooq-fsCloseOnly" 
                onClick={() => setIsFullscreen(false)}
                aria-label="إغلاق الخريطة"
              >
                ✕
              </button>

              <div className="sooq-fsMap">
                <MapBody mode="fs" />
              </div>

              <button
                type="button"
                className={`sooq-locateBtn ${nearbyOn ? 'isActive' : ''}`}
                onClick={locateMe}
                aria-label={nearbyOn ? 'إلغاء القريب من موقعي' : 'تحديد موقعي'}
                title={nearbyOn ? 'عرض الكل' : 'تحديد موقعي'}
              >
                🎯
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

        @media (max-width: 520px) {
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
        }

        .sooq-chip.isActive {
          border-color: rgba(0, 0, 0, 0.18);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
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
        }

        @media (max-width: 520px) {
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
        }

        .sooq-fsMap {
          position: absolute;
          inset: 0;
          height: 100dvh;
          width: 100vw;
        }

        .sooq-fsCloseOnly {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 16px);
          right: 16px;
          z-index: 999999;
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: none;
          background: #dc2626;
          color: white;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .sooq-fsCloseOnly:hover {
          background: #b91c1c;
          transform: scale(1.05);
        }

        .sooq-fsOverlay .sooq-mapOverlay {
          top: calc(env(safe-area-inset-top, 0px) + 76px);
        }

        .sooq-locateBtn {
          position: fixed;
          right: 16px;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
          z-index: 999999;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: none;
          background: #3b82f6;
          color: white;
          font-size: 22px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .sooq-locateBtn:hover {
          background: #2563eb;
          transform: scale(1.05);
        }

        .sooq-locateBtn.isActive {
          background: #1d4ed8;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25);
          transform: translateY(-1px) scale(1.05);
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
      `}</style>
    </div>
  );
}
