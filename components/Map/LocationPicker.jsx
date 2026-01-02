'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// إصلاح أيقونة Marker في Next + Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// حدود اليمن (تقريبية ممتازة لمنع خروج الخريطة)
const YEMEN_BOUNDS = [
  [12.0, 41.0], // جنوب غرب
  [19.5, 54.7], // شمال شرق
];

const DEFAULT_CENTER = [15.3694, 44.1910]; // صنعاء

function ClickPicker({ value, onChange }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // تأكد داخل حدود اليمن
      const inYemen =
        lat >= YEMEN_BOUNDS[0][0] &&
        lat <= YEMEN_BOUNDS[1][0] &&
        lng >= YEMEN_BOUNDS[0][1] &&
        lng <= YEMEN_BOUNDS[1][1];

      if (!inYemen) {
        alert('اختر موقع داخل اليمن فقط 🇾🇪');
        return;
      }

      onChange([lat, lng], `Lat: ${lat.toFixed(5)} , Lng: ${lng.toFixed(5)}`);
    },
  });

  return value ? <Marker position={value} /> : null;
}

export default function LocationPicker({ value, onChange }) {
  const center = useMemo(() => {
    // value لازم تكون [lat, lng]
    if (Array.isArray(value) && value.length === 2) return value;
    return DEFAULT_CENTER;
  }, [value]);

  // نضيف class للـ body عشان CSS حق leaflet يشتغل
  useEffect(() => {
    document.body.classList.add('leaflet-body');
    return () => document.body.classList.remove('leaflet-body');
  }, []);

  return (
    <div className="card" style={{ minHeight: 520 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>
        📍 حدّد موقع الإعلان (داخل اليمن)
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        اضغط على الخريطة لتحديد الموقع. (لا نعتمد على “موقعي”)
      </div>

      <div style={{ height: 440, borderRadius: 14, overflow: 'hidden' }}>
        <MapContainer
          center={center}
          zoom={7}
          minZoom={6}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          // قفل الحدود على اليمن
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <ClickPicker value={value} onChange={onChange} />
        </MapContainer>
      </div>

      {value ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          ✅ الموقع المحدد: {value[0].toFixed(5)} , {value[1].toFixed(5)}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          لم يتم اختيار موقع بعد
        </div>
      )}
    </div>
  );
}
