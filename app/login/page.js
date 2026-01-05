'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { auth, googleProvider } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

// أمان بسيط ضد روابط خارجية في next
function safeNextPath(p) {
  if (!p) return '/';
  if (p.startsWith('/') && !p.startsWith('//')) return p;
  return '/';
}

function mapAuthError(err) {
  const code = err?.code || '';

  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (code === 'auth/wrong-password') return 'كلمة المرور غير صحيحة';
  if (code === 'auth/invalid-email') return 'صيغة البريد الإلكتروني غير صحيحة';
  if (code === 'auth/too-many-requests') {
    return 'محاولات كثيرة. حاول لاحقاً.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'الدومين غير مسموح به في إعدادات Firebase.';
  }
  if (code === 'auth/popup-blocked') {
    return 'المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة جوجل قبل إكمال العملية.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'طريقة تسجيل الدخول غير مفعلة في Firebase.';
  }

  return 'حدث خطأ غير متوقع، حاول مرة أخرى.';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get('next') || '/';
  const nextPath = useMemo(() => safeNextPath(nextParam), [nextParam]);

  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const [busyEmail, setBusyEmail] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  // إذا المستخدم مسجّل دخول بالفعل → حوله
  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace(nextPath);
  }, [user, authLoading, router, nextPath]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = String(email || '').trim();
    const cleanPass = String(password || '');

    if (!cleanEmail || !cleanPass) {
      setError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }

    setBusyEmail(true);
    try {
      // مشروعك غالباً يستخدم compat
      if (typeof auth?.signInWithEmailAndPassword === 'function') {
        await auth.signInWithEmailAndPassword(cleanEmail, cleanPass);
      } else {
        // fallback نادر لو auth modular
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      }

      router.replace(nextPath);
    } catch (err) {
      console.error('LOGIN_ERROR', err);
      setError(mapAuthError(err));
    } finally {
      setBusyEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setBusyGoogle(true);

    try {
      if (!googleProvider) {
        setError('googleProvider غير موجود في firebaseClient');
        return;
      }

      if (typeof auth?.signInWithPopup === 'function') {
        await auth.signInWithPopup(googleProvider);
      } else {
        const { signInWithPopup } = await import('firebase/auth');
        await signInWithPopup(auth, googleProvider);
      }

      router.replace(nextPath);
    } catch (err) {
      console.error('GOOGLE_LOGIN_ERROR', err);
      setError(mapAuthError(err));
    } finally {
      setBusyGoogle(false);
    }
  };

  if (authLoading) {
    return (
      <div className="wrap" dir="rtl">
        <div className="card">
          <div className="spinner" />
          <p className="muted">جاري التحميل...</p>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  // منع الوميض إذا user موجود (useEffect سيحوّل)
  if (user) {
    return (
      <div className="wrap" dir="rtl">
        <div className="card">
          <div className="spinner" />
          <p className="muted">جاري تحويلك...</p>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap" dir="rtl">
      <div className="card">
        <div className="head">
          <h1>تسجيل الدخول</h1>
          <p className="muted">أهلاً بك مجدداً في سوق اليمن</p>
        </div>

        {error && (
          <div className="errorBox">
            <span className="errorIcon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="form">
          <label className="label">البريد الإلكتروني</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label rowBetween">
            <span>كلمة المرور</span>
            <button
              type="button"
              className="linkBtn"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? 'إخفاء' : 'إظهار'}
            </button>
          </label>

          <input
            className="input"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="rowBetween small">
            <span />
            <Link className="link" href="/forgot-password">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <button className="btnPrimary" type="submit" disabled={busyEmail || busyGoogle}>
            {busyEmail ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>

        <div className="divider">
          <span>أو</span>
        </div>

        <button
          className="btnSecondary"
          type="button"
          onClick={handleGoogleLogin}
          disabled={busyEmail || busyGoogle}
        >
          {busyGoogle ? 'جاري فتح جوجل...' : 'تسجيل الدخول باستخدام Google'}
        </button>

        <p className="footer">
          ليس لديك حساب؟{' '}
          <Link className="link strong" href="/register">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.wrap{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  background:#f8fafc;
}
.card{
  width:100%;
  max-width:420px;
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:16px;
  box-shadow:0 10px 30px rgba(0,0,0,.08);
  padding:22px;
}
.head{ text-align:center; margin-bottom:16px; }
.head h1{ margin:0; font-size:22px; color:#0f172a; font-weight:900; }
.muted{ margin:8px 0 0; color:#64748b; font-size:13px; }

.errorBox{
  display:flex;
  gap:10px;
  align-items:flex-start;
  background:#fef2f2;
  border:1px solid #fecaca;
  color:#b91c1c;
  padding:10px 12px;
  border-radius:12px;
  margin:10px 0 14px;
  font-size:14px;
}
.errorIcon{ margin-top:1px; }

.form{ display:flex; flex-direction:column; gap:10px; }
.label{
  font-size:14px;
  font-weight:700;
  color:#1e293b;
}
.rowBetween{ display:flex; align-items:center; justify-content:space-between; }
.small{ margin-top:-6px; }

.input{
  width:100%;
  padding:12px 12px;
  border:2px solid #e2e8f0;
  border-radius:12px;
  background:#f8fafc;
  font-size:15px;
  outline:none;
  transition:.15s;
}
.input:focus{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.12);
}

.btnPrimary{
  margin-top:6px;
  width:100%;
  padding:12px;
  border:none;
  border-radius:12px;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  color:#fff;
  font-weight:900;
  cursor:pointer;
  transition:.15s;
}
.btnPrimary:disabled{ opacity:.7; cursor:not-allowed; }

.divider{
  display:flex;
  align-items:center;
  justify-content:center;
  margin:14px 0;
  position:relative;
}
.divider::before{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:50%;
  height:1px;
  background:#e2e8f0;
}
.divider span{
  position:relative;
  background:#fff;
  padding:0 10px;
  color:#64748b;
  font-size:13px;
}

.btnSecondary{
  width:100%;
  padding:12px;
  border:2px solid #e2e8f0;
  border-radius:12px;
  background:#fff;
  color:#0f172a;
  font-weight:800;
  cursor:pointer;
  transition:.15s;
}
.btnSecondary:hover{ background:#f8fafc; }
.btnSecondary:disabled{ opacity:.7; cursor:not-allowed; }

.footer{
  margin:16px 0 0;
  text-align:center;
  color:#475569;
  font-size:14px;
}
.link{
  color:#4f46e5;
  text-decoration:none;
}
.link:hover{ text-decoration:underline; }
.strong{ font-weight:900; }

.linkBtn{
  border:none;
  background:transparent;
  color:#4f46e5;
  font-weight:800;
  cursor:pointer;
  padding:0;
}
.linkBtn:hover{ text-decoration:underline; }

.spinner{
  width:42px;height:42px;
  border:4px solid #e2e8f0;
  border-top-color:#4f46e5;
  border-radius:50%;
  animation:spin .9s linear infinite;
  margin:0 auto 10px;
}
@keyframes spin{ to{ transform:rotate(360deg)} }
`;
