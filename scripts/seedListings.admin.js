// scripts/seedListings.admin.js
// تشغيل: node scripts/seedListings.admin.js
//
// ✅ يحقن إعلانات (مثلاً 20 لكل قسم) مباشرة عبر Firebase Admin (بدون متصفح)
// ⚠️ لا ترفع ملف service account إلى GitHub ولا تضعه داخل public.

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ====== إعدادات ======
const PER_CATEGORY = 20;
const CATEGORIES = [
  'cars','realestate','phones','electronics','motorcycles',
  'heavy_equipment','solar','networks','maintenance',
  'furniture','home_tools','clothes','animals',
  'jobs','services','other',
];

const CITIES = ['صنعاء','عدن','تعز','إب','الحديدة','حضرموت','ذمار','مأرب','عمران','البيضاء'];

const CATEGORY_DATA = {
  cars: {
    titles: ['تويوتا كورولا 2022 نظيف','هايلوكس غمارتين للبيع','هيونداي سنتافي 2020','كيا سبورتاج مستخدم نظيف','برادو 2018 فل كامل'],
    descriptions: ['سيارة بحالة ممتازة، صيانة دورية، فحص كامل، لا حوادث','محرك نظيف، تكييف ثلج، داخلية ممتازة','اقتصادية في الوقود، جاهزة للاستخدام'],
    priceRange: [3000000, 25000000],
  },
  realestate: {
    titles: ['أرض للبيع في موقع مميز','شقة تمليك تشطيب لوكس','عمارة استثمارية للبيع','محل تجاري للإيجار','أرضية تجارية على شارع عام'],
    descriptions: ['موقع قريب من الخدمات، مساحة مناسبة، فرص استثمارية','تشطيب فاخر، مساحة واسعة، موقع هادئ'],
    priceRange: [5000000, 100000000],
  },
  phones: {
    titles: ['ايفون 14 برو ماكس','سامسونج S23 الترا','ريدمي نوت 12','ايفون 11 نظيف','ايفون 13 جديد بكرتونة'],
    descriptions: ['جهاز نظيف، بطارية ممتازة، مع العلبة والشاحن','مستخدم خفيف، كامل الملحقات'],
    priceRange: [200000, 4000000],
  },
  electronics: {
    titles: ['لاب توب ديل كور i7','شاشة سامسونج سمارت','بلايستيشن 5 جديد','كاميرا كانون احترافية','ماك بوك برو M1'],
    descriptions: ['حالة ممتازة، مناسب للعمل والألعاب','جودة عالية ومواصفات قوية'],
    priceRange: [300000, 5000000],
  },
  solar: {
    titles: ['منظومة طاقة شمسية متكاملة','ألواح شمسية 500 وات','بطارية جل 200 أمبير','انفرتر هايبرد 5 كيلو','منظم شحن MPPT'],
    descriptions: ['جودة عالية، ضمان طويل','مناسب للمنازل والمزارع'],
    priceRange: [1000000, 10000000],
  },
  networks: {
    titles: ['راوتر واي فاي عالي السرعة','كاميرات مراقبة 8 قنوات','سويتش جيجابت 24 منفذ'],
    descriptions: ['تغطية قوية، جودة ممتازة','نظام كامل مع تركيب'],
    priceRange: [100000, 2000000],
  },
  maintenance: {
    titles: ['خدمات صيانة عامة للمنازل','صيانة كهرباء وسباكة','خدمات تكييف وتبريد'],
    descriptions: ['فريق محترف، خدمة سريعة، أسعار مناسبة','ضمان على العمل'],
    priceRange: [50000, 500000],
  },
  furniture: {
    titles: ['طقم كنب مجلس عربي','غرفة نوم ملكي','طاولة طعام 6 كراسي','مكتب فخم للبيع'],
    descriptions: ['حالة ممتازة، نظيف جداً','خشب أصلي وتصميم عصري'],
    priceRange: [300000, 5000000],
  },
  home_tools: {
    titles: ['أدوات مطبخ كاملة للبيع','مكنسة كهربائية قوية','عدة نجارة احترافية'],
    descriptions: ['استخدام خفيف، نظيفة','جودة عالية وسعر مناسب'],
    priceRange: [50000, 800000],
  },
  clothes: {
    titles: ['ملابس رجالية ماركات عالمية','فساتين نسائية فخمة','ملابس أطفال جديدة'],
    descriptions: ['نظيفة جداً، موديلات حديثة','أسعار ممتازة'],
    priceRange: [30000, 500000],
  },
  animals: {
    titles: ['قطط شيرازي للبيع','عصافير زينة ملونة','أغنام حري أصيلة'],
    descriptions: ['بصحة ممتازة','تطعيمات كاملة'],
    priceRange: [50000, 2000000],
  },
  jobs: {
    titles: ['مطلوب موظف مبيعات','فرصة عمل سائق خاص','مطلوب محاسب خبرة'],
    descriptions: ['راتب مجزي، بيئة عمل ممتازة','شروط بسيطة ورواتب جيدة'],
    priceRange: [150000, 1000000],
  },
  services: {
    titles: ['خدمات تنظيف شاملة','نقل أثاث وعفش','تصميم جرافيك احترافي'],
    descriptions: ['خدمة احترافية، سرعة في التنفيذ','أسعار تنافسية'],
    priceRange: [50000, 800000],
  },
  default: {
    titles: ['عرض مميز لقطة','فرصة لا تعوض للبيع','بضاعة نظيفة وسعر مغري','مطلوب للشراء'],
    descriptions: ['منتج بحالة ممتازة، سعر مناسب','عرض مميز، جودة عالية'],
    priceRange: [50000, 3000000],
  },
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateListing(category) {
  const data = CATEGORY_DATA[category] || CATEGORY_DATA.default;
  const title = pick(data.titles);
  const description = pick(data.descriptions);
  const city = pick(CITIES);
  const [minP, maxP] = data.priceRange || CATEGORY_DATA.default.priceRange;
  const priceYER = randInt(minP, maxP);

  // صور placeholder — الأفضل لاحقاً استبدالها بصور حقيقية من Firebase Storage
  const images = [
    `https://placehold.co/900x600/2563eb/ffffff?text=${encodeURIComponent(category)}`,
    `https://placehold.co/900x600/16a34a/ffffff?text=Sooq+Yemen`,
  ];

  const now = admin.firestore.Timestamp.now();

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

    // بيانات المعلن (عدّلها حسب حساب الأدمن)
    userId: 'seed_admin',
    userEmail: 'admin@sooqyemen.com',
    userName: 'Admin',
    phone: '770000000',
    isWhatsapp: true,

    isActive: true,
    hidden: false,
    views: randInt(0, 500),

    createdAt: now,
    updatedAt: now,
  };
}

// ====== تهيئة Admin ======
// الخيار 1 (مفضل): ضع ملف serviceAccount.json خارج المشروع أو داخل scripts/ ثم تجاهله في git
// ثم عيّن متغير البيئة: GOOGLE_APPLICATION_CREDENTIALS=/full/path/serviceAccount.json
//
// الخيار 2: ضع المسار هنا يدوياً (لا يُنصح إذا ستدفعه إلى GitHub)
function initAdmin() {
  if (admin.apps.length) return;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('❌ لازم تحدد GOOGLE_APPLICATION_CREDENTIALS لمسار ملف service account JSON');
    process.exit(1);
  }

  const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
  if (!fs.existsSync(abs)) {
    console.error('❌ ملف الخدمة غير موجود:', abs);
    process.exit(1);
  }

  const serviceAccount = require(abs);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function main() {
  initAdmin();

  const db = admin.firestore();
  const total = CATEGORIES.length * PER_CATEGORY;

  console.log(`🚀 سيتم حقن ${PER_CATEGORY} إعلان لكل قسم = ${total} إعلان`);

  const docs = [];
  for (const cat of CATEGORIES) {
    for (let i = 0; i < PER_CATEGORY; i++) docs.push(generateListing(cat));
  }

  // حد الـ batch في Firestore هو 500
  const BATCH_SIZE = 400;
  let added = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);

    chunk.forEach((data) => {
      const ref = db.collection('listings').doc();
      batch.set(ref, data);
    });

    await batch.commit();
    added += chunk.length;
    console.log(`✅ دفعة تمّت: ${added}/${total}`);
  }

  console.log('🎉 انتهينا بنجاح');
}

main().catch((e) => {
  console.error('❌ خطأ:', e);
  process.exit(1);
});
