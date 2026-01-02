'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const YEMEN_BOUNDS = [
  [12.0, 41.0],
  [19.5, 54.7],
];
const DEFAULT_CENTER = [15.3694, 44.1910];

function ClickPicker({ value, onChange }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

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
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);

  const center = useMemo(() => {
    if (Array.isArray(value) && value.length === 2) return value;
    return DEFAULT_CENTER;
  }, [value]);

  // أهم شيء: تحديث قياس الخريطة بعد ما الكونتينر يستقر
  useEffect(() => {
    if (!map) return;

    const fix = () => {
      // مرات تحتاج مرتين بسبب Grid + Fonts
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 500);
    };

    fix();

    // مراقبة تغيّر حجم العنصر نفسه
    let ro;
    if (wrapRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => fix());
      ro.observe(wrapRef.current);
    }

    // كمان على resize
    window.addEventListener('resize', fix);

    return () => {
      window.removeEventListener('resize', fix);
      if (ro) ro.disconnect();
    };
  }, [map]);

  return (
    <div className="card" style={{ minHeight: 520 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>
        📍 اختر موقع الإعلان
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        اضغط على الخريطة لتحديد الموقع (داخل اليمن)
      </div>

      <div
        ref={wrapRef}
        style={{
          height: 440,
          borderRadius: 14,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <MapContainer
          center={center}
          zoom={7}
          minZoom={6}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          maxBounds={YEMEN_BOUNDS}
          maxBoundsViscosity={1.0}
          whenCreated={setMap}
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
          ✅ {value[0].toFixed(5)} , {value[1].toFixed(5)}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          لم يتم اختيار موقع بعد
        </div>
      )}
    </div>
  );
}
