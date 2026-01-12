'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db, firebase } from '@/lib/firebaseClient';

export default function SeedPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // 1. تعريف المدن اليمنية
  const CITIES = [
    'صنعاء', 'عدن', 'تعز', 'إب', 'الحديدة', 'حضرموت', 'ذمار', 'مأرب', 'عمران', 'البيضاء'
  ];

  // 2. تعريف الأقسام الـ 16
  const CATEGORIES = [
    'cars', 'realestate', 'phones', 'electronics', 'motorcycles', 
    'heavy_equipment', 'solar', 'internet-networks', 'maintenance', 
    'furniture', 'home-appliances', 'clothes', 'animals-birds', 
    'jobs', 'services', 'other'
  ];

  // 3. بيانات واقعية لكل قسم
  const CATEGORY_DATA = {
    cars: {
      titles: ['تويوتا كورولا 2022 نظيف', 'هايلوكس غمارتين للبيع', 'باص تويوتا دباب', 'هيونداي سنتافي 2020', 'كيا سبورتاج مستخدم نظيف', 'برادو 2018 فل كامل'],
      descriptions: ['سيارة بحالة ممتازة، صيانة دورية، فحص كامل، لا حوادث', 'محرك نظيف، تكييف ثلج، داخلية جلد، شاشة ونافجيشن', 'اقتصادية في استهلاك الوقود، بدون مشاكل، جاهزة للاستخدام'],
      priceRange: [3000000, 25000000]
    },
    realestate: {
      titles: ['أرض للبيع في موقع مميز', 'شقة تمليك تشطيب لوكس', 'عمارة استثمارية للبيع', 'فلة راقية في حدة', 'محل تجاري للإيجار', 'أرضية تجارية على شارع عام'],
      descriptions: ['موقع استراتيجي، قريب من الخدمات، مساحة مناسبة', 'شقة واسعة، تشطيب فاخر، مطبخ جاهز، حمامين', 'بناء حديث، تشطيب ديلوكس، موقع هادئ'],
      priceRange: [5000000, 100000000]
    },
    phones: {
      titles: ['ايفون 14 برو ماكس', 'سامسونج S23 الترا', 'ريدمي نوت 12', 'ايفون 11 نظيف', 'جوال هواوي مستخدم', 'ايفون 13 جديد بكرتونة'],
      descriptions: ['جهاز نظيف، بدون خدوش، بطارية ممتازة، مع العلبة والشاحن', 'مستخدم استخدام خفيف، كامل الملحقات، ضمان ساري'],
      priceRange: [200000, 4000000]
    },
    electronics: {
      titles: ['لاب توب ديل كور i7', 'شاشة سامسونج سمارت', 'بلايستيشن 5 جديد', 'كاميرا كانون احترافية', 'طابعة ليزر ملونة', 'ماك بوك برو M1'],
      descriptions: ['جهاز بحالة ممتازة، مواصفات عالية، مناسب للعمل والألعاب', 'شاشة 4K، سمارت، جودة صورة رائعة'],
      priceRange: [300000, 5000000]
    },
    solar: {
      titles: ['منظومة طاقة شمسية متكاملة', 'ألواح شمسية 500 وات', 'بطارية جل 200 أمبير', 'انفرتر هايبرد 5 كيلو', 'غطاس طاقة شمسية', 'منظم شحن MPPT'],
      descriptions: ['نظام كامل، جودة عالية، تركيب مجاني', 'ألواح أصلية، كفاءة عالية، ضمان طويل'],
      priceRange: [1000000, 10000000]
    },
    furniture: {
        titles: ['طقم كنب مجلس عربي', 'غرفة نوم ملكي', 'دولاب ملابس كبير', 'طاولة طعام 6 كراسي', 'مكتب فخم للبيع'],
        descriptions: ['أثاث بحالة ممتازة، خشب أصلي، تصميم عصري', 'استخدام خفيف، نظيف جدا، بدون عيوب'],
        priceRange: [300000, 5000000]
    },
    // البيانات الافتراضية لباقي الأقسام
    default: {
      titles: ['عرض مميز لقطة', 'فرصة لا تعوض للبيع', 'بضاعة نظيفة وسعر مغري', 'للبيع بسعر عرطة', 'مطلوب للشراء', 'خدمة مميزة وسريعة'],
      descriptions: ['منتج بحالة ممتازة، سعر مناسب، للجادين فقط', 'عرض مميز، جودة عالية، سعر تنافسي'],
      priceRange: [50000, 3000000]
    }
  };

  // دالة مساعدة لاختيار عنصر عشوائي
  const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

  // دالة توليد إعلان واحد
  const generateListing = (category) => {
    const data = CATEGORY_DATA[category] || CATEGORY_DATA.default;
    const title = getRandomItem(data.titles);
    const description = getRandomItem(data.descriptions);
    const city = getRandomItem(CITIES);
    
    const [minP, maxP] = data.priceRange || CATEGORY_DATA.default.priceRange;
    const priceYER = Math.floor(Math.random() * (maxP - minP + 1)) + minP;

    // صور ملونة وهمية
    const images = [
        `https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(category)}`,
        `https://placehold.co/600x400/16a34a/ffffff?text=Sooq+Yemen`
    ];

    return {
      title,
      description,
      priceYER,
      currency: 'YER',
      originalPrice: priceYER,
      originalCurrency: 'YER',
      currencyBase: 'YER',
      category,
      city,
      locationLabel: city,
      images,
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || 'Admin',
      phone: '770000000',
      isWhatsapp: true,
      isActive: true,
      hidden: false,
      views: Math.floor(Math.random() * 500),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
  };

  const generateListings = async () => {
    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!confirm('هل أنت متأكد من إضافة 200 إعلان؟')) return;

    setLoading(true);
    setProgress(0);
    setStatus('جاري البدء...');
    setError('');
    const logsTemp = [];

    try {
      const TOTAL_LISTINGS = 200; // العدد المطلوب
      const BATCH_SIZE = 10; // عدد الإعلانات في كل دفعة (لتجنب الضغط)
      let totalAdded = 0;
      
      // حلقة الدفعات
      for (let batchStart = 0; batchStart < TOTAL_LISTINGS; batchStart += BATCH_SIZE) {
        const batch = db.batch();
        const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_LISTINGS);
        
        // تجهيز الدفعة الحالية
        for (let i = batchStart; i < batchEnd; i++) {
          const category = getRandomItem(CATEGORIES);
          const listingData = generateListing(category);
          const docRef = db.collection('listings').doc(); // إنشاء ID تلقائي
          batch.set(docRef, listingData);
        }
        
        // تنفيذ الدفعة
        await batch.commit();
        
        // تحديث الواجهة
        totalAdded = batchEnd;
        const newProgress = Math.round((totalAdded / TOTAL_LISTINGS) * 100);
        setProgress(newProgress);
        setStatus(`تم إضافة ${totalAdded} من ${TOTAL_LISTINGS} إعلان...`);
        
        logsTemp.push(`✅ تم إضافة دفعة: ${totalAdded} إعلان`);
        setLogs([...logsTemp]);
      }

      setProgress(100);
      setStatus('✅ تم إضافة 200 إعلان بنجاح!');
      alert('تمت العملية بنجاح!');

    } catch (err) {
      console.error('Error seeding data:', err);
      setError(`حدث خطأ: ${err.message}`);
      setStatus('');
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
    <div className="container" style={{ maxWidth: '800px', padding: '40px 20px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', background: 'white' }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px', color: '#1e293b' }}>🌱 مولد البيانات (Seeder)</h1>
        
        <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
          هذه الأداة ستقوم بإضافة <strong>200 إعلان تجريبي</strong> إلى قاعدة البيانات لأغراض SEO واختبار الأداء.
          <br />
          <small>⚠️ الإعلانات ستكون مرتبطة بحسابك الحالي: {user.email}</small>
        </p>

        <button 
          onClick={generateListings} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: loading ? '#94a3b8' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
            transition: 'all 0.2s'
          }}
        >
          {loading ? '⏳ جاري التوليد...' : '🚀 توليد 200 إعلان الآن'}
        </button>

        {loading && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)', 
                  width: `${progress}%`,
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: 'bold', color: '#4f46e5' }}>
              {progress}%
            </div>
          </div>
        )}

        {status && (
          <div style={{ 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            background: status.includes('✅') ? '#dcfce7' : '#e0f2fe',
            color: status.includes('✅') ? '#166534' : '#0369a1',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}

        {error && (
          <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', background: '#fee2e2', color: '#991b1b', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
          {logs.length === 0 ? <p style={{color: '#94a3b8', textAlign: 'center'}}>سجل العمليات سيظهر هنا...</p> : logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
