'use client';

import { useState } from 'react';
<<<<<<< copilot/add-data-seeding-tool
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

// 16 categories from the existing system
const CATEGORIES = [
  'cars', 'realestate', 'phones', 'electronics', 'motorcycles',
  'heavy_equipment', 'solar', 'networks', 'maintenance', 'furniture',
  'home_tools', 'clothes', 'animals', 'jobs', 'services', 'other'
];

// Yemeni cities
const CITIES = ['صنعاء', 'عدن', 'إب', 'تعز', 'الحديدة', 'حضرموت'];

// Category-specific data for realistic listings
const CATEGORY_DATA = {
  cars: {
    titles: [
      'تويوتا كورولا 2022 نظيف',
      'هوندا أكورد 2021 فل كامل',
      'نيسان صني 2020 اقتصادي',
      'BMW X5 2023 وكالة',
      'مرسيدس C200 2021 ممتازة',
      'كيا سيراتو 2022 كالجديدة',
      'هيونداي النترا 2020 نظيفة جدا',
      'لكزس ES 350 2023 فل أوبشن'
    ],
    descriptions: [
      'سيارة بحالة ممتازة، صيانة دورية، فحص كامل، لا حوادث',
      'محرك نظيف، تكييف ثلج، داخلية جلد، شاشة ونافجيشن',
      'اقتصادية في استهلاك الوقود، بدون مشاكل، جاهزة للاستخدام',
      'وكالة محلية، تحت الضمان، كامل المواصفات',
      'قير اوتوماتيك، فتحة سقف، كاميرا خلفية، سنسر أمامي وخلفي'
    ],
    priceRange: [3000000, 25000000] // YER
  },
  realestate: {
    titles: [
      'أرض للبيع في موقع مميز',
      'شقة 3 غرف وصالة للبيع',
      'فيلا دورين مع حديقة',
      'محل تجاري شارع رئيسي',
      'عمارة استثمارية 4 طوابق',
      'أرض زراعية مساحة كبيرة',
      'شقة فاخرة إطلالة بحرية'
    ],
    descriptions: [
      'موقع استراتيجي، قريب من الخدمات، مساحة مناسبة',
      'شقة واسعة، تشطيب فاخر، مطبخ جاهز، حمامين',
      'بناء حديث، تشطيب ديلوكس، موقع هادئ',
      'مناسب لكافة الأنشطة التجارية، مساحة ممتازة',
      'بناء متين، عوائد استثمارية عالية'
    ],
    priceRange: [5000000, 100000000]
  },
  phones: {
    titles: [
      'آيفون 14 برو ماكس 256 جيجا',
      'سامسونج S23 الترا جديد',
      'شاومي ريدمي نوت 12 برو',
      'آيفون 13 بحالة الوكالة',
      'سامسونج A54 كالجديد',
      'هواوي P60 برو مستخدم نظيف',
      'آيفون 15 بلس أحدث إصدار'
    ],
    descriptions: [
      'جهاز نظيف، بدون خدوش، بطارية ممتازة، مع العلبة والشاحن',
      'مستخدم استخدام خفيف، كامل الملحقات، ضمان ساري',
      'حالة ممتازة، شاشة سليمة، كاميرا واضحة',
      'جديد لم يستخدم، مع الفاتورة والضمان'
    ],
    priceRange: [200000, 4000000]
  },
  electronics: {
    titles: [
      'لابتوب ديل كور i7 للبيع',
      'تلفزيون سامسونج 55 بوصة ذكي',
      'بلايستيشن 5 مع ألعاب',
      'كاميرا كانون احترافية',
      'ثلاجة إل جي نظيفة',
      'غسالة أوتوماتيك سامسونج',
      'ماك بوك برو 2022 M1'
    ],
    descriptions: [
      'جهاز بحالة ممتازة، مواصفات عالية، مناسب للعمل والألعاب',
      'شاشة 4K، سمارت، جودة صورة رائعة',
      'استخدام خفيف، كامل الملحقات والألعاب',
      'حالة ممتازة، استخدام احترافي'
    ],
    priceRange: [300000, 5000000]
  },
  motorcycles: {
    titles: [
      'دراجة نارية هوندا 150 سي سي',
      'ياماها 250 موديل حديث',
      'سوزوكي 125 اقتصادية',
      'كاواساكي 300 سبورت'
    ],
    descriptions: [
      'دراجة نظيفة، محرك قوي، استهلاك وقود قليل',
      'حالة ممتازة، صيانة دورية، جاهزة للاستخدام',
      'استخدام شخصي، بدون حوادث'
    ],
    priceRange: [800000, 3000000]
  },
  heavy_equipment: {
    titles: [
      'حفار كاتربلر للبيع',
      'لودر فولفو موديل حديث',
      'رافعة شوكية تويوتا',
      'قلاب مرسيدس بحالة ممتازة'
    ],
    descriptions: [
      'معدة بحالة ممتازة، صيانة دورية، جاهزة للعمل',
      'استخدام خفيف، محرك قوي، بدون مشاكل'
    ],
    priceRange: [15000000, 80000000]
  },
  solar: {
    titles: [
      'نظام طاقة شمسية 5 كيلو وات',
      'ألواح شمسية 300 وات للبيع',
      'منظومة طاقة شمسية كاملة',
      'انفرتر شمسي 3000 وات'
    ],
    descriptions: [
      'نظام كامل، جودة عالية، تركيب مجاني',
      'ألواح أصلية، كفاءة عالية، ضمان طويل',
      'منظومة متكاملة، مناسبة للمنازل والمحلات'
    ],
    priceRange: [1000000, 10000000]
  },
  networks: {
    titles: [
      'راوتر واي فاي عالي السرعة',
      'كاميرات مراقبة 8 قنوات',
      'نظام شبكات للشركات',
      'سويتش جيجابت 24 منفذ'
    ],
    descriptions: [
      'جهاز بحالة ممتازة، سرعة عالية، تغطية واسعة',
      'نظام كامل، جودة صورة عالية، رؤية ليلية',
      'حالة ممتازة، مناسب للاستخدام التجاري'
    ],
    priceRange: [100000, 2000000]
  },
  maintenance: {
    titles: [
      'خدمات صيانة عامة للمنازل',
      'صيانة كهرباء وسباكة',
      'خدمات تكييف وتبريد',
      'صيانة أجهزة كهربائية'
    ],
    descriptions: [
      'فريق محترف، خدمة سريعة، أسعار مناسبة',
      'خبرة طويلة، جودة عالية، ضمان على العمل',
      'خدمة 24 ساعة، فنيون متخصصون'
    ],
    priceRange: [50000, 500000]
  },
  furniture: {
    titles: [
      'طقم صالون 7 مقاعد فخم',
      'غرفة نوم كاملة خشب زان',
      'طاولة طعام 6 كراسي',
      'مكتبة خشبية كبيرة',
      'كنب زاوية حرف L'
    ],
    descriptions: [
      'أثاث بحالة ممتازة، خشب أصلي، تصميم عصري',
      'استخدام خفيف، نظيف جدا، بدون عيوب',
      'جودة عالية، تصميم أنيق، مريح جدا'
    ],
    priceRange: [300000, 5000000]
  },
  home_tools: {
    titles: [
      'أدوات مطبخ كاملة للبيع',
      'مكنسة كهربائية قوية',
      'عدة نجارة احترافية',
      'مجموعة أواني طبخ'
    ],
    descriptions: [
      'أدوات بحالة ممتازة، نظيفة، استخدام خفيف',
      'جودة عالية، عملية جدا، سهلة الاستخدام'
    ],
    priceRange: [50000, 800000]
  },
  clothes: {
    titles: [
      'ملابس رجالية ماركات عالمية',
      'فساتين نسائية فخمة',
      'أحذية رياضية أصلية',
      'ملابس أطفال جديدة'
    ],
    descriptions: [
      'ملابس بحالة ممتازة، ماركات أصلية، قياسات متنوعة',
      'استخدام خفيف، نظيفة جدا، موديلات حديثة'
    ],
    priceRange: [30000, 500000]
  },
  animals: {
    titles: [
      'قطط شيرازي للبيع',
      'عصافير زينة ملونة',
      'أغنام حري أصيلة',
      'دجاج بياض إنتاجي'
    ],
    descriptions: [
      'حيوانات بصحة ممتازة، تطعيمات كاملة',
      'أليفة، نظيفة، مع الأوراق الصحية',
      'إنتاجية عالية، سلالة أصيلة'
    ],
    priceRange: [50000, 2000000]
  },
  jobs: {
    titles: [
      'مطلوب موظف مبيعات',
      'فرصة عمل سائق خاص',
      'مطلوب محاسب خبرة',
      'وظيفة مهندس برمجيات'
    ],
    descriptions: [
      'نبحث عن موظف متميز، راتب مجزي، بيئة عمل ممتازة',
      'شروط بسيطة، رواتب جيدة، تأمينات اجتماعية'
    ],
    priceRange: [150000, 1000000]
  },
  services: {
    titles: [
      'خدمات تنظيف شاملة',
      'نقل أثاث وعفش',
      'تصميم جرافيك احترافي',
      'خدمات ترجمة فورية'
    ],
    descriptions: [
      'خدمة احترافية، أسعار تنافسية، سرعة في التنفيذ',
      'فريق محترف، جودة عالية، ضمان على العمل'
    ],
    priceRange: [50000, 800000]
  },
  other: {
    titles: [
      'منتج مميز للبيع',
      'سلعة بحالة ممتازة',
      'عرض خاص لفترة محدودة',
      'للبيع بسعر مناسب'
    ],
    descriptions: [
      'منتج بحالة ممتازة، سعر مناسب، للجادين فقط',
      'عرض مميز، جودة عالية، سعر تنافسي'
    ],
    priceRange: [100000, 3000000]
  }
};

// Placeholder image
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400?text=Sooq+Yemen';

export default function SeedPage() {
  const { user, loading } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const getRandomItem = (array) => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const generateListing = (category) => {
    const categoryData = CATEGORY_DATA[category] || CATEGORY_DATA.other;
    const title = getRandomItem(categoryData.titles);
    const description = getRandomItem(categoryData.descriptions);
    const city = getRandomItem(CITIES);
    
    const [minPrice, maxPrice] = categoryData.priceRange;
    const priceYER = Math.floor(Math.random() * (maxPrice - minPrice) + minPrice);

    // Generate random phone number (50% chance to include)
    const hasPhone = Math.random() > 0.5;
    const phone = hasPhone ? `77${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}` : null;
    const isWhatsapp = hasPhone ? Math.random() > 0.3 : false; // 70% chance of WhatsApp if phone exists

    return {
      title,
      description,
      city,
      category,
      priceYER,
      originalPrice: priceYER,
      originalCurrency: 'YER',
      currencyBase: 'YER',
      phone,
      isWhatsapp,
      images: [PLACEHOLDER_IMAGE],
      userId: user.uid,
      userEmail: user.email || null,
      userName: user.displayName || null,
      views: 0,
      likes: 0,
      isActive: true,
      hidden: false,
      coords: null,
      lat: null,
      lng: null,
      locationLabel: null,
      auctionEnabled: false,
      auctionEndAt: null,
      currentBidYER: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
=======
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
>>>>>>> main
  };

  const generateListings = async () => {
    if (!user) {
<<<<<<< copilot/add-data-seeding-tool
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    setSeeding(true);
    setProgress(0);
    setStatus('جاري البدء...');
    setError('');

    try {
      const BATCH_SIZE = 10; // Process 10 items per batch for progress updates
      
      for (let batchStart = 0; batchStart < 100; batchStart += BATCH_SIZE) {
        const batch = db.batch();
        const batchEnd = Math.min(batchStart + BATCH_SIZE, 100);
        
        // Create batch of listings
        for (let i = batchStart; i < batchEnd; i++) {
          const category = getRandomItem(CATEGORIES);
          const listingData = generateListing(category);
          const docRef = db.collection('listings').doc();
          batch.set(docRef, listingData);
        }
        
        // Commit the batch
        await batch.commit();
        
        // Update progress
        const newProgress = Math.round((batchEnd / 100) * 100);
        setProgress(newProgress);
        setStatus(`تم إضافة ${batchEnd} من 100 إعلان...`);
      }

      setProgress(100);
      setStatus('✅ تم إضافة 100 إعلان بنجاح!');
    } catch (err) {
      console.error('Error seeding data:', err);
      setError(`حدث خطأ: ${err.message}`);
      setStatus('');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="seed-page">
        <div className="card">
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="seed-page">
        <div className="card">
          <h2>🔒 يجب تسجيل الدخول</h2>
          <p>يجب عليك تسجيل الدخول للوصول إلى هذه الصفحة.</p>
        </div>
=======
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
>>>>>>> main
      </div>
    );
  }

  return (
<<<<<<< copilot/add-data-seeding-tool
    <div className="seed-page">
      <div className="card">
        <h1>🌱 أداة إضافة بيانات تجريبية</h1>
        <p className="description">
          هذه الأداة ستقوم بإضافة 100 إعلان تجريبي إلى قاعدة البيانات لأغراض SEO.
          جميع الإعلانات ستكون باسم المستخدم الحالي.
        </p>

        <div className="info-box">
          <h3>📊 معلومات البيانات التجريبية:</h3>
          <ul>
            <li>✅ 100 إعلان موزعة على 16 قسم</li>
            <li>✅ مدن يمنية: صنعاء، عدن، إب، تعز، الحديدة، حضرموت</li>
            <li>✅ عناوين وأوصاف عربية واقعية</li>
            <li>✅ أسعار مناسبة لكل قسم</li>
            <li>✅ صور بديلة (placeholder)</li>
            <li>✅ حالة نشطة (isActive: true)</li>
            <li>✅ غير مخفية (hidden: false)</li>
          </ul>
        </div>

        <div className="user-info">
          <p><strong>المستخدم الحالي:</strong> {user.email}</p>
          <p className="note">جميع الإعلانات ستضاف باسم هذا المستخدم</p>
        </div>

        <button
          className="generate-btn"
          onClick={generateListings}
          disabled={seeding}
        >
          {seeding ? '⏳ جاري الإضافة...' : '🚀 إضافة 100 إعلان'}
        </button>

        {seeding && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">{progress}%</div>
          </div>
        )}

        {status && (
          <div className="status-message success">
            {status}
          </div>
        )}

        {error && (
          <div className="status-message error">
            ❌ {error}
          </div>
        )}

        <div className="warning-box">
          <strong>⚠️ تحذير:</strong>
          <p>هذه الأداة مخصصة للتطوير والاختبار فقط. تأكد من أنك في البيئة الصحيحة قبل الاستخدام.</p>
        </div>
      </div>

      <style jsx>{`
        .seed-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        h1 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 28px;
        }

        .description {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .info-box h3 {
          color: #1e293b;
          margin-bottom: 15px;
          font-size: 18px;
        }

        .info-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-box li {
          padding: 8px 0;
          color: #475569;
          font-size: 15px;
        }

        .user-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }

        .user-info p {
          margin: 5px 0;
          color: #1e40af;
        }

        .user-info .note {
          font-size: 14px;
          color: #3b82f6;
          margin-top: 8px;
        }

        .generate-btn {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 20px 0;
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .progress-container {
          margin: 20px 0;
        }

        .progress-bar {
          width: 100%;
          height: 30px;
          background: #e2e8f0;
          border-radius: 15px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
          transition: width 0.3s ease;
          border-radius: 15px;
        }

        .progress-text {
          text-align: center;
          margin-top: 10px;
          font-size: 18px;
          font-weight: 700;
          color: #4f46e5;
        }

        .status-message {
          padding: 15px 20px;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }

        .status-message.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .status-message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .warning-box {
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 15px;
          margin-top: 30px;
        }

        .warning-box strong {
          color: #92400e;
          display: block;
          margin-bottom: 8px;
        }

        .warning-box p {
          color: #92400e;
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .seed-page {
            padding: 15px;
          }

          .card {
            padding: 20px;
          }

          h1 {
            font-size: 24px;
          }

          .generate-btn {
            font-size: 16px;
            padding: 14px 20px;
          }
        }
      `}</style>
=======
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
>>>>>>> main
    </div>
  );
}
