'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

// نفس نظام الأدمن المستخدم في صفحة /admin
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com', // احذف السطر لو ما تريده أدمن
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function Header() {
  const { user, loading, logout } = useAuth();
  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  return (
    <header className="header">
      <div
        className="container row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* شعار الموقع */}
        <Link href="/" className="row" style={{ gap: 6, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 900, fontSize: 18 }}>سوق اليمن</span>
          <span className="muted" style={{ fontSize: 12 }}>
            بيع وشراء كل شيء في اليمن
          </span>
        </Link>

        <div
          className="row"
          style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {/* إيميل المستخدم */}
          {user && (
            <span className="badge">
              {user.email}
            </span>
          )}

          {/* أضف إعلاناً */}
          <Link className="btn btnPrimary" href="/add">
            + أضف إعلاناً
          </Link>

          {/* لوحة تحكم المستخدم العادي لإعلاناته */}
          {user && (
            <Link className="btn" href="/my-listings">
              إعلاناتي
            </Link>
          )}

          {/* 🔒 لوحة الإدارة – للأدمن فقط */}
          {isAdmin && (
            <Link className="btn" href="/admin">
              لوحة الإدارة
            </Link>
          )}

          {/* دخول / خروج */}
          {user ? (
            <button className="btn" onClick={logout}>
              خروج
            </button>
          ) : (
            <Link className="btn" href="/login">
              دخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
