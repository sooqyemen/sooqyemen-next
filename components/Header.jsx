// components/Header.jsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

const ADMINS = ['mansouralbarout@gmail.com']; // بريديك كأدمن بدون ما نعرضه للمستخدمين

export default function Header() {
  const { user, signInWithGoogle, signOut } = useAuth();

  const isAdmin = user && ADMINS.includes(user.email || '');

  return (
    <header
      className="container"
      style={{
        paddingTop: 12,
        paddingBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* السطر العلوي: شعار + اسم الموقع + أيقونة الحساب */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* شعار بسيط */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '999px',
              background: '#0f98d6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            س
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>سوق اليمن</span>
            <span
              className="muted"
              style={{ fontSize: 11, marginTop: 2 }}
            >
              منصة إعلانات مبوبة في اليمن
            </span>
          </div>
        </div>

        {/* أيقونة الحساب / تسجيل الدخول */}
        <button
          type="button"
          onClick={() => {
            if (!user) {
              signInWithGoogle();
            } else {
              // ممكن لاحقاً نفتح صفحة حسابي، حالياً نخليه تسجيل خروج
              signOut();
            }
          }}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#2563eb',
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '999px',
              background: '#e0ecff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            👤
          </span>
          <span>{user ? 'تسجيل الخروج' : 'تسجيل الدخول'}</span>
        </button>
      </div>

      {/* السطر الثاني: أزرار العمليات الرئيسية */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* زر إضافة إعلان (واحد فقط في الموقع) */}
        <Link
          href="/add"
          className="btn btn-primary"
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + إضافة إعلان
        </Link>

        {/* زر لوحة الإدارة للأدمن فقط */}
        {isAdmin && (
          <Link
            href="/admin"
            className="btn btn-outline"
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 12,
              textDecoration: 'none',
            }}
          >
            لوحة الإدارة
          </Link>
        )}
      </div>
    </header>
  );
}
