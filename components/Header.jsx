// components/Header.jsx - نسخة محسنة
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { auth, googleProvider } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

export default function Header() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const signInGoogle = async () => {
    setBusy(true);
    try { await auth.signInWithPopup(googleProvider); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true);
    try { await auth.signOut(); }
    finally { setBusy(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        {/* الصف العلوي */}
        <div className="flex items-center justify-between py-3">
          {/* الشعار */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl">س</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">سوق اليمن</h1>
              <p className="text-sm text-gray-600 mt-1">بيع واشتري كل شيء في اليمن</p>
            </div>
          </Link>

          {/* شريط البحث (للأجهزة الكبيرة) */}
          <form 
            onSubmit={handleSearch}
            className="hidden lg:flex flex-1 max-w-2xl mx-8"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن سيارة، شقة، جوال، وظيفة..."
                className="w-full pr-14 pl-5 py-3.5 border border-gray-300 rounded-full focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 text-gray-800 text-sm transition-all duration-200"
              />
              <button 
                type="submit"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-3">
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 border border-gray-300 rounded-full hover:border-blue-400"
                >
                  فلاتر
                </button>
              </div>
            </div>
          </form>

          {/* القسم الأيمن (أزرار وإجراءات) */}
          <div className="flex items-center space-x-3">
            {/* زر إضافة إعلان رئيسي */}
            <Link 
              href="/add" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>إضافة إعلان</span>
            </Link>

            {/* زر البحث للجوال */}
            <button 
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="lg:hidden p-2.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* زر لوحة التحكم */}
            <Link 
              href="/admin" 
              className="hidden md:flex items-center space-x-2 px-4 py-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">لوحة التحكم</span>
            </Link>

            {/* قسم المستخدم */}
            <div className="relative">
              {!user ? (
                <button 
                  onClick={signInGoogle} 
                  disabled={busy}
                  className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12h5v5h-5v-5zm-7 0h5v5H5v-5zm0-7h12v5H5V5z" />
                  </svg>
                  <span className="text-sm font-medium">تسجيل الدخول</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  {/* صورة المستخدم أو الأحرف الأولى */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  
                  {/* معلومات المستخدم مع قائمة منسدلة */}
                  <div className="hidden md:block">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">
                        {user.displayName || user.email?.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[150px]">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  
                  {/* زر الخروج */}
                  <button 
                    onClick={signOut} 
                    disabled={busy}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="تسجيل الخروج"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">خروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* شريط البحث للجوال (يظهر عند الضغط) */}
        {showMobileSearch && (
          <div className="lg:hidden pb-4 animate-slideDown">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في سوق اليمن..."
                className="w-full pr-12 pl-5 py-3.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* خط ألوان زخرفي */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600"></div>

      {/* أنماط CSS مدمجة للحركة */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </header>
  );
}
