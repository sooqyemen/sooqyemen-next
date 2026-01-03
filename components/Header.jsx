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
  const [isMobile, setIsMobile] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  // ✅ اكتشاف حجم الشاشة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 769);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ محاكاة تحقق من الرسائل غير المقروءة (يمكنك استبدالها ب API حقيقي)
  useEffect(() => {
    if (user) {
      // محاكاة: 30% فرصة أن يكون هناك رسائل غير مقروءة
      const hasMessages = Math.random() > 0.7;
      setHasUnreadMessages(hasMessages);
    }
  }, [user]);

  // ✅ قفل سكرول الصفحة عندما تكون القائمة مفتوحة (للجوال فقط)
  useEffect(() => {
    if (menuOpen && isMobile) {
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
  }, [menuOpen, isMobile]);

  // ✅ إغلاق القائمة عند الضغط على ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [menuOpen]);

  // ✅ إغلاق القائمة عند النقر على رابط
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

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

  // ✅ منع الانتشار للنقر على القائمة نفسها
  const handleSideClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* ========== الهيدر الرئيسي ========== */}
      <header className="sy-header">
        <div className="sy-header-inner container">
          
          {/* ========== تصميم الجوال ========== */}
          <div className="sy-mobile-nav">
            {/* زر القائمة - على اليسار */}
            <button
              className="sy-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
              type="button"
            >
              <span className="sy-icon-lines" />
            </button>

            {/* العنوان بالوسط */}
            <Link href="/" className="sy-title" aria-label="سوق اليمن">
              سوق اليمن
            </Link>

            {/* زر إضافة إعلان - على اليمين */}
            <Link 
              href="/add" 
              className="sy-add-btn"
              aria-label="أضف إعلان جديد"
            >
              + أضف إعلان
            </Link>
          </div>

          {/* ========== تصميم اللابتوب ========== */}
          <div className="sy-desktop-nav">
            {/* الشعار */}
            <Link href="/" className="sy-logo">
              سوق اليمن
            </Link>

            {/* روابط التنقل */}
            <nav className="sy-nav-links">
              <Link href="/" className="sy-nav-link">
                الرئيسية
              </Link>
              <Link href="/listings" className="sy-nav-link">
                الإعلانات
              </Link>
              <Link href="/categories" className="sy-nav-link">
                الفئات
              </Link>
              {isAdmin && (
                <Link href="/admin" className="sy-nav-link sy-admin-link">
                  🛡️ لوحة الإدارة
                </Link>
              )}
            </nav>

            {/* الجزء الأيمن: أزرار المستخدم */}
            <div className="sy-user-actions">
              {loading ? (
                <div className="sy-loading-text">جاري التحميل…</div>
              ) : user ? (
                <>
                  <Link href="/add" className="sy-add-btn-desktop">
                    + أضف إعلان
                  </Link>
                  
                  <div className="sy-user-menu">
                    <span className="sy-user-greeting">
                      أهلاً، {user.name || user.email?.split('@')[0]}
                    </span>
                    <div className="sy-dropdown">
                      <Link href="/my-listings" className="sy-dropdown-item">
                        📋 إعلاناتي
                      </Link>
                      <Link href="/my-chats" className="sy-dropdown-item">
                        <span className="sy-dropdown-item-content">
                          💬 محادثاتي
                          {hasUnreadMessages && (
                            <span className="sy-unread-dot-desktop" />
                          )}
                        </span>
                      </Link>
                      <Link href="/profile" className="sy-dropdown-item">
                        👤 الملف الشخصي
                      </Link>
                      <div className="sy-dropdown-divider" />
                      <Link href="/about" className="sy-dropdown-item">
                        ℹ️ عن المنصة
                      </Link>
                      <Link href="/help" className="sy-dropdown-item">
                        ❓ مساعدة ودعم
                      </Link>
                      <Link href="/privacy" className="sy-dropdown-item">
                        🔒 سياسة الخصوصية
                      </Link>
                      <div className="sy-dropdown-divider" />
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="sy-dropdown-item sy-logout-item"
                        type="button"
                      >
                        🚪 تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/add" className="sy-add-btn-desktop">
                    + أضف إعلان
                  </Link>
                  <div className="sy-auth-buttons">
                    <Link href="/login" className="sy-login-btn">
                      تسجيل الدخول
                    </Link>
                    <Link href="/register" className="sy-register-btn">
                      إنشاء حساب
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========== مسافة الهيدر ========== */}
      <div className="sy-header-spacer" />

      {/* ========== قائمة الجوال الجانبية ========== */}
      {isMobile && (
        <>
          <div 
            className={`sy-backdrop ${menuOpen ? 'open' : ''}`}
            onClick={closeMenu}
            aria-hidden={!menuOpen}
          />

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
                <Link
                  href="/"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">🏠</span>
                  <span className="sy-nav-text">الرئيسية</span>
                </Link>

                <Link
                  href="/add"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">➕</span>
                  <span className="sy-nav-text">أضف إعلاناً</span>
                </Link>

                <Link
                  href="/listings"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">📄</span>
                  <span className="sy-nav-text">جميع الإعلانات</span>
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

                    <Link
                      href="/my-chats"
                      className="sy-nav-item"
                      onClick={closeMenu}
                      prefetch={false}
                    >
                      <span className="sy-nav-icon">
                        💬
                        {hasUnreadMessages && (
                          <span className="sy-unread-badge" />
                        )}
                      </span>
                      <span className="sy-nav-text">
                        محادثاتي
                        {hasUnreadMessages && (
                          <span className="sy-unread-count"> جديد</span>
                        )}
                      </span>
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="sy-nav-item"
                    onClick={closeMenu}
                    prefetch={false}
                  >
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
                  <>
                    <Link
                      href="/profile"
                      className="sy-nav-item"
                      onClick={closeMenu}
                      prefetch={false}
                    >
                      <span className="sy-nav-icon">👤</span>
                      <span className="sy-nav-text">الملف الشخصي</span>
                    </Link>
                    
                    <button
                      className="sy-nav-item sy-logout-btn"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      type="button"
                    >
                      <span className="sy-nav-icon">
                        {isLoggingOut ? '⏳' : '🚪'}
                      </span>
                      <span className="sy-nav-text">
                        {isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="sy-nav-item"
                      onClick={closeMenu}
                      prefetch={false}
                    >
                      <span className="sy-nav-icon">🔑</span>
                      <span className="sy-nav-text">تسجيل الدخول</span>
                    </Link>
                    
                    <Link
                      href="/register"
                      className="sy-nav-item"
                      onClick={closeMenu}
                      prefetch={false}
                    >
                      <span className="sy-nav-icon">📝</span>
                      <span className="sy-nav-text">إنشاء حساب</span>
                    </Link>
                  </>
                )}
              </div>

              {/* قسم روابط إضافية */}
              <div className="sy-nav-section">
                <Link
                  href="/about"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">ℹ️</span>
                  <span className="sy-nav-text">عن المنصة</span>
                </Link>
                
                <Link
                  href="/help"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">❓</span>
                  <span className="sy-nav-text">مساعدة ودعم</span>
                </Link>
                
                <Link
                  href="/privacy"
                  className="sy-nav-item"
                  onClick={closeMenu}
                  prefetch={false}
                >
                  <span className="sy-nav-icon">🔒</span>
                  <span className="sy-nav-text">سياسة الخصوصية</span>
                </Link>
              </div>
            </nav>

            {/* هامش آمن للشريحة */}
            <div className="sy-safe-area" />
          </aside>
        </>
      )}

      <style jsx>{`
        /* ========== الأنماط العامة للهيدر ========== */
        .sy-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: #ffffff;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(229, 231, 235, 0.8);
          height: 64px;
          padding-top: env(safe-area-inset-top);
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
        }

        .sy-header-inner.container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
          height: 100%;
        }

        .sy-header-spacer {
          height: 64px;
        }

        /* ========== تصميم الجوال ========== */
        .sy-mobile-nav {
          display: none;
        }

        /* ========== تصميم اللابتوب ========== */
        .sy-desktop-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          width: 100%;
        }

        /* الشعار */
        .sy-logo {
          font-size: 24px;
          font-weight: 900;
          color: #1e293b;
          text-decoration: none;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          padding: 4px 0;
          transition: transform 0.2s ease;
        }

        .sy-logo:hover {
          transform: scale(1.05);
        }

        /* روابط التنقل */
        .sy-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          margin: 0 20px;
        }

        .sy-nav-link {
          text-decoration: none;
          color: #475569;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
          padding: 8px 0;
          position: relative;
        }

        .sy-nav-link:hover {
          color: #4f46e5;
        }

        .sy-nav-link:hover::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 1px;
        }

        .sy-admin-link {
          color: #dc2626;
          font-weight: 700;
        }

        .sy-admin-link:hover {
          color: #b91c1c;
        }

        /* أزرار المستخدم */
        .sy-user-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* زر إضافة إعلان - نسخة اللابتوب */
        .sy-add-btn-desktop {
          text-decoration: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
          white-space: nowrap;
          transition: all 0.2s ease;
          display: inline-block;
          text-align: center;
          min-width: 120px;
        }

        .sy-add-btn-desktop:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
        }

        /* قائمة المستخدم */
        .sy-user-menu {
          position: relative;
        }

        .sy-user-greeting {
          font-size: 14px;
          color: #475569;
          font-weight: 600;
          padding: 8px 16px;
          background: #f8fafc;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-block;
          border: 1px solid #e2e8f0;
        }

        .sy-user-greeting:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .sy-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          min-width: 220px;
          padding: 8px;
          margin-top: 8px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s ease;
          z-index: 1001;
          border: 1px solid #e2e8f0;
        }

        .sy-user-menu:hover .sy-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .sy-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          text-decoration: none;
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
          border: none;
          background: none;
          width: 100%;
          text-align: right;
          cursor: pointer;
        }

        .sy-dropdown-item-content {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          position: relative;
        }

        .sy-dropdown-item:hover {
          background: #f8fafc;
          color: #4f46e5;
        }

        .sy-dropdown-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 8px 0;
        }

        .sy-logout-item {
          color: #dc2626;
          margin-top: 4px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .sy-logout-item:hover {
          background: #fee2e2;
        }

        /* نقطة الرسائل غير المقروءة - نسخة اللابتوب */
        .sy-unread-dot-desktop {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* أزرار تسجيل الدخول والتسجيل */
        .sy-auth-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sy-login-btn {
          text-decoration: none;
          color: #4f46e5;
          font-weight: 600;
          font-size: 14px;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          border: 1px solid #e2e8f0;
        }

        .sy-login-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .sy-register-btn {
          text-decoration: none;
          color: #ffffff;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .sy-register-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .sy-loading-text {
          color: #64748b;
          font-size: 14px;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-50%) scale(1.1);
          }
        }

        /* ========== استعلامات الوسائط ========== */
        @media (max-width: 768px) {
          .sy-mobile-nav {
            display: grid;
            grid-template-columns: 50px 1fr auto;
            align-items: center;
            gap: 10px;
            width: 100%;
            height: 100%;
          }

          .sy-desktop-nav {
            display: none;
          }

          .sy-header-inner.container {
            padding: 0 16px;
          }

          .sy-header-spacer {
            height: 60px;
          }
        }

        /* ========== أنماط قائمة الجوال ========== */
        .sy-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
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
          max-width: 320px;
          background: #ffffff;
          z-index: 1000;
          box-shadow: -4px 0 24px rgba(15, 23, 42, 0.15);
          display: flex;
          flex-direction: column;
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

        .sy-side-user-info {
          flex: 1;
          min-width: 0;
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

        .sy-user-avatar,
        .sy-guest-icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .sy-user-email,
        .sy-guest-text {
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          transition: all 0.2s ease;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .sy-close-btn:active {
          background: #e2e8f0;
        }

        /* التنقل في القائمة الجانبية */
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
          transition: all 0.2s ease;
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
          font-weight: 500;
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
          animation: pulse 2s infinite;
        }

        .sy-unread-count {
          color: #ef4444;
          font-weight: 700;
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
          to { transform: rotate(360deg); }
        }

        /* زر القائمة الجانبية */
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
          transition: all 0.2s ease;
          touch-action: manipulation;
        }

        .sy-menu-btn:active {
          background: #e2e8f0;
          transform: scale(0.95);
        }

        .sy-icon-lines {
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: #1e293b;
          position: relative;
          transition: all 0.3s ease;
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
          transition: all 0.3s ease;
        }
        
        .sy-icon-lines::before {
          top: -6px;
        }
        
        .sy-icon-lines::after {
          top: 6px;
        }

        /* العنوان في الجوال */
        .sy-title {
          text-align: center;
          font-weight: 900;
          font-size: 18px;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 8px;
          text-decoration: none;
        }

        /* زر الإضافة في الجوال */
        .sy-add-btn {
          text-decoration: none;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
          white-space: nowrap;
          transition: all 0.2s ease;
          display: inline-block;
          text-align: center;
          min-width: 90px;
        }

        .sy-add-btn:active {
          transform: translateY(1px);
          box-shadow: 0 1px 4px rgba(79, 70, 229, 0.3);
        }

        /* تحسينات للأجهزة الصغيرة جداً */
        @media (max-width: 360px) {
          .sy-title {
            font-size: 16px;
          }
          
          .sy-add-btn {
            padding: 8px 12px;
            font-size: 13px;
            min-width: 80px;
          }
          
          .sy-side {
            width: 90%;
          }
        }

        /* منع التحديد على العناصر التفاعلية */
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
