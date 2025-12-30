'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// الإيميلات المسموح لها بلوحة الإدارة
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com',
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// لوجو سوق اليمن (مطابق للصورة تقريبًا)
const YemenMarketLogo = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* الخلفية الزرقاء بزوايا دائرية */}
    <rect
      x="16"
      y="16"
      width="480"
      height="480"
      rx="120"
      ry="120"
      fill="#0F4C8A"
    />

    {/* جسم الحقيبة الأبيض */}
    <rect
      x="120"
      y="160"
      width="272"
      height="260"
      rx="80"
      ry="80"
      fill="#FFFFFF"
    />

    {/* يد الحقيبة (القوس الذهبي) */}
    <path
      d="M176 190 C176 140 216 104 256 104 C296 104 336 140 336 190"
      fill="none"
      stroke="#E5B322"
      strokeWidth="32"
      strokeLinecap="round"
    />

    {/* ألوان العلم اليمني */}
    <rect x="150" y="200" width="212" height="40" fill="#CE1126" />
    <rect x="150" y="240" width="212" height="36" fill="#FFFFFF" />
    <rect x="150" y="276" width="212" height="40" fill="#000000" />

    {/* حرف ي */}
    <path
      d="
        M238 356
        C238 332 252 320 272 320
        C292 320 306 332 306 356
        C306 388 284 408 272 408
        C260 408 238 388 238 356
        Z
      "
      fill="#0F4C8A"
    />
    <path
      d="M252 332 C252 312 262 300 272 300 C282 300 292 312 292 332"
      stroke="#0F4C8A"
      strokeWidth="18"
      strokeLinecap="round"
      fill="none"
    />

    {/* نقطتا الياء */}
    <circle cx="256" cy="430" r="10" fill="#0F4C8A" />
    <circle cx="284" cy="430" r="10" fill="#0F4C8A" />
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
      if (typeof login === 'function') {
        await login();
      } else {
        // لو ما فيه login في الهوك افتح صفحة /login
        window.location.href = '/login';
      }
      setMenuOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    if (!logout) return;
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

  // حالة التحميل
  if (loading) {
    return (
      <header className="header-shell">
        <div className="container header-bar">
          <div className="skeleton" style={{ width: 140, height: 30 }} />
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
      {/* الهيدر الأساسي */}
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
          {/* زر القائمة للجوال */}
          <button
            className="icon-btn mobile-only"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
          >
            <span className="icon-lines" />
          </button>

          {/* الشعار + الاسم في المنتصف */}
          <Link href="/" className="logo-wrap">
            <YemenMarketLogo size={40} />
            <div className="logo-text">
              <span className="logo-title">سوق اليمن</span>
              <span className="logo-sub">بيع وشراء كل شيء في اليمن</span>
            </div>
          </Link>

          {/* زر أضف إعلاناً (يظهر في الديسكتوب فقط) */}
          <div className="right-slot">
            <Link href="/add" className="add-btn">
              <span className="add-plus">+</span>
              <span className="add-label">أضف إعلاناً</span>
            </Link>
          </div>
        </div>

        {/* صف ثاني للديسكتوب (روابط إضافية) */}
        <div className="desktop-only secondary-row">
          <div className="container secondary-inner">
            {user && (
              <span className="user-chip">👤 {user.email.split('@')[0]}</span>
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

      {/* القائمة الجانبية للجوال */}
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
                  <div className="side-user">👤 {user.email}</div>
                ) : (
                  <div className="side-user muted">زائر · لم تقم بتسجيل الدخول</div>
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
              <Link
                href="/add"
                className="side-item"
                onClick={() => setMenuOpen(false)}
              >
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

        /* ضبط الجوال: الشعار في المنتصف و زر القائمة في اليمين */
        @media (max-width: 768px) {
          .header-bar {
            justify-content: center;
            position: relative;
            padding: 8px 0;
          }

          .logo-wrap {
            margin-inline: 0;
          }

          .mobile-only {
            display: inline-flex;
            position: absolute;
            inset-inline-end: 12px;
            top: 50%;
            transform: translateY(-50%);
          }

          .right-slot {
            display: none;
          }

          .logo-title {
            font-size: 16px;
          }
          .logo-sub {
            font-size: 10px;
          }

          .desktop-only {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
