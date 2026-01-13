// app/help/page.jsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq ${open ? 'open' : ''}`}>
      <button className="faqQ" type="button" onClick={() => setOpen((v) => !v)}>
        <span className="qIcon">{open ? '−' : '+'}</span>
        <span className="qText">{q}</span>
        <span className="qArrow">{open ? '▲' : '▼'}</span>
      </button>
      {open ? <div className="faqA">{a}</div> : null}

      <style jsx>{`
        .faq{
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }
        .faqQ{
          width: 100%;
          text-align: right;
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: 14px 14px;
          display:flex;
          align-items:center;
          gap: 10px;
          font-weight: 950;
          color:#0f172a;
        }
        .qIcon{
          width: 28px;height: 28px;
          border-radius: 10px;
          display:flex;align-items:center;justify-content:center;
          background: rgba(59,130,246,.12);
          border: 1px solid rgba(59,130,246,.18);
          flex-shrink: 0;
          font-size: 18px;
        }
        .qText{ flex: 1; min-width: 0; }
        .qArrow{ color:#94a3b8; font-size: 12px; }
        .faqA{
          padding: 0 14px 14px;
          color:#334155;
          font-weight: 800;
          line-height: 1.9;
          border-top: 1px solid rgba(0,0,0,.06);
        }
      `}</style>
    </div>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState('');

  const faqs = useMemo(
    () => [
      {
        q: 'كيف أضيف إعلان جديد؟',
        a: (
          <>
            ادخل صفحة <Link className="a" href="/add">إضافة إعلان</Link>، عبّئ البيانات (العنوان، السعر، القسم، المدينة،
            الصور) ثم اضغط نشر.
          </>
        ),
      },
      {
        q: 'لماذا لا يظهر إعلاني في القائمة؟',
        a: (
          <>
            أحياناً يكون الإعلان غير نشط أو تم إخفاؤه بسبب مخالفة/نقص بيانات. تأكد من:
            <ul className="ul">
              <li>أن الحقل <b>isActive</b> = true (في الإعلانات).</li>
              <li>اكتمال البيانات (سعر/قسم/مدينة/صور).</li>
              <li>أن الإعلان ليس <b>hidden</b>.</li>
            </ul>
            إذا استمرت المشكلة تواصل معنا وسنراجع الحالة.
          </>
        ),
      },
      {
        q: 'كيف أستخدم المحادثات داخل الموقع؟',
        a: (
          <>
            افتح إعلان ثم اضغط <b>بدء محادثة</b>. ستنتقل إلى صفحة المحادثة. ستجد جميع محادثاتك في
            <Link className="a" href="/my-chats"> محادثاتي</Link>.
          </>
        ),
      },
      {
        q: 'كيف أفعّل الواتساب والاتصال في الإعلان؟',
        a: (
          <>
            عند إضافة إعلان ضع رقم جوالك، ثم فعّل خيار الواتساب إن أردت. سيظهر زر الاتصال وزر واتساب في صفحة الإعلان.
          </>
        ),
      },
      {
        q: 'كيف يعمل المزاد؟',
        a: (
          <>
            إذا كان الإعلان مزاداً، سيظهر صندوق المزاد داخل صفحة الإعلان. يمكنك المزايدة وفق الشروط الظاهرة
            (أعلى سعر/وقت/إغلاق). في حال وجود مشكلة بالمزاد تواصل معنا.
          </>
        ),
      },
      {
        q: 'كيف تعمل العملات (ريال/دولار/يمني)؟',
        a: (
          <>
            السعر الأساسي قد يُعرض باليمني ويتم التحويل لعملات أخرى حسب أسعار الصرف في الإعدادات.
            إذا لاحظت فرق كبير، غالباً سعر الصرف يحتاج تحديث من الإدارة.
          </>
        ),
      },
      {
        q: 'كيف أحذف حسابي أو بياناتي؟',
        a: (
          <>
            تواصل معنا عبر البريد وسنساعدك بتنفيذ طلبك حسب سياسة الخصوصية:
            <a className="a" href="mailto:privacy@sooqyemen.com">privacy@sooqyemen.com</a>.
          </>
        ),
      },
      {
        q: 'كيف أقدّم بلاغ عن محتوى مخالف؟',
        a: (
          <>
            حالياً يمكنك مراسلتنا عبر البريد أو الدعم مع رابط الإعلان وسبب البلاغ. وسيتم لاحقاً إضافة زر بلاغ داخل التطبيق.
          </>
        ),
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((x) => {
      const qq = String(x.q || '').toLowerCase();
      // النص في "a" JSX، بنكتفي بالسؤال
      return qq.includes(q);
    });
  }, [faqs, query]);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 18 }}>
        {/* Header */}
        <div className="head">
          <h1 style={{ margin: 0 }}>مركز المساعدة</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            هنا تلاقي إجابات سريعة لأكثر الأسئلة شيوعاً.
          </p>

          <div className="searchRow">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الأسئلة… (مثال: مزاد / محادثات / إعلان)"
            />
            <Link className="btn btnPrimary" href="/add">➕ إضافة إعلان</Link>
          </div>

          <div className="quick">
            <Link className="q" href="/my-listings">📋 إعلاناتي</Link>
            <Link className="q" href="/my-chats">💬 محادثاتي</Link>
            <Link className="q" href="/profile">👤 الملف الشخصي</Link>
            <Link className="q" href="/privacy">🔒 الخصوصية</Link>
            <Link className="q" href="/terms">📜 الشروط</Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="faqWrap">
          <div className="secTitle">
            <h2 className="h2">الأسئلة الشائعة</h2>
            <p className="muted" style={{ margin: 0 }}>
              اضغط على السؤال لعرض الإجابة.
            </p>
          </div>

          <div className="faqGrid">
            {filtered.map((item, idx) => (
              <FaqItem key={idx} q={item.q} a={item.a} />
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              لا توجد نتائج مطابقة. جرّب كلمة أخرى مثل: <b>محادثات</b> أو <b>مزاد</b>.
            </div>
          ) : null}
        </div>

        {/* Contact */}
        <div className="contactBox">
          <div className="contactTop">
            <div>
              <div className="contactTitle">📞 تحتاج مساعدة مباشرة؟</div>
              <div className="muted" style={{ marginTop: 6 }}>
                ارسل لنا رابط الإعلان أو وصف المشكلة وسنرد عليك.
              </div>
            </div>
            <div className="contactBtns">
              <a className="btn btnPrimary" href="mailto:support@sooqyemen.com">✉️ دعم فني</a>
              <a className="btn" href="mailto:info@sooqyemen.com">ℹ️ استفسار عام</a>
            </div>
          </div>

          <div className="contactGrid">
            <div className="contactItem">
              <div className="k">الدعم الفني</div>
              <a className="a" href="mailto:support@sooqyemen.com">support@sooqyemen.com</a>
              <div className="muted">للأعطال، مشاكل الدخول، ظهور الإعلانات، المحادثات…</div>
            </div>

            <div className="contactItem">
              <div className="k">الخصوصية</div>
              <a className="a" href="mailto:privacy@sooqyemen.com">privacy@sooqyemen.com</a>
              <div className="muted">لطلب حذف بياناتك أو استفسارات الخصوصية.</div>
            </div>

            <div className="contactItem">
              <div className="k">أوقات العمل</div>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>الأحد - الخميس</div>
              <div className="muted">9 صباحاً - 5 مساءً</div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .head{
            padding: 8px 2px 14px;
            border-bottom: 1px solid rgba(0,0,0,.08);
            margin-bottom: 14px;
          }
          .searchRow{
            margin-top: 12px;
            display:flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: stretch;
          }
          .searchRow .input{
            flex:1;
            min-width: 220px;
          }
          .quick{
            margin-top: 10px;
            display:flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .q{
            text-decoration:none;
            font-weight: 900;
            color: #0f172a;
            background:#f8fafc;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 999px;
            padding: 8px 12px;
          }
          .q:hover{ background:#eef2ff; }

          .faqWrap{ margin-top: 14px; }
          .secTitle{
            display:flex;
            align-items:flex-end;
            justify-content:space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 10px;
          }
          .h2{
            margin:0;
            font-size: 1.15rem;
            font-weight: 950;
            color:#0f172a;
          }
          .faqGrid{
            display:grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .empty{
            margin-top: 12px;
            padding: 12px;
            border-radius: 14px;
            border: 1px dashed rgba(0,0,0,.18);
            background:#f8fafc;
            color:#475569;
            font-weight: 900;
          }

          .contactBox{
            margin-top: 18px;
            padding-top: 14px;
            border-top: 1px solid rgba(0,0,0,.08);
          }
          .contactTop{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 12px;
          }
          .contactTitle{
            font-weight: 950;
            color:#0f172a;
            font-size: 1.05rem;
          }
          .contactBtns{
            display:flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .contactGrid{
            display:grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .contactItem{
            background:#fff;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 16px;
            padding: 14px;
          }
          .k{
            font-weight: 950;
            color:#0f172a;
            margin-bottom: 6px;
          }
          .a{ color:#2563eb; font-weight: 950; text-decoration:none; }
          .a:hover{ text-decoration: underline; }

          .ul{ margin: 8px 0 0; padding-right: 18px; color:#334155; font-weight: 850; line-height: 2; }
          .ul li{ margin: 2px 0; }

          @media (max-width: 980px){
            .faqGrid{ grid-template-columns: 1fr; }
            .contactGrid{ grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </div>
  );
}
