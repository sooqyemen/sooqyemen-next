'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// نستورد auth و googleProvider مباشرة من ملف الإعدادات المتوافق (Compat)
import { auth, googleProvider } from '@/lib/firebaseClient'; 
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // تسجيل الدخول بالبريد الإلكتروني
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // استخدام الطريقة المتوافقة (Compat Style) لتتناسب مع lib/firebaseClient.js
      await auth.signInWithEmailAndPassword(email, password);
      router.push('/'); // توجيه للرئيسية بعد النجاح
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (err.code === 'auth/too-many-requests') {
        setError('تم تعطيل الحساب مؤقتاً بسبب كثرة المحاولات الفاشلة');
      } else {
        setError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً');
      }
    } finally {
      setLoading(false);
    }
  };

  // تسجيل الدخول بجوجل
  const handleGoogleLogin = async () => {
    setError('');
    try {
      // استخدام الطريقة المتوافقة (Compat Style)
      await auth.signInWithPopup(googleProvider);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('فشل تسجيل الدخول بواسطة جوجل');
    }
  };

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

        {/* رسائل الخطأ */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* النموذج */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* البريد الإلكتروني */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
              <input
                type="email"
                required
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
                type="password"
                required
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* زر الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>

        {/* فاصل */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">أو تابع باستخدام</span>
          </div>
        </div>

        {/* دخول بجوجل */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
