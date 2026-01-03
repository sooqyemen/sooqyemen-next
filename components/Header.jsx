'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// إيميلات المدراء
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// لوجو سوق اليمن
const YemenMarketLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="16" width="480" height="480" rx="120" ry="120" fill="#0F4C8A" />
    <rect x="120" y="160" width="272" height="260" rx="80" ry="80" fill="#FFFFFF" />
    <path
      d="M176 190 C176 140 216 104 256 104 C296 104 336 140 336 190"
      fill="none"
      stroke="#E5B322"
      strokeWidth="32"
      strokeLinecap="round"
    />
    <rect x="150" y="200" width="212" height="40" fill="#CE1126" />
    <rect x="150" y="240" width="212" height="36" fill="#FFFFFF" />
    <rect x="150" y="276" width="212" height="40" fill="#000000" />
    <path
      d="M238 356 C238 332 252 320 272 320 C292 320 306 332 306 356 C306 388 284 408 272 408 C260 408 238 388 238 356 Z"
      fill="#0F4C8A"
    />
    <path
      d="M252 332 C252 312 262 300 272 300 C282 300 292 312 292 332"
      stroke="#0F4C8A"
      strokeWidth="18"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="256" cy="430" r="10" fill="#0F4C8A" />
    <circle cx="284" cy="430" r="10" fill="#0F4C8A" />
  </svg>
);

export default function Header() {
  const { user, loading, logout } = useAuth();
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

  if (loading) {
    return (
      <header className="header-shell">
        <div className="container header-grid">
          <div className="skeleton" style={{ width: 140, height: 30 }} />
        </div>
        <style jsx>{`
          .header-shell {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: #ffffff;
          }
          .header-grid {
            display: grid;
            place-items: center;
            padding: 10px 0;
          }
          .skeleton {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
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
        <div className="container header-grid">
          {/* يمين: زر القائمة */}
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="القائمة">
            <span className="icon-lines" />
          </button>

          {/* وسط: اللوجو */}
          <div className="logo-wrap">
            <Link href="/" aria-label="سوق اليمن">
              <YemenMarketLogo size={40} />
            </Link>
          </div>

          {/* يسار: زر إضافة إعلان */}
          <Link href="/add" className="btn primary add-btn" aria-label="أضف إعلاناً">
            <span className="add-plus">+</span>
            <span className="add-text">أضف إعلاناً</span>
          </Link>
        </div>
      </header>

      {/* القائمة الجانبية */}
      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="side-menu" role="dialog" aria-modal="true">
            <div className="side-header">
              <div>
                <div className="side-title">القائمة</div>
                {user ? (
                  <div className="side-user">👤 {user.email}</div>
                ) : (
                  <div className="side-user muted">زائر · لم تقم بتسجيل الدخول</div>
                )}
              </div>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="إغلاق">
                ✕
              </button>
            </div>

            <div className="side-section">
              <Link href="/add" className="side-item" onClick={() => setMenuOpen(false)}>
                <span>➕</span>
                <span>أضف إعلاناً</span>
              </Link>

              {user && (
                <Link href="/my-listings" className="side-item" onClick={() => setMenuOpen(false)}>
                  <span>📋</span>
                  <span>إعلاناتي</span>
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="side-item" onClick={() => setMenuOpen(false)}>
                  <span>🛡️</span>
                  <span>لوحة الإدارة</span>
                </Link>
              )}
            </div>

            <div className="side-section">
              {user ? (
                <button className="side-item as-btn" onClick={handleLogout} disabled={isLoggingOut}>
                  <span>🚪</span>
                  <span>{isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</span>
                </button>
              ) : (
                <Link href="/login" className="side-item" onClick={() => setMenuOpen(false)}>
                  <span>🔑</span>
                  <span>تسجيل الدخول</span>
                </Link>
              )}
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        /* ✅ أهم نقطة: Grid يمنع اختفاء الأزرار */
        .header-grid {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          padding: 8px 0;
          gap: 10px;
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
          flex: 0 0 auto;
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

        /* وسط: اللوجو يتوسّط بدون ما “يدفع” الأزرار */
        .logo-wrap {
          display: flex;
          justify-content: center;
          min-width: 0;
        }

        .btn {
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 13px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          cursor: pointer;
          text-decoration: none;
          color: #111827;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        .add-plus {
          font-size: 16px;
          line-height: 1;
        }

        /* ✅ على الجوال: نخلي زر الإضافة “صغير” عشان ما يزحم ويخفي زر القائمة */
        @media (max-width: 420px) {
          .add-text {
            display: none;
          }
          .btn {
            padding: 7px 10px;
          }
        }

        /* القائمة الجانبية */
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

        @media (max-width: 768px) {
          .header-grid {
            padding: 8px 10px;
          }
        }
      `}</style>
    </>
  );
}
