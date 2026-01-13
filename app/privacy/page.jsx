// app/privacy/page.jsx
'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  const lastUpdated = '13 يناير 2026';

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 18 }}>
        {/* Header */}
        <div className="head">
          <h1 style={{ margin: 0 }}>سياسة الخصوصية</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            آخر تحديث: <b>{lastUpdated}</b>
          </p>
        </div>

        {/* Content */}
        <div className="content">
          <section className="sec">
            <h2 className="h2">مقدمة</h2>
            <p className="p">
              في منصة &quot;سوق اليمن&quot;، نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
              توضح سياسة الخصوصية هذه كيف نجمع ونستخدم ونحمي معلوماتك عند استخدامك لموقعنا.
            </p>
          </section>

          <section className="sec">
            <h2 className="h2">المعلومات التي نجمعها</h2>

            <h3 className="h3">1) المعلومات التي تقدمها لنا:</h3>
            <ul className="ul">
              <li>الاسم والبريد الإلكتروني عند التسجيل</li>
              <li>رقم الهاتف للتواصل</li>
              <li>معلومات الإعلانات التي تضيفها</li>
              <li>الرسائل التي ترسلها لمستخدمين آخرين</li>
            </ul>

            <h3 className="h3" style={{ marginTop: 10 }}>2) المعلومات التي نجمعها تلقائياً:</h3>
            <ul className="ul">
              <li>عنوان IP ونوع المتصفح</li>
              <li>صفحات الموقع التي تزورها</li>
              <li>توقيت زيارتك ومدة بقائك</li>
              <li>الإعلانات التي تشاهدها أو تنقر عليها</li>
            </ul>
          </section>

          <section className="sec">
            <h2 className="h2">كيف نستخدم معلوماتك</h2>
            <ul className="ul">
              <li>توفير وتحسين خدمات المنصة</li>
              <li>الرد على استفساراتك وطلباتك</li>
              <li>إرسال إشعارات مهمة حول إعلاناتك</li>
              <li>منع الاحتيال وإساءة الاستخدام</li>
              <li>تحليل استخدام الموقع لتحسين تجربتك</li>
              <li>تخصيص المحتوى والإعلانات المناسبة</li>
            </ul>
          </section>

          <section className="sec">
            <h2 className="h2">مشاركة المعلومات</h2>
            <p className="p">
              <b>نحن لا نبيع بياناتك الشخصية لأي طرف ثالث.</b>
              قد نشارك معلوماتك فقط في الحالات التالية:
            </p>
            <ul className="ul">
              <li>عند الحاجة للامتثال للقوانين والأنظمة</li>
              <li>لحماية حقوق وممتلكات المنصة</li>
              <li>مع مزودي خدمات موثوقين يساعدوننا في تشغيل المنصة</li>
              <li>عندما تختار مشاركة معلوماتك في إعلانك المنشور</li>
            </ul>
          </section>

          <section className="sec">
            <h2 className="h2">حماية معلوماتك</h2>
            <p className="p">
              نستخدم إجراءات أمنية تقنية وإدارية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو التعديل أو
              الكشف أو الإتلاف. تشمل هذه الإجراءات:
            </p>
            <ul className="ul">
              <li>تشفير البيانات الحساسة</li>
              <li>جدران الحماية وأنظمة الكشف عن التسلل</li>
              <li>مراجعة منتظمة لممارسات جمع وتخزين ومعالجة البيانات</li>
              <li>تقليل الوصول إلى المعلومات الشخصية للموظفين والمتعاقدين</li>
            </ul>
          </section>

          <section className="sec">
            <h2 className="h2">الكوكيز (Cookies)</h2>
            <p className="p">
              نستخدم ملفات تعريف الارتباط لتذكر تفضيلاتك وتحسين تجربتك على الموقع.
              يمكنك إدارة أو تعطيل الكوكيز من خلال إعدادات المتصفح، لكن قد يؤثر ذلك على بعض وظائف الموقع.
            </p>
          </section>

          <section className="sec">
            <h2 className="h2">حقوقك</h2>
            <p className="p">لديك الحق في:</p>
            <ul className="ul">
              <li>الوصول إلى بياناتك الشخصية التي نحتفظ بها</li>
              <li>تصحيح أي معلومات غير دقيقة</li>
              <li>طلب حذف بياناتك الشخصية</li>
              <li>الاعتراض على معالجة بياناتك</li>
              <li>طلب نقل بياناتك إلى طرف ثالث</li>
            </ul>
            <p className="p" style={{ marginTop: 10 }}>
              لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني:{' '}
              <a className="a" href="mailto:privacy@sooqyemen.com">privacy@sooqyemen.com</a>
            </p>
          </section>

          <section className="sec">
            <h2 className="h2">تغييرات على سياسة الخصوصية</h2>
            <p className="p">
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإشعارك بأي تغييرات جوهرية عن طريق نشر
              الإشعار على الموقع أو إرسال إشعار لك مباشرة. ننصحك بمراجعة هذه الصفحة بشكل دوري للاطلاع على أي تحديثات.
            </p>
          </section>

          <section className="sec">
            <h2 className="h2">اتصل بنا</h2>
            <p className="p">
              إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يرجى التواصل معنا على:
            </p>

            <div className="contact">
              <div className="line">
                <span className="k">البريد الإلكتروني:</span>
                <a className="a" href="mailto:privacy@sooqyemen.com">privacy@sooqyemen.com</a>
              </div>
              <div className="line">
                <span className="k">العنوان:</span>
                <span>صنعاء، اليمن</span>
              </div>
              <div className="line">
                <span className="k">ساعات العمل:</span>
                <span>الأحد - الخميس، 9 ص - 5 م</span>
              </div>
            </div>
          </section>

          {/* Quick links */}
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn btnPrimary" href="/help">❓ مركز المساعدة</Link>
            <Link className="btn" href="/terms">📜 الشروط والأحكام</Link>
            <Link className="btn" href="/">🏠 الرئيسية</Link>
          </div>

          <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            * إذا غيرت إيميلات التواصل لاحقاً، حدّثها هنا (privacy@ / info@ / support@).
          </div>
        </div>

        <style jsx>{`
          .head{
            padding: 8px 2px 14px;
            border-bottom: 1px solid rgba(0,0,0,.08);
            margin-bottom: 14px;
          }
          .content{ display:flex; flex-direction:column; gap: 12px; }

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
          .h3{
            margin: 0 0 8px;
            font-size: .95rem;
            font-weight: 950;
            color: #0f172a;
          }
          .p{
            margin: 0;
            color: #334155;
            line-height: 1.9;
            font-weight: 700;
          }
          .ul{
            margin: 8px 0 0;
            padding-right: 18px;
            color: #334155;
            font-weight: 800;
            line-height: 2;
          }
          .ul li{ margin: 2px 0; }

          .contact{
            margin-top: 10px;
            display:flex;
            flex-direction:column;
            gap: 10px;
            color:#334155;
            font-weight: 800;
            border: 1px solid rgba(0,0,0,.06);
            border-radius: 14px;
            padding: 12px;
            background: #f8fafc;
          }
          .line{ display:flex; gap:10px; flex-wrap: wrap; align-items:center; }
          .k{ color:#0f172a; font-weight: 950; }

          .a{ color:#2563eb; font-weight: 950; text-decoration:none; }
          .a:hover{ text-decoration: underline; }

          @media (max-width: 560px){
            .sec{ padding: 12px; }
          }
        `}</style>
      </div>
    </div>
  );
}
