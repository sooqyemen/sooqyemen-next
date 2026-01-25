'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function setupDefaultMarkerOnce() {
  if (typeof window === 'undefined') return;
  if (window.__sooq_leaflet_marker_ready) return;

  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // eslint-disable-next-line no-prototype-builtins
  if (L?.Marker?.prototype?.options) L.Marker.prototype.options.icon = DefaultIcon;

  window.__sooq_leaflet_marker_ready = true;
}

export default function ListingMiniMap({ lat, lng, label }) {
  setupDefaultMarkerOnce();

  const center = useMemo(() => {
    const la = Number(lat);
    const lo = Number(lng);
    if (!isFinite(la) || !isFinite(lo)) return null;
    return [la, lo];
  }, [lat, lng]);

  if (!center) return null;

  return (
    <div className="miniMapWrap">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>{label || 'الموقع'}</Popup>
        </Marker>
      </MapContainer>

      <style jsx>{`
        .miniMapWrap {
          height: 360px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
        }
        @media (max-width: 768px) {
          .miniMapWrap {
            height: 280px;
          }
        }
      `}</style>
    </div>
  );
}
