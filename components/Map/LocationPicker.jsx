'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Leaflet CSS is imported globally in app/layout.js

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

// Cache للـ reverse geocoding لتحسين الأداء
const geocodeCache = new Map();
const MAX_CACHE_SIZE = 100;
// دقة التقريب للكاش (4 منازل عشرية = دقة ~11 متر)
const COORDINATE_PRECISION = 4;

// يجيب اسم المكان من OSM مع تفاصيل أكثر (المنطقة، القرية، الشارع)
// يرجع { label, cityName } حيث label هو التفاصيل الكاملة و cityName هو اسم المدينة فقط
async function reverseName(lat, lng) {
  // تقريب الإحداثيات للكاش
  const roundedLat = Number(lat.toFixed(COORDINATE_PRECISION));
  const roundedLng = Number(lng.toFixed(COORDINATE_PRECISION));
  const cacheKey = `${roundedLat},${roundedLng}`;
  
  // تحقق من الكاش أولاً
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }
  
  try {
    // استخدم الإحداثيات المقربة للاتساق مع الكاش
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLng}&accept-language=ar`;
    const res = await fetch(url, {
      headers: {
        // مهم: بعض الأحيان Nominatim يحتاج User-Agent
        'User-Agent': 'sooqyemen/1.0 (contact: sooqyemen.com)',
      },
    });
    if (!res.ok) throw new Error('reverse failed');
    const data = await res.json();

    const a = data.address || {};
    
    // نجمع التفاصيل: الشارع، القرية/الحي، المنطقة/المدينة
    const parts = [];
    
    // الشارع أو الطريق
    if (a.road) parts.push(a.road);
    else if (a.street) parts.push(a.street);
    
    // القرية أو الحي
    if (a.village) parts.push(a.village);
    else if (a.suburb) parts.push(a.suburb);
    else if (a.neighbourhood) parts.push(a.neighbourhood);
    else if (a.hamlet) parts.push(a.hamlet);
    
    // المنطقة أو المدينة
    let cityName = '';
    if (a.city) {
      cityName = a.city;
      parts.push(a.city);
    } else if (a.town) {
      cityName = a.town;
      parts.push(a.town);
    } else if (a.county) {
      cityName = a.county;
      parts.push(a.county);
    } else if (a.state) {
      cityName = a.state;
      parts.push(a.state);
    }
    
    // إذا ما في أي تفاصيل، نستخدم display_name
    const label = parts.length > 0 ? parts.join('، ') : (data.display_name || '');
    
    const result = { label: label || '', cityName: cityName || '' };
    
    // حفظ النتيجة في الكاش
    if (geocodeCache.size >= MAX_CACHE_SIZE) {
      // إذا امتلأ الكاش، احذف أقدم عنصر
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey); // آمن حتى لو firstKey كان undefined
    }
    geocodeCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    // لا نحفظ الأخطاء في الكاش لأن المشاكل الشبكية قد تكون مؤقتة
    console.warn('Reverse geocoding failed:', error);
    return { label: '', cityName: '' };
  }
}

function ClickPicker({ value, onChange }) {
  const [loadingName, setLoadingName] = useState(false);

  useMapEvents({
    async click(e) {
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

      setLoadingName(true);
      const result = await reverseName(lat, lng);
      setLoadingName(false);

      // لو ما قدر يجيب اسم، نرجع للإحداثيات
      const label =
        result?.label?.trim() ||
        `Lat: ${lat.toFixed(5)} , Lng: ${lng.toFixed(5)}`;
      
      const cityName = result?.cityName || '';

      onChange([lat, lng], label, cityName);
    },
  });

  return value ? <Marker position={value} /> : null;
}

export default function LocationPicker({ value, onChange }) {
  const wrapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [locatingMe, setLocatingMe] = useState(false);

  const center = useMemo(() => {
    if (Array.isArray(value) && value.length === 2) return value;
    return DEFAULT_CENTER;
  }, [value]);

  // معالجة الموقع بعد الحصول عليه
  const processLocation = async (lat, lng) => {
    try {
      // تحقق من الموقع داخل اليمن
      const inYemen =
        lat >= YEMEN_BOUNDS[0][0] &&
        lat <= YEMEN_BOUNDS[1][0] &&
        lng >= YEMEN_BOUNDS[0][1] &&
        lng <= YEMEN_BOUNDS[1][1];

      if (!inYemen) {
        alert('موقعك الحالي خارج اليمن 🇾🇪');
        return;
      }

      // جلب اسم المكان
      const result = await reverseName(lat, lng);
      const label =
        result?.label?.trim() ||
        `Lat: ${lat.toFixed(5)} , Lng: ${lng.toFixed(5)}`;
      
      const cityName = result?.cityName || '';

      onChange([lat, lng], label, cityName);
      
      // تحريك الخريطة للموقع الجديد
      if (map) {
        map.setView([lat, lng], 15);
      }
    } catch (error) {
      console.error('Error processing location:', error);
      alert('حدث خطأ أثناء معالجة الموقع');
    } finally {
      setLocatingMe(false);
    }
  };

  // دالة تحديد موقعي
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    setLocatingMe(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        processLocation(lat, lng);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'فشل تحديد موقعك';
        
        if (error.code === error.PERMISSION_DENIED) {
          message = 'يرجى السماح للمتصفح بالوصول إلى موقعك';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'موقعك غير متاح حالياً';
        } else if (error.code === error.TIMEOUT) {
          message = 'انتهت مهلة تحديد الموقع';
        }
        
        alert(message);
        setLocatingMe(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // إصلاح المقاسات (منع التقطيع) - Enhanced with requestAnimationFrame
  useEffect(() => {
    if (!map) return;

    const fix = () => {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        map.invalidateSize();
        // Additional delayed fixes for better reliability
        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 300);
      });
    };

    // Initial fix on mount
    fix();
    
    // Additional fix after a short delay to ensure container is visible
    setTimeout(fix, 50);
    setTimeout(fix, 200);

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

  return (
    <div className="card" style={{ minHeight: 520 }}>
      <div style={{ fontWeight: 900, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📍 اختر موقع الإعلان</span>
        <button
          onClick={handleLocateMe}
          disabled={locatingMe}
          style={{
            padding: '8px 16px',
            background: locatingMe ? '#94a3b8' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: locatingMe ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          {locatingMe ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⌛</span>
              جاري التحديد...
            </>
          ) : (
            <>
              📍 حدد موقعي
            </>
          )}
        </button>
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        اضغط على الخريطة لتحديد الموقع (داخل اليمن) أو استخدم زر "حدد موقعي"
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
