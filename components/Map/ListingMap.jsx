// components/Map/ListingMap.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths (works on Next.js)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// حدود اليمن تقريبية
const YEMEN_BOUNDS = [
  [12.0, 41.0], // [lat, lng]
  [19.5, 54.7],
];

// مركز افتراضي (صنعاء)
const DEFAULT_CENTER = [15.3694, 44.1910];

const inRange = (v, min, max) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// تصحيح الإحداثيات إذا كانت مقلوبة
function normalizeLatLng(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;

  const a = Number(input[0]);
  const b = Number(input[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  // ضمن اليمن بصيغتها الطبيعية؟
  const aLatOk = inRange(a, 12.0, 19.5);
  const bLngOk = inRange(b, 41.0, 54.7);
  if (aLatOk && bLngOk) return [a, b];

  // ضمن اليمن إذا كانت مقلوبة؟
  const bLatOk = inRange(b, 12.0, 19.5);
  const aLngOk = inRange(a, 41.0, 54.7);
  if (bLatOk && aLngOk) return [b, a];

  // fallback عالمي
  const latOkGlobal = inRange(a, -90, 90);
  const lngOkGlobal = inRange(b, -180, 180);
  if (latOkGlobal && lngOkGlobal) return [a, b];

  // جرّب عكسها عالمياً
  const latOkGlobal2 = inRange(b, -90, 90);
  const lngOkGlobal2 = inRange(a, -180, 180);
  if (latOkGlobal2 && lngOkGlobal2) return [b, a];

  return null;
}

export default function ListingMap({ coords, label }) {
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const normalized = useMemo(() => normalizeLatLng(coords), [coords]);

  const center = normalized || DEFAULT_CENTER;
  const zoom = normalized ? 13 : 6;

  // إصلاح تحجيم البلاطات داخل العناصر المرنة
  useEffect(() => {
    if (!map) return;

    const fix = () => {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 500);
    };

    fix();

    let ro;
    if (wrapRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => fix());
      ro.observe(wrapRef.current);
    }

    window.addEventListener('resize', fix);

    return () => {
      window.removeEventListener('resize', fix);
      if (ro) ro.disconnect();
    };
  }, [map]);

  // بعد إظهار الخريطة اضبط العرض
  useEffect(() => {
    if (!map || !showMap) return;
    try {
      if (normalized) {
        map.setView(normalized, 13, { animate: false });
      } else {
        map.fitBounds(YEMEN_BOUNDS, { padding: [20, 20] });
      }
    } catch {}
  }, [map, showMap, normalized]);

  // زر عرض الخريطة (تحسين أداء الجوال)
  if (!showMap) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>الموقع</div>

        <div
          style={{
            height: 220,
            borderRadius: 14,
            overflow: 'hidden',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 10,
            background:
              'linear-gradient(135deg, rgba(2,132,199,0.10), rgba(59,130,246,0.06))',
            border: '1px solid rgba(2,132,199,0.12)',
          }}
        >
          <div style={{ fontSize: 28 }}>🗺️</div>
          <div style={{ fontWeight: 700, opacity: 0.9 }}>اضغط لعرض الخريطة</div>

          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => setShowMap(true)}
            style={{ padding: '10px 14px', borderRadius: 10 }}
          >
            عرض الخريطة
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>(لتسريع تحميل الصفحة على الجوال)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 800, marginBottom: 8 }}>الموقع على الخريطة</div>

      <div
        ref={wrapRef}
        style={{
          height: 320,
          borderRadius: 14,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          minZoom={5}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMap}
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {normalized ? (
            <Marker position={normalized}>
              <Popup>{label || 'موقع الإعلان'}</Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
