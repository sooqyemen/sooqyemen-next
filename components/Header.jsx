'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// إعداد الإيميلات الإدارية
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com',
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// لوجو سوق اليمن (مثل الشنطة اللي تستخدمها)
const YemenMarketLogo = ({ size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="36" height="36" rx="10" fill="#1E3A8A" />
    <path
      d="M23 25H13C11.8954 25 11 24.1046 11 23V17C11 15.8954 11.8954 15 13 15H23C24.1046 15 25 15.8954 25 17V23C25 24.1046 24.1046 25 23 25Z"
      fill="white"
    />
    <path
      d="M18 13C21.3137 13 24 15.6863 24 19C24 22.3137 21.3137 25 18 25C14.6863 25 12 22.3137 12 19C12 15.6863 14.6863 13 18 13Z"
      stroke="#FBBF24"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    <rect x="13" y="17" width="10" height="2" fill="#CE1126" />
    <rect x="13" y="19" width="10" height="2" fill="white" />
    <rect x="13" y="21" width="10" height="2" fill="#000000" />
    <path
      d="M20 24C20 24 19 25 18 25C17 25 16 24 16 24C15 23 16 22 17 22C18 22 19 23 20 24Z"
      fill="#1E3A8A"
    />
    <path
      d="M17 22C17 22 17 20 18 20C19 20 19 22 19 22"
      stroke="#1E3A8A"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export default function Header() {
  const { user, loading, login, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    try {
      await login();
      setMenuOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // حالة التحميل البسيطة
  if (loading) {
    return (
      <header className="header-shell">
        <div className="container header-bar">
          <div className="skeleton" style={{ width: 120, height: 28 }} />
        </div>
        <style jsx>{`
          .header-shell {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: #ffffff;
          }
          .header-bar {
            display: flex;
            justify-content: center;
            padding: 10px 0;
          }
          .skeleton {
            background: linear-gradient(
              90deg,
              #f1f5f9 25%,
              #e2e8f0 50%,
              #f1f5f9 75%
            );
            background-size: 200% 100%;
            border-radius: 999px;
            animation: loading 1.4s infinite;
          }
          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </header>
    );
  }

  return (
    <>
      {/* شريط علوي مثل حراج */}
      <header
        className="header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : '#ffffff',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          boxShadow: scrolled ? '0 2px 8px rgba(15,23,42,0.08)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <div className="container header-bar">
          {/* زر القائمة (يظهر في الجوال فقط) */}
          <button
            className="icon-btn mobile-only"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
          >
            <span className="icon-lines" />
          </button>

          {/* الشعار في المنتصف */}
          <Link href="/" className="logo-wrap">
            <YemenMarketLogo size={32} />
            <div className="logo-text">
              <span className="logo-title">سوق اليمن</span>
              <span className="logo-sub">بيع وشراء كل شيء في اليمن</span>
            </div>
          </Link>

          {/* زر أضف إعلاناً (يمين في الديسكتوب، أسفله في الجوال) */}
          <div className="right-slot">
            <Link href="/add" className="add-btn">
              <span className="add-plus">+</span>
              <span className="add-label">أضف إعلاناً</span>
            </Link>
          </div>
        </div>

        {/* في الديسكتوب فقط: شريط ثانوي بسيط مثل حراج */}
        <div className="desktop-only secondary-row">
          <div className="container secondary-inner">
            {user && (
              <span className="user-chip">
                👤 {user.email.split('@')[0]}
              </span>
            )}

            <div className="secondary-links">
              {user && (
                <Link href="/my-listings" className="sec-link">
                  إعلاناتي
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="sec-link sec-admin">
                  لوحة الإدارة
                </Link>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="sec-link as-btn"
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'جاري الخروج…' : 'خروج'}
                </button>
              ) : (
                <button onClick={handleLogin} className="sec-link as-btn">
                  دخول
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* القائمة الجانبية للجوال (مثل حراج) */}
      {menuOpen && (
        <>
          <div
            className="menu-backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="side-menu">
            <div className="side-header">
              <div>
                <div className="side-title">القائمة</div>
                {user ? (
                  <div className="side-user">
                    👤 {user.email}
                  </div>
                ) : (
                  <div className="side-user muted">
                    غير مسجّل · زائر
                  </div>
                )}
              </div>
              <button
                className="icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="side-section">
              <Link href="/add" className="side-item" onClick={() => setMenuOpen(false)}>
                <span>➕</span>
                <span>أضف إعلاناً</span>
              </Link>

              {user && (
                <Link
                  href="/my-listings"
                  className="side-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>📋</span>
                  <span>إعلاناتي</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="side-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>🛡️</span>
                  <span>لوحة الإدارة</span>
                </Link>
              )}
            </div>

            <div className="side-section">
              {user ? (
                <button
                  className="side-item as-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span>🚪</span>
                  <span>{isLoggingOut ? 'جاري الخروج…' : 'تسجيل الخروج'}</span>
                </button>
              ) : (
                <button className="side-item as-btn" onClick={handleLogin}>
                  <span>🔑</span>
                  <span>تسجيل الدخول عبر جوجل</span>
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          gap: 12px;
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }
        .logo-text {
          display: flex;
          flex-direction: column;
        }
        .logo-title {
          font-weight: 900;
          font-size: 18px;
          line-height: 1.2;
        }
        .logo-sub {
          font-size: 11px;
          color: #64748b;
          line-height: 1.2;
        }

        .right-slot {
          display: flex;
          align-items: center;
        }

        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
          border: none;
          white-space: nowrap;
        }
        .add-plus {
          font-size: 16px;
          line-height: 1;
        }
        .add-label {
          line-height: 1;
        }

        .icon-btn {
          border: none;
          background: #f1f5f9;
          border-radius: 999px;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .icon-lines {
          width: 16px;
          height: 2px;
          border-radius: 4px;
          background: #0f172a;
          position: relative;
        }
        .icon-lines::before,
        .icon-lines::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 4px;
          background: #0f172a;
        }
        .icon-lines::before {
          top: -5px;
        }
        .icon-lines::after {
          top: 5px;
        }

        .secondary-row {
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          background: #f9fafb;
        }
        .secondary-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          gap: 12px;
        }
        .user-chip {
          font-size: 13px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #e5e7eb;
          color: #111827;
        }
        .secondary-links {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sec-link {
          font-size: 13px;
          color: #4b5563;
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 999px;
        }
        .sec-link:hover {
          background: #e5e7eb;
        }
        .sec-admin {
          color: #b91c1c;
        }
        .as-btn {
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 999;
        }
        .side-menu {
          position: fixed;
          inset-block: 0;
          inset-inline-end: 0;
          width: 78%;
          max-width: 340px;
          background: #ffffff;
          z-index: 1000;
          box-shadow: -4px 0 16px rgba(15, 23, 42, 0.25);
          display: flex;
          flex-direction: column;
          padding: 14px 14px 18px;
        }
        .side-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .side-title {
          font-weight: 800;
          font-size: 17px;
        }
        .side-user {
          font-size: 12px;
          margin-top: 2px;
        }
        .muted {
          color: #9ca3af;
        }

        .side-section {
          border-top: 1px solid #e5e7eb;
          margin-top: 10px;
          padding-top: 10px;
        }
        .side-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 4px;
          font-size: 14px;
          text-decoration: none;
          color: #111827;
          border-radius: 8px;
        }
        .side-item span:first-child {
          width: 22px;
          text-align: center;
        }
        .side-item:hover {
          background: #f3f4f6;
        }
        .side-item.as-btn {
          border: none;
          background: transparent;
          text-align: start;
          cursor: pointer;
        }

        .mobile-only {
          display: none;
        }
        .desktop-only {
          display: block;
        }

        @media (max-width: 768px) {
          .header-bar {
            justify-content: space-between;
          }
          .logo-wrap {
            margin-inline: auto;
          }
          .right-slot {
            display: none; /* زر أضف إعلاناً يبقى في شريط فوق الهيرو (الهيرو عندك) أو نرجعه لاحقًا كزر عائم */
          }
          .logo-title {
            font-size: 16px;
          }
          .logo-sub {
            font-size: 10px;
          }
          .mobile-only {
            display: inline-flex;
          }
          .desktop-only {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
