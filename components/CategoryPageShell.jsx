// components/CategoryPageShell.jsx
import Link from 'next/link';

export default function CategoryPageShell({ title, description, children }) {
  return (
    <div dir="rtl">
      <div className="container shell" style={{ paddingTop: 14 }}>
        {/* ✅ رأس الصفحة مثل الرئيسية */}
        <div className="card hero">
          <div className="heroTop">
            <div>
              <div className="heroTitle">{title}</div>
              {description ? <div className="muted heroDesc">{description}</div> : null}
            </div>

            <div className="heroActions">
              <Link className="btn" href="/">
                ⟵ الرئيسية
              </Link>
              <Link className="btn btnPrimary" href="/add">
                ➕ أضف إعلان
              </Link>
            </div>
          </div>

          {/* ✅ شريط صغير معلوماتي */}
          <div className="heroBottom">
            <div className="muted" style={{ fontSize: 12 }}>
              نصيحة: استخدم “شبكة / قائمة / خريطة” لعرض الإعلانات بالشكل اللي يناسبك.
            </div>
          </div>
        </div>

        {/* ✅ محتوى الصفحة (القائمة/الخريطة/البطاقات) */}
        <div className="content">{children}</div>
      </div>

      <style jsx>{`
        .shell {
          padding-bottom: 24px;
        }

        .hero {
          padding: 16px;
          margin-bottom: 12px;
        }

        .heroTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .heroTitle {
          font-weight: 900;
          font-size: 20px;
          line-height: 1.3;
        }

        .heroDesc {
          margin-top: 6px;
          line-height: 1.6;
        }

        .heroActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .heroBottom {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .content {
          margin-top: 0;
        }

        /* ✅ جوال */
        @media (max-width: 768px) {
          .heroTop {
            flex-direction: column;
            align-items: stretch;
          }

          .heroActions {
            justify-content: stretch;
          }

          :global(.btn) {
            width: 100%;
            justify-content: center;
          }

          .heroTitle {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
