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
    try { await auth.signInWithPopup(googleProvider); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    try { await auth.signOut(); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ borderBottom:'1px solid #eee', background:'#fff', position:'sticky', top:0, zIndex:20 }}>
      <div className="container row" style={{ justifyContent:'space-between' }}>
        <div className="row">
          <Link href="/" className="row" style={{ gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:12, background:'#0ea5e9', color:'#fff', display:'grid', placeItems:'center', fontWeight:700 }}>س</div>
            <div>
              <div style={{ fontWeight:800 }}>سوق اليمن</div>
              <div className="muted" style={{ fontSize:12 }}>Next.js</div>
            </div>
          </Link>
        </div>

        <div className="row">
          <Link className="btn" href="/add">إضافة إعلان</Link>
          <Link className="btn" href="/admin">لوحة الإدارة</Link>
          {!user ? (
            <button className="btn btnPrimary" onClick={signInGoogle} disabled={busy}>
              تسجيل الدخول (Google)
            </button>
          ) : (
            <>
              <span className="badge">{user.email}</span>
              <button className="btn" onClick={signOut} disabled={busy}>خروج</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
