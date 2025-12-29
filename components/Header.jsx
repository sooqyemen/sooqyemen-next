// components/Header.jsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/useAuth';

const ADMINS = ['mansouralbarout@gmail.com']; // بريد الأدمن (داخلي فقط)

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
        gap: 6,
      }}
    >
      {/* السطر الأول: الشعار + الاسم + تسجيل الدخول */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* الشعار + اسم الموقع */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* الشعار من ملف الصورة */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <Image
              src="/logo.png"      // تأكد أن اسم الملف في public هو logo.png
              alt="شعار سوق اليمن"
              width={40}
              height={40}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              priority
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>سوق اليمن</span>
            <span className="muted" style={{ fontSize: 11 }}>
              منصة إعلانات مبوبة في اليمن
            </span>
          </div>
        </div>

        {/* تسجيل الدخول / الخروج */}
        <button
          onClick={() => (!user ? signInWithGoogle() : signOut())}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            fontSize: 12,
            color: '#2563eb',
            padding: 0,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#e0ecff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            👤
          </div>
          <span>{user ? 'تسجيل الخروج' : 'تسجيل الدخول'}</span>
        </button>
      </div>

      {/* السطر الثاني: إضافة إعلان + لوحة الإدارة (للأدمن فقط) */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          href="/add"
          className="btn btn-primary"
          style={{
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + إضافة إعلان
        </Link>

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
