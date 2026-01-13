import Link from 'next/link';
import './about.css';

export const metadata = {
  title: 'عن منصة سوق اليمن | سوق اليمن',
  description:
    'تعرف على منصة سوق اليمن: رؤيتنا، مهمتنا، مميزات المنصة، وكيف نسهّل البيع والشراء والمزادات في اليمن.',
};

export default function AboutPage() {
  return (
    <main className="container aboutWrap">
      {/* Hero */}
      <section className="card aboutHero">
        <div className="aboutHeroTop">
          <span className="badge">سوق اليمن</span>
          <h1 className="aboutTitle">عن منصة سوق اليمن</h1>
          <p className="muted aboutSubtitle">منصتك الأولى للبيع والشراء في اليمن</p>

          <div className="aboutActions">
            <Link href="/add" className="btn btnPrimary">+ أضف إعلان</Link>
            <Link href="/listings" className="btn">تصفح الإعلانات</Link>
          </div>
        </div>

        <div className="aboutStats">
          <div className="aboutStat">
            <div className="aboutStatNum">آمنة</div>
            <div className="muted">مراجعة الإعلانات</div>
          </div>
          <div className="aboutStat">
            <div className="aboutStatNum">سريعة</div>
            <div className="muted">تصفح وبحث بسهولة</div>
          </div>
          <div className="aboutStat">
            <div className="aboutStatNum">مجانية</div>
            <div className="muted">إضافة وتصفح</div>
          </div>
          <div className="aboutStat">
            <div className="aboutStatNum">موبايل</div>
            <div className="muted">متوافقة مع الجوال</div>
          </div>
        </div>
      </section>

      {/* Vision + Mission */}
      <section className="aboutGrid2">
        <div className="card aboutCard">
          <h2 className="aboutH2">🎯 رؤيتنا</h2>
          <p className="aboutP">
            نسعى لأن نكون المنصة الرائدة في تسهيل عمليات البيع والشراء في اليمن،
            من خلال توفير بيئة آمنة وموثوقة تربط بين البائعين والمشترين في جميع أنحاء الجمهورية.
          </p>
        </div>

        <div className="card aboutCard">
          <h2 className="aboutH2">🚀 مهمتنا</h2>
          <p className="aboutP">
            تمكين الأفراد والشركات من عرض منتجاتهم وخدماتهم بسهولة،
            وتوفير وسيلة فعالة للتواصل المباشر بين الطرفين،
            مع الحفاظ على أعلى معايير الجودة والأمان.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="card aboutSection">
        <div className="aboutSectionHead">
          <h2 className="aboutH2">⭐ مميزات المنصة</h2>
          <p className="muted">كل شيء مرتب وواضح… عشان توصل للعميل بسرعة.</p>
        </div>

        <div className="aboutFeatures">
          <div className="aboutFeature card">
            <div className="aboutIcon">🛡️</div>
            <h3 className="aboutH3">آمنة وموثوقة</h3>
            <p className="muted">نراقب الإعلانات للتأكد من جودتها وصحتها.</p>
          </div>

          <div className="aboutFeature card">
            <div className="aboutIcon">⚡</div>
            <h3 className="aboutH3">سريعة وسهلة</h3>
            <p className="muted">واجهة بسيطة ومباشرة تناسب الجميع.</p>
          </div>

          <div className="aboutFeature card">
            <div className="aboutIcon">🆓</div>
            <h3 className="aboutH3">مجانية تماماً</h3>
            <p className="muted">إضافة وتصفح الإعلانات مجاني بالكامل.</p>
          </div>

          <div className="aboutFeature card">
            <div className="aboutIcon">📱</div>
            <h3 className="aboutH3">متوافقة مع الجوال</h3>
            <p className="muted">تعمل بشكل ممتاز على جميع الأجهزة.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="aboutGrid2">
        <div className="card aboutCard">
          <h2 className="aboutH2">✅ كيف تستخدم المنصة؟</h2>
          <ol className="aboutSteps">
            <li><strong>أضف إعلانك:</strong> اكتب العنوان والتفاصيل وارفع الصور.</li>
            <li><strong>حدد السعر والموقع:</strong> واختر القسم المناسب.</li>
            <li><strong>تواصل مباشر:</strong> مع المهتمين عبر الاتصال أو الواتساب.</li>
          </ol>
        </div>

        <div className="card aboutCard">
          <h2 className="aboutH2">🤝 فريق العمل</h2>
          <p className="aboutP">
            نعمل بجد لتطوير وتحسين المنصة باستمرار. فريقنا مكون من مبرمجين ومصممين
            وخبراء في التسويق الإلكتروني، جميعنا نهدف لخدمة المجتمع اليمني.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="card aboutSection">
        <div className="aboutSectionHead">
          <h2 className="aboutH2">❓ الأسئلة الشائعة</h2>
          <p className="muted">إجابات سريعة لأكثر الأسئلة تكراراً.</p>
        </div>

        <div className="aboutFaq">
          <details className="aboutFaqItem">
            <summary>هل إضافة الإعلان مجانية؟</summary>
            <div className="aboutFaqBody">
              نعم، إضافة وتصفح الإعلانات مجاني. قد نضيف خدمات مدفوعة اختيارية لاحقاً (مثل تمييز الإعلان).
            </div>
          </details>

          <details className="aboutFaqItem">
            <summary>كيف أتواصل مع صاحب الإعلان؟</summary>
            <div className="aboutFaqBody">
              من داخل صفحة الإعلان ستجد بيانات التواصل (اتصال / واتساب) حسب ما يختاره المعلن.
            </div>
          </details>

          <details className="aboutFaqItem">
            <summary>كيف يعمل المزاد؟</summary>
            <div className="aboutFaqBody">
              بعض الإعلانات تكون بنظام مزاد. تستطيع إضافة مزايدة، وتظهر أعلى مزايدة للجميع حتى نهاية المزاد.
            </div>
          </details>

          <details className="aboutFaqItem">
            <summary>ماذا أفعل إذا وجدت إعلان مخالف؟</summary>
            <div className="aboutFaqBody">
              تواصل معنا عبر صفحة التواصل أو البريد المخصص للدعم، وسنتعامل معه فوراً.
            </div>
          </details>
        </div>

        <div className="aboutCta" style={{ marginTop: 12 }}>
          <Link href="/contact" className="btn btnPrimary">تواصل معنا</Link>
          <Link href="/add" className="btn">أضف إعلانك الآن</Link>
        </div>
      </section>

      {/* Contact (مختصر) */}
      <section className="card aboutSection">
        <div className="aboutSectionHead">
          <h2 className="aboutH2">📞 تواصل معنا</h2>
          <p className="muted">نسعد برسائلكم وشكاويكم ومقترحاتكم.</p>
        </div>

        <div className="aboutContact">
          <div className="aboutContactRow">
            <span className="aboutContactLabel">البريد الإلكتروني</span>
            <a className="aboutLink" href="mailto:info@sooqyemen.com">info@sooqyemen.com</a>
          </div>

          <div className="aboutContactRow">
            <span className="aboutContactLabel">للدعم</span>
            <a className="aboutLink" href="mailto:support@sooqyemen.com">support@sooqyemen.com</a>
          </div>

          <div className="aboutContactRow">
            <span className="aboutContactLabel">ساعات العمل</span>
            <span className="aboutContactValue">الأحد - الخميس، 9 صباحاً - 5 مساءً</span>
          </div>
        </div>
      </section>
    </main>
  );
}
