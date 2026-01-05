'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { auth, googleProvider } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

import {
  signInWithEmailAndPassword as signInWithEmailAndPasswordMod,
  signInWithPopup as signInWithPopupMod,
} from 'firebase/auth';

import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

function safeNextPath(nextPath) {
  // أمان بسيط: ما نسمح بروابط خارجية
  if (!nextPath) return '/';
  if (nextPath.startsWith('/') && !nextPath.startsWith('//')) return nextPath;
  return '/';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get('next') || '/';

  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const nextPath = useMemo(() => safeNextPath(nextParam), [nextParam]);

  // إذا المستخدم مسجّل دخول بالفعل → حوله
  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace(nextPath);
  }, [user, authLoading, router, nextPath]);

  const mapAuthError = (err) => {
    const code = err?.code || '';
    // رسائل عربية واضحة
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }
    if (code === 'auth/wrong-password') return 'كلمة المرور غير صحيحة';
    if (code === 'auth/too-many-requests') {
      return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.';
    }
    if (code === 'auth/invalid-email') return 'صيغة البريد الإلكتروني غير صحيحة';
    if (code === 'auth/invalid-api-key') {
      return 'مشكلة في إعدادات Firebase (API Key غير صحيحة).';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'تسجيل الدخول بهذه الطريقة غير مفعّل في Firebase.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'الدومين الحالي غير مسموح به في إعدادات Firebase.';
    }
    if (code === 'auth/popup-blocked') {
      return 'المتصفح منع نافذة تسجيل الدخول (Popup). اسمح بالنوافذ المنبثقة وحاول مرة أخرى.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.';
    }

    return 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً';
  };

  // ✅ تسجيل الدخول بالبريد (يدعم compat + modular)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = String(email || '').trim();
    const cleanPass = String(password || '');

    if (!cleanEmail || !cleanPass) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoadingEmail(true);
    try {
      // compat: auth.signInWithEmailAndPassword(email, pass)
      if (typeof auth?.signInWithEmailAndPassword === 'function') {
        await auth.signInWithEmailAndPassword(cleanEmail, cleanPass);
      } else {
        // modular: signInWithEmailAndPassword(auth, email, pass)
        await signInWithEmailAndPasswordMod(auth, cleanEmail, cleanPass);
      }

      router.replace(nextPath);
    } catch (err) {
      console.error('LOGIN_ERROR', err);
      setError(mapAuthError(err));
    } finally {
      setLoadingEmail(false);
    }
  };

  // ✅ تسجيل الدخول بجوجل (يدعم compat + modular)
  const handleGoogleLogin = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      if (typeof auth?.signInWithPopup === 'function') {
        await auth.signInWithPopup(googleProvider);
      } else {
        await signInWithPopupMod(auth, googleProvider);
      }
      router.replace(nextPath);
    } catch (err) {
      console.error('GOOGLE_LOGIN_ERROR', err);
      setError(mapAuthError(err));
    } finally {
      setLoadingGoogle(false);
    }
  };

  // شاشة تحميل خفيفة لو useAuth لسه يحمل
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-slate-100 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // لو كان user موجود، useEffect سيحوّله، هنا فقط منع وميض
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="text-slate-600 text-sm">جاري تحويلك...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-slate-100">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <LogIn className="text-blue-600" />
            تسجيل الدخول
          </h1>
          <p className="text-slate-500 mt-2 text-sm">أهلاً بك مجدداً في سوق اليمن</p>
        </div>

        {/* رسالة خطأ */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-start gap-2 border border-red-100">
            <AlertCircle size={18} className="mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* النموذج */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* البريد */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-slate-400" size={20} />
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="w-full pr-10 pl-12 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-700"
                aria-label="إظهار/إخفاء كلمة المرور"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span />
              <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </div>

          {/* زر البريد */}
          <button
            type="submit"
            disabled={loadingEmail || loadingGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
          >
            {loadingEmail ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>

        {/* فاصل */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">أو تابع باستخدام</span>
          </div>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingEmail || loadingGoogle}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loadingGoogle ? (
            <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </button>

        {/* التسجيل */}
        <div className="mt-8 text-center text-sm text-slate-600">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
