// app/api/chat/route.js
import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// =========================
// الثوابت والإعدادات
// =========================
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 دقيقة
const MAX_REQUESTS_PER_WINDOW = 15; // 15 طلب لكل دقيقة
const CACHE_TTL = 60000; // 1 دقيقة
const DEFAULT_SAR = 425;
const DEFAULT_USD = 1632;
const DRAFTS_COLLECTION = 'assistant_drafts';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';

// =========================
// أنظمة التخزين المؤقت والتحكم
// =========================
const rateLimiter = new Map();
const LRU_CACHE = new Map();

// =========================
// قاعدة المعرفة (FAQ)
// =========================
const knowledgeBase = {
  'ما هو|ماهو|ايش هو|شنو هو|عن الموقع|عن سوق اليمن':
    'سوق اليمن هو أكبر منصة للإعلانات والمزادات في اليمن. نقدم خدمة بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات، والمزيد.',

  'كيف اضيف|كيف انشر|كيف اعلن|اضافة اعلان|نشر اعلان|انشاء اعلان|طريقة اضافة اعلان':
    'لإضافة إعلان:\n1) سجل دخول أو أنشئ حساب جديد\n2) اضغط على زر "إضافة إعلان"\n3) اختر الفئة المناسبة\n4) املأ التفاصيل وأضف الصور\n5) اضغط نشر\n\nللانتقال: /add',

  'فئات|اقسام|تصنيفات|categories|الاقسام|الاصناف':
    'الفئات المتوفرة:\n🚗 سيارات\n🏠 عقارات\n📱 جوالات\n💻 إلكترونيات\n🏍️ دراجات نارية\n🚜 معدات ثقيلة\n☀️ طاقة شمسية\n🌐 نت وشبكات\n🔧 صيانة\n🛋️ أثاث\n🏡 أدوات منزلية\n👔 ملابس\n🐾 حيوانات وطيور\n💼 وظائف\n⚙️ خدمات\n📦 أخرى',

  'محادثة|شات|تواصل مع البائع|كيف اكلم البائع|ارسل رسالة للبائع':
    'للتواصل مع البائع:\n1) افتح صفحة الإعلان\n2) اضغط على زر "💬 محادثة"\n3) ابدأ المحادثة\n\nراجع محادثاتك من صفحة "محادثاتي".',

  'مزاد|مزادات|auction|كيف اشارك في المزاد|المزادات كيف تعمل':
    'المزادات في سوق اليمن:\n• المزايدة على المنتجات\n• متابعة المزادات المفتوحة\n• الحصول على أفضل الأسعار\n\nابحث عن الإعلانات بعلامة "مزاد".',

  'تسجيل|حساب|دخول|login|register|انشاء حساب|كيف اسجل':
    'للتسجيل:\n1) اضغط على "تسجيل"\n2) أدخل البريد الإلكتروني وكلمة المرور\n3) أكمل البيانات\n\nأو استخدم التسجيل السريع عبر Google.',

  'بحث|search|ابحث|كيف ابحث|طريقة البحث|بحث عن':
    'للبحث:\n1) استخدم شريط البحث في الأعلى\n2) تصفح الفئات المختلفة\n3) استخدم الفلاتر لتضييق النتائج\n\nاستخدم الخريطة للبحث حسب الموقع.',

  'صور|اضافة صور|رفع صور|عدد الصور|نوع الصور':
    'يمكنك إضافة حتى 8 صور لكل إعلان.\n• تأكد من جودة الصور\n• الصور واضحة وتظهر المنتج\n• تنوع الزوايا',

  'سعر|اسعار|price|prices|كيف اضع السعر|العملات المتاحة':
    'العملات المتاحة:\n• الريال اليمني (ر.ي)\n• الريال السعودي (SAR)\n• الدولار الأمريكي (USD)\n\nيمكنك اختيار "قابل للتفاوض".',

  'موقع|خريطة|location|map|كيف اضيف موقع|تحديد الموقع':
    'نستخدم الخرائط التفاعلية:\n• تحديد موقع المنتج\n• البحث حسب المنطقة\n• معرفة المسافة من موقعك\n\nفعل الموقع لنتائج أدق.',

  'مساعدة|دعم|help|support|مشكلة|تواصل مع الدعم':
    'إذا واجهت مشكلة:\n• صفحة المساعدة: /help\n• تواصل معنا: /contact\n\nنحن هنا لمساعدتك! 😊',

  'شروط|سياسة|privacy|terms|الشروط والاحكام|سياسة الخصوصية':
    'للاطلاع على:\n• شروط الاستخدام: /terms\n• سياسة الخصوصية: /privacy',

  'كيف احذف اعلان|حذف اعلان|ازالة اعلان|الغاء نشر اعلان':
    'لحذف إعلان:\n1) انتقل إلى صفحة إعلاناتك\n2) اختر الإعلان\n3) اضغط على "🗑️ حذف"\n4) أكد الحذف\n\nملاحظة: يمكن استرجاع الإعلان خلال 24 ساعة.',

  'كيف اعدل اعلان|تعديل اعلان|تغيير سعر|تحديث اعلان':
    'لتعديل إعلان:\n1) صفحة إعلاناتك\n2) اختر الإعلان\n3) اضغط على "✏️ تعديل"\n4) عدل التفاصيل\n5) حفظ التعديلات',

  'الاعلانات المميزة|تثبيت اعلان|تمييز اعلان|اعلان مميز':
    'الخدمات المميزة:\n• تثبيت الإعلان: 50,000 ر.ي\n• تمييز الإعلان: 30,000 ر.ي\n• ظهور في الصدارة: 70,000 ر.ي\n\nلتفعيل: /premium',

  'كيف ابيع|نصائح للبيع|افضل طريقة للبيع|زيادة مبيعات':
    'نصائح لبيع أسرع:\n1) أضف صور واضحة وجذابة\n2) اكتب وصف تفصيلي\n3) ضع سعر مناسب\n4) كن متاح للرد\n5) ضع الإعلان في القسم المناسب',

  'كيف اشتري|نصائح للشراء|تأكيد الشراء|الدفع الامن':
    'نصائح للشراء الآمن:\n1) تواصل مع البائع\n2) اطلب صور إضافية\n3) قابل البائع في مكان عام\n4) تأكد من المنتج قبل الدفع\n5) استخدم نظام التقييمات',

  'التقييمات|كيف اقييم|شهادة مستخدم|تقيم البائع':
    'نظام التقييمات:\n• تقييم البائع بعد كل عملية\n• التقييم من 1 إلى 5 نجوم\n• كتابة تعليق عن التجربة\n• التقييمات تساعد الآخرين',

  'الابلاغ عن اعلان|ابلاغ|اعلان مخالف|احتيال|نصاب':
    'للإبلاغ عن إعلان:\n1) افتح صفحة الإعلان\n2) اضغط على "⚠️ إبلاغ"\n3) اختر سبب الإبلاغ\n4) أضف تفاصيل\nسيتم المراجعة خلال 24 ساعة.',

  'كيف اتابع اعلان|المفضلة|حفظ اعلان|متابعة اعلان':
    'لمتابعة الإعلانات:\n1) اضغط على "❤️" في أي إعلان\n2) ستظهر في "المفضلة"\n3) إشعارات بالتحديثات\n4) تنظيم المفضلة حسب الفئة',

  'الاشعارات|كيف اشغل الاشعارات|إعدادات الاشعارات|رسائل تنبيه':
    'للتحكم في الإشعارات:\n1) إعدادات الحساب\n2) اختر "الإشعارات"\n3) فعّل/عطّل الإشعارات\n4) حفظ التعديلات',

  'حسابي|صفحتي|معلومات الحساب|تعديل الملف الشخصي':
    'لإدارة حسابك:\n1) اضغط على صورتك\n2) اختر "حسابي"\n3) يمكنك تعديل:\n• المعلومات الشخصية\n• كلمة المرور\n• الإعدادات\n• التفضيلات',

  'رسائلي|المحادثات|الشات|المراسلات':
    'لإدارة محادثاتك:\n1) اضغط على "💬"\n2) اختر المحادثة\n3) يمكنك حذف المحادثات\n4) البحث في المحادثات',

  'الرسائل الواردة|طلبات الشراء|عروض السعر|المفاوضات':
    'لإدارة عروض السعر:\n1) صفحة إعلاناتك\n2) اختر إعلان\n3) اضغط على "العروض"\n4) قبول/رفض/تفاوض',

  'العمولة|الرسوم|تكلفة النشر|اسعار الخدمات':
    'الرسوم الحالية:\n• النشر العادي: مجاني\n• التميز: حسب الخدمة\n• المزادات: 2% من سعر البيع\n• الإعلانات المثبتة: 50,000 ر.ي\n\nالتفاصيل: /pricing',

  'الضمان|كيف احصل على ضمان|الشراء المؤمن|حماية المشتري':
    'خدمة الحماية:\n• للمنتجات بعلامة "🛡️"\n• تحفظ المبلغ حتى الاستلام\n• في النزاع، نتوسط\n• التفاصيل: /protection',

  'الشحن|التوصيل|كيف اشحن|تكلفة الشحن|شركات الشحن':
    'خيارات الشحن:\n• توصيل محلي\n• شحن بين المحافظات\n• شحن دولي (متوفر لبعض المنتجات)\n• الاتفاق مع البائع',
};

// =========================
// التفاعلات الاجتماعية
// =========================
const SOCIAL_INTERACTIONS = {
  morning: {
    patterns: ['صباح الخير', 'صباح النور', 'صباح الفل', 'صباح الورد', 'صباح'],
    responses: [
      'صباح الخير 🌞 أتمنى أن يكون صباحك مليئاً بالخير',
      'صباح النور ☀️ كيف حالك هذا الصباح؟',
      'صباح الفل 🌷 كل يوم وأنت بألف خير',
      'صباح الخير 🌅 أتمنى لك يوماً سعيداً',
    ]
  },
  evening: {
    patterns: ['مساء الخير', 'مساء النور', 'مساء الورد', 'مساء'],
    responses: [
      'مساء الخير 🌙 أسعد الله مساءك',
      'مساء النور 🌜 أتمنى أن يكون مساؤك هادئاً',
      'مساء الخير 🌙 كيف كان يومك؟',
      'مساء النور 🌜 كل مساء وأنت بخير',
    ]
  },
  greetings: {
    patterns: ['السلام', 'سلام', 'السلام عليكم', 'وعليكم السلام', 'هلا', 'مرحبا', 'مرحباً', 'اهلا', 'أهلاً'],
    responses: [
      'وعليكم السلام ورحمة الله 🌹',
      'أهلاً وسهلاً بك 😊 كيف يمكنني مساعدتك؟',
      'مرحباً بك في سوق اليمن 🇾🇪',
      'أهلاً بكم 🌷 تفضل كيف أقدر أساعدك؟',
    ]
  },
  thanks: {
    patterns: ['شكرا', 'شكراً', 'مشكور', 'مشكورة', 'يعطيك العافية', 'بارك الله فيك'],
    responses: [
      'العفو 😊 سعيد لأنني استطعت مساعدتك',
      'الله يعافيك 🌹 دايماً في خدمتك',
      'بارك الله فيك 🙏 العفو منك',
      'تسلم 😊 حياك الله',
    ]
  },
  howAreYou: {
    patterns: ['كيف حالك', 'كيفك', 'شلونك', 'كيف الحال', 'اخبارك'],
    responses: [
      'الحمدلله بخير، شكراً لسؤالك! 😊 وأنت كيف حالك؟',
      'بخير والحمدلله 🌷 شكراً لاهتمامك',
      'الحمدلله تمام، شكراً 🙏 وانت كيف حالك؟',
    ]
  },
  compliments: {
    patterns: ['جميل', 'رائع', 'ممتاز', 'احسنت', 'مبدع'],
    responses: [
      'شكراً لك 🌹 سعيد لأن الإجابة نالت إعجابك',
      'الله يسلمك 😊 هذا من ذوقك',
      'شكراً لطيب كلامك 🌷',
    ]
  },
  prayers: {
    patterns: ['ما شاء الله', 'تبارك الله', 'الله يبارك فيك', 'ربنا يخليك'],
    responses: [
      'الله يبارك فيك 🌹',
      'تسلم 🙏 الله يحفظك',
      'ما شاء الله تبارك الله 🌷',
    ]
  },
  goodbye: {
    patterns: ['مع السلامة', 'وداعاً', 'الى اللقاء', 'باي'],
    responses: [
      'مع السلامة 🌹 في أمان الله',
      'وداعاً 🙏 إلى اللقاء',
      'ان شاء الله نشوفك على خير 🌷',
    ]
  }
};

// =========================
// الفئات المتاحة
// =========================
const CATEGORIES = [
  { slug: 'cars', name: 'سيارات', keywords: ['سيارة', 'سيارات', 'car', 'cars'] },
  { slug: 'realestate', name: 'عقارات', keywords: ['عقار', 'عقارات', 'شقة', 'فيلا'] },
  { slug: 'phones', name: 'جوالات', keywords: ['جوال', 'جوالات', 'موبايل', 'ايفون'] },
  { slug: 'electronics', name: 'إلكترونيات', keywords: ['إلكترونيات', 'كمبيوتر', 'لابتوب'] },
  { slug: 'motorcycles', name: 'دراجات نارية', keywords: ['دراجة', 'دراجات', 'موتوسيكل'] },
  { slug: 'heavy_equipment', name: 'معدات ثقيلة', keywords: ['معدات', 'شيول', 'حفار'] },
  { slug: 'solar', name: 'طاقة شمسية', keywords: ['طاقة شمسية', 'الواح', 'بطاريات'] },
  { slug: 'networks', name: 'نت وشبكات', keywords: ['نت', 'شبكات', 'انترنت', 'راوتر'] },
  { slug: 'maintenance', name: 'صيانة', keywords: ['صيانة', 'تصليح', 'ورشة'] },
  { slug: 'furniture', name: 'أثاث', keywords: ['اثاث', 'أثاث', 'كنب', 'مجلس'] },
  { slug: 'home_tools', name: 'أدوات منزلية', keywords: ['ادوات منزلية', 'ثلاجة', 'غسالة'] },
  { slug: 'clothes', name: 'ملابس', keywords: ['ملابس', 'أزياء', 'ملابس نسائية'] },
  { slug: 'animals', name: 'حيوانات وطيور', keywords: ['حيوانات', 'طيور', 'غنم', 'ماعز'] },
  { slug: 'jobs', name: 'وظائف', keywords: ['وظائف', 'وظيفة', 'توظيف'] },
  { slug: 'services', name: 'خدمات', keywords: ['خدمات', 'توصيل', 'نقل', 'شحن'] },
  { slug: 'other', name: 'أخرى', keywords: ['اخرى', 'أخرى', 'متفرقات'] },
];

// =========================
// أدوات مساعدة
// =========================
function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toEnglishDigits(input) {
  const arDigits = '٠١٢٣٤٥٦٧٨٩';
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(arDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
}

function parsePriceFromText(text) {
  const raw = toEnglishDigits(String(text || ''))
    .replace(/[,_،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!raw) return null;

  const unitMatch = raw.match(/(\d+(?:\.\d+)?)\s*(k|m|b|الف|مليون|مليار)\b/i);
  if (unitMatch) {
    const n = Number(unitMatch[1]);
    const unit = normalizeText(unitMatch[2]);
    
    if (!isFinite(n) || n <= 0) return null;
    
    const multipliers = {
      'k': 1000,
      'الف': 1000,
      'الاف': 1000,
      'آلاف': 1000,
      'م': 1000000,
      'مليون': 1000000,
      'ملايين': 1000000,
      'ب': 1000000000,
      'مليار': 1000000000,
      'مليارات': 1000000000
    };
    
    const multiplier = multipliers[unit] || 1;
    return Math.round(n * multiplier);
  }

  const numMatch = raw.match(/(\d{1,3}(?:\s\d{3})+|\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  
  const numStr = numMatch[1].replace(/\s+/g, '');
  const n = Number(numStr);
  
  return isFinite(n) && n > 0 ? Math.round(n) : null;
}

function detectCategorySlug(text) {
  const t = normalizeText(text);
  
  for (const category of CATEGORIES) {
    if (t.includes(normalizeText(category.slug))) return category.slug;
    
    for (const keyword of category.keywords) {
      if (t.includes(normalizeText(keyword))) return category.slug;
    }
  }
  
  return null;
}

function categoryNameFromSlug(slug) {
  const category = CATEGORIES.find(c => c.slug === slug);
  return category ? category.name : slug;
}

function findBestMatch(message) {
  const lowerMessage = normalizeText(message);

  for (const [pattern, response] of Object.entries(knowledgeBase)) {
    const patterns = pattern.split('|');
    
    for (const p of patterns) {
      const normalizedPattern = normalizeText(p);
      
      if (lowerMessage.includes(normalizedPattern)) {
        return response;
      }
      
      const regex = new RegExp(`(^|\\s)${normalizedPattern}($|\\s|[،.؟!])`, 'i');
      if (regex.test(lowerMessage)) {
        return response;
      }
    }
  }
  
  return null;
}

// =========================
// نظام Rate Limiting
// =========================
function checkRateLimit(userId, action) {
  const key = `${userId || 'anonymous'}_${action}`;
  const now = Date.now();

  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }

  const timestamps = rateLimiter.get(key);
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimiter.set(key, validTimestamps);

  if (validTimestamps.length === 1) {
    setTimeout(() => rateLimiter.delete(key), RATE_LIMIT_WINDOW + 1000);
  }

  return true;
}

// =========================
// نظام Cache
// =========================
async function cachedFetch(key, fetchFn, ttl = CACHE_TTL) {
  const cached = LRU_CACHE.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetchFn();
  LRU_CACHE.set(key, { data, timestamp: Date.now() });

  setTimeout(() => LRU_CACHE.delete(key), ttl + 1000);
  return data;
}

// =========================
// Authentication
// =========================
async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : '';

  if (!token || !adminAuth) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.displayName || null,
    };
  } catch {
    return null;
  }
}

function adminNotReadyMessage() {
  return 'هذه الميزة تحتاج تفعيل Firebase Admin.\n\nأضف المتغيرات في Vercel/Netlify:\n• FIREBASE_PROJECT_ID\n• FIREBASE_CLIENT_EMAIL\n• FIREBASE_PRIVATE_KEY\n\nثم أعد النشر.';
}

// =========================
// التفاعلات الاجتماعية
// =========================
function detectSocialInteraction(message) {
  const t = normalizeText(message);

  for (const [category, data] of Object.entries(SOCIAL_INTERACTIONS)) {
    for (const pattern of data.patterns) {
      if (t.includes(normalizeText(pattern))) {
        const randomResponse = data.responses[Math.floor(Math.random() * data.responses.length)];
        return {
          type: category,
          response: randomResponse,
          matched: pattern
        };
      }
    }
  }

  return null;
}

// =========================
// تحليل النية والمشاعر
// =========================
function analyzeIntentAndSentiment(message) {
  const text = normalizeText(message);

  const intents = {
    isAskingForHelp: /مساعدة|مشكلة|سؤال|استفسار|كيف|طريقة/.test(text),
    isLookingToBuy: /اشتري|اريد|مطلوب|ابحث عن|شراء/.test(text),
    isLookingToSell: /للبع|معروض|بيع|اضيف|اعلان/.test(text),
    isNegotiating: /سعر|كم|تفاوض|رخيص|غالي/.test(text),
    isUrgent: /سريع|عاجل|ضروري|الان|فوري/.test(text),
    isComplaining: /مشكلة|شكوى|غلط|خطأ|احتيال/.test(text),
    isThanking: /شكر|ممتاز|رائع|احسنت|يعطيك/.test(text),
  };

  const sentiment = {
    isPositive: /شكر|حلو|رائع|ممتاز|جميل|احسنت/.test(text),
    isNegative: /مشكلة|غلط|خطأ|سيء|مافهمت|احتيال/.test(text),
    isNeutral: !/(شكر|مشكلة|احتيال|رائع|ممتاز)/.test(text)
  };

  return { intents, sentiment };
}

// =========================
// عد الإعلانات
// =========================
function extractCountIntent(message) {
  const t = normalizeText(message);
  const asksHowMany = t.startsWith('كم') || t.includes('كم ') || t.includes('عدد') || t.includes('احص');
  
  if (!asksHowMany) return null;

  const mentionsAds = t.includes('اعلان') || t.includes('إعلان') || t.includes('منشور');
  const category = detectCategorySlug(t);

  if (mentionsAds || category) {
    return { category };
  }

  return null;
}

async function tryCountListings(categorySlug) {
  if (!adminDb) return { ok: false, reason: 'admin_not_configured' };

  return cachedFetch(`count_${categorySlug || 'all'}`, async () => {
    try {
      let query = adminDb.collection('listings').where('isActive', '==', true);
      
      if (categorySlug) {
        query = query.where('category', '==', categorySlug);
      }

      const snapshot = await query.get();
      const totalActive = snapshot.size;
      
      let hiddenCount = 0;
      snapshot.forEach(doc => {
        if (doc.data().hidden) hiddenCount++;
      });

      const publicCount = Math.max(0, totalActive - hiddenCount);
      
      return {
        ok: true,
        totalActive,
        hiddenTrue: hiddenCount,
        publicCount,
        approximate: false
      };
    } catch {
      return { ok: false, reason: 'count_failed' };
    }
  });
}

// =========================
// نظام إضافة الإعلانات
// =========================
function normalizeImagesMeta(metaImages) {
  if (!metaImages) return [];
  
  const arr = Array.isArray(metaImages) ? metaImages : [metaImages];
  const urls = arr
    .map(item => {
      if (!item) return null;
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object') return item.url || item.downloadURL || item.href || null;
      return null;
    })
    .filter(url => url && url.startsWith('http'))
    .slice(0, 8);
    
  return [...new Set(urls)];
}

function normalizePhone(raw) {
  const phone = String(raw || '')
    .replace(/[\s\-()]/g, '')
    .replace(/[^0-9+]/g, '');

  if (phone.startsWith('+')) {
    const digits = phone.replace(/[^0-9]/g, '');
    return `+${digits}`;
  }
  
  return phone;
}

function isValidPhone(phone) {
  const p = normalizePhone(phone);
  const digits = p.replace(/[^0-9]/g, '');

  if (digits.length === 9 && digits.startsWith('7')) return true;
  if (digits.length === 12 && digits.startsWith('9677')) return true;
  
  return digits.length >= 7 && digits.length <= 15;
}

function detectCurrency(text) {
  const t = normalizeText(text);
  if (t.includes('sar') || t.includes('ريال سعودي') || t.includes('ر س')) return 'SAR';
  if (t.includes('usd') || t.includes('دولار') || t.includes('$')) return 'USD';
  return 'YER';
}

function extractFirstPhone(text) {
  const t = toEnglishDigits(String(text || ''));
  const candidates = t.match(/\+?\d[\d\s\-()]{6,}\d/g) || [];
  
  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized && isValidPhone(normalized)) return normalized;
  }
  
  return null;
}

// =========================
// مساعد الذكاء الاصطناعي
// =========================
async function runAiFallback({ message, history }) {
  if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    return {
      ok: false,
      reply: 'ما فهمت سؤالك تماماً 🤔\n\nجرب:\n• كيف أضيف إعلان؟\n• أضف إعلان\n• كيف أبحث عن سيارات؟'
    };
  }

  try {
    if (GEMINI_API_KEY && ASSISTANT_PREFER_GEMINI) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: message }]
            }],
            systemInstruction: {
              role: 'system',
              parts: [{
                text: 'أنت مساعد لموقع سوق اليمن. أجب بلغة عربية واضحة ومفيدة.'
              }]
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (reply) {
          return { ok: true, reply };
        }
      }
    }

    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'أنت مساعد لموقع سوق اليمن. أجب بلغة عربية واضحة ومفيدة.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';
        
        if (reply) {
          return { ok: true, reply };
        }
      }
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

// =========================
// Route الرئيسية - POST
// =========================
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = body?.message?.trim();
    const history = body?.history;
    const meta = body?.meta || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'الرسالة مطلوبة' },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(request);
    const userId = user?.uid || 'anonymous';

    if (!checkRateLimit(userId, 'assistant_request')) {
      return NextResponse.json(
        { error: 'لقد تجاوزت الحد المسموح. حاول مرة أخرى بعد دقيقة.' },
        { status: 429 }
      );
    }

    // التحقق من التفاعلات الاجتماعية
    const socialInteraction = detectSocialInteraction(message);
    if (socialInteraction) {
      return NextResponse.json({ reply: socialInteraction.response });
    }

    // البحث في قاعدة المعرفة
    const faqAnswer = findBestMatch(message);
    if (faqAnswer) {
      return NextResponse.json({ reply: faqAnswer });
    }

    // عد الإعلانات
    const countIntent = extractCountIntent(message);
    if (countIntent) {
      const result = await tryCountListings(countIntent.category);
      
      if (!result.ok) {
        return NextResponse.json({ reply: adminNotReadyMessage() });
      }

      const label = countIntent.category 
        ? categoryNameFromSlug(countIntent.category) 
        : 'كل الأقسام';
      
      return NextResponse.json({
        reply: `📊 عدد الإعلانات في ${label}: ${result.publicCount}`
      });
    }

    // التحقق من نية إضافة إعلان
    const normalizedMessage = normalizeText(message);
    const isCreatingAd = normalizedMessage.includes('اضف اعلان') || 
                         normalizedMessage.includes('انشئ اعلان') ||
                         normalizedMessage.includes('اعلان جديد');

    if (isCreatingAd) {
      if (!user || !user.uid) {
        return NextResponse.json({
          reply: 'لإضافة إعلان يجب تسجيل الدخول أولاً ✅\n\nتسجيل الدخول: /login'
        });
      }

      if (!adminDb) {
        return NextResponse.json({ reply: adminNotReadyMessage() });
      }

      return NextResponse.json({
        reply: 'لإضافة إعلان جديد، يرجى استخدام صفحة الإضافة المباشرة: /add\n\nأو اتبع الخطوات:\n1) اختر القسم\n2) اكتب العنوان\n3) اكتب الوصف\n4) حدد السعر\n5) أضف الصور\n6) نشر الإعلان'
      });
    }

    // استخدام الذكاء الاصطناعي كخلفية
    const aiResult = await runAiFallback({ message, history });
    
    if (aiResult.ok) {
      return NextResponse.json({ reply: aiResult.reply });
    }

    // رد افتراضي
    return NextResponse.json({
      reply: 'ما فهمت سؤالك تماماً 🤔\n\nجرب أحد هذه الخيارات:\n• كيف أضيف إعلان؟\n• أضف إعلان\n• كم اعلان سيارات؟\n• شروط الاستخدام\n\nأو اكتب سؤالك بشكل أوضح.'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'حدث خطأ في معالجة الطلب',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// =========================
// Route للإحصائيات - GET
// =========================
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'stats') {
      if (!adminDb) {
        return NextResponse.json({
          message: 'Firebase Admin غير مفعل'
        });
      }

      const result = await tryCountListings(null);
      const usersCount = await adminDb.collection('users').count().get()
        .then(snap => snap.data().count)
        .catch(() => 'N/A');

      return NextResponse.json({
        totalListings: result.ok ? result.publicCount : 'N/A',
        activeUsers: usersCount,
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      status: 'active',
      version: '2.0.0',
      features: ['faq', 'counts', 'ai_fallback', 'rate_limiting', 'social_interactions']
    });

  } catch (error) {
    console.error('GET API error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ' },
      { status: 500 }
    );
  }
}
