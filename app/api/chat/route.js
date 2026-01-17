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
  const t = normalizeText(messageRaw);
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
  const t = normalizeText(messageRaw);
  return t === 'الغاء' || t === 'إلغاء' || t.includes('الغاء') || t.includes('كنسل') || t.includes('cancel') || t.includes('حذف المسوده');
}

function isConfirmPublish(messageRaw) {
  const t = normalizeText(messageRaw);
  return t === 'نشر' || t === 'انشر' || t.includes('تاكيد') || t.includes('تأكيد') || t.includes('اعتماد') || t.includes('نشر الاعلان');
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
  if (data.originalPrice) {
    parts.push(`السعر: ${data.originalPrice} ${data.originalCurrency || 'YER'}`);
  }
  if (data.phone) parts.push(`الهاتف: ${data.phone}`);
  return parts.join('\n');
}

function listingNextPrompt(step, draft) {
  if (step === 'category') {
    return (
      'الخطوة 1/5: اختر القسم (اكتب اسم القسم):\n' +
      categoriesHint() +
      '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)'
    );
  }

  if (step === 'title') {
    return 'الخطوة 2/5: اكتب عنوان الإعلان.';
  }

  if (step === 'description') {
    return 'الخطوة 3/5: اكتب وصف الإعلان (على الأقل 10 أحرف).';
  }

  if (step === 'city') {
    return 'الخطوة 4/5: اكتب اسم المدينة.';
  }

  if (step === 'price') {
    return 'الخطوة 5/5: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.';
  }

  return (
    'هذه مسودة الإعلان الحالية:\n\n' +
    draftSummary(draft) +
    '\n\nإذا كل شيء تمام اكتب: نشر\nأو اكتب: إلغاء لإلغاء المسودة.'
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
        '• كم إعلان سيارات في الموقع؟\n' +
        '• كيف أضيف إعلان؟\n' +
        '• أضف إعلان (لبدء إضافة إعلان من الشات)\n\n' +
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
  const systemPrompt =
    'أنت مساعد ذكي لموقع سوق اليمن. ردودك قصيرة وواضحة وباللهجة العربية الفصحى.\n' +
    'إذا كانت نية المستخدم بيع/عرض/إضافة إعلان اختر action=create_listing وحاول استخراج البيانات المتاحة.\n' +
    'إذا كان السؤال عن "كم/عدد" للإعلانات اختر action=count_listings وحدد category إن وجدت.\n' +
    'خلاف ذلك اختر action=none مع رد عام.\n' +
    'التصنيفات المتاحة (slug: الاسم):\n' +
    categoriesGuide;

  try {
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
      return { ok: false };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return { ok: false };
    const parsed = safeJsonParse(rawText);
    if (!parsed) return { ok: false };
    return { ok: true, ...parsed };
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
  if (listing?.price) data.originalPrice = Number(listing.price);
  if (listing?.currency) data.originalCurrency = sanitizeCurrency(String(listing.currency).toUpperCase());
  if (listing?.phone) data.phone = String(listing.phone).trim();

  let step = 'category';
  if (data.category) step = 'title';
  if (data.title) step = 'description';
  if (data.description) step = 'city';
  if (data.city) step = 'price';
  if (data.originalPrice) step = 'confirm';

  await saveDraft(user.uid, { step, data });
  return { step, data };
}

async function handleListingWizard({ user, message }) {
  // هذه الميزة تتطلب Admin SDK حتى نتحقق من التوكن ونكتب على Firestore
  if (!adminDb || !adminAuth) {
    return { reply: adminNotReadyMessage() };
  }

  if (isCancel(message)) {
    await clearDraft(user.uid);
    return { reply: 'تم إلغاء مسودة الإعلان ✅\nإذا حبيت نبدأ من جديد اكتب: أضف إعلان' };
  }

  let draft = await loadDraft(user.uid);

  // بدء المسار
  if (!draft) {
    await saveDraft(user.uid, { step: 'category', data: {} });
    return {
      reply:
        'تمام! بنضيف إعلان من داخل الشات ✅\n\n' +
        'الخطوة 1/5: اختر القسم (اكتب اسم القسم):\n' +
        categoriesHint() +
        '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)',
    };
  }

  const step = String(draft.step || 'category');
  const data = draft.data || {};
  const msg = String(message || '').trim();

  // لو المستخدم كتب "أضف إعلان" وهو داخل المسار بالفعل
  if (isStartCreateListing(msg)) {
    await saveDraft(user.uid, { step: 'category', data: {} });
    return {
      reply:
        'بدأنا من جديد ✅\n\n' +
        'الخطوة 1/5: اختر القسم (اكتب اسم القسم):\n' +
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

      coords: null,
      lat: null,
      lng: null,
      locationLabel: null,
      images: [],

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
        'ملاحظة: رفع الصور عبر الشات غير مفعّل حالياً. لإضافة صور افتح الإعلان ثم عدّل عليه أو استخدم صفحة /add.',
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
    return { reply: `تمام ✅ القسم: ${categoryNameFromSlug(cat)}\n\nالخطوة 2/5: اكتب عنوان الإعلان.` };
  }

  if (step === 'title') {
    const title = msg.trim();
    if (!title || title.length < 5) {
      return { reply: 'العنوان لازم يكون واضح (5 أحرف على الأقل). اكتب عنوان الإعلان الآن.' };
    }
    await saveDraft(user.uid, { step: 'description', data: { ...data, title } });
    return { reply: 'تمام ✅\n\nالخطوة 3/5: اكتب وصف الإعلان (على الأقل 10 أحرف).' };
  }

  if (step === 'description') {
    const description = msg.trim();
    if (!description || description.length < 10) {
      return { reply: 'الوصف قصير. اكتب وصف أوضح (10 أحرف على الأقل).' };
    }
    await saveDraft(user.uid, { step: 'city', data: { ...data, description } });
    return { reply: 'تمام ✅\n\nالخطوة 4/5: اكتب اسم المدينة.' };
  }

  if (step === 'city') {
    const city = msg.trim();
    if (!city || city.length < 2) {
      return { reply: 'اكتب اسم المدينة بشكل صحيح (مثلاً: صنعاء).' };
    }
    await saveDraft(user.uid, { step: 'price', data: { ...data, city } });
    return { reply: 'تمام ✅\n\nالخطوة 5/5: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.' };
  }

  if (step === 'price') {
    const n = extractNumber(msg);
    if (!n || n <= 0) {
      return { reply: 'ما فهمت السعر. اكتب رقم فقط (مثال: 100000) أو (100 USD).' };
    }
    const originalCurrency = detectCurrency(msg);
    const phone = null;
    await saveDraft(user.uid, {
      step: 'confirm',
      data: { ...data, originalPrice: n, originalCurrency, phone },
    });

    const fakeDraft = { step: 'confirm', data: { ...data, originalPrice: n, originalCurrency, phone } };
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
      'الخطوة 1/5: اختر القسم (اكتب اسم القسم):\n' +
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

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json({ error: 'الرسالة فارغة' }, { status: 400 });
    }

    const normalized = normalizeText(trimmedMessage);
    const user = await getUserFromRequest(request);

    // 1) إلغاء مسودة (لو مسجل دخول)
    if (user && !user.error && isCancel(normalized)) {
      const res = await handleListingWizard({ user, message: normalized });
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
          (category ? '' : '\nتقدر تسأل مثلاً: كم إعلان سيارات؟'),
      });
    }

    // 3) إضافة إعلان عبر الشات (يتطلب تسجيل الدخول)
    if (isStartCreateListing(normalized) || (user && !user.error && (await loadDraft(user.uid)))) {
      if (!user || user.error) {
        return NextResponse.json({
          reply:
            'لإضافة إعلان عبر المساعد لازم تسجل دخول أولاً ✅\n\n' +
            'بعد تسجيل الدخول اكتب: أضف إعلان\n' +
            'أو استخدم صفحة الإضافة مباشرة: /add',
        });
      }

      const res = await handleListingWizard({ user, message: normalized });
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
          '• حساب عدد الإعلانات (مثلاً: كم إعلان سيارات؟)\n' +
          '• إضافة إعلان من داخل الشات (اكتب: أضف إعلان)\n\n' +
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
            (category ? '' : '\nتقدر تسأل مثلاً: كم إعلان سيارات؟'),
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
        '• كم إعلان سيارات في الموقع؟\n' +
        '• كيف أضيف إعلان؟\n' +
        '• أضف إعلان (لبدء إضافة إعلان من الشات)\n\n' +
        'حاول تكتب سؤالك بصياغة أبسط وسأساعدك.',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة الطلب' }, { status: 500 });
  }
}
