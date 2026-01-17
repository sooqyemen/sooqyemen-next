'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebaseClient';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = (() => {
    const n = searchParams?.get('next') || '/';
    return n.startsWith('/') ? n : '/';
  })();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

  const mapAuthError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found') return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
    if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صحيح';
    if (code === 'auth/too-many-requests') return 'تم تعطيل المحاولة مؤقتاً بسبب كثرة الطلبات';
    return 'حدث خطأ أثناء إرسال رابط إعادة التعيين';
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const em = normalizeEmail(email);
    if (!em) return setError('الرجاء إدخال البريد الإلكتروني');

    setLoading(true);
    try {
      // ✅ Compat (بدون import من firebase/auth)
      await auth.sendPasswordResetEmail(em, {
        // يرجع المستخدم للموقع بعد ما يغير كلمة المرور (اختياري، لكنه ممتاز)
        url: `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}&reset=sent`,
        handleCodeInApp: false,
      });

      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من بريدك واتبع التعليمات.');

      setTimeout(() => {
        router.push(`/login?next=${encodeURIComponent(nextPath)}&reset=sent`);
      }, 3500);
    } catch (err) {
      console.error('RESET_PASSWORD_ERROR', err);
      setError(mapAuthError(err));
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
          <h1>إعادة تعيين كلمة المرور</h1>
          <p className="sub">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
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

        <form onSubmit={handleResetPassword} className="form">
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

          <button className="btnPrimary" type="submit" disabled={loading}>
            {loading ? 'جاري الإرسال…' : 'إرسال رابط التعيين'}
          </button>
        </form>

        <div className="instructions">
          <h4>تعليمات:</h4>
          <ul>
            <li>أدخل البريد الإلكتروني المرتبط بحسابك</li>
            <li>سنرسل لك رابطًا لإعادة تعيين كلمة المرور</li>
            <li>تحقق من بريدك الإلكتروني (والبريد المزعج)</li>
            <li>اتبع الرابط وأنشئ كلمة مرور جديدة</li>
          </ul>
        </div>

        <div className="foot">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="link">
            ← العودة لتسجيل الدخول
          </Link>

          <div className="muted">
            لا تملك حسابًا؟{' '}
            <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="link">
              إنشاء حساب جديد
            </Link>
          </div>
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
          overflow: hidden;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
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
        .alert.error {
          border: 1px solid rgba(220,38,38,.25);
          background: rgba(220,38,38,.08);
          color:#991b1b;
        }
        .alert.success {
          border: 1px solid rgba(34,197,94,.25);
          background: rgba(34,197,94,.08);
          color:#166534;
        }
        .alertIcon{ margin-top:2px; }

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

        .instructions {
          margin-top: 20px;
          padding: 15px;
          background: #f1f5f9;
          border-radius: 12px;
          text-align: right;
        }
        .instructions h4 {
          margin: 0 0 10px;
          color: #0f172a;
        }
        .instructions ul {
          margin: 0;
          padding-right: 20px;
          color: #475569;
          line-height: 1.6;
          font-size: 0.9rem;
        }
        .instructions li {
          margin-bottom: 8px;
        }

        .foot{
          margin-top: 20px;
          display:flex;
          flex-direction: column;
          gap: 15px;
          align-items:center;
          text-align: center;
        }
        .muted{ color:#64748b; font-size: .92rem; }
        .link{ color:#0F3460; font-weight: 900; text-decoration:none; }
        .link:hover{ text-decoration: underline; }

        @media (min-width: 768px) {
          .card { max-width: 460px; padding: 24px; }
          .head { padding: 12px 12px 18px; }
          h1 { font-size: 1.5rem; }
          .sub { font-size: 1rem; }
          .btnPrimary { padding: 14px 16px; font-size: 16px; }
          .field { padding: 12px 14px; }
        }
        @media (max-width: 360px) {
          .wrap { padding: 16px 10px; }
          .card { padding: 16px; }
          .head { padding: 6px 6px 12px; }
          .logo { width: 50px; height: 50px; }
          h1 { font-size: 1.25rem; }
          .field { padding: 8px 10px; }
          .btnPrimary { padding: 10px 12px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }} dir="rtl">جارٍ التحميل…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
