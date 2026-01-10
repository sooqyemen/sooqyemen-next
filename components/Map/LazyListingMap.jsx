// components/Map/LazyListingMap.jsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the actual map component with no SSR
const ListingMap = dynamic(() => import('./ListingMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '320px',
      background: '#f8f9fa',
      borderRadius: '14px',
      gap: '12px',
    }}>
      <div style={{ fontSize: '48px' }}>🗺️</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>
        جاري تحميل الخريطة...
      </div>
    </div>
  ),
});

/**
 * Lazy-loaded map wrapper that only loads Google Maps/Leaflet when user clicks "Show Map"
 * This reduces initial bundle size and improves Time to Interactive (TTI)
 */
export default function LazyListingMap({ coords, label }) {
  const [showMap, setShowMap] = useState(false);

  if (!showMap) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '320px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '14px',
        gap: '16px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => setShowMap(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.4,
        }}/>
        
        <div style={{ fontSize: '64px', zIndex: 1 }}>🗺️</div>
        <button
          style={{
            padding: '14px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#667eea',
            background: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          🗺️ اضغط لإظهار الخريطة
        </button>
        <div style={{
          fontSize: '14px',
          color: 'white',
          opacity: 0.9,
          zIndex: 1,
        }}>
          {coords ? '📍 موقع محدد على الخريطة' : '🌍 عرض الخريطة'}
        </div>
      </div>
    );
  }

  // Once user clicks, load the actual map component
  return <ListingMap coords={coords} label={label} />;
}
