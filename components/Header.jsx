'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useMemo, useState } from 'react';

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

  // منع “إغلاق فوري” على بعض أجهزة الجوال بسبب لمس الخلفية
  const [backdropArmed, setBackdropArmed] = useState(false);
  useEffect(() => {
    if (!menuOpen) {
      setBackdropArmed(false);
      return;
    }
    const t = setTimeout(() => setBackdropArmed(true), 200);
    return () => clearTimeout(t);
  }, [menuOpen]);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

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

  return (
    <>
      <header className="sy-header">
        <div className="sy-header-inner container">
          {/* زر القائمة */}
          <button
            className="sy-icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            type="button"
          >
            <span className="sy-icon-lines" />
          </button>

          {/* العنوان بالوسط (بدون شعار) */}
          <div className="sy-title" aria-label="عنوان الموقع">
            سوق اليمن
          </div>

          {/* زر إضافة إعلان (أصغر ومضبوط) */}
          <Link href="/add" className="sy-add-btn">
            + أضف إعلان
          </Link>
        </div>
      </header>

      {/* القائمة الجانبية */}
      {menuOpen && (
        <>
          <div
            className="sy-backdrop"
            onClick={() => {
              if (backdropArmed) setMenuOpen(false);
            }}
          />
          <aside
            className="sy-side"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sy-side-head">
              <div>
                <div className="sy-side-title">القائمة</div>
                {user ? (
                  <div className="sy-side-user">👤 {user.email}</div>
                ) : (
                  <div className="sy-side-user sy-muted">
                    زائر · لم تقم بتسجيل الدخول
                  </div>
                )}
              </div>
              <button
                className="sy-icon-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="sy-side-section">
              <Link
                href="/add"
                className="sy-side-item"
                onClick={() => setMenuOpen(false)}
              >
                <span>➕</span>
                <span>أضف إعلاناً</span>
              </Link>

              {user && (
                <Link
                  href="/my-listings"
                  className="sy-side-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>📋</span>
                  <span>إعلاناتي</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="sy-side-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>🛡️</span>
                  <span>لوحة الإدارة</span>
                </Link>
              )}
            </div>

            <div className="sy-side-section">
              {loading ? (
                <div className="sy-side-item sy-muted">جاري التحميل…</div>
              ) : user ? (
                <button
                  className="sy-side-item sy-side-btn"
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
                  className="sy-side-item"
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
        /* ✅ هيدر ثابت: يمنع اختفاء/تزحلق iOS */
        .sy-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2000;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #eef2f7;
          height: calc(var(--sy-header-h, 56px) + env(safe-area-inset-top));
          padding-top: env(safe-area-inset-top);
        }

        .sy-header-inner {
          height: var(--sy-header-h, 56px);
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 10px;
        }

        .sy-title {
          text-align: center;
          font-weight: 900;
          font-size: 14px;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sy-icon-btn {
          border: none;
          background: #f1f5f9;
          border-radius: 999px;
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .sy-icon-lines {
          width: 16px;
          height: 2px;
          border-radius: 4px;
          background: #0f172a;
          position: relative;
        }
        .sy-icon-lines::before,
        .sy-icon-lines::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 4px;
          background: #0f172a;
        }
        .sy-icon-lines::before {
          top: -5px;
        }
        .sy-icon-lines::after {
          top: 5px;
        }

        .sy-add-btn {
          text-decoration: none;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.28);
          white-space: nowrap;
        }

        /* القائمة الجانبية */
        .sy-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 1999;
        }
        .sy-side {
          position: fixed;
          inset-block: 0;
          inset-inline-end: 0;
          width: 78%;
          max-width: 340px;
          background: #ffffff;
          z-index: 2000;
          box-shadow: -4px 0 16px rgba(15, 23, 42, 0.25);
          display: flex;
          flex-direction: column;
          padding: 14px 14px 18px;
        }
        .sy-side-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .sy-side-title {
          font-weight: 900;
          font-size: 16px;
        }
        .sy-side-user {
          font-size: 12px;
          margin-top: 2px;
        }
        .sy-muted {
          color: #9ca3af;
        }

        .sy-side-section {
          border-top: 1px solid #e5e7eb;
          margin-top: 10px;
          padding-top: 10px;
        }
        .sy-side-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 6px;
          font-size: 14px;
          text-decoration: none;
          color: #111827;
          border-radius: 10px;
        }
        .sy-side-item:hover {
          background: #f3f4f6;
        }
        .sy-side-item span:first-child {
          width: 22px;
          text-align: center;
        }
        .sy-side-btn {
          border: none;
          background: transparent;
          text-align: start;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .sy-header-inner {
            padding: 0 10px;
          }
          .sy-title {
            font-size: 13px;
          }
          .sy-add-btn {
            padding: 7px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}
