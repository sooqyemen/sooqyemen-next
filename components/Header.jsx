// components/Header.jsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/lib/useUserProfile';

// إيميلات المدراء
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

// رابط برنامج العمولة
const AFFILIATE_CREATE_PATH = '/affiliate/create';

export default function Header() {
  const pathname = usePathname();
  const { user, profile, loading, error } = useUserProfile();

  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const closeTimerRef = useRef(null);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(String(user.email).toLowerCase());

  const getDisplayName = () => {
    if (error === 'timeout') return 'مستخدم';
    if (error) return 'مستخدم';
    if (profile?.name) return profile.name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'مستخدم';
  };

  const getShortUid = () => {
    if (profile?.uid) return profile.uid.substring(0, 6);
    if (user?.uid) return user.uid.substring(0, 6);
    return '';
  };

  useEffect(() => {
    if (user) setHasUnreadMessages(false);
  }, [user]);

  useEffect(() => {
    if (menuMounted) closeMenu(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setMenuMounted(true);
    requestAnimationFrame(() => setMenuOpen(true));
  };

  const closeMenu = (immediate = false) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    if (immediate) {
      setMenuOpen(false);
      setMenuMounted(false);
      return;
    }

    setMenuOpen(false);
    closeTimerRef.current = setTimeout(() => {
      setMenuMounted(false);
    }, 320);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { auth } = await import('@/lib/firebaseClient');
      await auth.signOut();
      closeMenu(true);
    } catch (e) {
      console.error('خطأ في تسجيل الخروج:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const Logo = ({ variant = 'desktop' }) => {
  // ✅ شعار الهوية الجديدة
  // - Desktop: نعرض الشعار الأفقي (أوضح للهوية)
  // - Mobile: نعرض الأيقونة + الاسم (أخف وأجمل على المساحات الصغيرة)
  const iconSize = variant === 'mobile' ? 28 : 32;

  if (variant === 'desktop') {
    return (
      <span className="sy-logo sy-logo--desktop" aria-label="سوق اليمن">
        <img
          src="/logo-horizontal-800.png"
          srcSet="/logo-horizontal-800.png 1x, /logo-horizontal-1200.png 2x"
          alt="سوق اليمن"
          width={170}
          height={44}
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span className="sy-logo sy-logo--mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/icon-192.png"
        srcSet="/icon-192.png 1x, /icon-512.png 2x"
        alt="سوق اليمن"
        width={iconSize}
        height={iconSize}
        style={{ display: 'block', borderRadius: 10 }}
        loading="eager"
        decoding="async"
      />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontWeight: 900, fontSize: 16 }}>سوق اليمن</span>
        <span className="muted" style={{ fontSize: 12 }}>السوق الشامل</span>
      </span>
    </span>
  );
};

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Mobile */}
          <div className="mobile-nav">
            <button className="menu-btn" onClick={openMenu} aria-label="فتح القائمة">
              <span className="menu-icon">☰</span>
            </button>

            <Link href="/" className="site-title" aria-label="الذهاب للرئيسية">
              <Logo variant="mobile" />
            </Link>

            <Link href="/add" className="add-btn-mobile" aria-label="أضف إعلان جديد">
              + إعلان
            </Link>
          </div>

          {/* Desktop */}
          <div className="desktop-nav">
            <Link href="/" className="logo" aria-label="الذهاب للرئيسية">
              <Logo variant="desktop" />
            </Link>

            <nav className="nav-links">
              <Link href="/" className="nav-link">
                الرئيسية
              </Link>

              <Link href="/listings" className="nav-link">
                جميع الإعلانات
              </Link>

              {!loading && !user && (
                <Link href={AFFILIATE_CREATE_PATH} className="nav-link">
                  💸 برنامج العمولة
                </Link>
              )}
            </nav>

            <div className="user-actions">
              {loading ? (
                <div className="loading-text">جاري التحميل…</div>
              ) : user ? (
                <>
                  <Link href="/add" className="add-btn-desktop">
                    + أضف إعلان
                  </Link>

                  <div className="user-menu">
                    <span className="user-greeting">أهلاً، {getDisplayName()}</span>

                    <div className="dropdown">
                      <Link href="/my-listings" className="dropdown-item">
                        📋 إعلاناتي
                      </Link>

                      <Link href="/notifications" className="dropdown-item">
                        🔔 الإشعارات
                      </Link>

                      <Link href="/my-chats" className="dropdown-item">
                        💬 محادثاتي
                        {hasUnreadMessages && <span className="unread-dot" />}
                      </Link>

                      <Link href="/profile" className="dropdown-item">
                        👤 الملف الشخصي
                      </Link>

                      <Link href={AFFILIATE_CREATE_PATH} className="dropdown-item">
                        💸 برنامج العمولة
                      </Link>

                      {isAdmin && (
                        <Link href="/admin" className="dropdown-item">
                          🛡️ لوحة الإدارة
                        </Link>
                      )}

                      <div className="dropdown-divider" />

                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="dropdown-item logout-item"
                      >
                        {isLoggingOut ? 'جاري الخروج…' : '🚪 تسجيل الخروج'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/add" className="add-btn-desktop">
                    + أضف إعلان
                  </Link>

                  <div className="auth-buttons">
                    <Link href="/login" className="login-btn">
                      تسجيل الدخول
                    </Link>
                    <Link href="/register" className="register-btn">
                      إنشاء حساب
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="header-spacer" />

      {menuMounted && (
        <>
          <div
            className={`side-menu-backdrop ${menuOpen ? 'open' : ''}`}
            onClick={() => closeMenu()}
            aria-hidden="true"
          />

          <aside className={`side-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
            <div className="side-menu-header">
              <div className="side-menu-user">
                {loading ? (
                  <div className="guest-message">
                    <div className="guest-icon">⏳</div>
                    <div className="guest-text">جاري التحميل…</div>
                  </div>
                ) : user ? (
                  <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                      <div className="user-name">اسم المستخدم: {getDisplayName()}</div>
                      <div className="user-email">
                        {error
                          ? 'معرف المستخدم: غير متاح'
                          : getShortUid()
                          ? `معرف المستخدم: ${getShortUid()}`
                          : 'معرف المستخدم: غير متاح'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="guest-message">
                    <div className="guest-icon">👤</div>
                    <div className="guest-text">زائر</div>
                  </div>
                )}
              </div>

              <button className="close-menu-btn" onClick={() => closeMenu()} aria-label="إغلاق القائمة">
                ✕
              </button>
            </div>

            <nav className="side-menu-nav">
              <div className="menu-section">
                <h3 className="section-title">التنقل الرئيسي</h3>

                <Link href="/" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">🏠</span>
                  <span className="item-text">الرئيسية</span>
                </Link>

                <Link href="/add" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">➕</span>
                  <span className="item-text">أضف إعلاناً</span>
                </Link>

                <Link href="/listings" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">📄</span>
                  <span className="item-text">جميع الإعلانات</span>
                </Link>
              </div>

              <div className="menu-section">
                <h3 className="section-title">حسابك</h3>

                {loading ? (
                  <div className="loading-item">
                    <span className="loading-spinner" />
                    <span>جاري التحميل…</span>
                  </div>
                ) : user ? (
                  <>
                    <Link href="/profile" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">👤</span>
                      <span className="item-text">الملف الشخصي</span>
                    </Link>

                    <Link href="/my-listings" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">📋</span>
                      <span className="item-text">إعلاناتي</span>
                    </Link>

                    <Link href="/notifications" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">🔔</span>
                      <span className="item-text">الإشعارات</span>
                    </Link>

                    <Link href="/my-chats" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">💬</span>
                      <span className="item-text">
                        محادثاتي
                        {hasUnreadMessages && <span className="unread-dot" />}
                      </span>
                    </Link>

                    <Link href={AFFILIATE_CREATE_PATH} className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">💸</span>
                      <span className="item-text">برنامج العمولة</span>
                    </Link>

                    {isAdmin && (
                      <Link href="/admin" className="menu-item" onClick={() => closeMenu(true)}>
                        <span className="item-icon">🛡️</span>
                        <span className="item-text">لوحة الإدارة</span>
                      </Link>
                    )}

                    <button className="menu-item logout-menu-item" onClick={handleLogout} disabled={isLoggingOut}>
                      <span className="item-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
                      <span className="item-text">{isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">🔑</span>
                      <span className="item-text">تسجيل الدخول</span>
                    </Link>

                    <Link href="/register" className="menu-item" onClick={() => closeMenu(true)}>
                      <span className="item-icon">📝</span>
                      <span className="item-text">إنشاء حساب</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="menu-section">
                <h3 className="section-title">المزيد</h3>

                {!loading && !user && (
                  <Link href={AFFILIATE_CREATE_PATH} className="menu-item" onClick={() => closeMenu(true)}>
                    <span className="item-icon">💸</span>
                    <span className="item-text">برنامج العمولة</span>
                  </Link>
                )}

                <Link href="/help" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">❓</span>
                  <span className="item-text">مساعدة ودعم</span>
                </Link>

                <Link href="/privacy" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">🔒</span>
                  <span className="item-text">سياسة الخصوصية</span>
                </Link>

                <Link href="/terms" className="menu-item" onClick={() => closeMenu(true)}>
                  <span className="item-icon">📄</span>
                  <span className="item-text">الشروط والأحكام</span>
                </Link>
              </div>
            </nav>
          </aside>
        </>
      )}
    
      <style jsx>{`
        :global(:root) {
          --sy-navy: #0b1a2a;
          --sy-navy-2: #081423;
          --sy-red: #d11f2b;
          --sy-surface: #ffffff;
        }

        /* Header */
        .header {
          background: linear-gradient(180deg, var(--sy-navy), var(--sy-navy-2));
          border-bottom: 3px solid var(--sy-red);
        }

        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 14px;
        }

        .sy-logo img {
          display: block;
          height: auto;
        }

        .sy-logo--desktop img {
          max-width: 200px;
        }

        .sy-logo--desktop {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .site-title,
        .user-greeting,
        .loading-text {
          color: rgba(255, 255, 255, 0.95);
        }

        :global(.desktop-nav .nav-link),
        :global(.mobile-nav .nav-link) {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 800;
          position: relative;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }

        :global(.desktop-nav .nav-link:hover),
        :global(.mobile-nav .nav-link:hover) {
          color: #ffffff;
          text-decoration: none;
        }

        :global(.desktop-nav .nav-link::after) {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8px;
          height: 2px;
          background: var(--sy-red);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 160ms ease;
        }

        :global(.desktop-nav .nav-link:hover::after) {
          transform: scaleX(1);
          transform-origin: left;
        }

        :global(.add-btn-desktop),
        :global(.add-btn-mobile) {
          background: var(--sy-red) !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 14px !important;
          font-weight: 900 !important;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
        }

        :global(.add-btn-desktop:hover),
        :global(.add-btn-mobile:hover) {
          filter: brightness(1.05);
        }

        :global(.auth-buttons .login-btn) {
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #ffffff;
          border-radius: 14px;
          font-weight: 800;
        }

        :global(.auth-buttons .register-btn) {
          background: #ffffff;
          color: var(--sy-navy);
          border-radius: 14px;
          font-weight: 900;
        }

        .menu-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffffff;
          border-radius: 14px;
        }

        .unread-dot {
          background: var(--sy-red);
        }

        /* Dropdown */
        .dropdown {
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 14px 40px rgba(2, 6, 23, 0.16);
        }

        :global(.dropdown-item) {
          font-weight: 800;
        }

        :global(.dropdown-item:hover) {
          background: #f8fafc;
        }

        :global(.dropdown-item.logout-item) {
          color: var(--sy-red);
        }

        /* Mobile side menu */
        .side-menu {
          background: linear-gradient(180deg, var(--sy-navy), #07101d);
          color: #ffffff;
        }

        .side-menu .section-title {
          color: rgba(255, 255, 255, 0.8);
        }

        :global(.side-menu .menu-item) {
          color: #ffffff;
          border-radius: 14px;
        }

        :global(.side-menu .menu-item:hover) {
          background: rgba(255, 255, 255, 0.08);
        }

        :global(.side-menu .logout-menu-item) {
          color: #ffd1d1;
        }

        /* Spacer (لو الهيدر ثابت) */
        .header-spacer {
          height: 72px;
        }

        @media (max-width: 480px) {
          .sy-logo--desktop img {
            max-width: 160px;
          }
          .header-inner {
            padding: 10px 10px;
          }
        }
      `}</style>

</>
  );
}
