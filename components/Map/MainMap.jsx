'use client';

import { useEffect, useRef } from 'react';

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

export default function MainMap({ listings = [], onMarkerClick }) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const L = await waitForLeaflet();
        if (!isMounted) return;

        if (!mapObjRef.current) {
          const map = L.map(mapRef.current, {
            center: [15.3694, 44.191], // صنعاء تقريباً
            zoom: 6,
            zoomControl: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
          }).addTo(map);

          markersLayerRef.current = L.layerGroup().addTo(map);
          mapObjRef.current = map;
        }

        // Update markers
        const layer = markersLayerRef.current;
        layer.clearLayers();

        listings
          .filter((x) => x?.location?.lat && x?.location?.lng)
          .forEach((x) => {
            const m = window.L.marker([x.location.lat, x.location.lng]);
            m.on('click', () => onMarkerClick?.(x));
            m.addTo(layer);
          });
      } catch {
        // ignore
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [listings, onMarkerClick]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div ref={mapRef} className="w-full h-[280px] sm:h-[360px] leaflet-container" />
    </div>
  );
}
