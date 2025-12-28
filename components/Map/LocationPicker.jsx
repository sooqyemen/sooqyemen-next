// components/Map/LocationPicker.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const YEMEN_CENTER = [15.5527, 48.5164];

async function reverseGeocodeOSM(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("reverse geocode failed");
    const data = await res.json();

    const addr = data?.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || addr.state || "";
    const road = addr.road || addr.residential || addr.pedestrian || addr.footway || addr.path || "";
    const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || "";
    const locality = addr.locality || addr.name || "";

    const parts = [road, neighbourhood, locality, city].filter(Boolean);
    if (parts.length) return parts.join(" - ");
    if (data?.display_name) return String(data.display_name).split(",").slice(0, 3).join("، ").trim();
    return "";
  } catch {
    return "";
  }
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const label = await reverseGeocodeOSM(lat, lng);
      onPick([lat, lng], label);
    }
  });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!value) return;
    // حاول الحصول على label مرة واحدة
    (async () => {
      const l = await reverseGeocodeOSM(value[0], value[1]);
      if (l) setLabel(l);
    })();
  }, [value?.[0], value?.[1]]);

  const center = value || YEMEN_CENTER;

  const handlePick = (coords, lbl) => {
    onChange(coords, lbl);
    setLabel(lbl || '');
  };

  const autoDetect = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      const lbl = await reverseGeocodeOSM(coords[0], coords[1]);
      handlePick(coords, lbl);
    });
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent:'space-between' }}>
        <div>
          <div style={{ fontWeight:800 }}>اختر موقع الإعلان</div>
          <div className="muted" style={{ fontSize:12 }}>{label || 'اضغط على الخريطة لتحديد الموقع'}</div>
        </div>
        <button className="btn" onClick={autoDetect}>تحديد تلقائي</button>
      </div>

      <div style={{ height: 320, marginTop: 10, borderRadius: 14, overflow:'hidden' }}>
        <MapContainer center={center} zoom={value ? 13 : 6} style={{ height:'100%' }}>
          <TileLayer
            attribution="&copy; سوق اليمن"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {value ? <Marker position={value} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
