'use client';

import { useMemo, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider, ensureAuthPersistence } from '@lib/firebaseClient';

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = useMemo(() => (mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'), [mode]);

  if (!open) return null;

  const onGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await ensureAuthPersistence();
      if (isMobile()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
      onClose?.();
    } catch (e) {
      setError(e?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ensureAuthPersistence();
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose?.();
    } catch (e) {
      setError(e?.message || 'تعذر إكمال العملية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-lg">{title}</div>
          <button onClick={onClose} className="px-3 py-1 rounded-xl border">إغلاق</button>
        </div>

        <div className="mt-4">
          <button
            onClick={onGoogle}
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 hover:bg-sky-700 text-white py-3 font-extrabold"
          >
            تسجيل الدخول (Google)
          </button>

          <div className="my-4 text-center text-slate-400">أو</div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-2xl border px-4 py-3"
              placeholder="كلمة المرور"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error ? (
              <div className="rounded-xl bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 hover:bg-black text-white py-3 font-extrabold"
            >
              {mode === 'login' ? 'دخول' : 'إنشاء حساب'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <button
                type="button"
                className="text-sky-700 font-bold"
                onClick={() => setMode('signup')}
              >
                ما عندك حساب؟ أنشئ حساب
              </button>
            ) : (
              <button
                type="button"
                className="text-sky-700 font-bold"
                onClick={() => setMode('login')}
              >
                عندك حساب؟ سجل دخول
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            ملاحظة: على بعض أجهزة iPhone قد تحتاج إيقاف "منع التعقب" أو فتح الصفحة في Safari العادي (وليس الوضع الخاص) لكي يعمل تسجيل الدخول.
          </div>
        </div>
      </div>
    </div>
  );
}
