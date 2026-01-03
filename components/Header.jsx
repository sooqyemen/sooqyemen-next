// components/Header.jsx
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

// ✅ ثبّت ارتفاع الهيدر عشان نعوضه تحت
const HEADER_H = 56;

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  // ظل الهيدر عند التمرير
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ قفل سكرول الصفحة + ESC للإغلاق
  useEffect(() => {
    if (!menuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    if (!logout) {
      setMenuOpen(false);
      return;
    }
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

  // ✅ أثناء التحميل نخلي هيدر ثابت بسيط
  if (loading) {
    return (
      <>
        <header className="header-shell">
          <div className="container header-row">
            <div className="skeleton" style={{ width: 160, height: 32 }} />
          </div>
        </header>

        {/* ✅ تعويض ارتفاع الهيدر */}
        <div style={{ height: HEADER_H }} />

        <style jsx>{`
          .header-shell {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: #ffffff;
            border-bottom: 1px solid #eef2f7;
            height: ${HEADER_H}px;
            display: flex;
            align-items: center;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
          .header-row {
            display: flex;
            justify-content: center;
            padding: 0 12px;
            width: 100%;
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
      </>
    );
  }

  return (
    <>
      {/* ✅ Fixed بدل Sticky (هذا اللي يحل اختفاء زر القائمة بالجوال) */}
      <header
        className="header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: HEADER_H,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.98)' : '#ffffff',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(10px)' : 'none',
          boxShadow: scrolled ? '0 2px 10px rgba(15,23,42,0.10)' : 'none',
          borderBottom: scrolled ? 'none' : '1px solid #eef2f7',
          transition: 'all 0.2s ease',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <div className="container header-row">
          {/* زر القائمة */}
          <button
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            type="button"
          >
            <span className="icon-lines" />
          </button>

          {/* وسط فاضي (بدون شعار وبدون نص) */}
          <div className="center-spacer" />

          {/* زر إضافة إعلان (يصغر تلقائي للجوال) */}
          <Link href="/add" className="add-link" aria-label="أضف إعلاناً">
            <span className="add-plus">+</span>
            <span className="add-text">أضف إعلاناً</span>
          </Link>
        </div>
      </header>

      {/* ✅ تعويض ارتفاع الهيدر حتى لا يغطي المحتوى */}
      <div style={{ height: HEADER_H }} />

      {/* القائمة الجانبية */}
      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="side-menu" role="dialog" aria-modal="true">
            <div className="side-header">
              <div>
                <div className="side-title">القائمة</div>
                {user ? (
                  <div className="side-user">👤 {user.displayName || 'مستخدم'}</div>
                ) : (
                  <div className="side-user muted">
                    زائر · لم تقم بتسجيل الدخول
                  </div>
                )}
              </div>
              <button
                className="icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق"
                type="button"
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
                  type="button"
                >
                  <span>🚪</span>
                  <span>
                    {isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
                  </span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="side-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>🔑</span>
                  <span>تسجيل الدخول</span>
                </Link>
              )}
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: ${HEADER_H}px;
          padding: 0 10px;
        }

        .center-spacer {
          flex: 1;
        }

        .icon-btn {
          border: none;
          background: #f1f5f9;
          border-radius: 999px;
          width: 36px;
          height: 36px;
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

        /* زر إضافة إعلان */
        .add-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          text-decoration: none;
          color: #ffffff;
          font-weight: 800;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.30);
          flex: 0 0 auto;
          white-space: nowrap;
        }
        .add-plus {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          font-size: 16px;
          line-height: 1;
        }
        .add-text {
          font-size: 13px;
        }

        /* ✅ على الجوال: نخلي الزر أصغر (حتى ما يضغط الهيدر) */
        @media (max-width: 420px) {
          .add-link {
            padding: 8px 10px;
            gap: 6px;
          }
          .add-text {
            display: none; /* نخليها + فقط */
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
          font-weight: 900;
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
          padding: 9px 6px;
          font-size: 14px;
          text-decoration: none;
          color: #111827;
          border-radius: 10px;
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
      `}</style>
    </>
  );
}
