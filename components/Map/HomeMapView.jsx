'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ taxonomy
import {
  inferListingTaxonomy,
  CAR_MAKES,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
} from '@/lib/taxonomy';

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

// ===== helpers (مختصرة) =====
function getId(l) {
  return (
    l?.id ??
    l?._id ??
    l?.docId ??
    l?.uid ??
    l?.listingId ??
    null
  );
}

function normalizeCoords(l) {
  const toNum = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };
  if (Array.isArray(l?.coords) && l.coords.length === 2) {
    const lat = toNum(l.coords[0]);
    const lng = toNum(l.coords[1]);
    if (lat != null && lng != null) return [lat, lng];
  }
  if (l?.lat != null && (l?.lng != null || l?.lon != null)) {
    const lat = toNum(l.lat);
    const lng = toNum(l.lng ?? l.lon);
    if (lat != null && lng != null) return [lat, lng];
  }
  if (l?.latitude != null && l?.longitude != null) {
    const lat = toNum(l.latitude);
    const lng = toNum(l.longitude);
    if (lat != null && lng != null) return [lat, lng];
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

function pickImage(l) {
  const imgs = l?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const f = imgs[0];
    if (typeof f === 'string') return f;
    if (f && typeof f === 'object') return f.url || f.src || f.path || null;
  }
  return l?.image || l?.cover || l?.thumbnail || null;
}

// ===== styles per root =====
const ROOT_STYLE = {
  cars: { color: '#2563eb', icon: '🚗', label: 'سيارات' },
  realestate: { color: '#16a34a', icon: '🏡', label: 'عقارات' },
  phones: { color: '#7c3aed', icon: '📱', label: 'جوالات' },
  other: { color: '#475569', icon: '📦', label: 'أخرى' },
};

function buildDivIcon({ color, icon }) {
  return L.divIcon({
    className: 'sooq-marker',
    html: `
      <div class="sooq-pin" style="--pin:${color}">
        <div class="sooq-pin__icon">${icon}</div>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -42],
  });
}

// ===== component =====
export default function HomeMapView({ listings = [] }) {
  const [activeRoot, setActiveRoot] = useState('all'); // all | cars | realestate | phones
  const [step1, setStep1] = useState(''); // carMake | phoneBrand | dealType
  const [step2, setStep2] = useState(''); // propertyType

  const points = useMemo(() => {
    return (listings || [])
      .map((l) => {
        const id = getId(l);
        if (!id) return null;
        const c = normalizeCoords(l);
        if (!c || !inYemen(c)) return null;

        const root =
          l?.rootCategory ||
          l?.category ||
          l?.section ||
          'other';

        const tax = inferListingTaxonomy(l, root);

        return {
          ...l,
          _id: String(id),
          _coords: c,
          _root: tax.root || root,
          _tax: tax,
        };
      })
      .filter(Boolean);
  }, [listings]);

  // ===== available facets (من البيانات نفسها) =====
  const available = useMemo(() => {
    const out = {
      roots: new Set(),
      carMake: new Map(),
      phoneBrand: new Map(),
      dealType: new Map(),
      propertyType: new Map(),
    };
    for (const p of points) {
      out.roots.add(p._root);
      if (p._root === 'cars') {
        out.carMake.set(p._tax.carMake, (out.carMake.get(p._tax.carMake) || 0) + 1);
      }
      if (p._root === 'phones') {
        out.phoneBrand.set(p._tax.phoneBrand, (out.phoneBrand.get(p._tax.phoneBrand) || 0) + 1);
      }
      if (p._root === 'realestate') {
        if (p._tax.dealType)
          out.dealType.set(p._tax.dealType, (out.dealType.get(p._tax.dealType) || 0) + 1);
        out.propertyType.set(
          p._tax.propertyType,
          (out.propertyType.get(p._tax.propertyType) || 0) + 1
        );
      }
    }
    return out;
  }, [points]);

  // ===== filtering =====
  const filtered = useMemo(() => {
    let arr = points;
    if (activeRoot !== 'all') arr = arr.filter((p) => p._root === activeRoot);

    if (activeRoot === 'cars' && step1) {
      arr = arr.filter((p) => p._tax.carMake === step1);
    }
    if (activeRoot === 'phones' && step1) {
      arr = arr.filter((p) => p._tax.phoneBrand === step1);
    }
    if (activeRoot === 'realestate') {
      if (step1) arr = arr.filter((p) => p._tax.dealType === step1);
      if (step2) arr = arr.filter((p) => p._tax.propertyType === step2);
    }
    return arr;
  }, [points, activeRoot, step1, step2]);

  // ===== UI helpers =====
  const resetSteps = () => {
    setStep1('');
    setStep2('');
  };

  const MarkerIcon = (root) =>
    buildDivIcon(ROOT_STYLE[root] || ROOT_STYLE.other);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>🗺️ عرض الإعلانات على الخريطة</div>

      {/* ===== Chips ===== */}
      <div className="sooq-chips">
        <button
          className={`sooq-chip ${activeRoot === 'all' ? 'isActive' : ''}`}
          onClick={() => {
            setActiveRoot('all');
            resetSteps();
          }}
        >
          الكل <span>{points.length}</span>
        </button>

        {['cars', 'realestate', 'phones'].map((r) =>
          available.roots.has(r) ? (
            <button
              key={r}
              className={`sooq-chip ${activeRoot === r ? 'isActive' : ''}`}
              onClick={() => {
                setActiveRoot(r);
                resetSteps();
              }}
            >
              {ROOT_STYLE[r].icon} {ROOT_STYLE[r].label}
            </button>
          ) : null
        )}
      </div>

      {/* ===== Sub filters ===== */}
      {activeRoot === 'cars' && (
        <div className="sooq-chips">
          {CAR_MAKES.filter((m) => available.carMake.has(m.key)).map((m) => (
            <button
              key={m.key}
              className={`sooq-chip ${step1 === m.key ? 'isActive' : ''}`}
              onClick={() => setStep1(m.key)}
            >
              {m.label} <span>{available.carMake.get(m.key)}</span>
            </button>
          ))}
        </div>
      )}

      {activeRoot === 'phones' && (
        <div className="sooq-chips">
          {PHONE_BRANDS.filter((b) => available.phoneBrand.has(b.key)).map((b) => (
            <button
              key={b.key}
              className={`sooq-chip ${step1 === b.key ? 'isActive' : ''}`}
              onClick={() => setStep1(b.key)}
            >
              {b.label} <span>{available.phoneBrand.get(b.key)}</span>
            </button>
          ))}
        </div>
      )}

      {activeRoot === 'realestate' && (
        <>
          <div className="sooq-chips">
            {DEAL_TYPES.filter((d) => available.dealType.has(d.key)).map((d) => (
              <button
                key={d.key}
                className={`sooq-chip ${step1 === d.key ? 'isActive' : ''}`}
                onClick={() => {
                  setStep1(d.key);
                  setStep2('');
                }}
              >
                {d.label} <span>{available.dealType.get(d.key)}</span>
              </button>
            ))}
          </div>

          {step1 && (
            <div className="sooq-chips">
              {PROPERTY_TYPES.filter((p) => available.propertyType.has(p.key)).map((p) => (
                <button
                  key={p.key}
                  className={`sooq-chip ${step2 === p.key ? 'isActive' : ''}`}
                  onClick={() => setStep2(p.key)}
                >
                  {p.label} <span>{available.propertyType.get(p.key)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== Map ===== */}
      <div style={{ height: 420, borderRadius: 14, overflow: 'hidden', marginTop: 10 }}>
        <MapContainer
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

          {filtered.map((l) => (
            <Marker key={l._id} position={l._coords} icon={MarkerIcon(l._root)}>
              <Popup>
                <div className="sooq-popupMini">
                  {pickImage(l) && (
                    <img src={pickImage(l)} alt="" className="sooq-popupMiniImg" />
                  )}
                  <div className="sooq-popupMiniTitle">{l.title || 'بدون عنوان'}</div>
                  <Link href={`/listing/${l._id}`} className="sooq-popupMiniBtn">
                    فتح
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        الظاهر الآن: {filtered.length} إعلان
      </div>
    </div>
  );
}
