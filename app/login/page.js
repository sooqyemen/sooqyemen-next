'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, googleProvider } from '@/lib/firebaseClient';

function mapAuthError(err) {
  const code = err?.code || '';

  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (code === 'auth/wrong-password') return 'كلمة المرور غير صحيحة';
  if (code === 'auth/too-many-requests')
    return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة المحاولات. جرّب لاحقاً';
  if (code === 'auth/invalid-email') return 'صيغة البريد الإلكتروني غير صحيحة';
  if (code === 'auth/invalid-api-key')
    return 'مشكلة في إعدادات Firebase (API Key غير صحيحة)';
  if (code === 'auth/operation-not-allowed')
    return 'تسجيل الدخول بالبريد/جوجل غير مفعّل في إعدادات Firebase';
  if (code === 'auth/unauthorized-domain')
    return 'الدومين الحالي غير مسموح به في Firebase (Authorized domains)';
  if (code === 'auth/popup-blocked')
    return 'المتصفح منع نافذة تسجيل الدخول. سنحوّل لطريقة أخرى…';
  if (code === 'auth/network-request-failed')
    return 'مشكلة اتصال بالإنترنت. تأكد من الشبكة ثم أعد المحاولة';

  return 'حدث خطأ غير متوقع، حاول مرة أخرى';
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => {
    const n = sp?.get('next');
    // حماية بسيطة: لا نسمح بروابط خارجية
    if (!n) return '/';
    if (n.startsWith('http')) return '/';
    if (!n.startsWith('/')) return '/';
    return n;
  }, [sp]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [debug, setDebug] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDebug('');
    setResetMsg('');

    if (!email.trim() || !password) {
      setError('الرجاء إدخال البريد وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const cred = await auth.signInWithEmailAndPassword(
        email.trim(),
        password
      );

      // نجاح
      const u = cred?.user;
      if (!u) throw new Error('No user returned');
      router.replace(nextPath);
    } catch (err) {
      const msg = mapAuthError(err);
      setError(msg);

      // Debug اختياري: لو تبغاه خله، أو احذف هالسطرين
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);

      // إذا Popup blocked — نحاول Redirect كحل أفضل للجوال
      if (err?.code === 'auth/popup-blocked') {
        try {
          await auth.signInWithRedirect(googleProvider);
        } catch (e2) {
          setError('فشل التحويل لتسجيل الدخول. جرّب لاحقاً');
          setDebug(`${e2?.code || 'no-code'}: ${e2?.message || ''}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setDebug('');
    setResetMsg('');

    // لو ما كان provider موجود (احتياط)
    if (!googleProvider) {
      setError('تسجيل الدخول عبر Google غير جاهز حالياً');
      return;
    }

    setLoading(true);
    try {
      await auth.signInWithPopup(googleProvider);
      router.replace(nextPath);
    } catch (err) {
      const msg = mapAuthError(err);
      setError(msg);
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);

      // على الجوال أحياناً popup ما يشتغل → Redirect
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
        try {
          await auth.signInWithRedirect(googleProvider);
        } catch (e2) {
          setError('فشل تسجيل الدخول بواسطة Google');
          setDebug(`${e2?.code || 'no-code'}: ${e2?.message || ''}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setDebug('');
    setResetMsg('');

    const em = email.trim();
    if (!em) {
      setError('اكتب بريدك أولاً ثم اضغط “نسيت كلمة المرور؟”');
      return;
    }

    setResetLoading(true);
    try {
      await auth.sendPasswordResetEmail(em);
      setResetMsg('✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
    } catch (err) {
      setError(mapAuthError(err));
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        padding: '90px 16px 40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            تسجيل الدخول
          </h1>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            أهلاً بك مجدداً في سوق اليمن
          </p>
        </div>

        {error ? (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        ) : null}

        {resetMsg ? (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {resetMsg}
          </div>
        ) : null}

        {/* Debug — إذا ما تبغاه احذف البلوك كامل */}
        {debug ? (
          <div
            style={{
              fontSize: 11,
              color: '#64748b',
              marginBottom: 12,
              wordBreak: 'break-word',
            }}
          >
            Debug: {debug}
          </div>
        ) : null}

        <form onSubmit={handleLogin}>
          <label className="muted" style={{ fontSize: 13 }}>
            البريد الإلكتروني
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            style={{ marginBottom: 10 }}
            required
          />

          <label className="muted" style={{ fontSize: 13 }}>
            كلمة المرور
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ marginBottom: 10 }}
            required
          />

          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading || loading}
              className="btn"
              style={{ background: '#f1f5f9' }}
            >
              {resetLoading ? 'جاري الإرسال…' : 'نسيت كلمة المرور؟'}
            </button>

            <Link href="/register" className="muted" style={{ fontSize: 13 }}>
              إنشاء حساب جديد
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btnPrimary"
            style={{
              width: '100%',
              justifyContent: 'center',
              borderRadius: 12,
              fontWeight: 900,
            }}
          >
            {loading ? 'جاري التحقق…' : 'دخول'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '14px 0',
          }}
        >
          <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
          <span className="muted" style={{ fontSize: 12 }}>
            أو
          </span>
          <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            borderRadius: 12,
            background: '#fff',
          }}
        >
          تسجيل الدخول بواسطة Google
        </button>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Link href="/" className="muted" style={{ fontSize: 13 }}>
            ← العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
