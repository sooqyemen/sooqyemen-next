import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// =========================
// مساعد ذكي (FAQ + إحصاءات + إنشاء إعلان عبر محادثة)
// =========================

// قاعدة معرفية بسيطة (FAQ)
const knowledgeBase = {
  // أسئلة حول الموقع
  'ما هو|ماهو|ايش هو|شنو هو':
    'سوق اليمن هو أكبر منصة للإعلانات والمزادات في اليمن. نقدم خدمة بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات، والمزيد. يمكنك تصفح أكثر من 16 فئة مختلفة.',

  // كيفية إضافة إعلان
  'كيف اضيف|كيف انشر|كيف اعلن|اضافة اعلان|نشر اعلان':
    'لإضافة إعلان، اتبع هذه الخطوات:\n1) سجل دخول أو أنشئ حساب جديد\n2) اضغط على زر "إضافة إعلان" من القائمة\n3) اختر الفئة المناسبة\n4) املأ تفاصيل الإعلان وأضف الصور\n5) اضغط نشر\n\nيمكنك الانتقال مباشرة لصفحة الإضافة من هنا: /add',

  // الفئات المتاحة
  'فئات|اقسام|تصنيفات|categories':
    'الفئات المتوفرة في سوق اليمن:\n🚗 سيارات\n🏠 عقارات\n📱 جوالات\n💻 إلكترونيات\n🏍️ دراجات نارية\n🚜 معدات ثقيلة\n☀️ طاقة شمسية\n🌐 نت وشبكات\n🔧 صيانة\n🛋️ أثاث\n🏡 أدوات منزلية\n👔 ملابس\n🐾 حيوانات وطيور\n💼 وظائف\n⚙️ خدمات\n📦 أخرى',

  // المحادثات
  'محادثة|شات|تواصل مع البائع':
    'يمكنك التواصل مع البائع مباشرة من خلال:\n1) افتح صفحة الإعلان\n2) اضغط على زر "💬 محادثة"\n3) ابدأ المحادثة مع البائع\n\nيمكنك أيضاً مراجعة جميع محادثاتك من صفحة "محادثاتي".',

  // المزادات
  'مزاد|مزادات|auction':
    'المزادات في سوق اليمن تتيح لك:\n• المزايدة على المنتجات\n• متابعة المزادات المفتوحة\n• الحصول على أفضل الأسعار\n\nابحث عن الإعلانات التي تحتوي على علامة "مزاد" للمشاركة.',

  // التسجيل والحساب
  'تسجيل|حساب|دخول|login|register':
    'للتسجيل في سوق اليمن:\n1) اضغط على "تسجيل" من القائمة\n2) أدخل بريدك الإلكتروني وكلمة المرور\n3) أكمل البيانات الشخصية\n\nأو يمكنك استخدام التسجيل السريع عبر Google.',

  // البحث
  'بحث|search|ابحث':
    'للبحث عن إعلان:\n1) استخدم شريط البحث في الأعلى\n2) أو تصفح الفئات المختلفة\n3) استخدم الفلاتر لتضييق النتائج\n\nيمكنك أيضاً استخدام الخريطة للبحث حسب الموقع.',

  // معلومات الإعلان
  'صور|اضافة صور|رفع صور':
    'يمكنك إضافة حتى 8 صور لكل إعلان. تأكد من:\n• جودة الصور عالية\n• الصور واضحة وتظهر المنتج بشكل جيد\n• تنوع الزوايا',

  // الأسعار
  'سعر|اسعار|price|prices':
    'في سوق اليمن يمكنك عرض الأسعار بـ:\n• الريال اليمني (ر.ي)\n• الريال السعودي (SAR)\n• الدولار الأمريكي (USD)\n\nيمكنك أيضاً اختيار "قابل للتفاوض" إذا كنت مرناً في السعر.',

  // الموقع
  'موقع|خريطة|location|map':
    'نستخدم الخرائط التفاعلية لمساعدتك في:\n• تحديد موقع المنتج\n• البحث حسب المنطقة\n• معرفة المسافة من موقعك\n\nيمكنك تفعيل الموقع للحصول على نتائج أدق.',

  // الدعم والمساعدة
  'مساعدة|دعم|help|support|مشكلة':
    'إذا كنت تواجه أي مشكلة:\n• تفضل بزيارة صفحة المساعدة: /help\n• أو تواصل معنا: /contact\n\nنحن هنا لمساعدتك! 😊',

  // شروط الاستخدام
  'شروط|سياسة|privacy|terms':
    'للاطلاع على:\n• شروط الاستخدام: /terms\n• سياسة الخصوصية: /privacy\n\nنحن نحترم خصوصيتك ونحمي بياناتك.',
};

// =========================
// إعدادات + أدوات مساعدة
// =========================

const DEFAULT_SAR = 425; // 1 SAR = 425 YER
const DEFAULT_USD = 1632; // 1 USD = 1632 YER
const DRAFTS_COLLECTION = 'assistant_drafts';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
// افتراضيًا: إذا كان Gemini متاح نستخدمه أولاً (لأنه غالباً أرخص/مجاني)
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';

const CATEGORIES = [
  { slug: 'cars', name: 'سيارات', keywords: ['سيارة', 'سيارات', 'car', 'cars'] },
  { slug: 'realestate', name: 'عقارات', keywords: ['عقار', 'عقارات', 'شقة', 'شقق', 'أرض', 'ارض', 'realestate', 'estate'] },
  { slug: 'phones', name: 'جوالات', keywords: ['جوال', 'جوالات', 'هاتف', 'هواتف', 'phone', 'phones'] },
  { slug: 'electronics', name: 'إلكترونيات', keywords: ['الكترونيات', 'إلكترونيات', 'electronics'] },
  { slug: 'motorcycles', name: 'دراجات نارية', keywords: ['دراجة', 'دراجات', 'دراجات نارية', 'motorcycle', 'motorcycles'] },
  { slug: 'heavy_equipment', name: 'معدات ثقيلة', keywords: ['معدات', 'معدات ثقيلة', 'شيول', 'حفار', 'heavy', 'equipment'] },
  { slug: 'solar', name: 'طاقة شمسية', keywords: ['طاقة شمسية', 'الواح', 'ألواح', 'بطاريات', 'solar'] },
  { slug: 'networks', name: 'نت وشبكات', keywords: ['نت', 'شبكات', 'انترنت', 'internet', 'networks'] },
  { slug: 'maintenance', name: 'صيانة', keywords: ['صيانة', 'تصليح', 'maintenance'] },
  { slug: 'furniture', name: 'أثاث', keywords: ['اثاث', 'أثاث', 'furniture'] },
  { slug: 'home_tools', name: 'أدوات منزلية', keywords: ['ادوات منزلية', 'أدوات منزلية', 'home tools'] },
  { slug: 'clothes', name: 'ملابس', keywords: ['ملابس', 'clothes'] },
  { slug: 'animals', name: 'حيوانات وطيور', keywords: ['حيوانات', 'طيور', 'حيوان', 'animal', 'animals'] },
  { slug: 'jobs', name: 'وظائف', keywords: ['وظائف', 'وظيفة', 'job', 'jobs'] },
  { slug: 'services', name: 'خدمات', keywords: ['خدمات', 'service', 'services'] },
  { slug: 'other', name: 'أخرى', keywords: ['اخرى', 'أخرى', 'other'] },
];

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function categoryNameFromSlug(slug) {
  const item = CATEGORIES.find((c) => c.slug === slug);
  return item ? item.name : slug;
}

function detectCategorySlug(raw) {
  const t = normalizeText(raw);

  // match slug directly
  for (const c of CATEGORIES) {
    if (t.includes(normalizeText(c.slug))) return c.slug;
  }

  // match keywords
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      const k = normalizeText(kw);
      if (k && t.includes(k)) return c.slug;
    }
  }

  return null;
}

// دالة لإيجاد أفضل تطابق (FAQ)
function findBestMatch(message) {
  const lowerMessage = normalizeText(message);

  for (const [pattern, response] of Object.entries(knowledgeBase)) {
    const patterns = pattern.split('|');
    if (
      patterns.some((p) => {
        const p2 = normalizeText(p);
        const regex = new RegExp(`(^|\\s)${escapeRegex(p2)}($|\\s|[،.؟!])`, 'i');
        return regex.test(lowerMessage) || lowerMessage.includes(p2);
      })
    ) {
      return response;
    }
  }
  return null;
}

// ردود عامة
const greetings = ['مرحبا', 'اهلا', 'السلام', 'صباح', 'مساء', 'هلا', 'هلو', 'hello', 'hi'];
const thanks = ['شكرا', 'شكراً', 'يعطيك', 'thanks', 'thank you'];

// =========================
// Auth helpers
// =========================

async function getUserFromRequest(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  const token = m && m[1] ? m[1].trim() : '';
  if (!token) return null;
  if (!adminAuth) return { error: 'admin_not_configured' };

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

function adminNotReadyMessage() {
  return (
    'هذه الميزة تحتاج تفعيل Firebase Admin في بيئة الاستضافة.\n\n' +
    'تأكد من إضافة المتغيرات التالية في Vercel/Netlify ثم أعد النشر:\n' +
    '• FIREBASE_PROJECT_ID\n' +
    '• FIREBASE_CLIENT_EMAIL\n' +
    '• FIREBASE_PRIVATE_KEY\n\n' +
    'بعدها سيقدر المساعد يحسب الأعداد ويضيف إعلانات لك وأنت مسجل دخول.'
  );
}

// =========================
// Counts (كم إعلان؟)
// =========================

function extractCountIntent(messageRaw) {
  const t = normalizeText(messageRaw);
  const asksHowMany = t.startsWith('كم') || t.includes('كم ') || t.includes('عدد') || t.includes('احص');
  if (!asksHowMany) return null;

  const mentionsAds = t.includes('اعلان') || t.includes('اعلانات') || t.includes('إعلان') || t.includes('إعلانات');
  const cat = detectCategorySlug(t);

  // أمثلة: "كم اعلان سيارات" أو "كم سيارات" أو "عدد عقارات"
  if (mentionsAds || cat || t.includes('عقار') || t.includes('سيار') || t.includes('جوال')) {
    return { category: cat };
  }

  return null;
}

async function tryCountListings(categorySlug) {
  if (!adminDb) return { ok: false, reason: 'admin_not_configured' };

  const base = adminDb.collection('listings').where('isActive', '==', true);
  const q = categorySlug ? base.where('category', '==', categorySlug) : base;

  // "hidden" قد يكون غير موجود في بعض الإعلانات؛ لذلك: public = totalActive - hiddenTrue
  try {
    const [totalAgg, hiddenAgg] = await Promise.all([
      q.count().get(),
      q.where('hidden', '==', true).count().get(),
    ]);

    const totalActive = Number(totalAgg?.data()?.count || 0);
    const hiddenTrue = Number(hiddenAgg?.data()?.count || 0);
    const publicCount = Math.max(0, totalActive - hiddenTrue);
    return { ok: true, totalActive, hiddenTrue, publicCount };
  } catch (e) {
    // fallback: قراءة عدد محدود (غير مثالي، لكنه يمنع انهيار المساعد)
    try {
      const limit = 5000;
      const snap = await q.limit(limit).get();
      const approx = snap.size;
      return { ok: true, totalActive: approx, hiddenTrue: 0, publicCount: approx, approximate: snap.size >= limit };
    } catch (e2) {
      return { ok: false, reason: 'count_failed' };
    }
  }
}

// =========================
// Listing Wizard (إضافة إعلان عبر الشات)
// =========================

function isStartCreateListing(messageRaw) {
  const t = normalizeText(String(messageRaw || '').trim().replace(/^\/+\s*/, ''));
  return (
    t.includes('اضف اعلان') ||
    t.includes('اضافه اعلان') ||
    t.includes('انشئ اعلان') ||
    t.includes('سوي اعلان') ||
    t.includes('ابغى اعلان') ||
    t.includes('ابغى اضيف اعلان')
  );
}

function isCancel(messageRaw) {
  const t = normalizeText(String(messageRaw || '').trim().replace(/^\/+\s*/, ''));
  return t === 'الغاء' || t === 'إلغاء' || t.includes('الغاء') || t.includes('كنسل') || t.includes('cancel') || t.includes('حذف المسوده');
}

function isConfirmPublish(messageRaw) {
  const t = normalizeText(String(messageRaw || '').trim().replace(/^\/+\s*/, ''));
  return t === 'نشر' || t === 'انشر' || t.includes('تاكيد') || t.includes('تأكيد') || t.includes('اعتماد') || t.includes('نشر الاعلان');
}

function normalizeImagesMeta(metaImages) {
  if (!metaImages) return [];
  const arr = Array.isArray(metaImages) ? metaImages : [metaImages];
  const urls = arr
    .map((it) => {
      if (!it) return null;
      if (typeof it === 'string') return it;
      if (typeof it === 'object') return it.url || it.downloadURL || it.href || null;
      return null;
    })
    .filter((u) => typeof u === 'string' && u.trim().startsWith('http'))
    .map((u) => u.trim());

  // unique
  const out = [];
  for (const u of urls) {
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

function extractNumber(messageRaw) {
  const t = String(messageRaw || '').replace(/[,،]/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function detectCurrency(messageRaw) {
  const t = normalizeText(messageRaw);
  if (t.includes('sar') || t.includes('سعود') || t.includes('ريال سعودي')) return 'SAR';
  if (t.includes('usd') || t.includes('دولار') || t.includes('$')) return 'USD';
  return 'YER';
}

function normalizePhone(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/[\s\-()]/g, '')
    .replace(/[^0-9+]/g, '');

  // +9677xxxxxxxx
  if (s.startsWith('+')) {
    const digits = s.replace(/[^0-9]/g, '');
    // keep leading +
    return `+${digits}`;
  }
  return s;
}

function isValidPhone(phone) {
  const p = normalizePhone(phone);
  const digits = p.replace(/[^0-9]/g, '');

  // Accept Yemen-like numbers (very lenient):
  // - 9 digits starting with 7 (e.g., 777123456)
  // - or 12 digits starting with 9677 (e.g., 967777123456)
  if (digits.length === 9 && digits.startsWith('7')) return true;
  if (digits.length === 12 && digits.startsWith('9677')) return true;
  return digits.length >= 7 && digits.length <= 15;
}

function extractLatLngFromText(messageRaw) {
  const t = String(messageRaw || '');
  // match: 15.3694, 44.1910 OR 15.3694 44.1910
  const m = t.match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function extractMapsLink(messageRaw) {
  const t = String(messageRaw || '');
  const m = t.match(/https?:\/\/\S+/i);
  if (!m) return null;
  const url = m[0];
  // accept most map links (google maps / goo.gl / openstreetmap)
  if (/google\.[^/]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|openstreetmap\.org/i.test(url)) return url;
  return url;
}

async function getRatesServer() {
  if (!adminDb) return { sar: DEFAULT_SAR, usd: DEFAULT_USD };
  try {
    const snap = await adminDb.collection('settings').doc('rates').get();
    const raw = snap.exists ? snap.data() : null;
    const sar = raw && raw.sar != null ? Number(raw.sar) : raw && raw.sarToYer != null ? Number(raw.sarToYer) : DEFAULT_SAR;
    const usd = raw && raw.usd != null ? Number(raw.usd) : raw && raw.usdToYer != null ? Number(raw.usdToYer) : DEFAULT_USD;
    return {
      sar: sar > 0 ? sar : DEFAULT_SAR,
      usd: usd > 0 ? usd : DEFAULT_USD,
    };
  } catch {
    return { sar: DEFAULT_SAR, usd: DEFAULT_USD };
  }
}

function toYERServer(amount, currency, rates) {
  const v = Number(amount || 0);
  if (!v || !isFinite(v)) return 0;
  if (currency === 'SAR') return Math.round(v * (rates?.sar || DEFAULT_SAR));
  if (currency === 'USD') return Math.round(v * (rates?.usd || DEFAULT_USD));
  return Math.round(v);
}

async function loadDraft(uid) {
  if (!adminDb) return null;
  const ref = adminDb.collection(DRAFTS_COLLECTION).doc(uid);
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

async function saveDraft(uid, data) {
  if (!adminDb) return;
  const ref = adminDb.collection(DRAFTS_COLLECTION).doc(uid);
  await ref.set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function clearDraft(uid) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).delete();
}

function categoriesHint() {
  const lines = CATEGORIES.map((c) => `• ${c.name} (${c.slug})`);
  return lines.join('\n');
}

function draftSummary(d) {
  const data = d?.data || {};
  const parts = [];
  if (data.category) parts.push(`القسم: ${categoryNameFromSlug(data.category)}`);
  if (data.title) parts.push(`العنوان: ${data.title}`);
  if (data.description) parts.push(`الوصف: ${data.description}`);
  if (data.city) parts.push(`المدينة: ${data.city}`);
  if (data.phone) parts.push(`الجوال: ${data.phone}`);
  if (data.locationLabel) parts.push(`الموقع: ${data.locationLabel}`);
  if (data.lat != null && data.lng != null) parts.push(`الإحداثيات: ${data.lat}, ${data.lng}`);
  if (data.originalPrice) {
    parts.push(`السعر: ${data.originalPrice} ${data.originalCurrency || 'YER'}`);
  }
  if (Array.isArray(data.images) && data.images.length) {
    parts.push(`الصور: ${data.images.length}`);
  }
  return parts.join('\n');
}

function listingNextPrompt(step, draft) {
  if (step === 'category') {
    return (
      'الخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' +
      categoriesHint() +
      '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)'
    );
  }

  if (step === 'title') {
    return 'الخطوة 2/7: اكتب عنوان الإعلان.';
  }

  if (step === 'description') {
    return 'الخطوة 3/7: اكتب وصف الإعلان (على الأقل 10 أحرف).';
  }

  if (step === 'city') {
    return 'الخطوة 4/7: اكتب اسم المدينة.';
  }

  if (step === 'phone') {
    return 'الخطوة 5/7: اكتب رقم الجوال للتواصل (مثال: 777123456 أو +967777123456).';
  }

  if (step === 'location') {
    return (
      'الخطوة 6/7: حدّد موقع الإعلان.\n' +
      '• اضغط زر "📍 موقعي" داخل الشات لإرسال الإحداثيات تلقائياً\n' +
      '• أو اكتب الإحداثيات بهذا الشكل: 15.3694, 44.1910\n' +
      '• أو أرسل رابط خرائط جوجل\n\n' +
      'تقدر أيضاً تكتب اسم الحي/المنطقة (مثال: صنعاء - حدة).'
    );
  }

  if (step === 'price') {
    return 'الخطوة 7/7: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.';
  }

  return (
    'هذه مسودة الإعلان الحالية:\n\n' +
    draftSummary(draft) +
    '\n\nيمكنك إضافة صور الآن عبر زر 📷 صور داخل الشات.\n\nإذا كل شيء تمام اكتب: نشر\nأو اكتب: إلغاء لإلغاء المسودة.'
  );
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: String(entry.content || entry.text || '').trim(),
    }))
    .filter((entry) => entry.content);
}

function sanitizeCurrency(currency) {
  if (currency === 'SAR' || currency === 'USD' || currency === 'YER') return currency;
  return 'YER';
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// =========================
// Auto extraction (تحويل كلام المستخدم إلى مسودة إعلان كاملة)
// =========================

function extractFirstPhone(messageRaw) {
  const t = String(messageRaw || '');
  // Grab likely phone sequences: +digits or long digit groups
  const candidates = t.match(/\+?\d[\d\s\-()]{6,}\d/g) || [];
  for (const c of candidates) {
    const normalized = normalizePhone(c);
    if (normalized && isValidPhone(normalized)) return normalized;
  }
  // fallback: any 7-15 digits
  const digitsOnly = t.replace(/[^0-9\s]/g, ' ');
  const groups = digitsOnly.split(/\s+/).filter(Boolean);
  for (const g of groups) {
    if (g.length >= 7 && g.length <= 15) {
      const normalized = normalizePhone(g);
      if (normalized && isValidPhone(normalized)) return normalized;
    }
  }
  return null;
}

function looksLikeListingDetails(messageRaw, meta) {
  const t = normalizeText(messageRaw);
  const hasDigits = /\d/.test(t);
  const hasPriceHints = hasDigits && (t.includes('سعر') || t.includes('ريال') || t.includes('دولار') || t.includes('sar') || t.includes('usd') || t.includes('$'));
  const hasSellingWords = t.includes('للبيع') || t.includes('معروض') || t.includes('مطلوب') || t.includes('عرض');
  const hasCategory = Boolean(detectCategorySlug(t));
  const phone = extractFirstPhone(messageRaw);
  const hasPhone = Boolean(phone);
  const hasLocation =
    meta?.location?.lat != null ||
    meta?.location?.lng != null ||
    Boolean(extractLatLngFromText(messageRaw)) ||
    Boolean(extractMapsLink(messageRaw));
  const hasImages = Array.isArray(meta?.images) && meta.images.length > 0;

  return (
    (hasPhone && (hasPriceHints || hasCategory || hasSellingWords)) ||
    (hasPriceHints && hasCategory && (hasSellingWords || hasLocation)) ||
    (hasImages && (hasCategory || hasSellingWords))
  );
}

function shouldAutoExtractInWizard(messageRaw) {
  const raw = String(messageRaw || '').trim();
  const t = normalizeText(raw);
  if (!t) return false;
  if (t.length >= 20) return true;
  if (/\n/.test(raw)) return true;
  if (extractFirstPhone(raw)) return true;
  if (/\d/.test(t) && (t.includes('سعر') || t.includes('ريال') || t.includes('دولار') || t.includes('sar') || t.includes('usd') || t.includes('$'))) return true;
  if (t.includes('للبيع') || t.includes('معروض') || t.includes('مطلوب')) return true;
  if (t.includes('عنوان') || t.includes('وصف') || t.includes('مدينة') || t.includes('المدينة')) return true;
  if (Boolean(extractLatLngFromText(raw)) || Boolean(extractMapsLink(raw))) return true;
  return false;
}

function computeDraftStep(data) {
  const d = data || {};
  const hasLocation = (d.lat != null && d.lng != null) || (d.locationLabel && String(d.locationLabel).trim().length >= 2);
  if (!d.category) return 'category';
  if (!d.title) return 'title';
  if (!d.description) return 'description';
  if (!d.city) return 'city';
  if (!d.phone) return 'phone';
  if (!hasLocation) return 'location';
  if (!d.originalPrice) return 'price';
  return 'confirm';
}

function mergeExtractedListingIntoDraftData(oldData, listing) {
  const prev = oldData || {};
  const next = { ...prev };
  const changed = [];

  const catRaw = listing?.category || listing?.categorySlug || null;
  const cat = catRaw ? detectCategorySlug(String(catRaw)) : null;
  if (cat && next.category !== cat) {
    next.category = cat;
    changed.push('category');
  }

  const title = listing?.title ? String(listing.title).trim() : null;
  if (title && title.length >= 3 && next.title !== title) {
    next.title = title;
    changed.push('title');
  }

  const description = listing?.description ? String(listing.description).trim() : null;
  if (description && description.length >= 5 && next.description !== description) {
    next.description = description;
    changed.push('description');
  }

  const city = listing?.city ? String(listing.city).trim() : null;
  if (city && city.length >= 2 && next.city !== city) {
    next.city = city;
    changed.push('city');
  }

  const phone = listing?.phone ? normalizePhone(listing.phone) : null;
  if (phone && isValidPhone(phone) && next.phone !== phone) {
    next.phone = phone;
    changed.push('phone');
  }

  const locationLabel = listing?.locationLabel ? String(listing.locationLabel).trim() : null;
  if (locationLabel && locationLabel.length >= 2 && next.locationLabel !== locationLabel) {
    next.locationLabel = locationLabel;
    changed.push('locationLabel');
  }

  if (listing?.lat != null && listing?.lng != null) {
    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (isFinite(lat) && isFinite(lng)) {
      if (next.lat !== lat || next.lng !== lng) {
        next.lat = lat;
        next.lng = lng;
        changed.push('coords');
      }
    }
  }

  if (listing?.price != null) {
    const price = Number(listing.price);
    if (isFinite(price) && price > 0 && next.originalPrice !== price) {
      next.originalPrice = price;
      changed.push('price');
    }
  }

  if (listing?.currency) {
    const cur = sanitizeCurrency(String(listing.currency).toUpperCase());
    if (cur && next.originalCurrency !== cur) {
      next.originalCurrency = cur;
      changed.push('currency');
    }
  }

  // Keep images as-is (they are handled separately)

  return { next, changed };
}

async function runListingExtractorGemini(message) {
  if (!GEMINI_API_KEY) return { ok: false };

  const categoriesGuide = CATEGORIES.map((c) => `${c.slug}: ${c.name}`).join('\n');

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      categorySlug: { type: ['string', 'null'] },
      title: { type: ['string', 'null'] },
      description: { type: ['string', 'null'] },
      city: { type: ['string', 'null'] },
      phone: { type: ['string', 'null'] },
      locationLabel: { type: ['string', 'null'] },
      lat: { type: ['number', 'null'] },
      lng: { type: ['number', 'null'] },
      price: { type: ['number', 'null'] },
      currency: { type: ['string', 'null'] },
    },
    required: [],
  };

  const systemPrompt =
    'أنت مستخرج بيانات لإعلانات في موقع سوق اليمن.\n' +
    'مهمتك: اقرأ نص المستخدم واستخرج (فقط مما ذُكر) بيانات الإعلان في JSON.\n' +
    'لا تخترع معلومات غير موجودة. إذا غير مذكور ضع null.\n' +
    'حوّل الأرقام العربية مثل "100 الف" إلى رقم 100000 إن أمكن.\n' +
    'العملة: استخدم واحداً من YER أو SAR أو USD إن أمكن، وإلا null.\n' +
    'categorySlug: اختر أقرب تصنيف من القائمة التالية (اكتب الـ slug فقط) أو null.\n' +
    'إذا لم يوجد عنوان صريح، اصنع عنواناً قصيراً (مستند على النص) بدون اختراع مواصفات.\n' +
    '\n' +
    'التصنيفات المتاحة (slug: الاسم):\n' +
    categoriesGuide;

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: String(message || '') }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      },
      OPENAI_TIMEOUT_MS
    );

    if (!response.ok) return { ok: false };
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return { ok: false };
    const parsed = safeJsonParse(rawText);
    if (!parsed || typeof parsed !== 'object') return { ok: false };
    return { ok: true, listing: parsed };
  } catch {
    return { ok: false };
  }
}

function tryExtractPriceHeuristic(messageRaw) {
  const raw = String(messageRaw || '');
  const t = normalizeText(raw);
  // Prefer patterns like: سعر 100000 or 100 SAR
  const m1 = raw.match(/(?:سعر|السعر)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (m1) return Number(m1[1]);
  // currency nearby
  const m2 = raw.match(/(\d+(?:\.\d+)?)\s*(sar|usd|\$|ريال سعودي|ريال|ر\.ي|دولار)/i);
  if (m2) return Number(m2[1]);
  // fallback: any number but avoid phone-like
  const n = extractNumber(raw);
  if (!n) return null;
  const phone = extractFirstPhone(raw);
  if (phone) {
    const digits = normalizePhone(phone).replace(/[^0-9]/g, '');
    if (String(n).replace(/\D/g, '') === digits) return null;
  }
  return n;
}

async function extractListingDetailsFromMessage(messageRaw, meta) {
  const raw = String(messageRaw || '').trim();
  const out = {
    category: null,
    title: null,
    description: null,
    city: null,
    phone: null,
    locationLabel: null,
    lat: null,
    lng: null,
    price: null,
    currency: null,
  };

  // 1) Gemini extractor (best for title/description/city)
  const ai = await runListingExtractorGemini(raw);
  if (ai.ok && ai.listing) {
    const l = ai.listing;
    if (l.categorySlug) out.category = String(l.categorySlug);
    if (l.title) out.title = String(l.title);
    if (l.description) out.description = String(l.description);
    if (l.city) out.city = String(l.city);
    if (l.phone) out.phone = String(l.phone);
    if (l.locationLabel) out.locationLabel = String(l.locationLabel);
    if (l.lat != null && l.lng != null) {
      out.lat = Number(l.lat);
      out.lng = Number(l.lng);
    }
    if (l.price != null) out.price = Number(l.price);
    if (l.currency) out.currency = String(l.currency);
  }

  // 2) Heuristics fill missing fields safely
  if (!out.category) {
    const c = detectCategorySlug(raw);
    if (c) out.category = c;
  }

  if (!out.phone) {
    const p = extractFirstPhone(raw);
    if (p) out.phone = p;
  }

  // location from meta first
  if (meta?.location?.lat != null && meta?.location?.lng != null) {
    const lat = Number(meta.location.lat);
    const lng = Number(meta.location.lng);
    if (isFinite(lat) && isFinite(lng)) {
      out.lat = lat;
      out.lng = lng;
    }
  }

  if (out.lat == null || out.lng == null) {
    const coords = extractLatLngFromText(raw);
    if (coords) {
      out.lat = coords.lat;
      out.lng = coords.lng;
    }
  }

  if (!out.locationLabel) {
    const link = extractMapsLink(raw);
    if (link) out.locationLabel = `رابط الموقع: ${link}`;
  }

  if (!out.price) {
    const p = tryExtractPriceHeuristic(raw);
    if (p && isFinite(p) && p > 0) out.price = p;
  }

  if (!out.currency) {
    const cur = detectCurrency(raw);
    if (cur) out.currency = cur;
  }

  return out;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function runModeration(text) {
  if (!OPENAI_API_KEY) return { ok: true };
  try {
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/moderations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: text,
        }),
      },
      OPENAI_TIMEOUT_MS
    );

    if (!response.ok) return { ok: true };
    const data = await response.json();
    const flagged = Boolean(data?.results?.[0]?.flagged);
    return { ok: !flagged };
  } catch (error) {
    return { ok: true };
  }
}

async function runAiFallback({ message, history }) {
  const hasOpenAi = Boolean(OPENAI_API_KEY);
  const hasGemini = Boolean(GEMINI_API_KEY);

  if (!hasOpenAi && !hasGemini) {
    return {
      ok: false,
      reply:
        'ما فهمت سؤالك تماماً 🤔\n\n' +
        'أمثلة سريعة:\n' +
        '• كيف أضيف إعلان؟\n' +
        '• أضف إعلان (لبدء إضافة إعلان من الشات)\n' +
        '• كيف أبحث عن سيارات؟\n\n' +
        'حاول تكتب سؤالك بصياغة أبسط وسأساعدك.',
    };
  }

  const schema = {
    name: 'assistant_response',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['none', 'create_listing', 'count_listings'],
        },
        reply: { type: 'string' },
        category: { type: ['string', 'null'] },
        listing: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: {
            category: { type: ['string', 'null'] },
            title: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            city: { type: ['string', 'null'] },
            locationLabel: { type: ['string', 'null'] },
            lat: { type: ['number', 'null'] },
            lng: { type: ['number', 'null'] },
            price: { type: ['number', 'null'] },
            currency: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
          },
        },
      },
      required: ['action', 'reply'],
    },
  };

  const categoriesGuide = CATEGORIES.map((c) => `${c.slug}: ${c.name}`).join('\n');
  const siteRoutes =
    'روابط مهمة داخل الموقع (استخدمها عند اللزوم):\n' +
    '• إضافة إعلان: /add\n' +
    '• الفئات: /categories\n' +
    '• تسجيل الدخول: /login\n' +
    '• إنشاء حساب: /register\n' +
    '• المساعدة: /help\n' +
    '• تواصل معنا: /contact\n' +
    '• الشروط: /terms\n' +
    '• الخصوصية: /privacy\n';

  const systemPrompt =
    'أنت مساعد ذكي لموقع سوق اليمن.\n' +
    'هدفك: الإجابة على استفسارات المستخدم عن الموقع (إعلانات/مزادات/تسجيل/تواصل/فئات).\n' +
    'التزم بالمعلومات العامة، وإذا ما عندك معلومة مؤكدة لا تخترع—اطلب توضيح أو وجّه المستخدم إلى /help أو /contact.\n' +
    'حاول دائماً إضافة رابط مناسب داخل الموقع عند إعطاء إرشادات.\n' +
    '\n' +
    siteRoutes +
    '\n' +
    'قواعد اختيار action:\n' +
    '• إذا كانت نية المستخدم بيع/عرض/إضافة إعلان اختر action=create_listing وحاول استخراج البيانات المتاحة.\n' +
    '• إذا كان السؤال عن "كم/عدد" للإعلانات اختر action=count_listings وحدد category إن وجدت.\n' +
    '• خلاف ذلك اختر action=none مع رد مباشر وواضح.\n' +
    '\n' +
    'التصنيفات المتاحة (slug: الاسم):\n' +
    categoriesGuide;

  try {
    // ✅ افتراضيًا: استخدم Gemini أولاً إن كان متاحاً
    if (hasGemini && ASSISTANT_PREFER_GEMINI) {
      const normalizedHistory = normalizeHistory(history);
      const contents = [
        ...normalizedHistory.map((entry) => ({
          role: entry.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: entry.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              role: 'system',
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: schema.schema,
            },
          }),
        },
        OPENAI_TIMEOUT_MS
      );

      if (!response.ok) {
        // لو Gemini فشل، نجرب OpenAI إذا متاح
        if (!hasOpenAi) return { ok: false };
      } else {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!rawText) return { ok: false };
        const parsed = safeJsonParse(rawText);
        if (!parsed) return { ok: false };
        return { ok: true, ...parsed };
      }
    }

    // OpenAI كخيار احتياطي
    if (hasOpenAi) {
      const moderation = await runModeration(message);
      if (!moderation.ok) {
        return {
          ok: true,
          action: 'none',
          reply: 'عذراً، لا يمكنني المساعدة في هذا الطلب.',
        };
      }

      const messages = [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        ...normalizeHistory(history).map((entry) => ({
          role: entry.role,
          content: [{ type: 'text', text: entry.content }],
        })),
        { role: 'user', content: [{ type: 'text', text: message }] },
      ];

      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            input: messages,
            response_format: {
              type: 'json_schema',
              json_schema: schema,
            },
          }),
        },
        OPENAI_TIMEOUT_MS
      );

      if (!response.ok) {
        return { ok: false };
      }

      const data = await response.json();
      const rawText =
        data?.output?.[0]?.content?.[0]?.text ||
        data?.output_text ||
        data?.output?.[0]?.content?.[0]?.input_text ||
        '';
      if (!rawText) return { ok: false };
      const parsed = safeJsonParse(rawText);
      if (!parsed) return { ok: false };

      const outputModeration = await runModeration(parsed.reply || '');
      if (!outputModeration.ok) {
        return { ok: true, action: 'none', reply: 'عذراً، لا يمكنني المساعدة في هذا الطلب.' };
      }

      return { ok: true, ...parsed };
    }

    // لو ما توفر أي مزود
    return { ok: false };
  } catch (error) {
    return { ok: false };
  }
}

async function startDraftFromAi(user, listing) {
  const data = {};
  const categoryRaw = listing?.category || '';
  const category = categoryRaw ? detectCategorySlug(categoryRaw) : null;
  if (category) data.category = category;
  if (listing?.title) data.title = String(listing.title).trim();
  if (listing?.description) data.description = String(listing.description).trim();
  if (listing?.city) data.city = String(listing.city).trim();
  if (listing?.locationLabel) data.locationLabel = String(listing.locationLabel).trim();
  if (listing?.lat != null && listing?.lng != null) {
    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (isFinite(lat) && isFinite(lng)) {
      data.lat = lat;
      data.lng = lng;
    }
  }
  if (listing?.price) data.originalPrice = Number(listing.price);
  if (listing?.currency) data.originalCurrency = sanitizeCurrency(String(listing.currency).toUpperCase());
  if (listing?.phone) data.phone = String(listing.phone).trim();

  const step = computeDraftStep(data);

  await saveDraft(user.uid, { step, data });
  return { step, data };
}

async function handleListingWizard({ user, message, meta }) {
  // هذه الميزة تتطلب Admin SDK حتى نتحقق من التوكن ونكتب على Firestore
  if (!adminDb || !adminAuth) {
    return { reply: adminNotReadyMessage() };
  }

  if (isCancel(message)) {
    await clearDraft(user.uid);
    return { reply: 'تم إلغاء مسودة الإعلان ✅\nإذا حبيت نبدأ من جديد اكتب: أضف إعلان' };
  }

  let draft = await loadDraft(user.uid);
  const incomingImages = normalizeImagesMeta(meta?.images);

  // بدء المسار
  if (!draft) {
    const baseData = { images: incomingImages.slice(0, 8) };
    const rawMsg = String(message || '').trim();
    const canAuto = shouldAutoExtractInWizard(rawMsg) && !isStartCreateListing(rawMsg);

    if (canAuto) {
      const extracted = await extractListingDetailsFromMessage(rawMsg, meta);
      const merged = mergeExtractedListingIntoDraftData(baseData, extracted);
      const nextData = merged.next;
      const step = computeDraftStep(nextData);

      // إذا ما استخرجنا شيء مفيد، نكمل المعالج التقليدي
      if (merged.changed.length) {
        await saveDraft(user.uid, { step, data: nextData });
        const draftObj = { step, data: nextData };
        const summary = draftSummary(draftObj);
        const tail =
          step === 'confirm'
            ? 'إذا كل شيء تمام اكتب: /نشر\nأو اكتب: /إلغاء لإلغاء المسودة.\n\nيمكنك إضافة صور عبر زر 📷.'
            : listingNextPrompt(step, draftObj);

        return {
          reply:
            'تمام ✅ استخرجت تفاصيل الإعلان من كلامك وجهزت مسودة.\n\n' +
            (incomingImages.length ? `تم حفظ ${incomingImages.slice(0, 8).length} صورة للمسودة ✅\n\n` : '') +
            'مسودة إعلانك الحالية:\n\n' +
            (summary || '(لا تزال بعض التفاصيل ناقصة)') +
            '\n\n' +
            tail,
        };
      }
    }

    await saveDraft(user.uid, { step: 'category', data: baseData });
    return {
      reply:
        'تمام! بنضيف إعلان من داخل الشات ✅\n\n' +
        (incomingImages.length ? `تم حفظ ${incomingImages.slice(0, 8).length} صورة للمسودة ✅\n\n` : '') +
        'الخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' +
        categoriesHint() +
        '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)',
    };
  }

  const step = String(draft.step || 'category');
  const data = draft.data || {};
  const msg = String(message || '').trim();

  // ✅ تحديث/تعبئة تلقائية: إذا كتب المستخدم كل التفاصيل مرة واحدة أو طلب تعديل
  if (shouldAutoExtractInWizard(msg) && !isCancel(msg) && !isConfirmPublish(msg) && !isStartCreateListing(msg)) {
    const extracted = await extractListingDetailsFromMessage(msg, meta);
    const merged = mergeExtractedListingIntoDraftData(data, extracted);
    const nextData = merged.next;

    // دعم تحديث الموقع حتى لو المستخدم في خطوة أخرى
    if (meta?.location?.lat != null && meta?.location?.lng != null) {
      const lat = Number(meta.location.lat);
      const lng = Number(meta.location.lng);
      if (isFinite(lat) && isFinite(lng)) {
        if (nextData.lat !== lat || nextData.lng !== lng) {
          nextData.lat = lat;
          nextData.lng = lng;
          merged.changed.push('coords');
        }
      }
    }

    if (merged.changed.length) {
      const newStep = computeDraftStep(nextData);
      await saveDraft(user.uid, { step: newStep, data: nextData });
      const draftObj = { step: newStep, data: nextData };
      const summary = draftSummary(draftObj);
      const tail =
        newStep === 'confirm'
          ? 'إذا كل شيء تمام اكتب: /نشر\nأو اكتب: /إلغاء لإلغاء المسودة.\n\nيمكنك إضافة صور عبر زر 📷.'
          : listingNextPrompt(newStep, draftObj);

      return {
        reply:
          'تم تحديث مسودة الإعلان بناءً على كلامك ✅\n\n' +
          (summary || '(لا تزال بعض التفاصيل ناقصة)') +
          '\n\n' +
          tail,
      };
    }
  }

  // ✅ إذا وصلت صور من الشات: نحفظها للمسودة بدون تغيير الخطوة
  if (incomingImages.length) {
    const current = Array.isArray(data.images) ? data.images : [];
    const merged = [];
    for (const u of [...current, ...incomingImages]) {
      if (typeof u !== 'string' || !u.trim()) continue;
      const v = u.trim();
      if (!merged.includes(v)) merged.push(v);
      if (merged.length >= 8) break;
    }

    await saveDraft(user.uid, { step, data: { ...data, images: merged } });
    const updatedDraft = { step, data: { ...data, images: merged } };
    return {
      reply:
        `تم إضافة ${Math.min(incomingImages.length, 8)} صورة للمسودة ✅\n\n` +
        listingNextPrompt(step, updatedDraft),
    };
  }

  // لو المستخدم كتب "أضف إعلان" وهو داخل المسار بالفعل
  if (isStartCreateListing(msg)) {
    await saveDraft(user.uid, { step: 'category', data: {} });
    return {
      reply:
        'بدأنا من جديد ✅\n\n' +
        'الخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' +
        categoriesHint() +
        '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)',
    };
  }

  // نشر نهائي
  if (step === 'confirm') {
    if (!isConfirmPublish(msg)) {
      return {
        reply:
          'هذه مسودة الإعلان الحالية:\n\n' +
          draftSummary(draft) +
          '\n\nإذا كل شيء تمام اكتب: نشر\nأو اكتب: إلغاء لإلغاء المسودة.',
      };
    }

    const rates = await getRatesServer();
    const originalCurrency = data.originalCurrency || 'YER';
    const originalPrice = Number(data.originalPrice || 0);
    const priceYER = toYERServer(originalPrice, originalCurrency, rates);

    const hasCoords = data.lat != null && data.lng != null;
    const listing = {
      title: String(data.title || '').trim(),
      description: String(data.description || '').trim(),
      city: String(data.city || '').trim(),
      category: String(data.category || '').trim(),

      phone: data.phone ? String(data.phone).trim() : null,
      isWhatsapp: true,

      priceYER: Number(priceYER),
      originalPrice: Number(originalPrice),
      originalCurrency,
      currencyBase: 'YER',

      coords: hasCoords ? [Number(data.lat), Number(data.lng)] : null,
      lat: hasCoords ? Number(data.lat) : null,
      lng: hasCoords ? Number(data.lng) : null,
      locationLabel: data.locationLabel ? String(data.locationLabel).trim() : null,
      images: Array.isArray(data.images) ? data.images.slice(0, 8) : [],

      userId: user.uid,
      userEmail: user.email || null,
      userName: user.name || null,

      views: 0,
      likes: 0,
      isActive: true,
      hidden: false,

      auctionEnabled: false,
      auctionEndAt: null,
      currentBidYER: null,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection('listings').add(listing);
    await clearDraft(user.uid);

    return {
      reply:
        'تم نشر الإعلان ✅\n\n' +
        `رابط الإعلان: /listing/${ref.id}\n\n` +
        (Array.isArray(listing.images) && listing.images.length
          ? `تم ربط ${listing.images.length} صورة بالإعلان ✅`
          : 'إذا حبيت تضيف صور: استخدم زر 📷 داخل الشات قبل النشر أو من صفحة /add.'),
    };
  }

  // خطوات جمع البيانات
  if (step === 'category') {
    const cat = detectCategorySlug(msg);
    if (!cat) {
      return {
        reply:
          'ما قدرت أحدد القسم من رسالتك 🤔\n' +
          'اكتب اسم القسم (مثلاً: سيارات أو عقارات)\n\n' +
          categoriesHint(),
      };
    }
    await saveDraft(user.uid, { step: 'title', data: { ...data, category: cat } });
    return { reply: `تمام ✅ القسم: ${categoryNameFromSlug(cat)}\n\nالخطوة 2/7: اكتب عنوان الإعلان.` };
  }

  if (step === 'title') {
    const title = msg.trim();
    if (!title || title.length < 5) {
      return { reply: 'العنوان لازم يكون واضح (5 أحرف على الأقل). اكتب عنوان الإعلان الآن.' };
    }
    await saveDraft(user.uid, { step: 'description', data: { ...data, title } });
    return { reply: 'تمام ✅\n\nالخطوة 3/7: اكتب وصف الإعلان (على الأقل 10 أحرف).' };
  }

  if (step === 'description') {
    const description = msg.trim();
    if (!description || description.length < 10) {
      return { reply: 'الوصف قصير. اكتب وصف أوضح (10 أحرف على الأقل).' };
    }
    await saveDraft(user.uid, { step: 'city', data: { ...data, description } });
    return { reply: 'تمام ✅\n\nالخطوة 4/7: اكتب اسم المدينة.' };
  }

  if (step === 'city') {
    const city = msg.trim();
    if (!city || city.length < 2) {
      return { reply: 'اكتب اسم المدينة بشكل صحيح (مثلاً: صنعاء).' };
    }
    await saveDraft(user.uid, { step: 'phone', data: { ...data, city } });
    return { reply: 'تمام ✅\n\nالخطوة 5/7: اكتب رقم الجوال للتواصل (مثال: 777123456 أو +967777123456).' };
  }

  if (step === 'phone') {
    const phone = normalizePhone(msg);
    if (!phone || !isValidPhone(phone)) {
      return { reply: 'اكتب رقم جوال صحيح (مثال: 777123456 أو +967777123456).' };
    }
    await saveDraft(user.uid, { step: 'location', data: { ...data, phone } });
    return {
      reply:
        'تمام ✅\n\n' +
        'الخطوة 6/7: حدّد موقع الإعلان.\n' +
        '• اضغط زر "📍 موقعي" داخل الشات لإرسال الإحداثيات تلقائياً\n' +
        '• أو اكتب الإحداثيات بهذا الشكل: 15.3694, 44.1910\n' +
        '• أو أرسل رابط خرائط\n\n' +
        'تقدر أيضاً تكتب اسم الحي/المنطقة (مثال: صنعاء - حدة).',
    };
  }

  if (step === 'location') {
    // 1) meta location from client
    const metaLat = meta?.location?.lat;
    const metaLng = meta?.location?.lng;
    if (metaLat != null && metaLng != null) {
      const lat = Number(metaLat);
      const lng = Number(metaLng);
      if (isFinite(lat) && isFinite(lng)) {
        const locationLabel = msg && msg !== '📍 هذا موقعي' ? String(msg).trim() : data.locationLabel || null;
        await saveDraft(user.uid, { step: 'price', data: { ...data, lat, lng, locationLabel } });
        return {
          reply:
            'تم حفظ موقعك ✅\n\n' +
            'الخطوة 7/7: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.',
        };
      }
    }

    // 2) parse lat,lng from text
    const parsed = extractLatLngFromText(msg);
    if (parsed) {
      await saveDraft(user.uid, { step: 'price', data: { ...data, lat: parsed.lat, lng: parsed.lng, locationLabel: data.locationLabel || null } });
      return {
        reply:
          'تمام ✅ تم حفظ الإحداثيات.\n\n' +
          'الخطوة 7/7: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.',
      };
    }

    // 3) accept maps link or label
    if (msg && msg.length >= 2) {
      const link = extractMapsLink(msg);
      const locationLabel = link ? `رابط الموقع: ${link}` : msg;
      await saveDraft(user.uid, { step: 'price', data: { ...data, locationLabel } });
      return {
        reply:
          'تمام ✅ تم حفظ الموقع.\n\n' +
          'الخطوة 7/7: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.',
      };
    }

    return {
      reply:
        'ما قدرت أحدد موقع واضح 🤔\n' +
        'جرّب أحد الخيارات:\n' +
        '• اضغط زر "📍 موقعي" داخل الشات\n' +
        '• اكتب الإحداثيات: 15.3694, 44.1910\n' +
        '• أرسل رابط خرائط\n' +
        '• أو اكتب اسم الحي/المنطقة',
    };
  }

  if (step === 'price') {
    const n = extractNumber(msg);
    if (!n || n <= 0) {
      return { reply: 'ما فهمت السعر. اكتب رقم فقط (مثال: 100000) أو (100 USD).' };
    }
    const originalCurrency = detectCurrency(msg);
    await saveDraft(user.uid, {
      step: 'confirm',
      data: { ...data, originalPrice: n, originalCurrency },
    });

    const fakeDraft = { step: 'confirm', data: { ...data, originalPrice: n, originalCurrency } };
    return {
      reply:
        'وصلنا للنهاية ✅ هذه مسودة إعلانك:\n\n' +
        draftSummary(fakeDraft) +
        '\n\nإذا كل شيء تمام اكتب: نشر\nأو اكتب: إلغاء لإلغاء المسودة.',
    };
  }

  // خطوة غير معروفة
  await saveDraft(user.uid, { step: 'category', data: {} });
  return {
    reply:
      'صار عندي لخبطة بسيطة 😅 خلّينا نبدأ من جديد.\n\n' +
      'الخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' +
      categoriesHint(),
  };
}

// =========================
// Route
// =========================

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = body?.message;
    const history = body?.history;
    const meta = body?.meta || null;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }

    const normalized = normalizeText(trimmedMessage);
    const user = await getUserFromRequest(request);

    // ✅ إذا وصلت صور من الواجهة: نتعامل معها كجزء من مسار إضافة الإعلان
    const metaImages = normalizeImagesMeta(meta?.images);
    if (metaImages.length) {
      if (!user || user.error) {
        return NextResponse.json({
          reply:
            'لرفع الصور وربطها بمسودة الإعلان لازم تسجل دخول أولاً ✅\n\n' +
            'اذهب إلى: /login',
        });
      }

      const res = await handleListingWizard({ user, message: trimmedMessage, meta });
      return NextResponse.json({ reply: res.reply });
    }

    // 1) إلغاء مسودة (لو مسجل دخول)
    if (user && !user.error && isCancel(normalized)) {
      const res = await handleListingWizard({ user, message: trimmedMessage, meta });
      return NextResponse.json({ reply: res.reply });
    }

    // 2) إحصاءات: كم إعلان؟
    const countIntent = extractCountIntent(normalized);
    if (countIntent) {
      const { category } = countIntent;
      const result = await tryCountListings(category);

      if (!result.ok) {
        return NextResponse.json({ reply: adminNotReadyMessage() });
      }

      const label = category ? categoryNameFromSlug(category) : 'كل الأقسام';
      const numberText = result.approximate ? `${result.publicCount}+` : String(result.publicCount);
      return NextResponse.json({
        reply:
          `عدد الإعلانات (المتاحة) في ${label}: ${numberText}\n` +
          (category ? '' : '\nتقدر تحدد القسم مثل: سيارات أو عقارات.'),
      });
    }

    // 3) إضافة إعلان عبر الشات (يتطلب تسجيل الدخول)
    const existingDraft = user && !user.error ? await loadDraft(user.uid) : null;
    const autoCreateFromDetails = user && !user.error ? looksLikeListingDetails(trimmedMessage, meta) : false;

    if (isStartCreateListing(normalized) || existingDraft || autoCreateFromDetails) {
      if (!user || user.error) {
        return NextResponse.json({
          reply:
            'لإضافة إعلان عبر المساعد لازم تسجل دخول أولاً ✅\n\n' +
            'بعد تسجيل الدخول اكتب: أضف إعلان\n' +
            'أو استخدم صفحة الإضافة مباشرة: /add',
        });
      }

      const res = await handleListingWizard({ user, message: trimmedMessage, meta });
      return NextResponse.json({ reply: res.reply });
    }

    // 4) تحية / شكر
    if (greetings.some((g) => normalized.includes(normalizeText(g)))) {
      return NextResponse.json({
        reply:
          'مرحباً بك في سوق اليمن! 🇾🇪\n\n' +
          'أقدر أساعدك في:\n' +
          '• معرفة معلومات عن الموقع\n' +
          '• كيفية إضافة إعلان\n' +
          '• إضافة إعلان من داخل الشات (اكتب: أضف إعلان)\n' +
          '• رفع صور للإعلان من داخل الشات (زر 📷)\n' +
          '• تسجيل صوت وتحويله إلى نص (زر 🎙️)\n\n' +
          'كيف أساعدك؟',
      });
    }

    if (thanks.some((t) => normalized.includes(normalizeText(t)))) {
      return NextResponse.json({
        reply: 'العفو! 😊 إذا عندك أي استفسار آخر، أنا حاضر.',
      });
    }

    // 5) FAQ
    const answer = findBestMatch(trimmedMessage);
    if (answer) {
      return NextResponse.json({ reply: answer });
    }

    // 6) AI fallback
    const aiResult = await runAiFallback({ message: trimmedMessage, history });
    if (aiResult?.ok) {
      if (aiResult.action === 'count_listings') {
        const category = aiResult.category ? detectCategorySlug(aiResult.category) : null;
        const result = await tryCountListings(category);
        if (!result.ok) {
          return NextResponse.json({ reply: adminNotReadyMessage() });
        }

        const label = category ? categoryNameFromSlug(category) : 'كل الأقسام';
        const numberText = result.approximate ? `${result.publicCount}+` : String(result.publicCount);
        return NextResponse.json({
          reply:
          `عدد الإعلانات (المتاحة) في ${label}: ${numberText}\n` +
          (category ? '' : '\nتقدر تحدد القسم مثل: سيارات أو عقارات.'),
        });
      }

      if (aiResult.action === 'create_listing') {
        if (!user || user.error) {
          return NextResponse.json({
            reply:
              'لإضافة إعلان عبر المساعد لازم تسجل دخول أولاً ✅\n\n' +
              'بعد تسجيل الدخول اكتب: أضف إعلان\n' +
              'أو استخدم صفحة الإضافة مباشرة: /add',
          });
        }
        if (!adminDb || !adminAuth) {
          return NextResponse.json({ reply: adminNotReadyMessage() });
        }

        const draft = await startDraftFromAi(user, aiResult.listing || {});
        const prompt = listingNextPrompt(draft.step, { step: draft.step, data: draft.data });
        const replyText = [aiResult.reply, prompt].filter(Boolean).join('\n\n');
        return NextResponse.json({ reply: replyText });
      }

      return NextResponse.json({ reply: aiResult.reply });
    }

    // رد افتراضي
    return NextResponse.json({
      reply:
        'ما فهمت سؤالك تماماً 🤔\n\n' +
        'أمثلة سريعة:\n' +
        '• كيف أضيف إعلان؟\n' +
        '• أضف إعلان (لبدء إضافة إعلان من الشات)\n' +
        '• كيف أبحث عن سيارات؟\n\n' +
        'حاول تكتب سؤالك بصياغة أبسط وسأساعدك.',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة الطلب' }, { status: 500 });
  }
}
