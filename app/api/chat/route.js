import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// =========================
// 1. الإعدادات والبيانات الثابتة
// =========================

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const rateLimiter = new Map();

const DRAFTS_COLLECTION = 'assistant_drafts';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';

const yemenCities = {
  'صنعاء': { lat: 15.3694, lng: 44.1910, districts: ['حدة', 'السبعين', 'الروضة', 'الشهداء', 'الواحدي', 'التحرير'] },
  'عدن': { lat: 12.7855, lng: 45.0187, districts: ['خور مكسر', 'التواهي', 'المعلا', 'صيرة', 'الشيخ عثمان', 'المنصورة'] },
  'تعز': { lat: 13.5789, lng: 44.0080, districts: ['القاهرة', 'المدينة', 'صالة', 'المظفر', 'المسراخ', 'شرعب'] },
  'الحديدة': { lat: 14.8022, lng: 42.9511, districts: ['الحالي', 'الحوك', 'المراوعة', 'التحيتا', 'الزهرة', 'باجل'] },
  'حضرموت': { lat: 16.9300, lng: 49.6500, districts: ['المكلا', 'سيئون', 'الشحر', 'الريان', 'الديس', 'غيل باوزير'] },
  'إب': { lat: 13.9667, lng: 44.1833, districts: ['المدينة', 'يريم', 'العرش', 'الظهار', 'السبر', 'ذي السفال'] },
  'ذمار': { lat: 14.5575, lng: 44.4017, districts: ['المدينة', 'جهران', 'وصاب', 'أنس', 'الحدا', 'مغرب عنس'] },
  'المكلا': { lat: 14.5300, lng: 49.1314, districts: ['الغويضة', 'بورسعيد', 'الميناء', 'الرملة', 'الشحر القديم'] },
  'سيئون': { lat: 15.9631, lng: 48.7875, districts: ['المدينة', 'تريم', 'شبام', 'القف', 'ساه'] },
  'شبوة': { lat: 14.3667, lng: 47.0167, districts: ['عتق', 'بيحان', 'ميفعة', 'روضة بن عامر', 'الطف', 'مرخة'] },
  'حجة': { lat: 15.7000, lng: 43.6000, districts: ['المدينة', 'كحلان', 'شحن', 'المغربة', 'بكيل المير', 'واشعة'] },
  'المهرة': { lat: 16.7000, lng: 53.0833, districts: ['الغيضة', 'قشن', 'حوف', 'منعر', 'سقطرى'] },
  'الجوف': { lat: 16.2000, lng: 44.8000, districts: ['الحزم', 'الخب والشعف', 'برط العنان', 'المطمة', 'الغيل'] },
  'البيضاء': { lat: 13.9833, lng: 45.5667, districts: ['المدينة', 'الرضمة', 'الصومعة', 'الطف', 'مكيراس', 'الشرية'] },
  'أبين': { lat: 13.1667, lng: 45.3333, districts: ['زنجبار', 'خنفر', 'لودر', 'رصد', 'سرار', 'المحفد'] },
  'لحج': { lat: 13.0500, lng: 44.8833, districts: ['الحوطة', 'تبن', 'ردفان', 'يهر', 'المضاربة والعارة', 'حبيل جبر'] },
  'الضالع': { lat: 13.9667, lng: 44.7333, districts: ['المدينة', 'دمت', 'الضالع', 'الحشاء', 'الأزارق', 'جبن'] },
  'عمران': { lat: 15.6594, lng: 43.9439, districts: ['المدينة', 'ريدة', 'ثلا', 'السودة', 'السوادية', 'بني صريم'] },
  'ريمة': { lat: 14.6333, lng: 43.6000, districts: ['الجبين', 'مزهر', 'بلاد الطعام', 'كسمة', 'الجعفرية'] },
  'صعدة': { lat: 16.9400, lng: 43.7600, districts: ['المدينة', 'سحار', 'غمر', 'كتاف', 'منبة', 'رازح'] },
  'المحويت': { lat: 15.4667, lng: 43.5500, districts: ['المدينة', 'حفاش', 'الطويلة', 'ملحان', 'خبت', 'بني سعد'] },
};

const CATEGORIES = [
  { slug: 'cars', name: 'سيارات', keywords: ['سيارة', 'سيارات', 'car', 'cars'] },
  { slug: 'realestate', name: 'عقارات', keywords: ['عقار', 'عقارات', 'شقة', 'شقق', 'أرض', 'ارض', 'realestate', 'estate'] },
  { slug: 'phones', name: 'جوالات', keywords: ['جوال', 'جوالات', 'هاتف', 'هواتف', 'phone', 'phones'] },
  { slug: 'electronics', name: 'إلكترونيات', keywords: ['الكترونيات', 'إلكترونيات', 'electronics'] },
  { slug: 'motorcycles', name: 'دراجات نارية', keywords: ['دراجة', 'دراجات', 'دراجات نارية', 'motorcycle', 'motorcycles'] },
  { slug: 'jobs', name: 'وظائف', keywords: ['وظائف', 'وظيفة', 'job', 'jobs'] },
  { slug: 'services', name: 'خدمات', keywords: ['خدمات', 'service', 'services'] },
  { slug: 'other', name: 'أخرى', keywords: ['اخرى', 'أخرى', 'other'] },
];

const knowledgeBase = {
  'ما هو|ماهو|عن الموقع': 'سوق اليمن هو منصة للإعلانات والمزادات. بيع وشراء سيارات، عقارات، وأكثر.',
  'كيف اضيف|كيف انشر|كيف اعلن|اضافة اعلان': 'لإضافة إعلان: سجل دخول، ثم اضغط "إضافة إعلان" أو اكتب "أضف إعلان" هنا في الشات.',
  'فئات|اقسام|تصنيفات': 'الفئات المتاحة: سيارات، عقارات، جوالات، إلكترونيات، وظائف، وغيرها.',
  'تسجيل|حساب|دخول': 'للتسجيل: اضغط على زر "تسجيل" في القائمة العلوية.',
  'بحث|طريقة البحث': 'استخدم شريط البحث في الأعلى أو تصفح الفئات.',
  'سعر|اسعار': 'يمكنك تحديد السعر بالريال اليمني، السعودي، أو الدولار.',
  'مساعدة|دعم|مشكلة': 'تفضل بزيارة صفحة /help أو تواصل معنا عبر /contact.',
};

const greetings = ['مرحبا', 'اهلا', 'السلام', 'صباح', 'مساء', 'هلا'];
const thanks = ['شكرا', 'شكراً', 'يعطيك', 'تسلم', 'مشكور'];

// =========================
// 2. دوال مساعدة (Utils)
// =========================

function normalizeText(input) {
  return String(input || '').toLowerCase()
    .replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim();
}

// دالة التحقق من نية المستخدم الشاملة (أهم جزء تم إعادته)
function isStartCreateListing(messageRaw) {
  const t = normalizeText(String(messageRaw || '').trim().replace(/^\/+\s*/, ''));
  return (
    t.includes('اضف اعلان') ||
    t.includes('اضافه اعلان') ||
    t.includes('انشئ اعلان') ||
    t.includes('سوي اعلان') ||
    t.includes('ابغى اعلان') ||
    t.includes('ابغى اضيف اعلان') ||
    t.includes('بدء اعلان جديد') ||
    t.includes('اعلان جديد')
  );
}

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertArabicNumbers(text) {
  const arabicToLatin = { '٠':'0', '١':'1', '٢':'2', '٣':'3', '٤':'4', '٥':'5', '٦':'6', '٧':'7', '٨':'8', '٩':'9' };
  return String(text).replace(/[٠١٢٣٤٥٦٧٨٩]/g, (m) => arabicToLatin[m] || m);
}

function extractNumber(messageRaw) {
  const converted = convertArabicNumbers(String(messageRaw || ''));
  const t = converted.replace(/[,،]/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function normalizePhone(raw) {
  const converted = convertArabicNumbers(String(raw || ''));
  const s = converted.trim().replace(/[\s\-()]/g, '').replace(/[^0-9+]/g, '');
  if (s.startsWith('+')) return `+${s.replace(/[^0-9]/g, '')}`;
  return s;
}

function isValidPhone(phone) {
  const p = normalizePhone(phone);
  const digits = p.replace(/[^0-9]/g, '');
  return (digits.length === 9 && digits.startsWith('7')) || (digits.length === 12 && digits.startsWith('9677')) || (digits.length >= 7 && digits.length <= 15);
}

function extractLatLngFromText(messageRaw) {
  const m = String(messageRaw || '').match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return (isFinite(lat) && isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180) ? { lat, lng } : null;
}

function extractMapsLink(messageRaw) {
  const m = String(messageRaw || '').match(/https?:\/\/\S+/i);
  return m && /google\.[^/]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|openstreetmap\.org/i.test(m[0]) ? m[0] : null;
}

function detectCategorySlug(raw) {
  const t = normalizeText(raw);
  for (const c of CATEGORIES) { if (t.includes(normalizeText(c.slug))) return c.slug; }
  for (const c of CATEGORIES) { for (const kw of c.keywords) { if (t.includes(normalizeText(kw))) return c.slug; } }
  return null;
}

function categoryNameFromSlug(slug) {
  const item = CATEGORIES.find((c) => c.slug === slug);
  return item ? item.name : slug;
}

function findCityAndDistrict(text) {
  const normalized = normalizeText(text);
  let foundCity = null, foundDistrict = null;

  for (const city in yemenCities) {
    if (normalized.includes(normalizeText(city))) {
      foundCity = city;
      if (yemenCities[city].districts) {
        for (const dist of yemenCities[city].districts) {
          if (normalized.includes(normalizeText(dist))) { foundDistrict = dist; break; }
        }
      }
      break;
    }
  }
  return { city: foundCity, district: foundDistrict };
}

function getCoordinates(city, district = null) {
  if (!city) return null;
  if (district && yemenCities[district]) return { lat: yemenCities[district].lat, lng: yemenCities[district].lng, label: `${district}, ${city}` };
  if (yemenCities[city]) return { lat: yemenCities[city].lat, lng: yemenCities[city].lng, label: city };
  return null;
}

function checkRateLimit(userId, action) {
  const key = `${userId || 'anonymous'}_${action}`;
  const now = Date.now();
  if (!rateLimiter.has(key)) rateLimiter.set(key, []);
  
  const timestamps = rateLimiter.get(key).filter(t => now - t < RATE_LIMIT_WINDOW);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) return false;
  
  timestamps.push(now);
  rateLimiter.set(key, timestamps);
  return true;
}

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function findBestMatch(message) {
  const lowerMessage = normalizeText(message);
  for (const [pattern, response] of Object.entries(knowledgeBase)) {
    const patterns = pattern.split('|');
    if (patterns.some((p) => lowerMessage.includes(normalizeText(p)))) return response;
  }
  return null;
}

// =========================
// 3. تحليل النية (Intent Analysis)
// =========================

async function analyzeIntentAndSentiment(message) {
  const text = normalizeText(message);
  return {
    intents: {
      isAskingForHelp: /مساعدة|مشكلة|سؤال|استفسار|كيف|طريقة/.test(text),
      isLookingToBuy: /اشتري|اريد|مطلوب|ابحث عن|شراء/.test(text),
    }
  };
}

// =========================
// 4. منطق الخدمة (Service: Auth, DB, AI)
// =========================

async function getUserFromRequest(request) {
  const h = request.headers.get('authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  if (!adminAuth) return { error: 'admin_not_configured' };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch { return null; }
}

async function tryCountListings(categorySlug) {
  if (!adminDb) return { ok: false };
  const base = adminDb.collection('listings').where('isActive', '==', true);
  const q = categorySlug ? base.where('category', '==', categorySlug) : base;
  try {
    const snap = await q.count().get();
    return { ok: true, publicCount: snap.data().count };
  } catch { return { ok: false }; }
}

async function runAiFallback({ message }) {
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) return { ok: false };
  
  const systemPrompt = `أنت مساعد سوق اليمن. الرد JSON: { "action": "create_listing" | "count_listings" | "none", "reply": "...", "category": "..." }.`;
  
  try {
    if (GEMINI_API_KEY && ASSISTANT_PREFER_GEMINI) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const parsed = safeJsonParse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
        if (parsed) return { ok: true, ...parsed };
      }
    }
  } catch (e) { console.error(e); }
  return { ok: false };
}

// =========================
// 5. منطق معالج الإضافة (Listing Wizard) - القلب النابض
// =========================

async function loadDraft(uid) {
  if (!adminDb) return null;
  const snap = await adminDb.collection(DRAFTS_COLLECTION).doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function saveDraft(uid, data) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).set(
    { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, 
    { merge: true }
  );
}

async function clearDraft(uid) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).delete();
}

function draftSummary(d) {
  const data = d?.data || {};
  const parts = [];
  if (data.category) parts.push(`القسم: ${categoryNameFromSlug(data.category)}`);
  if (data.title) parts.push(`العنوان: ${data.title}`);
  if (data.city) parts.push(`المدينة: ${data.city}`);
  if (data.phone) parts.push(`الجوال: ${data.phone}`);
  if (data.originalPrice) parts.push(`السعر: ${data.originalPrice}`);
  return parts.join('\n');
}

async function handleListingWizard({ user, message, meta }) {
  if (!adminDb) return { reply: 'الخدمة غير مفعلة حالياً.' };
  
  const msg = normalizeText(message);
  
  // إلغاء المسودة
  if (msg.includes('الغاء')) {
    await clearDraft(user.uid);
    return { reply: 'تم إلغاء العملية ✅. اكتب "أضف إعلان" للبدء من جديد.' };
  }

  let draft = await loadDraft(user.uid);

  // بدء جديد
  if (!draft) {
    await saveDraft(user.uid, { step: 'category', data: {} });
    return { 
      reply: 'بدأنا إضافة إعلان جديد 📝\n\nالخطوة 1/7: اختر القسم (مثال: سيارات، عقارات):' 
    };
  }

  const step = draft.step || 'category';
  const data = draft.data || {};

  // -------------------------
  // خطوات المعالج (State Machine)
  // -------------------------

  // 1. القسم
  if (step === 'category') {
    const cat = detectCategorySlug(message);
    if (!cat) return { reply: 'لم أفهم القسم. الرجاء كتابة اسم القسم (مثال: سيارات):' };
    await saveDraft(user.uid, { step: 'title', data: { ...data, category: cat } });
    return { reply: `تمام ✅ القسم: ${categoryNameFromSlug(cat)}\n\nالخطوة 2/7: اكتب عنوان الإعلان:` };
  }

  // 2. العنوان
  if (step === 'title') {
    if (message.length < 5) return { reply: 'العنوان قصير جداً. اكتب عنواناً واضحاً:' };
    await saveDraft(user.uid, { step: 'description', data: { ...data, title: message } });
    return { reply: 'الخطوة 3/7: اكتب وصف الإعلان:' };
  }

  // 3. الوصف
  if (step === 'description') {
    if (message.length < 10) return { reply: 'الوصف قصير. اكتب تفاصيل أكثر:' };
    await saveDraft(user.uid, { step: 'city', data: { ...data, description: message } });
    return { reply: 'الخطوة 4/7: في أي مدينة؟ (مثال: صنعاء):' };
  }

  // 4. المدينة
  if (step === 'city') {
    const { city } = findCityAndDistrict(message);
    const actualCity = city || message;
    const coords = getCoordinates(actualCity);
    const newData = { ...data, city: actualCity };
    if (coords) { newData.lat = coords.lat; newData.lng = coords.lng; newData.locationLabel = coords.label; }
    
    await saveDraft(user.uid, { step: 'phone', data: newData });
    return { reply: `المدينة: ${actualCity} ✅\n\nالخطوة 5/7: رقم الجوال للتواصل:` };
  }

  // 5. الجوال
  if (step === 'phone') {
    const phone = normalizePhone(message);
    if (!isValidPhone(phone)) return { reply: 'رقم الجوال غير صحيح. حاول مرة أخرى:' };
    await saveDraft(user.uid, { step: 'location', data: { ...data, phone } });
    return { reply: 'الخطوة 6/7: حدد موقعك (اضغط زر الموقع 📍 أو اكتب الإحداثيات):' };
  }

  // 6. الموقع
  if (step === 'location') {
    let lat, lng, label;
    const coords = extractLatLngFromText(message);
    const link = extractMapsLink(message);
    
    // الأولوية: إحداثيات نصية -> رابط -> إحداثيات من الزر (Meta)
    if (coords) { lat = coords.lat; lng = coords.lng; }
    else if (link) { label = `رابط: ${link}`; }
    else if (meta?.location) { lat = meta.location.lat; lng = meta.location.lng; }
    
    // إذا لم يحدد شيء وكان هناك إحداثيات سابقة من المدينة، نقبل بها إذا كتب "تخطي" أو "التالي"
    if (!lat && !lng && !label && !data.lat) {
         if (message.includes('تخطي') && data.lat) {
             // Keep existing city coords
         } else {
             if (data.lat) {
                 label = message; // قد يكون كتب اسم الحي
             } else {
                 return { reply: 'لم أستطع تحديد الموقع. اضغط زر "📍 موقعي" أو اكتب الإحداثيات:' };
             }
         }
    }
    
    await saveDraft(user.uid, { step: 'price', data: { ...data, lat, lng, locationLabel: label || message } });
    return { reply: 'تم حفظ الموقع ✅\n\nالخطوة 7/7: كم السعر؟ (اكتب الرقم فقط):' };
  }

  // 7. السعر
  if (step === 'price') {
    const price = extractNumber(message);
    if (!price) return { reply: 'الرجاء كتابة السعر كرقم (مثال: 50000):' };
    await saveDraft(user.uid, { step: 'confirm', data: { ...data, originalPrice: price } });
    
    const summary = draftSummary({ data: { ...data, originalPrice: price } });
    return { reply: `مراجعة الإعلان:\n${summary}\n\nاكتب "نشر" للاعتماد أو "الغاء" للإلغاء.` };
  }

  // 8. التأكيد والنشر
  if (step === 'confirm') {
    if (msg.includes('نشر') || msg.includes('تم') || msg.includes('موافق')) {
        const listing = {
            ...data,
            userId: user.uid,
            userEmail: user.email,
            userName: user.name,
            isActive: true,
            views: 0,
            likes: 0,
            hidden: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            priceYER: Number(data.originalPrice), // تبسيط للعملة
            originalCurrency: 'YER',
            images: meta?.images || [] // إذا تم رفع صور في الخطوة الأخيرة
        };
        
        const ref = await adminDb.collection('listings').add(listing);
        await clearDraft(user.uid);
        return { reply: `تم نشر الإعلان بنجاح! 🎉\nرابط الإعلان: /listing/${ref.id}` };
    }
    return { reply: 'اكتب "نشر" للاعتماد النهائي.' };
  }

  return { reply: 'حدث خطأ غير متوقع في المعالج.' };
}

// =========================
// 6. Main Route Handler
// =========================

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { message, history, meta } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    const normalized = normalizeText(trimmedMessage);
    
    // 1. Rate Limiting
    const user = await getUserFromRequest(request);
    const userId = user?.uid || 'anonymous';
    if (!checkRateLimit(userId, 'assistant_request')) {
      return NextResponse.json({ error: 'تجاوزت الحد المسموح. انتظر دقيقة.' }, { status: 429 });
    }

    // 2. التحقق من نية المستخدم (Wizard Trigger)
    // هذا الجزء تم إعادته ليغطي كل الاحتمالات ويتأكد من تسجيل الدخول
    const wantsToCreate = isStartCreateListing(normalized);
    const wantsToCancel = normalized.includes('الغاء');
    
    // تحميل المسودة (فقط إذا كان مسجل)
    let draft = null;
    if (user && !user.error) {
      draft = await loadDraft(user.uid);
    }

    if (wantsToCreate || wantsToCancel || draft || meta?.images?.length > 0) {
       // إذا كان يريد الإضافة وغير مسجل
       if (!user || user.error) {
           return NextResponse.json({ 
             reply: 'لإضافة إعلان، يرجى تسجيل الدخول أولاً ✅\nاضغط على زر التسجيل في الأعلى.' 
           });
       }

       // التعامل مع المعالج
       const res = await handleListingWizard({ user, message: trimmedMessage, meta });
       if (res && res.reply) {
           return NextResponse.json({ reply: res.reply });
       }
    }

    // 3. Simple Intents (Count, Greetings)
    if (normalized.includes('كم عدد') || normalized.includes('عدد الاعلانات')) {
        const cat = detectCategorySlug(normalized);
        const result = await tryCountListings(cat);
        const label = cat ? categoryNameFromSlug(cat) : 'كل الأقسام';
        return NextResponse.json({ reply: `عدد الإعلانات في ${label}: ${result.ok ? result.publicCount : 'غير متاح'}` });
    }

    if (greetings.some(g => normalized.includes(normalizeText(g)))) {
        return NextResponse.json({ reply: 'مرحباً بك في سوق اليمن! 🇾🇪\nكيف يمكنني مساعدتك اليوم؟\n(اكتب "أضف إعلان" للبيع)' });
    }

    if (thanks.some(t => normalized.includes(normalizeText(t)))) {
        return NextResponse.json({ reply: 'العفو! 😊' });
    }

    // 4. Knowledge Base (FAQ)
    const faqAnswer = findBestMatch(trimmedMessage);
    if (faqAnswer) {
      return NextResponse.json({ reply: faqAnswer });
    }

    // 5. AI Fallback
    const analysis = await analyzeIntentAndSentiment(trimmedMessage);
    if (analysis.intents.isAskingForHelp || analysis.intents.isLookingToBuy) {
        const aiResult = await runAiFallback({ message: trimmedMessage, history });
        if (aiResult.ok) {
            return NextResponse.json({ reply: aiResult.reply });
        }
    }

    // 6. Default Fallback
    return NextResponse.json({
      reply: 'لم أفهم سؤالك تماماً 🤔\nيمكنك السؤال عن:\n• كيفية إضافة إعلان\n• عدد الإعلانات\n• أو اكتب "أضف إعلان" للبدء.'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة الطلب' }, { status: 500 });
  }
}
