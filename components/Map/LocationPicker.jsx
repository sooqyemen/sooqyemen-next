'use client';

import { useEffect, useRef, useState } from 'react';

function waitForLeaflet(maxMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== 'undefined' && window.L) return resolve(window.L);
      if (Date.now() - start > maxMs) return reject(new Error('Leaflet not loaded'));
      setTimeout(tick, 50);
    };
    tick();
  });
}

export default function LocationPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        const L = await waitForLeaflet();
        if (destroyed) return;

        if (!containerRef.current) return;

        const initial = value?.lat && value?.lng ? [value.lat, value.lng] : [15.3694, 44.1910]; // صنعاء

        const map = L.map(containerRef.current, {
          center: initial,
          zoom: value?.lat ? 9 : 6,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        const marker = L.marker(initial, { draggable: true }).addTo(map);

        const push = (latlng) => {
          onChange?.({ lat: latlng.lat, lng: latlng.lng });
        };

        marker.on('dragend', (e) => push(e.target.getLatLng()));
        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          push(e.latlng);
        });

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      destroyed = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!value?.lat || !value?.lng) return;
    try {
      markerRef.current?.setLatLng([value.lat, value.lng]);
      mapRef.current?.panTo([value.lat, value.lng]);
    } catch {
      // ignore
    }
  }, [ready, value?.lat, value?.lng]);

  return (
    <div className="w-full">
      <div className="text-sm text-slate-500 dark:text-slate-300 mb-2">اضغط على الخريطة لتحديد الموقع</div>
      <div className="h-[260px] md:h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div ref={containerRef} className="leaflet-container" />
      </div>
    </div>
  );
}
