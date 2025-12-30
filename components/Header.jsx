'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// إيميلات المدراء
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com',
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// لوجو سوق اليمن (نفس الفكرة من الصورة)
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

    {/* أشرطة العلم اليمني */}
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
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <header className="header-shell">
        <div className="container header-row">
          <div className="skeleton" style={{ width: 140, height: 30 }} />
        </div>
        <style jsx>{`
          .header-shell {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: #ffffff;
          }
          .header-row {
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

  const handleLogout = async () => {
    if (!logout) return;
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
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
      <div className="container header-row">
        {/* الشعار + الاسم */}
        <Link href="/" className="brand">
          <YemenMarketLogo size={40} />
          <div className="brand-text">
            <span className="brand-title">سوق اليمن</span>
            <span className="brand-sub">بيع وشراء كل شيء في اليمن</span>
          </div>
        </Link>

        {/* أزرار الديسكتوب */}
        <div className="actions desktop-actions">
          {user && (
            <span className="chip">
              {user.email.split('@')[0]}
            </span>
          )}

          {user && (
            <Link href="/my-listings" className="btn ghost">
              إعلاناتي
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin" className="btn ghost danger">
              لوحة الإدارة
            </Link>
          )}

          {user ? (
            <button onClick={handleLogout} className="btn ghost">
              خروج
            </button>
          ) : (
            <Link href="/login" className="btn ghost">
              دخول
            </Link>
          )}

          <Link href="/add" className="btn primary">
            + أضف إعلاناً
          </Link>
        </div>

        {/* أزرار الجوال (تحت الشعار) */}
        <div className="actions mobile-actions">
          {user ? (
            <>
              <Link href="/add" className="btn primary small">
                + أضف إعلاناً
              </Link>
              <Link href="/my-listings" className="btn ghost small">
                إعلاناتي
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn ghost small">
                  لوحة الإدارة
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="btn ghost small"
              >
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn ghost small">
                دخول
              </Link>
              <Link href="/add" className="btn primary small">
                + أضف إعلاناً
              </Link>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-title {
          font-weight: 900;
          font-size: 18px;
          line-height: 1.2;
        }
        .brand-sub {
          font-size: 11px;
          color: #64748b;
          line-height: 1.2;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .desktop-actions {
          display: flex;
        }

        .mobile-actions {
          display: none;
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
          white-space: nowrap;
        }

        .btn.small {
          padding: 5px 10px;
          font-size: 12px;
        }

        .btn.ghost {
          background: #ffffff;
        }

        .btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        .btn.danger {
          border-color: #fecaca;
          color: #b91c1c;
        }

        .chip {
          padding: 4px 10px;
          border-radius: 999px;
          background: #e5e7eb;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .header-row {
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 0 10px;
            gap: 6px;
          }

          .brand {
            justify-content: center;
          }

          .desktop-actions {
            display: none;
          }

          .mobile-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
          }
        }
      `}</style>
    </header>
  );
}
