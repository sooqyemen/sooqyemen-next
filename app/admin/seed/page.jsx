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
    'heavy_equipment', 'solar', 'networks', 'maintenance', 
    'furniture', 'home_tools', 'clothes', 'animals', 
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
    networks: {
        titles: ['راوتر واي فاي عالي السرعة', 'كاميرات مراقبة 8 قنوات', 'نظام شبكات للشركات', 'سويتش جيجابت 24 منفذ'],
        descriptions: ['جهاز بحالة ممتازة، سرعة عالية، تغطية واسعة', 'نظام كامل، جودة صورة عالية، رؤية ليلية', 'حالة ممتازة، مناسب للاستخدام التجاري'],
        priceRange: [100000, 2000000]
    },
    maintenance: {
        titles: ['خدمات صيانة عامة للمنازل', 'صيانة كهرباء وسباكة', 'خدمات تكييف وتبريد', 'صيانة أجهزة كهربائية'],
        descriptions: ['فريق محترف، خدمة سريعة، أسعار مناسبة', 'خبرة طويلة، جودة عالية، ضمان على العمل'],
        priceRange: [50000, 500000]
    },
    furniture: {
        titles: ['طقم كنب مجلس عربي', 'غرفة نوم ملكي', 'دولاب ملابس كبير', 'طاولة طعام 6 كراسي', 'مكتب فخم للبيع', 'سجاد تركي نظيف'],
        descriptions: ['أثاث بحالة ممتازة، خشب أصلي، تصميم عصري', 'استخدام خفيف، نظيف جدا، بدون عيوب'],
        priceRange: [300000, 5000000]
    },
    home_tools: {
        titles: ['أدوات مطبخ كاملة للبيع', 'مكنسة كهربائية قوية', 'عدة نجارة احترافية', 'مجموعة أواني طبخ'],
        descriptions: ['أدوات بحالة ممتازة، نظيفة، استخدام خفيف', 'جودة عالية، عملية جدا، سهلة الاستخدام'],
        priceRange: [50000, 800000]
    },
    clothes: {
        titles: ['ملابس رجالية ماركات عالمية', 'فساتين نسائية فخمة', 'أحذية رياضية أصلية', 'ملابس أطفال جديدة'],
        descriptions: ['ملابس بحالة ممتازة، ماركات أصلية، قياسات متنوعة', 'استخدام خفيف، نظيفة جدا، موديلات حديثة'],
        priceRange: [30000, 500000]
    },
    animals: {
        titles: ['قطط شيرازي للبيع', 'عصافير زينة ملونة', 'أغنام حري أصيلة', 'دجاج بياض إنتاجي'],
        descriptions: ['حيوانات بصحة ممتازة، تطعيمات كاملة', 'أليفة، نظيفة، مع الأوراق الصحية'],
        priceRange: [50000, 2000000]
    },
    jobs: {
        titles: ['مطلوب موظف مبيعات', 'فرصة عمل سائق خاص', 'مطلوب محاسب خبرة', 'وظيفة مهندس برمجيات'],
        descriptions: ['نبحث عن موظف متميز، راتب مجزي، بيئة عمل ممتازة', 'شروط بسيطة، رواتب جيدة، تأمينات اجتماعية'],
        priceRange: [150000, 1000000]
    },
    services: {
        titles: ['خدمات تنظيف شاملة', 'نقل أثاث وعفش', 'تصميم جرافيك احترافي', 'خدمات ترجمة فورية'],
        descriptions: ['خدمة احترافية، أسعار تنافسية، سرعة في التنفيذ', 'فريق محترف، جودة عالية، ضمان على العمل'],
        priceRange: [50000, 800000]
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

    const PER_CATEGORY = 20; // ✅ عدد الإعلانات لكل قسم
    const TOTAL_ESTIMATED = CATEGORIES.length * PER_CATEGORY; // 16 * 20 = 320

    if (!confirm(`سيتم إضافة ${PER_CATEGORY} إعلان في كل قسم من الأقسام الـ ${CATEGORIES.length}.\nالإجمالي: ${TOTAL_ESTIMATED} إعلان.\nهل أنت متأكد؟`)) return;

    setLoading(true);
    setProgress(0);
    setStatus('جاري التجهيز...');
    setError('');
    const logsTemp = [];

    try {
      // 1. تجهيز كافة البيانات أولاً
      let allListingsData = [];
      
      CATEGORIES.forEach(category => {
        for(let i=0; i < PER_CATEGORY; i++) {
            allListingsData.push(generateListing(category));
        }
      });

      const TOTAL_LISTINGS = allListingsData.length;
      const BATCH_SIZE = 50;
      let totalAdded = 0;
      
      // 2. إرسال البيانات على دفعات
      for (let i = 0; i < TOTAL_LISTINGS; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = allListingsData.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(data => {
            const docRef = db.collection('listings').doc();
            batch.set(docRef, data);
        });
        
        await batch.commit();
        
        totalAdded += chunk.length;
        const newProgress = Math.round((totalAdded / TOTAL_LISTINGS) * 100);
        setProgress(newProgress);
        setStatus(`تم إضافة ${totalAdded} من ${TOTAL_LISTINGS} إعلان...`);
        
        // سجل مختصر لعدم ملء الشاشة
        if (totalAdded % 50 === 0 || totalAdded === TOTAL_LISTINGS) {
            logsTemp.push(`✅ تم الانتهاء من دفعة (${totalAdded}/${TOTAL_LISTINGS})`);
            setLogs([...logsTemp]);
        }
      }

      setProgress(100);
      setStatus(`✅ تم بنجاح! تمت إضافة ${TOTAL_LISTINGS} إعلان موزعة بالتساوي.`);
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
        <h1 style={{ marginBottom: '20px', fontSize: '24px', color: '#1e293b' }}>🌱 مولد البيانات المتوازن</h1>
        
        <p style={{ color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
          هذه الأداة ستقوم بإضافة <strong>20 إعلان</strong> في كل قسم من أقسام الموقع.
          <br />
          <strong>الإجمالي:</strong> {CATEGORIES.length * 20} إعلان.
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
          {loading ? '⏳ جاري التوليد...' : '🚀 توليد 20 إعلان لكل قسم (320 إعلان)'}
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
