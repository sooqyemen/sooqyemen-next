'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// إيميلات المدراء
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // التحقق إذا كان المستخدم مديراً
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // محاكاة تحقق من الرسائل غير المقروءة
  useEffect(() => {
    if (user) {
      // محاكاة: 30% فرصة أن يكون هناك رسائل غير مقروءة
      const hasMessages = Math.random() > 0.7;
      setHasUnreadMessages(hasMessages);
    }
  }, [user]);

  // قفل سكرول الصفحة عندما تكون القائمة مفتوحة
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // إغلاق القائمة عند الضغط على زر الخروج
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
    } catch (e) {
      console.error('خطأ في تسجيل الخروج:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // إغلاق القائمة عند النقر على رابط
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* ========== الهيدر الرئيسي ========== */}
      <header className="header">
        <div className="header-inner">
          
          {/* ========== تصميم الجوال ========== */}
          <div className="mobile-nav">
            {/* زر القائمة - على اليمين (لأن العربية من اليمين لليسار) */}
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              <span className="menu-icon">☰</span>
            </button>

            {/* العنوان بالوسط */}
            <Link href="/" className="site-title">
              سوق اليمن
            </Link>

            {/* زر إضافة إعلان - على اليسار */}
            <Link 
              href="/add" 
              className="add-btn-mobile"
              aria-label="أضف إعلان جديد"
            >
              + إعلان
            </Link>
          </div>

          {/* ========== تصميم الديسكتوب ========== */}
          <div className="desktop-nav">
            {/* الشعار */}
            <Link href="/" className="logo">
              سوق اليمن
            </Link>

            {/* روابط التنقل */}
            <nav className="nav-links">
              <Link href="/" className="nav-link">
                الرئيسية
              </Link>
              <Link href="/listings" className="nav-link">
                الإعلانات
              </Link>
              <Link href="/categories" className="nav-link">
                الفئات
              </Link>
              {isAdmin && (
                <Link href="/admin" className="nav-link admin-link">
                  لوحة الإدارة
                </Link>
              )}
            </nav>

            {/* الجزء الأيمن: أزرار المستخدم */}
            <div className="user-actions">
              {loading ? (
                <div className="loading-text">جاري التحميل…</div>
              ) : user ? (
                <>
                  <Link href="/add" className="add-btn-desktop">
                    + أضف إعلان
                  </Link>
                  
                  <div className="user-menu">
                    <span className="user-greeting">
                      أهلاً، {user.name || user.email?.split('@')[0]}
                    </span>
                    
                    <div className="dropdown">
                      <Link href="/my-listings" className="dropdown-item">
                        📋 إعلاناتي
                      </Link>
                      <Link href="/my-chats" className="dropdown-item">
                        💬 محادثاتي
                        {hasUnreadMessages && (
                          <span className="unread-dot" />
                        )}
                      </Link>
                      <Link href="/profile" className="dropdown-item">
                        👤 الملف الشخصي
                      </Link>
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

      {/* ========== مسافة الهيدر ========== */}
      <div className="header-spacer" />

      {/* ========== قائمة الجوال الجانبية ========== */}
      <div 
        className={`side-menu-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside 
        className={`side-menu ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="side-menu-header">
          <div className="side-menu-user">
            {user ? (
              <div className="user-info">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <div className="user-name">{user.name || 'مستخدم'}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="guest-message">
                <div className="guest-icon">👤</div>
                <div className="guest-text">زائر - لم تقم بتسجيل الدخول</div>
              </div>
            )}
          </div>
          
          <button
            className="close-menu-btn"
            onClick={closeMenu}
            aria-label="إغلاق القائمة"
          >
            ✕
          </button>
        </div>

        <nav className="side-menu-nav">
          {/* روابط رئيسية */}
          <div className="menu-section">
            <h3 className="section-title">التنقل الرئيسي</h3>
            
            <Link href="/" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">🏠</span>
              <span className="item-text">الرئيسية</span>
            </Link>

            <Link href="/add" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">➕</span>
              <span className="item-text">أضف إعلاناً</span>
            </Link>

            <Link href="/listings" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">📄</span>
              <span className="item-text">جميع الإعلانات</span>
            </Link>

            {user && (
              <>
                <Link href="/my-listings" className="menu-item" onClick={closeMenu}>
                  <span className="item-icon">📋</span>
                  <span className="item-text">إعلاناتي</span>
                </Link>

                <Link href="/my-chats" className="menu-item" onClick={closeMenu}>
                  <span className="item-icon">💬</span>
                  <span className="item-text">
                    محادثاتي
                    {hasUnreadMessages && (
                      <span className="unread-badge">جديد</span>
                    )}
                  </span>
                </Link>
              </>
            )}

            {isAdmin && (
              <Link href="/admin" className="menu-item admin-menu-item" onClick={closeMenu}>
                <span className="item-icon">🛡️</span>
                <span className="item-text">لوحة الإدارة</span>
              </Link>
            )}
          </div>

          {/* روابط الحساب */}
          <div className="menu-section">
            <h3 className="section-title">حسابك</h3>
            
            {loading ? (
              <div className="loading-item">
                <span className="loading-spinner" />
                <span>جاري التحميل…</span>
              </div>
            ) : user ? (
              <>
                <Link href="/profile" className="menu-item" onClick={closeMenu}>
                  <span className="item-icon">👤</span>
                  <span className="item-text">الملف الشخصي</span>
                </Link>
                
                <button
                  className="menu-item logout-menu-item"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span className="item-icon">
                    {isLoggingOut ? '⏳' : '🚪'}
                  </span>
                  <span className="item-text">
                    {isLoggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}
                  </span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="menu-item" onClick={closeMenu}>
                  <span className="item-icon">🔑</span>
                  <span className="item-text">تسجيل الدخول</span>
                </Link>
                
                <Link href="/register" className="menu-item" onClick={closeMenu}>
                  <span className="item-icon">📝</span>
                  <span className="item-text">إنشاء حساب</span>
                </Link>
              </>
            )}
          </div>

          {/* روابط إضافية */}
          <div className="menu-section">
            <h3 className="section-title">المزيد</h3>
            
            <Link href="/about" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">ℹ️</span>
              <span className="item-text">عن المنصة</span>
            </Link>
            
            <Link href="/help" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">❓</span>
              <span className="item-text">مساعدة ودعم</span>
            </Link>
            
            <Link href="/privacy" className="menu-item" onClick={closeMenu}>
              <span className="item-icon">🔒</span>
              <span className="item-text">سياسة الخصوصية</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
