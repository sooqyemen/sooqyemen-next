'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { useEffect, useState } from 'react';

// نفس نظام الأدمن المستخدم في صفحة /admin
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com', // احذف السطر لو ما تريده أدمن
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const email = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <header className="header">
        <div className="container row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <div className="skeleton" style={{ width: 100, height: 24 }}></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="skeleton" style={{ width: 80, height: 36 }}></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header 
      className="header" 
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        className="container row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* شعار الموقع */}
        <Link 
          href="/" 
          className="row" 
          style={{ 
            gap: 8, 
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'white',
            fontSize: 18
          }}>
            س
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
              سوق اليمن
            </span>
            <span className="muted" style={{ fontSize: 11, lineHeight: 1.2 }}>
              بيع وشراء كل شيء في اليمن
            </span>
          </div>
        </Link>

        <div
          className="row"
          style={{ 
            gap: 12, 
            alignItems: 'center', 
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}
        >
          {/* إيميل المستخدم مع أيقونة */}
          {user && (
            <div className="row" style={{ alignItems: 'center', gap: 6 }}>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ opacity: 0.6 }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span 
                className="badge" 
                style={{ 
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  fontWeight: 500
                }}
              >
                {user.email.split('@')[0]}
              </span>
            </div>
          )}

          {/* أضف إعلاناً */}
          <Link 
            className="btn btnPrimary" 
            href="/add"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            أضف إعلاناً
          </Link>

          {/* لوحة تحكم المستخدم العادي لإعلاناته */}
          {user && (
            <Link 
              className="btn" 
              href="/my-listings"
              style={{
                background: 'transparent',
                border: '1px solid #e0e0e0',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              إعلاناتي
            </Link>
          )}

          {/* 🔒 لوحة الإدارة – للأدمن فقط */}
          {isAdmin && (
            <Link 
              className="btn" 
              href="/admin"
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#dc2626',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4"></path>
              </svg>
              لوحة الإدارة
            </Link>
          )}

          {/* دخول / خروج */}
          {user ? (
            <button 
              className="btn" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              style={{
                background: 'transparent',
                border: '1px solid #e0e0e0',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isLoggingOut ? 0.6 : 1,
                cursor: isLoggingOut ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoggingOut ? (
                <>
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
                    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  جاري الخروج...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  خروج
                </>
              )}
            </button>
          ) : (
            <Link 
              className="btn" 
              href="/login"
              style={{
                background: 'transparent',
                border: '1px solid #e0e0e0',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              دخول
            </Link>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }
        
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @media (max-width: 768px) {
          .header > div {
            flex-direction: column;
            gap: 16px;
          }
          
          .header > div > div:last-child {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </header>
  );
}
