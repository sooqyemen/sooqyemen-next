// components/Map/HomeMapView.jsx
'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
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

// LocalStorage key (اختياري)
const SEEN_KEY = 'sooq_seen_listings_v1';

function readSeen() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const CATEGORIES = [
  { key: 'all', label: 'الكل', emoji: '🧩', color: '#0ea5e9' },
  { key: 'cars', label: 'سيارات', emoji: '🚗', color: '#2563eb' },
  { key: 'realestate', label: 'عقارات', emoji: '🏠', color: '#16a34a' },
  { key: 'phones', label: 'جوالات', emoji: '📱', color: '#7c3aed' },
  { key: 'electronics', label: 'إلكترونيات', emoji: '💻', color: '#0284c7' },
  { key: 'equipment', label: 'معدات', emoji: '🚜', color: '#b45309' },
  { key: 'net', label: 'نت وشبكات', emoji: '📡', color: '#0f766e' },
  { key: 'other', label: 'أخرى', emoji: '📦', color: '#64748b' },
];

function normalizeCategoryKey(raw) {
  const s = (raw ?? '').toString().trim();
  if (!s) return 'other';

  const low = s.toLowerCase();

  // Slugs
  if (low === 'cars' || low.includes('car')) return 'cars';
  if (low === 'realestate' || low.includes('real') || low.includes('estate')) return 'realestate';
  if (low === 'phones' || low.includes('phone') || low.includes('mobile')) return 'phones';
  if (low === 'electronics' || low.includes('elect')) return 'electronics';
  if (low === 'equipment' || low.includes('equip')) return 'equipment';
  if (low === 'net' || low.includes('network') || low.includes('internet')) return 'net';

  // Arabic
  if (s.includes('سيار')) return 'cars';
  if (s.includes('عقار') || s.includes('أرض') || s.includes('شقق') || s.includes('بيت')) return 'realestate';
  if (s.includes('جوال') || s.includes('هاتف') || s.includes('ايفون') || s.includes('آيفون')) return 'phones';
  if (s.includes('الكتر') || s.includes('إلكتر') || s.includes('لاب') || s.includes('كمبيوتر')) return 'electronics';
  if (s.includes('معد') || s.includes('حفار') || s.includes('بوكلين') || s.includes('شيول')) return 'equipment';
  if (s.includes('شبك') || s.includes('نت') || s.includes('راوتر') || s.includes('واي')) return 'net';

  return 'other';
}

function getLatLng(item) {
  // يدعم أشكال مختلفة لبيانات الموقع
  const lat =
    item?.lat ??
    item?.latitude ??
    item?.location?.lat ??
    item?.location?.latitude ??
    item?.geo?.lat ??
    item?.geo?.latitude;

  const lng =
    item?.lng ??
    item?.lon ??
    item?.longitude ??
    item?.location?.lng ??
    item?.location?.lon ??
    item?.location?.longitude ??
    item?.geo?.lng ??
    item?.geo?.lon ??
    item?.geo?.longitude;

  const nlat = Number(lat);
  const nlng = Number(lng);

  if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return null;
  return { lat: nlat, lng: nlng };
}

function getCategoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES.find((c) => c.key === 'other');
}

function makePinIcon(catKey) {
  const meta = getCategoryMeta(catKey);
  const bg = meta?.color || '#64748b';
  const emoji = meta?.emoji || '📍';

  const html = `
    <div style="position:relative;width:36px;height:46px;">
      <div style="
        position:absolute;top:0;left:0;right:0;margin:auto;
        width:36px;height:36px;border-radius:999px;
        background:${bg};
        border:2px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,.25);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;line-height:1;
      ">${emoji}</div>
      <div style="
        position:absolute;top:34px;left:0;right:0;margin:auto;
        width:0;height:0;
        border-left:10px solid transparent;
        border-right:10px solid transparent;
        border-top:14px solid ${bg};
        filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
}

export default function HomeMapView({ listings = [] }) {
  const mapRef = useRef(null);

  // فلترة القسم (الكل افتراضياً)
  const [activeCat, setActiveCat] = useState('all');

  // وضع "قريب من هنا" بدون مسافات: يعتمد على حدود الشاشة الحالية للخريطة
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyBounds, setNearbyBounds] = useState(null); // [[south, west], [north, east]]

  // Seen (اختياري)
  const [seen, setSeen] = useState(() => readSeen());

  const parsed = useMemo(() => {
    const safe = Array.isArray(listings) ? listings : [];
    return safe
      .map((it) => {
        const ll = getLatLng(it);
        if (!ll) return null;
        const catRaw = it?.category ?? it?.section ?? it?.cat ?? it?.categoryName ?? it?.categorySlug;
        const catKey = normalizeCategoryKey(catRaw);
        return { ...it, __latlng: ll, __catKey: catKey };
      })
      .filter(Boolean);
  }, [listings]);

  const counts = useMemo(() => {
    const obj = {};
    for (const c of CATEGORIES) obj[c.key] = 0;
    for (const it of parsed) {
      const k = it.__catKey || 'other';
      obj[k] = (obj[k] || 0) + 1;
      obj.all = (obj.all || 0) + 1;
    }
    return obj;
  }, [parsed]);

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

  const visible = useMemo(() => {
    let arr = parsed;

    if (activeCat && activeCat !== 'all') {
      arr = arr.filter((it) => it.__catKey === activeCat);
    }

    if (nearbyOn && boundsObj) {
      arr = arr.filter((it) => boundsObj.contains(L.latLng(it.__latlng.lat, it.__latlng.lng)));
    }

    return arr;
  }, [parsed, activeCat, nearbyOn, boundsObj]);

  const applyNearbyHere = () => {
    const map = mapRef.current;
    if (!map) return;

    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();

    setNearbyBounds([
      [sw.lat, sw.lng],
      [ne.lat, ne.lng],
    ]);
    setNearbyOn(true);
  };

  const resetNearby = () => {
    setNearbyOn(false);
    setNearbyBounds(null);
  };

  const toggleCat = (key) => {
    setActiveCat((prev) => (prev === key ? 'all' : key));
  };

  const markSeen = (id) => {
    if (!id) return;
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      writeSeen(next);
      return next;
    });
  };

  return (
    <div className="container">
      <div className="mapHeader">
        <div className="mapTitle">
          <span className="mapIcon">🗺️</span>
          <span>عرض الإعلانات على الخريطة</span>
        </div>

        {/* شريط الأقسام العلوي (يظهر على الديسكتوب فقط - يختفي على الجوال) */}
        <div className="catBar">
          {CATEGORIES.filter((c) => c.key !== 'other').map((c) => (
            <button
              key={c.key}
              className={`catPill ${activeCat === c.key ? 'active' : ''}`}
              onClick={() => setActiveCat(c.key)}
              type="button"
              title={c.label}
            >
              <span className="catEmoji">{c.emoji}</span>
              <span className="catLabel">{c.label}</span>
            </button>
          ))}
        </div>

        {/* شريط الجوال البديل: قريب من هنا فقط */}
        <div className="mobileNearBar">
          <div className="mobileNearText">الإعلانات القريبة من هنا</div>
          <div className="mobileNearActions">
            {!nearbyOn ? (
              <button className="btn btnPrimary" type="button" onClick={applyNearbyHere}>
                قريب من هنا
              </button>
            ) : (
              <button className="btn" type="button" onClick={resetNearby}>
                عرض الكل
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mapWrap">
        {/* شريط داخل الخريطة (counts) - قابل للضغط للفلترة */}
        <div className="legendBar">
          {CATEGORIES.filter((c) => c.key !== 'other').map((c) => (
            <button
              key={c.key}
              type="button"
              className={`legendItem ${activeCat === c.key ? 'active' : ''}`}
              onClick={() => setActiveCat(c.key)}
              title={`عرض قسم: ${c.label}`}
            >
              <span className="legendCount">{counts[c.key] || 0}</span>
              <span className="legendDot" style={{ background: c.color }} />
              <span className="legendLabel">{c.label}</span>
            </button>
          ))}

          <div className="legendSpacer" />

          {!nearbyOn ? (
            <button type="button" className="legendAction" onClick={applyNearbyHere}>
              قريب من هنا
            </button>
          ) : (
            <button type="button" className="legendAction" onClick={resetNearby}>
              عرض الكل
            </button>
          )}
        </div>

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={6}
          minZoom={5}
          maxZoom={18}
          maxBounds={YEMEN_BOUNDS}
          style={{ height: '520px', width: '100%' }}
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visible.map((it) => {
            const id = it?.id ?? it?.docId ?? it?._id ?? it?.slug ?? `${it.__latlng.lat},${it.__latlng.lng}`;
            const title = it?.title ?? it?.name ?? 'إعلان';
            const price = it?.price ?? it?.amount ?? '';
            const city = it?.city ?? it?.locationName ?? it?.area ?? '';
            const catKey = it.__catKey || 'other';
            const icon = makePinIcon(catKey);

            return (
              <Marker
                key={String(id)}
                position={[it.__latlng.lat, it.__latlng.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => markSeen(id),
                }}
              >
                <Popup>
                  <div className="popup">
                    <div className="popupTitle">{title}</div>
                    {(city || price) && (
                      <div className="popupMeta">
                        {city ? <span>📍 {city}</span> : null}
                        {price ? <span> • 💰 {price}</span> : null}
                      </div>
                    )}

                    <div className="popupActions">
                      {/* لو عندك رابط تفاصيل مختلف غيّره هنا */}
                      <Link className="btn btnPrimary" href={`/listing/${id}`}>
                        فتح الإعلان
                      </Link>

                      {seen.has(String(id)) ? <span className="seenTag">تمت المشاهدة</span> : null}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="mapFooter">
          <span className="muted">
            الظاهر على الخريطة: <b>{visible.length}</b> إعلان
            {activeCat !== 'all' ? (
              <>
                {' '}
                • القسم: <b>{getCategoryMeta(activeCat)?.label}</b>
              </>
            ) : null}
            {nearbyOn ? (
              <>
                {' '}
                • وضع: <b>قريب من هنا</b>
              </>
            ) : null}
          </span>
        </div>
      </div>

      <style jsx>{`
        .mapHeader {
          margin: 10px 0 8px;
        }

        .mapTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .mapIcon {
          font-size: 18px;
        }

        .catBar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .catPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }
        .catPill.active {
          border-color: #111827;
        }
        .catEmoji {
          font-size: 16px;
        }
        .catLabel {
          white-space: nowrap;
        }

        .mobileNearBar {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 10px;
        }
        .mobileNearText {
          font-weight: 700;
          font-size: 14px;
        }
        .mobileNearActions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .mapWrap {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }

        .legendBar {
          position: absolute;
          z-index: 500;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(229, 231, 235, 0.9);
          overflow-x: auto;
          white-space: nowrap;
        }

        .legendItem {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          flex: 0 0 auto;
        }
        .legendItem.active {
          border-color: #111827;
        }
        .legendCount {
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #111827;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          padding: 0 6px;
        }
        .legendDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }
        .legendLabel {
          font-size: 13px;
        }
        .legendSpacer {
          flex: 1 1 auto;
        }
        .legendAction {
          flex: 0 0 auto;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
        }

        .mapFooter {
          padding: 10px 12px;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }

        .popup {
          min-width: 220px;
        }
        .popupTitle {
          font-weight: 800;
          margin-bottom: 6px;
        }
        .popupMeta {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 10px;
        }
        .popupActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .seenTag {
          font-size: 12px;
          color: #6b7280;
        }

        /* ===== Mobile behavior ===== */
        @media (max-width: 768px) {
          .catBar {
            display: none; /* إخفاء شريط الأقسام العلوي على الجوال */
          }
          .mobileNearBar {
            display: flex; /* إظهار شريط "الإعلانات القريبة من هنا" */
          }
          .legendBar {
            top: 8px;
            left: 8px;
            right: 8px;
          }
        }
      `}</style>
    </div>
  );
}
