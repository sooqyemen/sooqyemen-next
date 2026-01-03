'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useMemo, useState, useCallback } from 'react';

// إيميلات المدراء
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  // ✅ قفل سكرول الصفحة عندما تكون القائمة مفتوحة
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [menuOpen]);

  // ✅ إغلاق القائمة عند الضغط على ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleLogout = async () => {
    if (!logout) {
      closeMenu();
      return;
    }
    setIsLoggingOut(true);
    try {
      await logout();
      closeMenu();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSideClick = (e) => e.stopPropagation();

  // ✅ لاحقاً: اربطها بمنطق unread
  const hasUnreadMessages = useMemo(() => false, [user]);

  return (
    <>
      {/* ✅ هيدر ثابت (يظهر على الجوال واللابتوب) */}
      <header className="sy-header">
        <div className="sy-header-inner">
          {/* زر القائمة */}
          <button
            className="sy-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={menuOpen}
            type="button"
          >
            <span className="sy-icon-lines" />
          </button>

          {/* العنوان */}
          <Link href="/" className="sy-title" aria-label="سوق اليمن">
            سوق اليمن
          </Link>

          {/* زر إضافة إعلان */}
          <Link href="/add" className="sy-add-btn" aria-label="أضف إعلان جديد">
            + أضف إعلان
          </Link>
        </div>
      </header>

      {/* ✅ Backdrop */}
      <div
        className={`sy-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />

      {/* ✅ القائمة */}
      <aside
        className={`sy-side ${menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل"
        aria-hidden={!menuOpen}
        onClick={handleSideClick}
      >
        <div className="sy-side-head">
          <div className="sy-side-user-info">
            <div className="sy-side-title">القائمة</div>

            {user ? (
              <div className="sy-side-user">
                <span className="sy-user-avatar">👤</span>
                <span className="sy-user-email">{user.email}</span>
              </div>
            ) : (
              <div className="sy-side-guest">
                <span className="sy-guest-icon">👤</span>
                <span className="sy-guest-text">زائر - لم تقم بتسجيل الدخول</span>
              </div>
            )}
          </div>

          <button
            className="sy-close-btn"
            onClick={closeMenu}
            aria-label="إغلاق القائمة"
            type="button"
          >
            ✕
          </button>
        </div>

        <nav className="sy-side-nav">
          <div className="sy-nav-section">
            <Link href="/add" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
              <span className="sy-nav-icon">➕</span>
              <span className="sy-nav-text">أضف إعلاناً</span>
            </Link>

            {user && (
              <>
                <Link
                  href="/my-listings"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">📋</span>
                  <span className="sy-nav-text">إعلاناتي</span>
                </Link>

                {/* ✅ محادثاتي */}
                <Link
                  href="/my-chats"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">
                    💬
                    {hasUnreadMessages && (
                      <span className="sy-unread-badge" aria-label="رسائل غير مقروءة" />
                    )}
                  </span>
                  <span className="sy-nav-text">
                    محادثاتي
                    {hasUnreadMessages && <span className="sy-unread-count"> جديد</span>}
                  </span>
                </Link>
              </>
            )}

            {isAdmin && (
              <Link href="/admin" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
                <span className="sy-nav-icon">🛡️</span>
                <span className="sy-nav-text">لوحة الإدارة</span>
              </Link>
            )}
          </div>

          <div className="sy-nav-section">
            {loading ? (
              <div className="sy-loading-item">
                <span className="sy-loading-spinner" />
                <span>جاري التحميل…</span>
              </div>
            ) : user ? (
              <button
                className="sy-nav-item sy-logout-btn"
                onClick={handleLogout}
                disabled={isLoggingOut}
                type="button"
              >
                <span className="sy-nav-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
                <span className="sy-nav-text">
                  {isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
                </span>
              </button>
            ) : (
              <Link href="/login" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
                <span className="sy-nav-icon">🔑</span>
                <span className="sy-nav-text">تسجيل الدخول</span>
              </Link>
            )}
          </div>

          <div className="sy-nav-section">
            <Link href="/about" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
              <span className="sy-nav-icon">ℹ️</span>
              <span className="sy-nav-text">عن المنصة</span>
            </Link>

            <Link href="/help" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
              <span className="sy-nav-icon">❓</span>
              <span className="sy-nav-text">مساعدة ودعم</span>
            </Link>

            <Link href="/privacy" className="sy-nav-item" onClick={closeMenu} prefetch={false}>
              <span className="sy-nav-icon">🔒</span>
              <span className="sy-nav-text">سياسة الخصوصية</span>
            </Link>
          </div>
        </nav>

        <div className="sy-safe-area" />
      </aside>

      {/* ✅ مهم جدًا: الهيدر fixed يحتاج مسافة أعلى المحتوى */}
      <div className="sy-header-spacer" />

      <style jsx>{`
        .sy-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1200;
          background: #ffffff;
          border-bottom: 1px solid rgba(229, 231, 235, 0.9);
          height: 60px;
          padding-top: env(safe-area-inset-top);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .sy-header-inner {
          height: 60px;
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          padding: 0 16px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .sy-header-spacer {
          height: calc(60px + env(safe-area-inset-top));
        }

        .sy-menu-btn {
          border: none;
          background: #f8fafc;
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
        }

        .sy-menu-btn:active {
          background: #e2e8f0;
          transform: scale(0.98);
        }

        .sy-icon-lines {
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: #1e293b;
          position: relative;
        }
        .sy-icon-lines::before,
        .sy-icon-lines::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 2px;
          background: #1e293b;
        }
        .sy-icon-lines::before {
          top: -6px;
        }
        .sy-icon-lines::after {
          top: 6px;
        }

        .sy-title {
          text-align: center;
          font-weight: 900;
          font-size: 18px;
          color: #1e293b;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 8px;
        }

        .sy-add-btn {
          text-decoration: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
          white-space: nowrap;
          display: inline-block;
          text-align: center;
        }

        .sy-add-btn:active {
          transform: translateY(1px);
        }

        .sy-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0);
          z-index: 1100;
          opacity: 0;
          visibility: hidden;
          transition: all 0.25s ease;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        .sy-backdrop.open {
          opacity: 1;
          visibility: visible;
          background: rgba(15, 23, 42, 0.5);
        }

        .sy-side {
          position: fixed;
          top: 0;
          right: -100%;
          bottom: 0;
          width: 85%;
          max-width: 340px;
          background: #ffffff;
          z-index: 1200;
          box-shadow: -4px 0 24px rgba(15, 23, 42, 0.15);
          display: flex;
          flex-direction: column;
          transition: right 0.25s ease;
          overflow: hidden;
        }
        .sy-side.open {
          right: 0;
        }

        .sy-side-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: calc(env(safe-area-inset-top) + 16px) 20px 20px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }

        .sy-side-title {
          font-weight: 900;
          font-size: 20px;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .sy-side-user,
        .sy-side-guest {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .sy-user-email,
        .sy-guest-text {
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 240px;
        }

        .sy-close-btn {
          border: none;
          background: #f1f5f9;
          border-radius: 10px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          color: #475569;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .sy-side-nav {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          padding-bottom: calc(20px + env(safe-area-inset-bottom));
        }

        .sy-nav-section {
          margin-bottom: 24px;
        }
        .sy-nav-section:not(:first-child) {
          border-top: 1px solid #f1f5f9;
          padding-top: 24px;
        }

        .sy-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 12px;
          text-decoration: none;
          color: #1e293b;
          border-radius: 12px;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 15px;
          position: relative;
        }

        .sy-nav-item:active {
          background: #f1f5f9;
          transform: translateX(2px);
        }

        .sy-nav-icon {
          width: 24px;
          text-align: center;
          font-size: 18px;
          flex-shrink: 0;
          position: relative;
        }

        .sy-nav-text {
          flex: 1;
          font-weight: 600;
        }

        .sy-unread-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #ffffff;
        }

        .sy-unread-count {
          color: #ef4444;
          font-weight: 900;
          font-size: 12px;
          margin-right: 4px;
        }

        .sy-logout-btn {
          color: #dc2626;
        }
        .sy-logout-btn:active {
          background: #fee2e2;
        }

        .sy-loading-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 12px;
          color: #64748b;
          font-size: 15px;
        }

        .sy-loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .sy-safe-area {
          height: env(safe-area-inset-bottom);
          background: #ffffff;
          flex-shrink: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* أجهزة صغيرة جدًا */
        @media (max-width: 360px) {
          .sy-header-inner {
            padding: 0 12px;
          }
          .sy-title {
            font-size: 16px;
          }
          .sy-add-btn {
            padding: 8px 10px;
            font-size: 13px;
          }
          .sy-side {
            width: 90%;
          }
        }

        /* منع الوميض */
        .sy-menu-btn,
        .sy-add-btn,
        .sy-nav-item,
        .sy-close-btn {
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
      `}</style>
    </>
  );
}
