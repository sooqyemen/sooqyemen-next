'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebaseClient';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams?.get('email') || '';
  const mode = searchParams?.get('mode') || '';
  const oobCode = searchParams?.get('oobCode') || '';
  const nextParam = searchParams?.get('next') || '';

  const nextPath = (() => {
    const n = nextParam || '/';
    return n.startsWith('/') ? n : '/';
  })();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 1) لو جاينا رابط تفعيل من Firebase (oobCode)
    if (mode === 'verifyEmail' && oobCode) {
      verifyByActionCode(oobCode);
      return;
    }

    // 2) غير كذا: نفحص المستخدم الحالي (لو مسجل دخول)
    checkEmailVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyByActionCode = async (code) => {
    setStatus('loading');
    setMessage('جاري تفعيل حسابك…');

    try {
      await auth.applyActionCode(code);
      setStatus('verified');
      setMessage('تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.');

      setTimeout(() => {
        router.push(`/login?verified=true&next=${encodeURIComponent(nextPath)}`);
      }, 2500);
    } catch (error) {
      console.error('APPLY_ACTION_CODE_ERROR', error);
      setStatus('error');
      setMessage('تعذر تفعيل الحساب. قد يكون الرابط منتهيًا أو تم استخدامه مسبقًا.');
    }
  };

  const checkEmailVerification = async () => {
    const user = auth.currentUser;

    if (!user) {
      setStatus('no-user');
      setMessage('لو وصلت لهذه الصفحة من رابط البريد، افتح الرابط مباشرة من البريد. أو سجّل دخولك أولاً ثم اضغط "تحديث الحالة".');
      return;
    }

    setStatus('loading');
    setMessage('جاري التحقق من حالة الحساب…');

    try {
      await user.reload();
      if (user.emailVerified) {
        setStatus('verified');
        setMessage('تم تفعيل حسابك بنجاح! يمكنك الآن تسجيل الدخول.');

        setTimeout(() => {
          router.push(`/login?verified=true&next=${encodeURIComponent(nextPath)}`);
        }, 2000);
      } else {
        setStatus('pending');
        setMessage('لم يتم تفعيل حسابك بعد. تحقق من بريدك الإلكتروني واضغط على رابط التفعيل.');
      }
    } catch (error) {
      console.error('RELOAD_USER_ERROR', error);
      setStatus('error');
      setMessage('حدث خطأ أثناء التحقق من حالة الحساب.');
    }
  };

  const resendVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      setStatus('no-user');
      setMessage('سجّل دخولك أولاً حتى نقدر نعيد إرسال رابط التفعيل.');
      return;
    }

    try {
      await user.sendEmailVerification({
        url: `${window.location.origin}/verify-email?email=${encodeURIComponent(user.email || '')}&next=${encodeURIComponent(nextPath)}`,
        handleCodeInApp: true,
      });
      setMessage('تم إعادة إرسال رابط التفعيل إلى بريدك الإلكتروني.');
    } catch (error) {
      console.error('RESEND_VERIFICATION_ERROR', error);
      setMessage('حدث خطأ أثناء إعادة إرسال رابط التفعيل.');
    }
  };

  return (
    <div className="wrap" dir="rtl">
      <div className="card">
        <div className="head">
          <div className="logo">
            <img src="/zon_200.png" alt="سوق اليمن" />
          </div>
          <h1>تفعيل الحساب</h1>
          <p className="sub">تحقق من بريدك الإلكتروني</p>
        </div>

        <div className={`status ${status}`}>
          {status === 'loading' && (
            <>
              <div className="statusIcon">⏳</div>
              <div className="statusText">جاري التحقق…</div>
            </>
          )}

          {status === 'verified' && (
            <>
              <div className="statusIcon">✅</div>
              <div className="statusText">
                <h3>تم التفعيل بنجاح!</h3>
                <p>{message}</p>
                <p>سيتم توجيهك تلقائيًا…</p>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="statusIcon">📧</div>
              <div className="statusText">
                <h3>تحقق من بريدك</h3>
                <p>{message}</p>
                {email ? <p className="email">{email}</p> : null}
                <p>إذا لم تستلم الرسالة، تحقق من البريد المزعج.</p>
              </div>
            </>
          )}

          {status === 'no-user' && (
            <>
              <div className="statusIcon">🔒</div>
              <div className="statusText">
                <h3>يتطلب تسجيل الدخول (لإعادة الإرسال)</h3>
                <p>{message}</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="statusIcon">⚠️</div>
              <div className="statusText">
                <h3>حدث خطأ</h3>
                <p>{message}</p>
              </div>
            </>
          )}
        </div>

        <div className="actions">
          {status === 'pending' && (
            <button onClick={resendVerification} className="btnPrimary" type="button">
              إعادة إرسال رابط التفعيل
            </button>
          )}

          <button onClick={checkEmailVerification} className="btnSecondary" type="button">
            تحديث الحالة
          </button>

          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="link">
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </div>

      <style jsx>{`
        .wrap{ min-height: calc(100vh - 60px); display:flex; align-items:center; justify-content:center; padding: 24px 14px; background: #f8fafc; }
        .card{ width:100%; max-width: 420px; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius: 18px; box-shadow: 0 14px 36px rgba(0,0,0,.08); padding: 24px; text-align: center; }
        .head{ padding-bottom: 20px; }
        .logo{ width:56px;height:56px;border-radius: 16px; display:flex;align-items:center;justify-content:center; margin: 0 auto 10px; background: linear-gradient(135deg, rgba(255,107,53,.15), rgba(26,26,46,.08)); border:1px solid rgba(0,0,0,.06); overflow: hidden; }
        .logo img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
        h1{ margin:0; font-size: 1.35rem; font-weight: 900; color:#0f172a; }
        .sub{ margin: 6px 0 0; color:#64748b; font-size: .92rem; line-height:1.6; }
        .status { margin: 20px 0; padding: 20px; border-radius: 12px; background: #f8fafc; }
        .status.loading { background: #f0f9ff; }
        .status.verified { background: #f0fdf4; }
        .status.pending { background: #fef3c7; }
        .status.error { background: #fef2f2; }
        .status.no-user { background: #f1f5f9; }
        .statusIcon { font-size: 48px; margin-bottom: 15px; }
        .statusText h3 { margin: 0 0 10px; color: #0f172a; }
        .statusText p { margin: 5px 0; color: #475569; line-height: 1.6; }
        .email { font-family: monospace; background: #e2e8f0; padding: 5px 10px; border-radius: 6px; margin: 10px 0; }
        .actions { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
        .btnPrimary, .btnSecondary { padding: 12px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; transition: all 0.2s; }
        .btnPrimary { background: linear-gradient(135deg, #0F3460, #1A1A2E); color: white; }
        .btnPrimary:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(15,52,96,.22); }
        .btnSecondary { background: #e2e8f0; color: #475569; }
        .btnSecondary:hover { background: #cbd5e1; }
        .link { color: #0F3460; text-decoration: none; font-weight: 900; margin-top: 10px; display: inline-block; }
        .link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }} dir="rtl">جارٍ التحميل…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
