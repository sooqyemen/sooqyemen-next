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

// Icons: default (new) + seen (visited)
const iconNew = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconSeen = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

    // أول مرة + بعد شوية (يحمي من بطء الأجهزة/التبديل)
    const t1 = setTimeout(tick, 0);
    const t2 = setTimeout(tick, 200);

    // عند تغيير حجم الشاشة
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

  const markSeen = (id) => {
    const sid = String(id);
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(sid);
      writeSeen(next);
      return next;
    });
  };

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🗺️ عرض الإعلانات على الخريطة</div>

      <div
        style={{
          width: '100%',
          // ✅ ارتفاع مرن للجوال والديسكتوب بدون styled-jsx
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

            return (
              <Marker key={l.id} position={l._coords} icon={isSeen ? iconSeen : iconNew}>
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

                    <div style={{ fontWeight: 800, marginBottom: 4 }}>
                      {l.title || 'بدون عنوان'}
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
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
                        background: isSeen ? '#64748b' : '#2563eb',
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
    </div>
  );
}
