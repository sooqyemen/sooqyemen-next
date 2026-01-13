// app/about/page.jsx
'use client';

import Link from 'next/link';

const CATEGORIES = [
  { key: 'cars', label: 'السيارات', icon: '🚗', href: '/cars' },
  { key: 'realestate', label: 'العقارات', icon: '🏡', href: '/realestate' },
  { key: 'phones', label: 'الجوالات', icon: '📱', href: '/phones' },
  { key: 'electronics', label: 'الإلكترونيات', icon: '💻', href: '/electronics' },
  { key: 'motorcycles', label: 'الدراجات', icon: '🏍️', href: '/motorcycles' },
  { key: 'heavy_equipment', label: 'المعدات الثقيلة', icon: '🚜', href: '/heavy_equipment' },
  { key: 'solar', label: 'الطاقة الشمسية', icon: '☀️', href: '/solar' },
  { key: 'networks', label: 'الشبكات', icon: '📡', href: '/networks' },
  { key: 'maintenance', label: 'الصيانة', icon: '🛠️', href: '/maintenance' },
  { key: 'furniture', label: 'الأثاث', icon: '🛋️', href: '/furniture' },
  { key: 'clothes', label: 'الملابس', icon: '👕', href: '/clothes' },
  { key: 'animals', label: 'الحيوانات', icon: '🐑', href: '/animals' },
  { key: 'jobs', label: 'الوظائف', icon: '💼', href: '/jobs' },
  { key: 'services', label: 'الخدمات', icon: '🧰', href: '/services' },
  { key: 'other', label: 'أخرى', icon: '📦', href: '/other' },
];

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature">
      <div className="fIcon">{icon}</div>
      <div className="fTitle">{title}</div>
      <div className="fDesc">{desc}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 18 }}>
        {/* Header */}
        <div className="head">
          <h1 style={{ margin: 0 }}>عن منصة سوق اليمن</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            منصتك الأولى للبيع والشراء في اليمن — بيع، شراء، مزادات، ومحادثات مباشرة.
          </p>
        </div>

        {/* Sections */}
        <div className="grid2">
          <section className="sec">
            <h2 className="h2">🎯 رؤيتنا</h2>
            <p className="p">
              نسعى لأن نكون المنصة الرائدة في تسهيل عمليات البيع والشراء في اليمن، عبر بيئة آمنة وموثوقة
              تربط البائعين بالمشترين في كل المحافظات.
            </p>
          </section>

          <section className="sec">
            <h2 className="h2">🚀 مهمتنا</h2>
            <p className="p">
              تمكين الأفراد والشركات من عرض منتجاتهم وخدماتهم بسهولة، وتوفير وسيلة فعّالة للتواصل المباشر،
              مع الالتزام بمعايير الجودة والأمان.
            </p>
          </section>
        </div>

        {/* Features */}
        <section className="sec" style={{ marginTop: 18 }}>
          <h2 className="h2">⭐ مميزات المنصة</h2>
          <div className="features">
            <FeatureCard icon="🛡️" title="آمنة وموثوقة" desc="نراجع البلاغات ونراقب المحتوى لتقليل الاحتيال." />
            <FeatureCard icon="⚡" title="سريعة وبسيطة" desc="واجهة واضحة وتجربة استخدام سهلة للجميع." />
            <FeatureCard icon="💬" title="محادثات داخلية" desc="تواصل خاص داخل الموقع بدون نشر رقمك." />
            <FeatureCard icon="📱" title="متوافقة مع الجوال" desc="تعمل بسلاسة على جميع الأجهزة." />
          </div>
        </section>

        {/* Categories */}
        <section className="sec" style={{ marginTop: 18 }}>
          <div className="rowTitle">
            <h2 className="h2" style={{ margin: 0 }}>🧭 أقسام سوق اليمن</h2>
            <Link className="btn" href="/listings">عرض كل الإعلانات</Link>
          </div>

          <div className="cats">
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={c.href} className="cat">
                <div className="catIcon">{c.icon}</div>
                <div className="catLabel">{c.label}</div>
                <div className="catArrow">←</div>
              </Link>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            * إذا عندك أسماء/روابط أقسام مختلفة في مشروعك، فقط غيّر قيم <b>href</b> بالأعلى.
          </div>
        </section>

        {/* Contact */}
        <section className="sec" style={{ marginTop: 18 }}>
          <h2 className="h2">📞 تواصل معنا</h2>
          <div className="contact">
            <div className="line">
              <span className="k">البريد الإلكتروني:</span>
              <a className="a" href="mailto:info@sooqyemen.com">info@sooqyemen.com</a>
            </div>
            <div className="line">
              <span className="k">للشكاوى والمقترحات:</span>
              <a className="a" href="mailto:support@sooqyemen.com">support@sooqyemen.com</a>
            </div>
            <div className="line">
              <span className="k">ساعات العمل:</span>
              <span>الأحد - الخميس، 9 صباحاً - 5 مساءً</span>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="sec" style={{ marginTop: 18 }}>
          <h2 className="h2">🤝 فريق العمل</h2>
          <p className="p">
            نعمل باستمرار على تطوير وتحسين المنصة. فريقنا يجمع بين البرمجة والتصميم والتسويق الرقمي لخدمة المجتمع اليمني.
          </p>
        </section>

        {/* Footer actions */}
        <div className="row" style={{ marginTop: 18 }}>
          <Link className="btn btnPrimary" href="/add">➕ إضافة إعلان</Link>
          <Link className="btn" href="/help">❓ مركز المساعدة</Link>
          <Link className="btn" href="/privacy">🔒 سياسة الخصوصية</Link>
        </div>
      </div>

      <style jsx>{`
        .head{
          padding: 8px 2px 14px;
          border-bottom: 1px solid rgba(0,0,0,.08);
          margin-bottom: 14px;
        }
        .grid2{
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .sec{
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 16px;
          padding: 14px;
        }
        .h2{
          margin: 0 0 10px;
          font-size: 1.05rem;
          font-weight: 900;
          color: #0f172a;
        }
        .p{
          margin: 0;
          color: #334155;
          line-height: 1.9;
          font-weight: 700;
        }

        .features{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 10px;
        }
        .feature{
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 16px;
          padding: 14px;
          background: #f8fafc;
          text-align: center;
        }
        .fIcon{ font-size: 28px; margin-bottom: 8px; }
        .fTitle{ font-weight: 950; color:#0f172a; margin-bottom: 6px; }
        .fDesc{ color:#64748b; font-weight: 800; font-size: 13px; line-height: 1.6; }

        .rowTitle{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cats{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .cat{
          text-decoration:none;
          color: inherit;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 14px;
          padding: 12px 12px;
          background: #fff;
          display:flex;
          align-items:center;
          gap: 10px;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .cat:hover{
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(0,0,0,.06);
        }
        .catIcon{
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: rgba(59,130,246,.12);
          border: 1px solid rgba(59,130,246,.18);
          font-size: 20px;
          flex-shrink: 0;
        }
        .catLabel{ font-weight: 950; color:#0f172a; }
        .catArrow{ margin-right:auto; color:#94a3b8; font-weight: 950; }

        .contact{
          display:flex;
          flex-direction:column;
          gap: 10px;
          color:#334155;
          font-weight: 800;
        }
        .line{ display:flex; gap:10px; flex-wrap: wrap; align-items:center; }
        .k{ color:#0f172a; font-weight: 950; }
        .a{ color:#2563eb; font-weight: 950; text-decoration:none; }
        .a:hover{ text-decoration: underline; }

        @media (max-width: 980px){
          .features{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cats{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .grid2{ grid-template-columns: 1fr; }
        }
        @media (max-width: 560px){
          .features{ grid-template-columns: 1fr; }
          .cats{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
