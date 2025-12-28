// components/Map/ListingMap.jsx
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths (works on Next.js)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ListingMap({ coords, label }) {
  const center = coords && coords.length === 2 ? coords : [15.5527, 48.5164];
  return (
    <div className="card">
      <div style={{ fontWeight:800, marginBottom:8 }}>الموقع على الخريطة</div>
      <MapContainer center={center} zoom={coords ? 13 : 6} style={{ height: 320, borderRadius: 14, overflow: 'hidden' }}>
        <TileLayer
          attribution="&copy; سوق اليمن"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coords ? (
          <Marker position={center}>
            <Popup>{label || 'موقع الإعلان'}</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
