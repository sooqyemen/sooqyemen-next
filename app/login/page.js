// app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, googleProvider } from '@/lib/firebaseClient';

export const dynamic = 'force-dynamic'; // يمنع مشاكل pre-render في بعض البيئات

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [debug, setDebug] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const mapAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (code === 'auth/user-not-found') return 'البريد الإلكتروني غير مسجل';
    if (code === 'auth/wrong-password') return 'كلمة المرور غير صحيحة';
    if (code === 'auth/too-many-requests') return 'محاولات كثيرة. حاول لاحقاً';
    if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صحيح';
    if (code === 'auth/operation-not-allowed') return 'تسجيل الدخول بالبريد غير مفعّل في Firebase';
    if (code === 'auth/unauthorized-domain') return 'الدومين غير مسموح في إعدادات Firebase';
    if (code === 'auth/popup-blocked') return 'المتصفح منع نافذة تسجيل الدخول (Popup)';
    return 'حدث خطأ غير متوقع، حاول لاحقاً';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDebug('');
    setBusy(true);

    try {
      const cleanEmail = String(email || '').trim();
      const cleanPw = String(password || '');

      // ✅ Firebase compat
      await auth.signInWithEmailAndPassword(cleanEmail, cleanPw);

      router.push('/');
    } catch (err) {
      console.error('LOGIN_ERROR', err);
      setError(mapAuthError(err));
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setDebug('');
    setBusy(true);

    try {
      if (!googleProvider) {
        setError('Google Provider غير جاهز في firebaseClient');
        setBusy(false);
        return;
      }
      // ✅ Firebase compat
      await auth.signInWithPopup(googleProvider);

      router.push('/');
    } catch (err) {
      console.error('GOOGLE_LOGIN_ERROR', err);
      setError(mapAuthError(err));
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '90px', paddingBottom: '40px', maxWidth: 520 }} dir="rtl">
      <div className="card" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>تسجيل الدخول</h1>
        <p style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>أهلاً بك مجدداً في سوق اليمن</p>

        {error && (
          <div className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2', padding: 12, marginTop: 12 }}>
            <div style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ {error}</div>
            {debug && <div style={{ marginTop: 6, color: '#64748b', fontSize: 11, wordBreak: 'break-word' }}>Debug: {debug}</div>}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 800 }}>البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '12px 12px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 16,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 800 }}>كلمة المرور</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    flex: 1,
                    padding: '12px 12px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: 16,
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    padding: '0 12px',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showPw ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btnPrimary"
              disabled={busy}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, opacity: busy ? 0.75 : 1 }}
            >
              {busy ? 'جاري التحقق...' : 'دخول'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ color: '#64748b', fontSize: 13 }}>أو</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #e2e8f0',
                fontWeight: 900,
                opacity: busy ? 0.75 : 1,
              }}
            >
              الدخول بواسطة Google
            </button>

            <div style={{ textAlign: 'center', fontSize: 14, marginTop: 6 }}>
              ليس لديك حساب؟{' '}
              <Link href="/register" style={{ fontWeight: 900 }}>
                إنشاء حساب جديد
              </Link>
            </div>

            <div style={{ textAlign: 'center', fontSize: 14 }}>
              <Link href="/" style={{ color: '#64748b' }}>
                ← العودة للرئيسية
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
