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

function normalizeCoords(listing) {
  if (Array.isArray(listing?.coords) && listing.coords.length === 2) {
    const lat = Number(listing.coords[0]);
    const lng = Number(listing.coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  if (listing?.coords?.lat != null && listing?.coords?.lng != null) {
    const lat = Number(listing.coords.lat);
    const lng = Number(listing.coords.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
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

export default function HomeMapView({ listings = [] }) {
  const [seen, setSeen] = useState(() => new Set());
  const [map, setMap] = useState(null);

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
    return listings
      .map((l) => {
        const c = normalizeCoords(l);
        if (!c) return null;
        if (!inYemen(c)) return null;
        return { ...l, _coords: c };
      })
      .filter(Boolean);
  }, [listings]);

  // ✅ كاش للأيقونات (أهم شي عشان ما نعيد بناء icon لكل Marker كل رندر)
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

  // ✅ Legend بسيط (يعرض فقط الأقسام الموجودة فعليًا في البيانات)
  const legendItems = useMemo(() => {
    const keys = new Set(points.map((p) => normalizeCategoryKey(p.category)));
    const arr = Array.from(keys).slice(0, 12); // حد أعلى بسيط
    return arr
      .map((k) => ({ key: k, ...(CAT_STYLE[k] || CAT_STYLE.other) }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ar'));
  }, [points]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>🗺️ عرض الإعلانات على الخريطة</div>

        {legendItems.length > 0 ? (
          <div className="sooq-legend" title="الأقسام">
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
        style={{
          width: '100%',
          height: 'min(520px, 70vh)',
          minHeight: 360,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
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

          {points.map((l) => {
            const img = (Array.isArray(l.images) && l.images[0]) || l.image || null;
            const isSeen = seen.has(String(l.id));
            const price = l.currentBidYER || l.priceYER || 0;
            const cat = getCatStyle(l.category);

            return (
              <Marker key={l.id} position={l._coords} icon={getMarkerIcon(l.category, isSeen)}>
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
                      📍 {l.city || l.locationLabel || 'غير محدد'}
                    </div>

                    <div style={{ fontWeight: 900, marginBottom: 10 }}>💰 {fmtYER(price)}</div>

                    <Link
                      href={`/listing/${l.id}`}
                      onClick={() => markSeen(l.id)}
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
        {points.length
          ? `✅ الظاهر على الخريطة: ${points.length} إعلان (فقط اللي له موقع داخل اليمن)`
          : 'لا توجد إعلانات لها موقع الآن—أضف موقع أثناء نشر الإعلان ليظهر هنا.'}
      </div>

      <style jsx global>{`
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
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.20);
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
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.25);
          white-space: nowrap;
        }

        .sooq-legend__icon {
          font-size: 12px;
          line-height: 1;
        }

        .sooq-legend__label {
          opacity: 0.98;
        }

        @media (max-width: 520px) {
          .sooq-legend {
            max-width: 100%;
          }
          .sooq-legend__label {
            display: none; /* بالجوال نخليها أيقونة فقط لتخفيف الزحمة */
          }
          .sooq-legend__item {
            padding: 4px 6px;
          }
        }
      `}</style>
    </div>
  );
}
