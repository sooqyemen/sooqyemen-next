// components/Header.jsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { auth, googleProvider } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

export default function Header() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const signInGoogle = async () => {
    setBusy(true);
    try {
      await auth.signInWithPopup(googleProvider);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await auth.signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <header
      style={{
        borderBottom: '1px solid #eee',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* شعار الموقع + عنوان صغير */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.svg"
              alt="سوق اليمن"
              style={{ height: 40, width: 40, borderRadius: 12 }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>سوق اليمن</div>
              <div className="muted" style={{ fontSize: 12 }}>
                بيع وشراء كل شيء في اليمن
              </div>
            </div>
          </div>
        </Link>

        {/* الأزرار */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {/* زر واحد فقط لإضافة إعلان */}
          <Link href="/add">
            <button className="btn btnPrimary" type="button" disabled={busy}>
              + أضف إعلاناً
            </button>
          </Link>

          {/* لوحة الإدارة */}
          <Link href="/admin">
            <button className="btn" type="button">
              لوحة الإدارة
            </button>
          </Link>

          {/* تسجيل الدخول / الخروج */}
          {!user ? (
            <button
              className="btn"
              onClick={signInGoogle}
              disabled={busy}
              type="button"
            >
              تسجيل الدخول (Google)
            </button>
          ) : (
            <>
              <span className="badge" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </span>
              <button
                className="btn"
                onClick={signOut}
                disabled={busy}
                type="button"
              >
                خروج
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
