// components/Map/HomeMapView.jsx
'use client';

import Link from 'next/link';
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

function normalizeCoords(listing) {
  // array format: [lat, lng]
  if (Array.isArray(listing?.coords) && listing.coords.length === 2) {
    const lat = Number(listing.coords[0]);
    const lng = Number(listing.coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  // object format: {lat, lng}
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

export default function HomeMapView({ listings = [] }) {
  // نعرض فقط الإعلانات التي لديها إحداثيات صحيحة وداخل اليمن
  const points = listings
    .map((l) => {
      const c = normalizeCoords(l);
      if (!c) return null;
      if (!inYemen(c)) return null;
      return { ...l, _coords: c };
    })
    .filter(Boolean);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🗺️ عرض الإعلانات على الخريطة</div>

      <div
        style={{
          width: '100%',
          height: 520,
          minHeight: 520,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={7}
          minZoom={6}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {points.map((l) => {
            const img =
              (Array.isArray(l.images) && l.images[0]) ||
              l.image ||
              null;

            return (
              <Marker key={l.id} position={l._coords}>
                <Popup>
                  <div style={{ width: 220 }}>
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
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      📍 {l.city || l.locationLabel || 'غير محدد'}
                    </div>

                    <Link
                      href={`/listing/${l.id}`}
                      style={{
                        display: 'inline-flex',
                        width: '100%',
                        justifyContent: 'center',
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: '#2563eb',
                        color: '#fff',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      فتح الإعلان
                    </Link>
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

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*='height: 520px'] {
            height: 420px !important;
            min-height: 420px !important;
          }
        }
      `}</style>
    </div>
  );
}
