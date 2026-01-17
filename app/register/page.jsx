'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth, googleProvider } from '@/lib/firebaseClient';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.4 13.0 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.14-3.1-.4-4.5H24v9.1h12.4c-.54 2.9-2.17 5.3-4.63 6.9l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.3z" />
      <path fill="#FBBC05" d="M10.6 28.4c-.5-1.5-.8-3.1-.8-4.9s.3-3.4.8-4.9l-8-6.2C.9 15.8 0 19.8 0 24s.9 8.2 2.6 11.8l8-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.7l-7.5-5.8c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.2-13.5-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = (() => {
    const n = searchParams?.get('next') || '/';
    return n.startsWith('/') ? n : '/';
  })();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

  const mapAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') return 'هذا البريد الإلكتروني مستخدم بالفعل';
    if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صحيح';
    if (code === 'auth/operation-not-allowed') return 'إنشاء الحساب غير مفعّل حاليًا';
    if (code === 'auth/weak-password') return 'كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل';
    if (code === 'auth/too-many-requests') return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة الطلبات';
    return 'حدث خطأ غير متوقع، حاول لاحقاً';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const em = normalizeEmail(email);

    if (!name.trim()) return setError('الرجاء إدخال الاسم');
    if (!em) return setError('اكتب البريد الإلكتروني');
    if (!password || password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    if (password !== confirmPassword) return setError('كلمتا المرور غير متطابقتين');

    setLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(em, password);
      const user = userCredential.user;

      await user.updateProfile({ displayName: name.trim() });

      await user.sendEmailVerification({
        url: `${window.location.origin}/verify-email?email=${encodeURIComponent(em)}`,
        handleCodeInApp: true,
      });

      setSuccess('تم إنشاء حسابك بنجاح! تم إرسال رابط التفعيل إلى بريدك الإلكتروني.');

      // الأفضل توجيهه لصفحة التفعيل بدل تسجيل الدخول مباشرة
      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(em)}&next=${encodeURIComponent(nextPath)}`);
      }, 1200);
    } catch (err) {
      console.error('REGISTER_ERROR', err);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await auth.signInWithPopup(googleProvider);
      router.replace(nextPath);
    } catch (err) {
      console.error('GOOGLE_REGISTER_ERROR', err);
      setError(mapAuthError(err) || 'فشل التسجيل بواسطة Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap" dir="rtl">
      <div className="card">
        <div className="head">
          <div className="logo">
            <img src="/zon_200.png" alt="سوق اليمن" />
          </div>
          <h1>إنشاء حساب جديد</h1>
          <p className="sub">انضم إلى مجتمع سوق اليمن</p>
        </div>

        {error ? (
          <div className="alert error">
            <span className="alertIcon">⚠️</span>
            <div className="alertText">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="alert success">
            <span className="alertIcon">✅</span>
            <div className="alertText">{success}</div>
          </div>
        ) : null}

        <form onSubmit={handleRegister} className="form">
          <label className="lbl">الاسم الكامل</label>
          <div className="field">
            <span className="icon">👤</span>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك الكامل" autoComplete="name" required />
          </div>

          <label className="lbl">البريد الإلكتروني</label>
          <div className="field">
            <span className="icon">✉️</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" inputMode="email" required />
          </div>

          <label className="lbl">كلمة المرور</label>
          <div className="field">
            <span className="icon">🔒</span>
            <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
            <button type="button" className="eye" onClick={() => setShowPass((s) => !s)} aria-label="إظهار/إخفاء كلمة المرور">
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <label className="lbl">تأكيد كلمة المرور</label>
          <div className="field">
            <span className="icon">🔒</span>
            <input className="input" type={showConfirmPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
            <button type="button" className="eye" onClick={() => setShowConfirmPass((s) => !s)} aria-label="إظهار/إخفاء تأكيد كلمة المرور">
              {showConfirmPass ? '🙈' : '👁️'}
            </button>
          </div>

          <div className="terms">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              أوافق على <Link href="/terms" className="link">الشروط والأحكام</Link> و <Link href="/privacy" className="link">سياسة الخصوصية</Link>
            </label>
          </div>

          <button className="btnPrimary" type="submit" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب…' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="sep">
          <div className="line" />
          <span>أو</span>
          <div className="line" />
        </div>

        <button type="button" className="btnGoogle" onClick={handleGoogleRegister} disabled={loading}>
          <span className="gIcon" aria-hidden="true"><GoogleIcon /></span>
          التسجيل بواسطة Google
        </button>

        <div className="foot">
          <div className="muted">
            لديك حساب بالفعل؟{' '}
            <Link className="link" href={`/login?next=${encodeURIComponent(nextPath)}`}>
              تسجيل الدخول
            </Link>
          </div>

          <Link className="link2" href={nextPath}>
            ← العودة
          </Link>
        </div>
      </div>

      <style jsx>{`
        .wrap{ min-height: calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding: 24px 14px; background: #f8fafc; }
        .card{ width:100%; max-width: 420px; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius: 18px; box-shadow: 0 14px 36px rgba(0,0,0,.08); padding: 18px; }
        .head{ text-align:center; padding: 8px 8px 14px; }
        .logo{ width:56px;height:56px;border-radius: 16px; display:flex;align-items:center;justify-content:center; margin: 0 auto 10px; background: linear-gradient(135deg, rgba(255,107,53,.15), rgba(26,26,46,.08)); border:1px solid rgba(0,0,0,.06); overflow: hidden; }
        .logo img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
        h1{ margin:0; font-size: 1.35rem; font-weight: 900; color:#0f172a; }
        .sub{ margin: 6px 0 0; color:#64748b; font-size: .92rem; line-height:1.6; }
        .alert{ margin-top: 10px; display:flex; gap:10px; align-items:flex-start; padding: 10px 12px; border-radius: 12px; font-size: .92rem; line-height:1.6; }
        .alert.error { border: 1px solid rgba(220,38,38,.25); background: rgba(220,38,38,.08); color:#991b1b; }
        .alert.success { border: 1px solid rgba(34,197,94,.25); background: rgba(34,197,94,.08); color:#166534; }
        .alertIcon{ margin-top:2px; }
        .form{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; }
        .lbl{ font-size: .9rem; font-weight: 800; color:#0f172a; margin-top: 4px; }
        .field{ display:flex; align-items:center; gap:10px; border:1px solid rgba(0,0,0,.10); background:#f8fafc; border-radius: 12px; padding: 10px 10px; }
        .icon{ width: 32px;height: 32px;border-radius: 10px; display:flex;align-items:center;justify-content:center; background:#fff;border:1px solid rgba(0,0,0,.06); flex-shrink: 0; }
        .input{ border:0; outline:0; background: transparent; width:100%; font-size: 15px; color:#0f172a; }
        .eye{ border:0; background: transparent; cursor:pointer; font-size: 18px; padding: 4px 6px; opacity:.85; }
        .terms{ display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px; border-radius: 8px; background: #f1f5f9; font-size: 0.85rem; color: #475569; }
        .terms input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
        .btnPrimary{ margin-top: 8px; width:100%; border:0; border-radius: 12px; padding: 12px 14px; background: linear-gradient(135deg, #0F3460, #1A1A2E); color:#fff; font-weight: 900; font-size: 15px; cursor:pointer; transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
        .btnPrimary:hover{ transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,52,96,.22); }
        .btnPrimary:disabled{ opacity: .7; cursor:not-allowed; transform:none; box-shadow:none; }
        .sep{ display:flex; align-items:center; gap:10px; margin: 14px 0; color:#94a3b8; font-weight:800; font-size: .85rem; }
        .line{ height:1px; background: rgba(0,0,0,.10); flex:1; }
        .btnGoogle{ width:100%; border-radius: 12px; padding: 11px 12px; border:1px solid rgba(0,0,0,.10); background:#fff; color:#0f172a; font-weight: 900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition: transform .15s ease, box-shadow .15s ease; }
        .btnGoogle:hover{ transform: translateY(-1px); box-shadow: 0 10px 20px rgba(0,0,0,.06); }
        .btnGoogle:disabled{ opacity:.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .gIcon{ width:26px;height:26px;border-radius: 10px; background: #fff; display:flex;align-items:center;justify-content:center; border: 1px solid rgba(0,0,0,.08); }
        .foot{ margin-top: 14px; display:flex; flex-direction: column; gap: 10px; align-items:center; }
        .muted{ color:#64748b; font-size: .92rem; }
        .link{ color:#0F3460; font-weight: 900; text-decoration:none; }
        .link:hover{ text-decoration: underline; }
        .link2{ color:#94a3b8; text-decoration:none; font-weight: 800; font-size: .9rem; }
        .link2:hover{ color:#64748b; }
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }} dir="rtl">جارٍ التحميل…</div>}>
      <RegisterInner />
    </Suspense>
  );
}
