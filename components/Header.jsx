'use client';

import Image from 'next/image';
import { LoginIcon, PlusIcon, ShieldIcon, MoonIcon, SunIcon } from './Icons';

export default function Header({
  user,
  onLoginClick,
  onAddClick,
  onAdminClick,
  isDark,
  onToggleDark,
}) {
  return (
    <header className="header-compact text-white">
      <div className="max-w-6xl mx-auto px-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/15 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo-souqyemen.png"
                alt="سوق اليمن"
                width={40}
                height={40}
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-lg leading-tight truncate">سوق اليمن</div>
              <div className="text-xs text-white/80 truncate">Next.js</div>
            </div>
          </div>

          <button
            onClick={onToggleDark}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 active:opacity-80"
            aria-label="تبديل الوضع"
          >
            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={onAddClick}
            className="btn btn-white w-full"
          >
            <PlusIcon className="w-5 h-5" />
            <span>إضافة إعلان</span>
          </button>

          <button
            onClick={onAdminClick}
            className="btn btn-white w-full"
          >
            <ShieldIcon className="w-5 h-5" />
            <span>لوحة الإدارة</span>
          </button>

          <button
            onClick={onLoginClick}
            className="btn btn-primary w-full"
          >
            <LoginIcon className="w-5 h-5" />
            <span className="truncate">
              {user ? (user.displayName || 'حسابي') : 'تسجيل الدخول (Google)'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
