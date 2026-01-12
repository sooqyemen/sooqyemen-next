'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db, firebase } from '@/lib/firebaseClient';

export default function SeedPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  // البيانات الوهمية الواقعية
  const CITIES = [
    'صنعاء', 'عدن', 'تعز', 'إب', 'الحديدة', 'حضرموت', 'ذمار', 'مأرب', 'عمران', 'البيضاء'
  ];

  const CATEGORIES = [
    'cars', 'realestate', 'phones', 'electronics', 'motorcycles', 
    'heavy-equipment', 'solar', 'internet-networks', 'maintenance', 
    'furniture', 'home-appliances', 'clothes', 'animals-birds', 
    'jobs', 'services', 'other'
  ];

  // دالة لتوليد عناوين واقعية حسب القسم
  const getRealisticTitle = (category) => {
    const titles = {
      cars: ['تويوتا كورولا 2022 نظيف', 'هايلوكس غمارتين للبيع', 'باص تويوتا دباب', 'هيونداي سنتافي 2020', 'كيا سبورتاج مستخدم نظيف', 'برادو 2018 فل كامل'],
      realestate: ['أرض للبيع في موقع مميز', 'شقة تمليك تشطيب لوكس', 'عمارة استثمارية للبيع', 'فلة راقية في حدة', 'محل تجاري للإيجار', 'أرضية تجارية على شارع عام'],
      phones: ['ايفون 14 برو ماكس', 'سامسونج S23 الترا', 'ريدمي نوت 12', 'ايفون 11 نظيف', 'جوال هواوي مستخدم', 'ايفون 13 جديد بكرتونة'],
      electronics: ['لاب توب ديل كور i7', 'شاشة سامسونج سمارت', 'بلايستيشن 5 جديد', 'كاميرا كانون احترافية', 'طابعة ليزر ملونة', 'ماك بوك برو M1'],
      solar: ['منظومة طاقة شمسية متكاملة', 'ألواح شمسية 500 وات', 'بطارية جل 200 أمبير', 'انفرتر هايبرد 5 كيلو', 'غطاس طاقة شمسية', 'منظم شحن MPPT'],
      furniture: ['طقم كنب مجلس عربي', 'غرفة نوم ملكي', 'دولاب ملابس كبير', 'طاولة طعام 6 كراسي', 'مكتب فخم للبيع', 'سجاد تركي نظيف'],
      // عناوين عامة للأقسام الأخرى
      default: ['عرض مميز لقطة', 'فرصة لا تعوض للبيع', 'بضاعة نظيفة وسعر مغري', 'للبيع بسعر عرطة', 'مطلوب للشراء', 'خدمة مميزة وسريعة']
    };
    
    const list = titles[category] || titles.default;
    return list[Math.floor(Math.random() * list.length)];
  };

  const generateListings = async () => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!confirm('هل أنت متأكد من إضافة 200 إعلان؟')) return;

    setLoading(true);
    setProgress(0);
    setLogs([]);
    const logsTemp = [];

    try {
      const TOTAL_LISTINGS = 200; // ✅ تم التحديث إلى 200 إعلان

      for (let i = 0; i < TOTAL_LISTINGS; i++) {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        const title = getRealisticTitle(category);
        
        // سعر عشوائي بين 50 ألف و 50 مليون
        const price = Math.floor(Math.random() * (50000000 - 50000 + 1)) + 50000;

        const listingData = {
          title: title,
          description: `هذا إعلان تجريبي وتوضيحي لنظام سوق اليمن.\n\nتفاصيل إضافية:\n- الحالة: مستخدم نظيف\n- الموقع: ${city}\n- السعر قابل للتفاوض بالمعقول.\n\nللتواصل يرجى استخدام زر الاتصال أو الواتساب.`,
          priceYER: price,
          currency: 'YER',
          category: category,
          city: city,
          locationLabel: city,
          // صور وهمية (Placeholders) ملونة لتبدو حقيقية
          images: [
            `https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(category + ' 1')}`,
            `https://placehold.co/600x400/16a34a/ffffff?text=${encodeURIComponent('سوق اليمن')}`
          ],
          userId: user.uid,        // يتم ربط الإعلان بحسابك الحالي (الأدمن)
          userEmail: user.email,
          phone: '770000000',      // رقم وهمي
          isWhatsapp: true,
          isActive: true,
          hidden: false,
          views: Math.floor(Math.random() * 500), // مشاهدات وهمية لتبدو نشطة
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // إضافة الإعلان لقاعدة البيانات
        await db.collection('listings').add(listingData);

        // تحديث العداد
        setProgress(((i + 1) / TOTAL_LISTINGS) * 100);
        
        // إضافة سجل بسيط كل 10 إعلانات
        if ((i + 1) % 10 === 0) {
          logsTemp.push(`✅ تم إضافة ${i + 1} إعلان`);
          setLogs([...logsTemp]);
        }
      }

      setLogs(prev => [...prev, '🎉 تمت العملية بنجاح!']);
      alert('تم إضافة 200 إعلان بنجاح!');

    } catch (error) {
      console.error(error);
      setLogs(prev => [...prev, `❌ خطأ: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <h1>🔒 منطقة محظورة</h1>
        <p>يجب تسجيل الدخول بحساب الأدمن للوصول لهذه الصفحة.</p>
        <a href="/login" className="btn btn-primary">تسجيل الدخول</a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>🌱 مولد البيانات (Seeder)</h1>
        
        <p style={{ color: '#666', marginBottom: '20px' }}>
          هذه الأداة ستقوم بإنشاء <strong>200 إعلان</strong> موزعة عشوائياً على جميع الأقسام والمدن.
          <br />
          <small>⚠️ الإعلانات ستكون مرتبطة بحسابك الحالي.</small>
        </p>

        <div style={{ marginBottom: '20px' }}>
          <strong>الحساب الحالي:</strong> {user.email}
        </div>

        {loading && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: '#10b981', 
                  width: `${progress}%`,
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '14px' }}>
              جاري المعالجة... {Math.round(progress)}%
            </div>
          </div>
        )}

        <button 
          onClick={generateListings} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'جاري التوليد...' : '🚀 توليد 200 إعلان الآن'}
        </button>

        <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto', background: '#f9fafb', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
