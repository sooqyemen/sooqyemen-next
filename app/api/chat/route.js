import { NextResponse, NextRequest } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// =========================
// إعدادات البيئة والثوابت
// =========================

const DEFAULT_SAR = 425;
const DEFAULT_USD = 1632;
const DRAFTS_COLLECTION = 'assistant_drafts';
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 دقيقة
const MAX_REQUESTS_PER_WINDOW = 15; // 15 طلب لكل دقيقة
const CACHE_TTL = 60000; // 1 دقيقة
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);

// مفاتيح API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';

// =========================
// إدارة الذاكرة (Rate Limit & Cache)
// =========================

const rateLimiter = new Map<string, number[]>();
const LRU_CACHE = new Map<string, { data: any; timestamp: number }>();

// تنظيف دوري للذاكرة كل 5 دقائق لمنع التسريب
setInterval(() => {
  const now = Date.now();
  // تنظيف Rate Limiter
  for (const [key, timestamps] of rateLimiter.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) rateLimiter.delete(key);
    else rateLimiter.set(key, valid);
  }
  // تنظيف Cache
  for (const [key, value] of LRU_CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) LRU_CACHE.delete(key);
  }
}, 5 * 60 * 1000);

// =========================
// قاعدة المعرفة (FAQ) & التصنيفات
// =========================

const CATEGORIES = [
  { slug: 'cars', name: 'سيارات', keywords: ['سيارة', 'سيارات', 'car', 'cars'] },
  { slug: 'realestate', name: 'عقارات', keywords: ['عقار', 'عقارات', 'شقة', 'شقق', 'أرض', 'ارض', 'realestate', 'estate', 'فلة', 'بيت'] },
  { slug: 'phones', name: 'جوالات', keywords: ['جوال', 'جوالات', 'هاتف', 'هواتف', 'phone', 'phones', 'ايفون', 'سامسونج'] },
  { slug: 'electronics', name: 'إلكترونيات', keywords: ['الكترونيات', 'إلكترونيات', 'electronics', 'لابتوب', 'كمبيوتر'] },
  { slug: 'motorcycles', name: 'دراجات نارية', keywords: ['دراجة', 'دراجات', 'دراجات نارية', 'motorcycle', 'motorcycles', 'موتور'] },
  { slug: 'heavy_equipment', name: 'معدات ثقيلة', keywords: ['معدات', 'معدات ثقيلة', 'شيول', 'حفار', 'heavy', 'equipment'] },
  { slug: 'solar', name: 'طاقة شمسية', keywords: ['طاقة شمسية', 'الواح', 'ألواح', 'بطاريات', 'solar', 'منظومة'] },
  { slug: 'networks', name: 'نت وشبكات', keywords: ['نت', 'شبكات', 'انترنت', 'internet', 'networks', 'مودم'] },
  { slug: 'maintenance', name: 'صيانة', keywords: ['صيانة', 'تصليح', 'maintenance', 'ورشة'] },
  { slug: 'furniture', name: 'أثاث', keywords: ['اثاث', 'أثاث', 'furniture', 'كنب', 'غرفة نوم'] },
  { slug: 'home_tools', name: 'أدوات منزلية', keywords: ['ادوات منزلية', 'أدوات منزلية', 'home tools', 'مطبخ'] },
  { slug: 'clothes', name: 'ملابس', keywords: ['ملابس', 'clothes', 'فستان', 'ثوب'] },
  { slug: 'animals', name: 'حيوانات وطيور', keywords: ['حيوانات', 'طيور', 'حيوان', 'animal', 'animals', 'غنم', 'قطة'] },
  { slug: 'jobs', name: 'وظائف', keywords: ['وظائف', 'وظيفة', 'job', 'jobs', 'عمل'] },
  { slug: 'services', name: 'خدمات', keywords: ['خدمات', 'service', 'services', 'توصيل', 'نقل'] },
  { slug: 'other', name: 'أخرى', keywords: ['اخرى', 'أخرى', 'other'] },
];

const KNOWLEDGE_BASE: Record<string, string> = {
  // تم دمج بعض المفاتيح المتشابهة لتقليل حجم الكائن وتسريع البحث
  'ما هو|ماهو|ايش هو|شنو هو|عن الموقع|عن سوق اليمن':
    'سوق اليمن هو أكبر منصة للإعلانات والمزادات في اليمن. نقدم خدمة بيع وشراء السيارات، العقارات، الجوالات، وغيرها. تصفح أكثر من 16 فئة مختلفة!',
  
  'كيف اضيف|كيف انشر|كيف اعلن|اضافة اعلان|نشر اعلان|انشاء اعلان':
    'لإضافة إعلان:\n1) سجل دخول\n2) اضغط "إضافة إعلان"\n3) اختر الفئة واملأ التفاصيل\n4) اضغط نشر\n\nأو يمكنك البدء من هنا بكتابة "أضف إعلان".\nرابط مباشر: /add',

  'فئات|اقسام|تصنيفات|categories':
    'أهم الفئات:\n🚗 سيارات\n🏠 عقارات\n📱 جوالات\n💻 إلكترونيات\n☀️ طاقة شمسية\n...وغيرها الكثير في القائمة الرئيسية.',

  'محادثة|شات|تواصل مع البائع|كيف اكلم':
    'افتح الإعلان واضغط زر "💬 محادثة" للتواصل المباشر والآمن مع البائع.',

  'مزاد|مزادات|auction':
    'المزادات تتيح لك المزايدة للحصول على أفضل سعر. ابحث عن علامة "مزاد" على الإعلانات.',

  'تسجيل|حساب|دخول|login|register':
    'يمكنك التسجيل بسهولة عبر البريد الإلكتروني أو حساب Google من زر "تسجيل" في الأعلى.',

  'بحث|search|ابحث|كيف ابحث':
    'استخدم شريط البحث في الأعلى أو الفلاتر لتحديد الفئة والمدينة والسعر.',

  'صور|اضافة صور|رفع صور':
    'يمكنك إضافة حتى 8 صور لكل إعلان. ننصح بصور واضحة لزيادة فرص البيع.',

  'سعر|اسعار|price|عملات':
    'ندعم الريال اليمني، السعودي، والدولار. يمكنك اختيار "قابل للتفاوض" أيضاً.',

  'موقع|خريطة|location|map|عنوان':
    'نستخدم الخرائط لتحديد موقع السلعة بدقة، مما يسهل الوصول إليها.',

  'مساعدة|دعم|help|support|مشكلة':
    'للمساعدة، تواصل معنا عبر صفحة /contact أو زر الدعم الفني.',

  'شروط|سياسة|privacy|terms':
    'تجد الشروط والسياسة في أسفل الموقع: /terms و /privacy',
    
  'حذف اعلان|ازالة اعلان':
    'لحذف إعلانك: اذهب لصفحة "إعلاناتي"، اختر الإعلان، واضغط "حذف".',
    
  'تعديل اعلان|تغيير سعر':
    'لتعديل الإعلان: من "إعلاناتي"، اختر الإعلان واضغط "تعديل".',
    
  'مميزة|تثبيت اعلان':
    'ثبت إعلانك في الأعلى لزيادة المشاهدات. تفاصيل الخدمات المميزة في: /premium',
    
  'نصائح للبيع|كيف ابيع':
    'للبيع السريع: صور واضحة، وصف دقيق، وسعر منافس.',
    
  'امان|نصب|احتيال|ابلاغ':
    'لا تحول مالاً مسبقاً. قابل البائع في مكان عام. للإبلاغ عن مخالفة استخدم زر "⚠️ إبلاغ".'
};

// =========================
// التفاعلات الاجتماعية
// =========================

const SOCIAL_INTERACTIONS = {
  morning: {
    patterns: ['صباح الخير', 'صباح النور', 'صباح'],
    responses: ['صباح النور والسرور ☀️', 'صباح الخير! كيف يمكنني مساعدتك اليوم؟ 🌹', 'صباح التفاؤل والنشاط 🌞']
  },
  evening: {
    patterns: ['مساء الخير', 'مساء النور', 'مساء'],
    responses: ['مساء الورد 🌙', 'مساء النور، تفضل أنا في خدمتك 🌜', 'أسعد الله مساءك بكل خير 🌹']
  },
  greetings: {
    patterns: ['سلام', 'السلام عليكم', 'هلا', 'مرحبا', 'مرحباً', 'hi', 'hello'],
    responses: ['وعليكم السلام ورحمة الله 👋', 'أهلاً بك في سوق اليمن 🇾🇪', 'يا هلا والله! آمرني 🌹', 'مرحباً! كيف أقدر أساعدك؟']
  },
  thanks: {
    patterns: ['شكرا', 'مشكور', 'يعطيك العافية', 'تسلم', 'thanks'],
    responses: ['العفو، واجبي! 😊', 'الله يعافيك 🌹', 'في الخدمة دائماً 🙏', 'على الرحب والسعة']
  },
  howAreYou: {
    patterns: ['كيف حالك', 'كيفك', 'اخبارك', 'علومك'],
    responses: ['أنا بخير والحمد لله، شكراً لسؤالك! أنت كيفك؟ 😊', 'بأفضل حال طالما أقدر أخدمك 🤖']
  },
  compliments: {
    patterns: ['كفو', 'ممتاز', 'ذكي', 'احسنت', 'بطل'],
    responses: ['شكراً لك، هذا من ذوقك 🌹', 'نسعى دائماً لتقديم الأفضل! 💪', 'كلامك يشجعني، شكراً! 😊']
  },
  goodbye: {
    patterns: ['مع السلامة', 'باي', 'وداعا', 'تصبح على خير'],
    responses: ['في أمان الله 👋', 'مع السلامة، ننتظر عودتك 🌹', 'إلى اللقاء!']
  }
};

// =========================
// دوال مساعدة (Helpers)
// =========================

function normalizeText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // إبقاء الأحرف والأرقام فقط
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// تحسين البحث في الـ FAQ
function findBestMatch(message: string): string | null {
  const normMsg = normalizeText(message);
  for (const [pattern, response] of Object.entries(KNOWLEDGE_BASE)) {
    const keywords = pattern.split('|');
    // البحث عن أي كلمة مفتاحية ككلمة كاملة أو جزء ذو معنى
    if (keywords.some(k => normMsg.includes(normalizeText(k)))) {
      return response;
    }
  }
  return null;
}

function detectCategorySlug(raw: string): string | null {
  const t = normalizeText(raw);
  for (const c of CATEGORIES) {
    if (t.includes(normalizeText(c.slug))) return c.slug;
    for (const kw of c.keywords) {
      if (t.includes(normalizeText(kw))) return c.slug;
    }
  }
  return null;
}

function normalizePhone(raw: string): string {
  let s = String(raw || '').trim().replace(/[\s\-()]/g, '').replace(/[^0-9+]/g, '');
  // تصحيح الأرقام اليمنية الشائعة
  if (s.startsWith('00967')) s = '+' + s.substring(2);
  else if (s.startsWith('967')) s = '+' + s;
  else if (s.startsWith('7') && s.length === 9) s = '+967' + s; // افتراض إضافة المفتاح
  return s;
}

function isValidPhone(phone: string): boolean {
  const p = normalizePhone(phone);
  const digits = p.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

function detectCurrency(text: string): string {
  const t = normalizeText(text);
  if (t.includes('سعود') || t.includes('sar')) return 'SAR';
  if (t.includes('دولار') || t.includes('usd') || t.includes('$')) return 'USD';
  return 'YER';
}

function extractNumber(text: string): number | null {
  const m = text.replace(/[,،]/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// =========================
// إدارة الـ Rate Limit & Cache
// =========================

function checkRateLimit(userId: string): boolean {
  const key = `rl_${userId}`;
  const now = Date.now();
  const timestamps = rateLimiter.get(key) || [];
  
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) return false;
  
  validTimestamps.push(now);
  rateLimiter.set(key, validTimestamps);
  return true;
}

async function cachedFetch<T>(key: string, fetchFn: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const cached = LRU_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }
  const data = await fetchFn();
  LRU_CACHE.set(key, { data, timestamp: Date.now() });
  return data;
}

// =========================
// Firebase Auth & Db
// =========================

async function getUserFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!token) return null;
  if (!adminAuth) return { error: 'server_config_error' };

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.displayName || null,
    };
  } catch (e) {
    return null;
  }
}

async function loadDraft(uid: string) {
  if (!adminDb) return null;
  const snap = await adminDb.collection(DRAFTS_COLLECTION).doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function saveDraft(uid: string, data: any) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).set({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function clearDraft(uid: string) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).delete();
}

// =========================
// منطق المساعد الذكي (AI Logic)
// =========================

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function runAiAnalysis(message: string, history: any[]) {
  // بناء المحادثة
  const messages = [
    {
      role: 'system',
      content: `
      You are a smart assistant for 'Souq Yemen'. 
      Roles: 
      1. Answer general questions about the site (listings, auctions, account).
      2. If user wants to SELL/ADD listing -> Action: "create_listing", Extract data.
      3. If user asks "How many cars/phones..." -> Action: "count_listings", Category: "cars/phones".
      4. Otherwise -> Action: "none", Reply normally in Arabic.
      
      Output JSON strictly: { "action": "...", "reply": "...", "category": "...", "listing": { ...extracted_fields } }
      Supported Categories: ${CATEGORIES.map(c => c.slug).join(', ')}
      `
    },
    ...history.slice(-5).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: message }
  ];

  // محاولة استخدام Gemini أولاً (أرخص وأسرع)
  if (GEMINI_API_KEY && ASSISTANT_PREFER_GEMINI) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: JSON.stringify(messages) }] }], // تبسيط لـ Gemini
            generationConfig: { responseMimeType: 'application/json' }
          }),
        },
        OPENAI_TIMEOUT_MS
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      }
    } catch (e) {
      console.error('Gemini Error, falling back...');
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: messages.map(m => ({ role: m.role, content: m.content || '' })), // OpenAI expects standard format
            response_format: { type: 'json_object' }
          }),
        },
        OPENAI_TIMEOUT_MS
      );
      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('OpenAI Error:', e);
    }
  }

  return null;
}

// =========================
// معالج إضافة الإعلان (Wizard State Machine)
// =========================

const WIZARD_STEPS = ['category', 'title', 'description', 'city', 'phone', 'location', 'price', 'confirm'];

function getNextStep(current: string): string {
  const idx = WIZARD_STEPS.indexOf(current);
  return (idx >= 0 && idx < WIZARD_STEPS.length - 1) ? WIZARD_STEPS[idx + 1] : 'confirm';
}

function getPrevStep(current: string): string {
  const idx = WIZARD_STEPS.indexOf(current);
  return (idx > 0) ? WIZARD_STEPS[idx - 1] : 'category';
}

function getStepPrompt(step: string, data: any): string {
  const common = '\n\n(أوامر: "رجوع"، "تعديل"، "إلغاء")';
  switch (step) {
    case 'category': return 'ما هو قسم الإعلان؟ (مثال: سيارات، عقارات، جوالات)' + common;
    case 'title': return 'اكتب عنواناً مميزاً للإعلان (مثال: تويوتا كورولا 2020 نظيفة).' + common;
    case 'description': return 'اكتب وصفاً تفصيلياً للإعلان والمواصفات.' + common;
    case 'city': return 'في أي مدينة يوجد المنتج؟' + common;
    case 'phone': return 'ما هو رقم الجوال للتواصل؟' + common;
    case 'location': return 'أرسل موقعك (Location) أو رابط خريطة، أو اكتب اسم الحي.' + common;
    case 'price': return 'كم السعر المطلوب؟ (حدد العملة إذا أمكن).' + common;
    case 'confirm': 
      return `📋 مراجعة الإعلان:\n` +
             `العنوان: ${data.title}\nالسعر: ${data.originalPrice} ${data.originalCurrency}\n` +
             `هل أنت متأكد من النشر؟ (اكتب "نشر" للتأكيد)`;
    default: return '';
  }
}

async function handleWizard(user: any, message: string, meta: any) {
  const uid = user.uid;
  let draft = await loadDraft(uid);
  const normalizedMsg = normalizeText(message);

  // 1. بدء مسودة جديدة
  if (!draft || normalizedMsg.includes('اضف اعلان') || normalizedMsg.includes('اعلان جديد')) {
    draft = { step: 'category', data: {} };
    await saveDraft(uid, draft);
    return { reply: 'أهلاً بك! لنبدأ إضافة إعلان جديد. 📝\n' + getStepPrompt('category', draft.data) };
  }

  // 2. أوامر التحكم
  if (normalizedMsg === 'الغاء' || normalizedMsg === '/cancel') {
    await clearDraft(uid);
    return { reply: 'تم إلغاء العملية. يمكنك البدء من جديد في أي وقت. ❌' };
  }
  
  if (normalizedMsg === 'رجوع' || normalizedMsg === 'السابق') {
    draft.step = getPrevStep(draft.step);
    await saveDraft(uid, draft);
    return { reply: '↩️ رجعنا للخطوة السابقة.\n' + getStepPrompt(draft.step, draft.data) };
  }

  // 3. معالجة البيانات حسب الخطوة
  const data = draft.data;
  const step = draft.step;

  switch (step) {
    case 'category':
      const cat = detectCategorySlug(message);
      if (!cat) return { reply: '⚠️ لم أفهم القسم. الرجاء الاختيار من القائمة (سيارات، عقارات...)' };
      data.category = cat;
      draft.step = 'title';
      break;

    case 'title':
      if (message.length < 3) return { reply: '⚠️ العنوان قصير جداً. اكتب عنواناً واضحاً.' };
      data.title = message;
      draft.step = 'description';
      break;

    case 'description':
      if (message.length < 10) return { reply: '⚠️ الوصف قصير. اشرح التفاصيل بشكل أفضل (10 أحرف على الأقل).' };
      data.description = message;
      draft.step = 'city';
      break;

    case 'city':
      data.city = message;
      draft.step = 'phone';
      break;

    case 'phone':
      const ph = normalizePhone(message);
      if (!isValidPhone(ph)) return { reply: '⚠️ رقم الهاتف يبدو غير صحيح. حاول مرة أخرى.' };
      data.phone = ph;
      draft.step = 'location';
      break;

    case 'location':
      // محاولة استخراج الموقع من الميتا أو النص
      if (meta?.location?.lat) {
        data.lat = meta.location.lat;
        data.lng = meta.location.lng;
        data.locationLabel = 'موقع محدد على الخريطة';
      } else if (message.includes('http')) {
         data.locationLabel = `رابط: ${message}`; // يمكن تحسين استخراج الرابط
      } else {
        data.locationLabel = message;
      }
      draft.step = 'price';
      break;

    case 'price':
      const price = extractNumber(message);
      if (!price) return { reply: '⚠️ الرجاء كتابة السعر كرقم (مثال: 50000).' };
      data.originalPrice = price;
      data.originalCurrency = detectCurrency(message);
      draft.step = 'confirm';
      break;

    case 'confirm':
      if (normalizedMsg.includes('نشر') || normalizedMsg.includes('تاكيد')) {
        // الحفظ النهائي في الداتابيس
        try {
          const listingData = {
            ...data,
            userId: user.uid,
            userName: user.name,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // تحويل العملة افتراضياً للريال اليمني إذا لزم الأمر
            priceYER: data.originalCurrency === 'SAR' ? data.originalPrice * DEFAULT_SAR : data.originalPrice
          };
          
          const ref = await adminDb!.collection('listings').add(listingData);
          await clearDraft(uid);
          return { reply: `🎉 تم نشر الإعلان بنجاح!\nرقم الإعلان: ${ref.id}\nيمكنك مشاهدته في صفحة "إعلاناتي".` };
        } catch (e) {
          console.error(e);
          return { reply: 'حدث خطأ أثناء النشر. حاول مرة أخرى لاحقاً.' };
        }
      }
      break;
  }

  await saveDraft(uid, draft);
  return { reply: getStepPrompt(draft.step, draft.data) };
}

// =========================
// Main Handler (POST)
// =========================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { message, history, meta } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. التحقق من Rate Limit
    const user = await getUserFromRequest(request);
    const userId = user?.uid || 'anonymous';
    
    if (!checkRateLimit(userId)) {
      return NextResponse.json({ reply: '⏳ يرجى الانتظار قليلاً قبل إرسال رسالة أخرى.' }, { status: 429 });
    }

    const normalizedMsg = normalizeText(message);

    // 2. التحقق من وجود مسودة نشطة (Wizard Mode)
    // إذا كان المستخدم مسجلاً ولديه مسودة، أو يطلب صراحة إضافة إعلان
    const activeDraft = user && !user.error ? await loadDraft(user.uid) : null;
    const isWizardIntent = normalizedMsg.includes('اضف اعلان') || normalizedMsg.includes('اعلان جديد');

    if ((activeDraft || isWizardIntent) && user && !user.error) {
      const wizardResponse = await handleWizard(user, message, meta);
      return NextResponse.json(wizardResponse);
    } else if (isWizardIntent && (!user || user.error)) {
       return NextResponse.json({ reply: '🔒 يرجى تسجيل الدخول أولاً لإضافة إعلان.' });
    }

    // 3. التحقق من FAQ (قاعدة المعرفة المحلية)
    const faqAnswer = findBestMatch(message);
    if (faqAnswer) {
      return NextResponse.json({ reply: faqAnswer });
    }

    // 4. التحقق من التفاعلات الاجتماعية السريعة
    for (const group of Object.values(SOCIAL_INTERACTIONS)) {
      if (group.patterns.some(p => normalizedMsg.includes(normalizeText(p)))) {
        const reply = group.responses[Math.floor(Math.random() * group.responses.length)];
        return NextResponse.json({ reply });
      }
    }

    // 5. استخدام الذكاء الاصطناعي (AI Fallback)
    const aiResult = await runAiAnalysis(message, history || []);
    
    if (aiResult) {
      // تنفيذ الأوامر من الـ AI
      if (aiResult.action === 'count_listings' && adminDb) {
        const catSlug = detectCategorySlug(aiResult.category || '');
        let q = adminDb.collection('listings').where('isActive', '==', true);
        if (catSlug) q = q.where('category', '==', catSlug);
        
        const snapshot = await q.count().get();
        const count = snapshot.data().count;
        return NextResponse.json({ reply: `📊 يوجد حالياً ${count} إعلان في هذا القسم.` });
      }
      
      if (aiResult.reply) {
        return NextResponse.json({ reply: aiResult.reply });
      }
    }

    // 6. رد افتراضي إذا فشل كل شيء
    return NextResponse.json({ 
      reply: 'عذراً، لم أفهم سؤالك تماماً. 🤔\nيمكنك سؤالي عن:\n- إضافة إعلان\n- أسعار السيارات\n- طريقة التسجيل' 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message }, 
      { status: 500 }
    );
  }
}

// =========================
// Main Handler (GET) - Stats
// =========================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('action') === 'stats' && adminDb) {
    const listingsCount = await adminDb.collection('listings').count().get();
    const usersCount = await adminDb.collection('users').count().get();
    
    return NextResponse.json({
      listings: listingsCount.data().count,
      users: usersCount.data().count,
      status: 'healthy'
    });
  }

  return NextResponse.json({ msg: 'Souq Yemen Assistant API v2.0 (Optimized)' });
}
