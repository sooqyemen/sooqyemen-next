// components/Map/HomeMapView.jsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// ✅ توحيد ID (يدعم اختلافات Firestore / API)
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

// ✅ توحيد القسم (يقرأ من أكثر من حقل)
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

// ✅ توحيد الإحداثيات (يدعم صيغ كثيرة)
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

// ✅ توحيد اسم القسم (يدعم العربية + الإنجليزي)
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

// ✅ ألوان + أيقونات لكل قسم (Marker)
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

function getCatStyle(categoryValue) {
  const key = normalizeCategoryKey(categoryValue);
  return CAT_STYLE[key] || CAT_STYLE.other;
}

// ✅ بناء دبوس HTML (divIcon) مع لون + أيقونة
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

// Small formatter (YER)
function fmtYER(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ar-YE').format(Math.round(n)) + ' ريال';
}

// ✅ صورة الإعلان (يدعم صور بصيغ مختلفة)
function pickImage(listing) {
  const imgs = listing?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return first.url || first.src || first.path || null;
  }
  return (
    listing?.image ||
    listing?.cover ||
    listing?.thumbnail ||
    listing?.mainImage ||
    listing?.imageUrl ||
    null
  );
}

export default function HomeMapView({ listings = [] }) {
  const [seen, setSeen] = useState(() => new Set());
  const [map, setMap] = useState(null);

  // فلتر الأقسام (Chips)
  const [activeCat, setActiveCat] = useState('all');

  // ✅ قريب من هنا (بدون كم): فلترة داخل حدود الخريطة الحالية
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null); // [[south, west],[north,east]]

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  // ✅ إصلاح: invalidateSize عشان الخريطة تظهر بكامل المساحة بعد الرندر/التبديل
  useEffect(() => {
    if (!map) return;

    const tick = () => {
      try {
        map.invalidateSize();
      } catch {}
    };

    const t1 = setTimeout(tick, 0);
    const t2 = setTimeout(tick, 200);

    window.addEventListener('resize', tick);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', tick);
    };
  }, [map]);

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

        return {
          ...l,
          _id: String(id),
          _coords: c,
          _categoryValue: categoryValue,
          _catKey: catKey,
        };
      })
      .filter(Boolean);
  }, [listings]);

  // ✅ كاش للأيقونات (عشان ما نعيد بناء icon لكل Marker كل رندر)
  const iconCache = useMemo(() => new Map(), []);

  const getMarkerIcon = (categoryValue, isSeen) => {
    const key = normalizeCategoryKey(categoryValue);
    const cacheKey = `${key}:${isSeen ? 'seen' : 'new'}`;
    const cached = iconCache.get(cacheKey);
    if (cached) return cached;

    const style = CAT_STYLE[key] || CAT_STYLE.other;
    const ic = buildDivIcon(style, isSeen);
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

  // ✅ counts للأقسام المتاحة
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

  const legendItems = useMemo(() => {
    const arr = availableCats.slice(0, 12);
    return arr
      .map((k) => ({ key: k, ...(CAT_STYLE[k] || CAT_STYLE.other), count: catCounts.get(k) || 0 }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ar'));
  }, [availableCats, catCounts]);

  // ✅ تطبيق "قريب من هنا" من حدود الخريطة الحالية
  const applyNearbyHere = () => {
    if (!map) return;
    try {
      const b = map.getBounds();
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

  // ✅ فلترة الـ markers (قسم + قريب من هنا)
  const filteredPoints = useMemo(() => {
    let arr = points;
    if (activeCat !== 'all') arr = arr.filter((p) => p._catKey === activeCat);

    if (nearbyOn && boundsObj) {
      arr = arr.filter((p) => boundsObj.contains(L.latLng(p._coords[0], p._coords[1])));
    }
    return arr;
  }, [points, activeCat, nearbyOn, boundsObj]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>🗺️ عرض الإعلانات على الخريطة</div>

        {/* ✅ نخفي الليجند في الجوال (زحمة) ونخليه للديسكتوب فقط */}
        {legendItems.length > 0 ? (
          <div className="sooq-legend hideOnMobile" title="الأقسام">
            {legendItems.map((it) => (
              <span key={it.key} className="sooq-legend__item" style={{ background: it.color }}>
                <span className="sooq-legend__icon" aria-hidden="true">
                  {it.icon}
                </span>
                <span className="sooq-legend__label">{it.label}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="sooq-mapWrap"
        style={{
          width: '100%',
          height: 'min(520px, 70vh)',
          minHeight: 360,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* ✅ Chips Filter Overlay + زر قريب من هنا */}
        {availableCats.length > 0 ? (
          <div className="sooq-mapOverlay">
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

              {/* ✅ زر "قريب من هنا" (بدون كم) */}
              <span className="sooq-chipSpacer" />

              {!nearbyOn ? (
                <button type="button" className="sooq-chip sooq-chipAction" onClick={applyNearbyHere} title="يعرض الإعلانات داخل حدود الخريطة الحالية">
                  قريب من هنا
                </button>
              ) : (
                <button type="button" className="sooq-chip sooq-chipAction" onClick={resetNearby} title="إلغاء القريب من هنا">
                  عرض الكل
                </button>
              )}
            </div>
          </div>
        ) : null}

        <MapContainer
          whenCreated={setMap}
          center={DEFAULT_CENTER}
          zoom={7}
          minZoom={6}
          maxZoom={18}
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
            const isSeen = seen.has(String(l._id));
            const price = l.currentBidYER || l.priceYER || l.price || l.currentBid || 0;

            const cat = getCatStyle(l._categoryValue || l._catKey);

            return (
              <Marker key={l._id} position={l._coords} icon={getMarkerIcon(l._categoryValue || l._catKey, isSeen)}>
                <Popup>
                  <div style={{ width: 230 }}>
                    {img ? (
                      <img
                        src={img}
                        alt={l.title || 'صورة'}
                        style={{
                          width: '100%',
                          height: 110,
                          objectFit: 'cover',
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      />
                    ) : null}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>{l.title || 'بدون عنوان'}</div>
                      <div
                        title={cat.label}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <span aria-hidden="true">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, marginTop: 6 }}>
                      📍 {l.city || l.locationLabel || l.area || 'غير محدد'}
                    </div>

                    <div style={{ fontWeight: 900, marginBottom: 10 }}>💰 {fmtYER(price)}</div>

                    <Link
                      href={`/listing/${l._id}`}
                      onClick={() => markSeen(l._id)}
                      style={{
                        display: 'inline-flex',
                        width: '100%',
                        justifyContent: 'center',
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: isSeen ? '#64748b' : cat.color,
                        color: '#fff',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      فتح الإعلان
                    </Link>

                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                      {isSeen ? '✅ تمت المشاهدة' : '🆕 جديد'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {filteredPoints.length
          ? `✅ الظاهر على الخريطة: ${filteredPoints.length} إعلان (داخل اليمن)${nearbyOn ? ' • وضع: قريب من هنا' : ''}`
          : 'لا توجد إعلانات مطابقة للفلتر/أو لا توجد إعلانات لها موقع داخل اليمن.'}
      </div>

      <style jsx global>{`
        /* Overlay */
        .sooq-mapWrap {
          position: relative;
        }

        .sooq-mapOverlay {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          z-index: 999;
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

        .sooq-chipSpacer {
          flex: 1 1 auto;
          min-width: 6px;
        }

        .sooq-chipAction {
          font-weight: 900;
        }

        .sooq-chips::-webkit-scrollbar {
          height: 6px;
        }
        .sooq-chips::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 999px;
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
          transition: transform 0.08s ease, box-shadow 0.12s ease, border-color 0.12s ease;
        }

        .sooq-chip:active {
          transform: scale(0.98);
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

        /* Marker */
        .sooq-marker {
          background: transparent !important;
          border: 0 !important;
        }

        .sooq-pin {
          position: relative;
          width: 34px;
          height: 46px;
          transform: translate3d(0, 0, 0);
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
          filter: saturate(1.05);
        }

        .sooq-marker--seen .sooq-pin {
          opacity: 0.72;
          filter: grayscale(0.25);
        }

        /* Legend */
        .sooq-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
          max-width: 70%;
        }

        .sooq-legend__item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          white-space: nowrap;
        }

        .sooq-legend__icon {
          font-size: 12px;
          line-height: 1;
        }

        .sooq-legend__label {
          opacity: 0.98;
        }

        /* ✅ نخفي الليجند كامل بالجوال */
        @media (max-width: 520px) {
          .hideOnMobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
