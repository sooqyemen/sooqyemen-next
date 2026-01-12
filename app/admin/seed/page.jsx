'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db, firebase } from '@/lib/firebaseClient';

export default function SeedPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  // بيانات المدن اليمنية
  const CITIES = [
    'صنعاء', 'عدن', 'تعز', 'إب', 'الحديدة', 'حضرموت', 'ذمار', 'مأرب', 'عمران', 'البيضاء'
  ];

  // الأقسام الموجودة في النظام
  const CATEGORIES = [
    'cars', 'realestate', 'phones', 'electronics', 'motorcycles', 
    'heavy-equipment', 'solar', 'internet-networks', 'maintenance', 
    'furniture', 'home-appliances', 'clothes', 'animals-birds', 
    'jobs', 'services', 'other'
  ];

  // بيانات واقعية لكل قسم (عناوين وأوصاف وأسعار)
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
    default: {
      titles: ['عرض مميز لقطة', 'فرصة لا تعوض للبيع', 'بضاعة نظيفة وسعر مغري', 'للبيع بسعر عرطة', 'مطلوب للشراء', 'خدمة مميزة وسريعة'],
      descriptions: ['منتج بحالة ممتازة، سعر مناسب، للجادين فقط', 'عرض مميز، جودة عالية، سعر تنافسي'],
      priceRange: [50000, 3000000]
    }
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
      const TOTAL_LISTINGS = 200;

      // استخدام batch للكتابة السريعة (مقسمة لمجموعات لأن الحد الأقصى للباتش 500)
      const BATCH_SIZE = 50;
      let totalAdded = 0;

      for (let i = 0; i < TOTAL_LISTINGS; i += BATCH_SIZE) {
        const batch = db.batch();
        const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_LISTINGS - i);

        for (let j = 0; j < currentBatchSize; j++) {
          const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
          const data = CATEGORY_DATA[category] || CATEGORY_DATA.default;
          
          const title = data.titles[Math.floor(Math.random() * data.titles.length)];
          const description = data.descriptions[Math.floor(Math.random() * data.descriptions.length)];
          const city = CITIES[Math.floor(Math.random() * CITIES.length)];
          
          // توليد سعر عشوائي ضمن النطاق
          const [minP, maxP] = data.priceRange || CATEGORY_DATA.default.priceRange;
          const price = Math.floor(Math.random() * (maxP - minP + 1)) + minP;

          const docRef = db.collection('listings').doc();
          
          batch.set(docRef, {
            title: title,
            description: description,
            priceYER: price,
            currency: 'YER',
            category: category,
            city: city,
            locationLabel: city,
            images: [
              `https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(category)}`,
              `https://placehold.co/600x400/16a34a/ffffff?text=Sooq+Yemen`
            ],
            userId: user.uid,
            userEmail: user.email,
            phone: '770000000',
            isWhatsapp: true,
            isActive: true,
            hidden: false,
            views: Math.floor(Math.random() * 500),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();
        totalAdded += currentBatchSize;
        setProgress((totalAdded / TOTAL_LISTINGS) * 100);
        logsTemp.push(`✅ تم إضافة دفعة: ${totalAdded} إعلان`);
        setLogs([...logsTemp]);
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
          هذه الأداة ستقوم بإنشاء <strong>200 إعلان</strong> موزعة عشوائياً.
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
