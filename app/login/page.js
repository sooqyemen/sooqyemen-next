'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth, googleProvider } from '@/lib/firebaseClient';

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.4 13.0 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.14-3.1-.4-4.5H24v9.1h12.4c-.54 2.9-2.17 5.3-4.63 6.9l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.4c-.5-1.5-.8-3.1-.8-4.9s.3-3.4.8-4.9l-8-6.2C.9 15.8 0 19.8 0 24s.9 8.2 2.6 11.8l8-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 12-2.1 16-5.7l-7.5-5.8c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.2-13.5-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = (() => {
    const n = searchParams?.get('next') || '/';
    return n.startsWith('/') ? n : '/';
  })();

  const verifiedFlag = searchParams?.get('verified') === 'true';
  const registeredFlag = searchParams?.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debug, setDebug] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    // مراقبة حالة المستخدم (عشان زر إرسال التفعيل يظهر بشكل صحيح)
    const unsub = auth.onAuthStateChanged((u) => setUser(u || null));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (verifiedFlag) setSuccess('تم تفعيل حسابك بنجاح ✅ يمكنك الآن تسجيل الدخول.');
    else if (registeredFlag) setSuccess('تم إنشاء الحساب ✅ تم إرسال رابط التفعيل إلى بريدك.');
    else setSuccess('');
  }, [verifiedFlag, registeredFlag]);

  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

  const mapAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صحيح';
    if (code === 'auth/too-many-requests') return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة المحاولات الفاشلة';
    if (code === 'auth/operation-not-allowed') return 'تسجيل الدخول بالبريد غير مفعّل في إعدادات Firebase';
    if (code === 'auth/unauthorized-domain') return 'الدومين غير مسموح في إعدادات Firebase (Authorized domains)';
    if (code === 'auth/invalid-api-key') return 'مشكلة في إعدادات Firebase (API Key)';
    if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    return 'حدث خطأ غير متوقع، حاول لاحقاً';
  };

  const goNext = () => {
    router.replace(nextPath);
  };

  const redirectToVerify = (emailValue) => {
    const em = normalizeEmail(emailValue || '');
    router.replace(`/verify-email?email=${encodeURIComponent(em)}&next=${encodeURIComponent(nextPath)}`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setDebug('');
    setSuccess('');

    const em = normalizeEmail(email);
    if (!em) return setError('اكتب البريد الإلكتروني');
    if (!password || password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setLoading(true);
    try {
      const cred = await auth.signInWithEmailAndPassword(em, password);
      const u = cred?.user;

      // ✅ لا ندخل المستخدم إذا حسابه غير مُفعّل (إلا لو تبغى تسمح)
      if (u && !u.emailVerified) {
        redirectToVerify(em);
        return;
      }

      goNext();
    } catch (err) {
      console.error('LOGIN_ERROR', err);
      setError(mapAuthError(err));
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setDebug('');
    setSuccess('');
    setLoading(true);
    try {
      const cred = await auth.signInWithPopup(googleProvider);
      const u = cred?.user;

      // أغلب حسابات Google تكون verified، بس نخليها حماية
      if (u && !u.emailVerified) {
        redirectToVerify(u.email || '');
        return;
      }

      goNext();
    } catch (err) {
      console.error('GOOGLE_LOGIN_ERROR', err);
      setError(mapAuthError(err) || 'فشل تسجيل الدخول بواسطة Google');
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationFromLogin = async () => {
    setError('');
    setDebug('');

    const u = auth.currentUser;
    if (!u) {
      setError('سجّل دخولك أولاً ثم أعد إرسال رابط التفعيل.');
      return;
    }

    try {
      await u.sendEmailVerification({
        url: `${window.location.origin}/verify-email?email=${encodeURIComponent(u.email || '')}&next=${encodeURIComponent(nextPath)}`,
        handleCodeInApp: true,
      });
      setSuccess('تم إرسال رابط التفعيل إلى بريدك الإلكتروني ✅');
    } catch (err) {
      console.error('RESEND_VERIFICATION_ERROR', err);
      setError('حدث خطأ أثناء إرسال رابط التفعيل');
      setDebug(`${err?.code || 'no-code'}: ${err?.message || ''}`);
    }
  };

  return (
    <div className="wrap" dir="rtl">
      <div className="card">
        <div className="head">
          {/* لو عندك شعار: خله صورة من public بدل الايموجي */}
          <div className="logo">
            <img src="/zon_200.png" alt="سوق اليمن" />
          </div>
          <h1>تسجيل الدخول</h1>
          <p className="sub">أهلاً بك مجدداً في سوق اليمن</p>
        </div>

        {success ? (
          <div className="alert success">
            <span className="alertIcon">✅</span>
            <div className="alertText">{success}</div>
          </div>
        ) : null}

        {error ? (
          <div className="alert error">
            <span className="alertIcon">⚠️</span>
            <div className="alertText">{error}</div>
          </div>
        ) : null}

        {debug ? (
          <div className="debug">
            <span>Debug:</span> {debug}
          </div>
        ) : null}

        {/* لو المستخدم مسجّل دخول وحسابه غير مُفعّل، اعرض زر إرسال رابط التفعيل */}
        {user && !user.emailVerified ? (
          <div className="verifyBox">
            <div className="verifyText">
              حسابك غير مُفعّل بعد. افتح رابط التفعيل في بريدك.
            </div>
            <button type="button" className="btnSecondary" onClick={resendVerificationFromLogin} disabled={loading}>
              إرسال رابط التفعيل مرة أخرى
            </button>
            <Link className="linkSmall" href={`/verify-email?email=${encodeURIComponent(user.email || '')}&next=${encodeURIComponent(nextPath)}`}>
              فتح صفحة التفعيل
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="form">
          <label className="lbl">البريد الإلكتروني</label>
          <div className="field">
            <span className="icon">✉️</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <label className="lbl">كلمة المرور</label>
          <div className="field">
            <span className="icon">🔒</span>
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowPass((s) => !s)}
              aria-label="إظهار/إخفاء كلمة المرور"
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <button className="btnPrimary" type="submit" disabled={loading}>
            {loading ? 'جاري التحقق…' : 'دخول'}
          </button>

          <div className="helperRow">
            <Link className="linkSmall" href="/reset-password">
              نسيت كلمة المرور؟
            </Link>
          </div>
        </form>

        <div className="sep">
          <div className="line" />
          <span>أو</span>
          <div className="line" />
        </div>

        <button type="button" className="btnGoogle" onClick={handleGoogleLogin} disabled={loading}>
          <span className="gIcon" aria-hidden="true">
            <GoogleIcon />
          </span>
          الدخول بواسطة Google
        </button>

        <div className="foot">
          <div className="muted">
            ليس لديك حساب؟{' '}
            <Link className="link" href={`/register?next=${encodeURIComponent(nextPath)}`}>
              إنشاء حساب جديد
            </Link>
          </div>

          <Link className="link2" href={nextPath}>
            ← العودة
          </Link>
        </div>
      </div>

      <style jsx>{`
        .wrap{
          min-height: calc(100vh - 60px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px 14px;
          background: #f8fafc;
        }
        .card{
          width:100%;
          max-width: 420px;
          background:#fff;
          border:1px solid rgba(0,0,0,.08);
          border-radius: 18px;
          box-shadow: 0 14px 36px rgba(0,0,0,.08);
          padding: 18px;
        }
        .head{ text-align:center; padding: 8px 8px 14px; }
        .logo{
          width:56px;height:56px;border-radius: 16px;
          display:flex;align-items:center;justify-content:center;
          margin: 0 auto 10px;
          background: linear-gradient(135deg, rgba(255,107,53,.15), rgba(26,26,46,.08));
          border:1px solid rgba(0,0,0,.06);
          overflow:hidden;
        }
        .logo img{
          width:100%;
          height:100%;
          object-fit:contain;
          padding:8px;
          display:block;
        }
        h1{ margin:0; font-size: 1.35rem; font-weight: 900; color:#0f172a; }
        .sub{ margin: 6px 0 0; color:#64748b; font-size: .92rem; line-height:1.6; }

        .alert{
          margin-top: 10px;
          display:flex; gap:10px; align-items:flex-start;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: .92rem; line-height:1.6;
        }
        .alertIcon{ margin-top:2px; }
        .alertText{ font-size: .92rem; line-height:1.6; }

        .alert.error{
          border: 1px solid rgba(220,38,38,.25);
          background: rgba(220,38,38,.08);
          color:#991b1b;
        }
        .alert.success{
          border: 1px solid rgba(34,197,94,.25);
          background: rgba(34,197,94,.08);
          color:#166534;
        }

        .debug{ margin-top: 8px; font-size: 11px; color:#64748b; word-break: break-word; }
        .debug span{ font-weight: 800; color:#475569; }

        .verifyBox{
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(245,158,11,.25);
          background: rgba(245,158,11,.10);
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .verifyText{
          color:#92400e;
          font-weight:800;
          font-size:.92rem;
          line-height:1.6;
        }

        .form{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; }
        .lbl{ font-size: .9rem; font-weight: 800; color:#0f172a; margin-top: 4px; }
        .field{
          display:flex; align-items:center; gap:10px;
          border:1px solid rgba(0,0,0,.10);
          background:#f8fafc;
          border-radius: 12px;
          padding: 10px 10px;
        }
        .icon{
          width: 32px;height: 32px;border-radius: 10px;
          display:flex;align-items:center;justify-content:center;
          background:#fff;border:1px solid rgba(0,0,0,.06);
          flex-shrink: 0;
        }
        .input{ border:0; outline:0; background: transparent; width:100%; font-size: 15px; color:#0f172a; }
        .eye{ border:0; background: transparent; cursor:pointer; font-size: 18px; padding: 4px 6px; opacity:.85; }

        .btnPrimary{
          margin-top: 8px; width:100%;
          border:0; border-radius: 12px;
          padding: 12px 14px;
          background: linear-gradient(135deg, #0F3460, #1A1A2E);
          color:#fff; font-weight: 900; font-size: 15px;
          cursor:pointer;
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        }
        .btnPrimary:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,52,96,.22); }
        .btnPrimary:disabled{ opacity: .7; cursor:not-allowed; transform:none; box-shadow:none; }

        .btnSecondary{
          width:100%;
          border-radius: 12px;
          padding: 11px 12px;
          border:1px solid rgba(0,0,0,.10);
          background:#fff;
          color:#0f172a;
          font-weight: 900;
          cursor:pointer;
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        }
        .btnSecondary:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(0,0,0,.06); }
        .btnSecondary:disabled{ opacity:.7; cursor:not-allowed; transform:none; box-shadow:none; }

        .helperRow{
          display:flex;
          justify-content:flex-start;
          margin-top: 2px;
        }

        .sep{
          display:flex; align-items:center; gap:10px;
          margin: 14px 0;
          color:#94a3b8; font-weight:800; font-size: .85rem;
        }
        .line{ height:1px; background: rgba(0,0,0,.10); flex:1; }

        .btnGoogle{
          width:100%;
          border-radius: 12px;
          padding: 11px 12px;
          border:1px solid rgba(0,0,0,.10);
          background:#fff;
          color:#0f172a;
          font-weight: 900;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .btnGoogle:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(0,0,0,.06); }
        .btnGoogle:disabled{ opacity:.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .gIcon{
          width:26px;height:26px;border-radius: 10px;
          background: #fff;
          display:flex;align-items:center;justify-content:center;
          border: 1px solid rgba(0,0,0,.08);
        }

        .foot{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; align-items:center; }
        .muted{ color:#64748b; font-size: .92rem; }
        .link{ color:#0F3460; font-weight: 900; text-decoration:none; }
        .link:hover{ text-decoration: underline; }
        .link2{ color:#94a3b8; text-decoration:none; font-weight: 800; font-size: .9rem; }
        .link2:hover{ color:#64748b; }

        .linkSmall{
          color:#0F3460;
          font-weight:900;
          text-decoration:none;
          font-size:.9rem;
        }
        .linkSmall:hover{ text-decoration: underline; }

        @media (min-width: 768px) {
          .card { max-width: 460px; padding: 24px; }
          .head { padding: 12px 12px 18px; }
          h1 { font-size: 1.5rem; }
          .sub { font-size: 1rem; }
          .btnPrimary, .btnGoogle { padding: 14px 16px; font-size: 16px; }
          .field { padding: 12px 14px; }
        }
        @media (max-width: 360px) {
          .wrap { padding: 16px 10px; }
          .card { padding: 16px; }
          .head { padding: 6px 6px 12px; }
          .logo { width: 50px; height: 50px; }
          h1 { font-size: 1.25rem; }
          .field { padding: 8px 10px; }
          .btnPrimary, .btnGoogle { padding: 10px 12px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }} dir="rtl">جارٍ التحميل…</div>}>
      <LoginInner />
    </Suspense>
  );
}
