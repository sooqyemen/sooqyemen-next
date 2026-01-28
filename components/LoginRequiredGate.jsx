'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LoginRequiredGate({
  title = 'تسجيل الدخول مطلوب',
  message = 'لاستكمال إضافة إعلان جديد، سجّل دخولك أو أنشئ حسابًا خلال دقيقة.',
  nextPath,
}) {
  const pathname = usePathname();
  const next = encodeURIComponent(nextPath || pathname || '/add');

  // عدّل هذا السطر فقط إذا مسار "إنشاء حساب" عندك مختلف (مثلاً /register)
  const signupPath = '/signup';

  const loginHref = `/login?next=${next}`;
  const signupHref = `${signupPath}?next=${next}`;

  return (
    <div className="gateWrap" dir="rtl">
      <div className="gateCard">
        <div className="gateTop">
          <div className="gateIcon" aria-hidden="true">
            🔒
          </div>

          <div className="gateHead">
            <h1 className="gateTitle">{title}</h1>
            <p className="gateMsg">{message}</p>
          </div>
        </div>

        <div className="gateBenefits">
          <div className="bItem">
            <span className="bDot" aria-hidden="true">✅</span>
            <span>سنعيدك تلقائيًا إلى صفحة إضافة الإعلان بعد تسجيل الدخول</span>
          </div>
          <div className="bItem">
            <span className="bDot" aria-hidden="true">⚡</span>
            <span>إضافة إعلان في دقائق مع تحديد الموقع والصور</span>
          </div>
          <div className="bItem">
            <span className="bDot" aria-hidden="true">🛡️</span>
            <span>حماية أفضل للإعلانات وتقليل المحتوى المزعج</span>
          </div>
        </div>

        <div className="gateActions">
          <Link className="gateBtnPrimary" href={loginHref}>
            تسجيل الدخول
          </Link>

          <Link className="gateBtn" href={signupHref}>
            إنشاء حساب
          </Link>
        </div>

        <div className="gateLinks">
          <Link className="gateLink" href="/listings">تصفّح الإعلانات</Link>
          <span className="sep" aria-hidden="true">•</span>
          <Link className="gateLink" href="/">العودة للرئيسية</Link>
        </div>
      </div>

      <style jsx>{`
        .gateWrap{
          min-height: calc(100vh - 90px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 14px;
          background:
            radial-gradient(900px 450px at 80% 10%, rgba(194,65,12,.18), transparent 60%),
            radial-gradient(700px 420px at 10% 90%, rgba(2,132,199,.10), transparent 55%),
            #f8fafc;
        }

        .gateCard{
          width: 100%;
          max-width: 760px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 18px;
          box-shadow: 0 18px 60px rgba(0,0,0,.08);
          padding: 18px;
        }

        .gateTop{
          display:flex;
          gap: 12px;
          align-items:flex-start;
        }

        .gateIcon{
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: rgba(194,65,12,.10);
          border: 1px solid rgba(194,65,12,.18);
          font-size: 20px;
          flex: 0 0 auto;
        }

        .gateTitle{
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 900;
          color: #0f172a;
        }

        .gateMsg{
          margin: 6px 0 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.7;
        }

        .gateBenefits{
          margin-top: 14px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(15,23,42,.03);
          border: 1px dashed rgba(0,0,0,.10);
          display: grid;
          gap: 8px;
        }

        .bItem{
          display:flex;
          gap: 8px;
          align-items:flex-start;
          color:#0f172a;
          font-size: 13.5px;
          line-height: 1.7;
        }

        .bDot{
          margin-top: 1px;
          flex: 0 0 auto;
        }

        .gateActions{
          display:flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .gateBtnPrimary, .gateBtn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 900;
          text-decoration:none;
          transition: transform .08s ease, box-shadow .18s ease, background .18s ease;
          min-width: 160px;
        }

        .gateBtnPrimary{
          background: #C2410C;
          color:#fff;
          box-shadow: 0 10px 24px rgba(194,65,12,.24);
        }
        .gateBtnPrimary:hover{ transform: translateY(-1px); }

        .gateBtn{
          background: #fff;
          color:#0f172a;
          border: 1px solid rgba(0,0,0,.10);
        }
        .gateBtn:hover{ transform: translateY(-1px); }

        .gateLinks{
          margin-top: 12px;
          display:flex;
          gap: 8px;
          align-items:center;
          justify-content:center;
          color:#64748b;
          font-size: 13px;
        }

        .gateLink{
          color:#2563eb;
          text-decoration:none;
          font-weight: 800;
        }
        .gateLink:hover{ text-decoration: underline; }

        .sep{ opacity:.7; }

        @media (max-width: 520px){
          .gateCard{ padding: 14px; }
          .gateBtnPrimary, .gateBtn{ width: 100%; }
          .gateLinks{ flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
