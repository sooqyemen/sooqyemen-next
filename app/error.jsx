'use client';

// app/error.jsx
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error);
    }
  }, [error]);

  return (
    <div dir="rtl" className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card" style={{ padding: 24, textAlign: 'center', border: '2px solid rgba(220,38,38,0.25)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: '#991b1b' }}>
          عذراً، حدث خطأ ما
        </div>
        <div className="muted" style={{ marginBottom: 16 }}>
          حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.
        </div>
        <button
          className="btn btnPrimary"
          onClick={() => reset()}
          style={{ marginRight: 8 }}
        >
          🔄 إعادة المحاولة
        </button>
        <button
          className="btn"
          onClick={() => (window.location.href = '/')}
        >
          🏠 العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
