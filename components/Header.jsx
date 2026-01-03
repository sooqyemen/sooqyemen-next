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

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  // ظل الهيدر عند التمرير
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // قفل سكرول الصفحة + ESC للإغلاق
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

  if (loading) {
    return (
      <header className="header-shell">
        <div className="container header-row">
          <div className="skeleton" style={{ width: 160, height: 32 }} />
        </div>
        <style jsx>{`
          .header-shell {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: #ffffff;
            border-bottom: 1px solid #eef2f7;
          }
          .header-row {
            display: flex;
            justify-content: center;
            padding: 10px 0;
          }
          .skeleton {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            border-radius: 999px;
            animation: loading 1.4s infinite;
          }
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
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
          borderBottom: scrolled ? 'none' : '1px solid #eef2f7',
          transition: 'all 0.25s ease',
        }}
      >
        <div className="container header-row">
          {/* زر القائمة (يمين) */}
          <div className="header-left">
            <button
              className="icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="القائمة"
            >
              <span className="icon-lines" />
            </button>
          </div>

          {/* زر إضافة إعلان (يسار) */}
          <div className="header-right">
            <Link href="/add" className="btn primary add-btn">
              <span className="add-text">+ أضف إعلاناً</span>
              <span className="add-text-mobile">+ إعلان</span>
            </Link>
          </div>
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
        /* ✅ تحسينات رئيسية للتجاوب مع الجوال */
        .header-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          direction: rtl; /* للحفاظ على الاتجاه العربي */
        }

        .header-left, .header-right {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
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
          flex-shrink: 0;
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
        .icon-lines::before { top: -5px; }
        .icon-lines::after { top: 5px; }

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
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        .btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
        }

        /* نص زر الإضافة: كبير للديسكتوب / مختصر للجوال */
        .add-text-mobile { display: none; }

        /* تحسينات للشاشات الصغيرة */
        @media (max-width: 480px) {
          .header-row {
            padding: 8px 10px;
          }
          
          .btn { 
            padding: 7px 12px; 
            font-size: 12px; 
          }
          
          .add-text { display: none; }
          .add-text-mobile { display: inline; }
          
          .icon-btn {
            width: 32px;
            height: 32px;
          }
        }

        /* تحسينات للشاشات الصغيرة جداً */
        @media (max-width: 360px) {
          .btn { 
            padding: 6px 10px; 
            font-size: 11px; 
          }
          
          .add-text-mobile {
            font-size: 10px;
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
          direction: rtl;
        }
        .side-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .side-title { font-weight: 800; font-size: 17px; }
        .side-user { font-size: 12px; margin-top: 2px; }
        .muted { color: #9ca3af; }

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
        .side-item:hover { background: #f3f4f6; }
        .side-item.as-btn {
          border: none;
          background: transparent;
          text-align: start;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .side-menu {
            width: 85%;
          }
        }
      `}</style>
    </>
  );
}
