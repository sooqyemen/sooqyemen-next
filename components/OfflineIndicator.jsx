// components/OfflineIndicator.jsx
'use client';

import { useEffect, useState } from 'react';
import './OfflineIndicator.css';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide success indicator after 3 seconds
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`} role="status" aria-live="polite">
      <div className="offline-content">
        {isOnline ? (
          <>
            <span className="indicator-icon">✅</span>
            <span className="indicator-text">تم استعادة الاتصال بالإنترنت</span>
          </>
        ) : (
          <>
            <span className="indicator-icon">📡</span>
            <span className="indicator-text">لا يوجد اتصال بالإنترنت</span>
          </>
        )}
      </div>
      <button
        className="close-indicator"
        onClick={() => setShowIndicator(false)}
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  );
}
