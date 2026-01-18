// app/api/chat/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import admin, { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// =========================
// Collections
// =========================
const SESSIONS_COLLECTION = 'assistant_sessions';
const LISTINGS_COLLECTION = 'listings';
const IDEMPOTENCY_COLLECTION = 'assistant_idempotency';
const GEOCODE_CACHE_COLLECTION = 'geocode_cache';

// =========================
// Rate limit (in-memory; best-effort in serverless)
// =========================
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

function getClientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function rateLimitOrThrow(key) {
  const now = Date.now();
  const row = rateLimiter.get(key) || { start: now, count: 0 };
  if (now - row.start > RATE_LIMIT_WINDOW_MS) {
    rateLimiter.set(key, { start: now, count: 1 });
    return;
  }
  row.count += 1;
  rateLimiter.set(key, row);
  if (row.count > MAX_REQUESTS_PER_WINDOW) {
    const err = new Error('RATE_LIMIT');
    err.code = 'RATE_LIMIT';
    throw err;
  }
}

// =========================
// Helpers
// =========================
function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function shortId(len = 18) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

function normText(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isCancel(s) {
  const t = normText(s);
  return (
    t === 'الغاء' ||
    t === 'إلغاء' ||
    t.includes('الغ') ||
    t.includes('إلغاء') ||
    t.includes('cancel') ||
    t.includes('وقف') ||
    t.includes('ايقاف') ||
    t.includes('إيقاف')
  );
}

function isStartAdd(s) {
  const t = normText(s);
  return (
    t.includes('اضافة اعلان') ||
    t.includes('إضافة اعلان') ||
    t.includes('إضافة إعلان') ||
    t.includes('اعلان جديد') ||
    t.includes('إعلان جديد') ||
    t === 'اضافة' ||
    t === 'إضافة'
  );
}

function isPublish(s) {
  const t = normText(s);
  return t === 'نشر' || t === 'انشر' || t === 'نعم' || t === 'موافق' || t === 'تمام';
}

// تحويل أرقام عربية/فارسية إلى إنجليزية + فواصل
function toEnglishDigits(input) {
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .replace(/,/g, '');
}

function extractNumber(s) {
  const m = String(s || '').match(/(-?\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// دعم مبسط لكلمات مثل: ألف، ألفين، مليون
function parseArabicWordNumber(s) {
  const t = normText(s);
  if (t.includes('مليون')) return 1000000;
  if (t.includes('الفين') || t.includes('ألفين')) return 2000;
  if (t.includes('الف') || t.includes('ألف')) return 1000;
  return null;
}

function detectCurrencyFromText(s) {
  const t = normText(s);

  if (t.includes('usd') || t.includes('دولار') || t.includes('دولارات')) return { code: 'USD', ambiguous: false };
  if (t.includes('sar') || t.includes('ريال سعودي') || t.includes('سعودي') || t.includes('س.ر') || t.includes('rs'))
    return { code: 'SAR', ambiguous: false };
  if (t.includes('yer') || t.includes('ريال يمني') || t.includes('يمني') || t.includes('ر.ي')) return { code: 'YER', ambiguous: false };

  // "ريال" فقط = مبهم
  if (t.includes('ريال')) return { code: null, ambiguous: true };

  return { code: null, ambiguous: false };
}

function parsePriceAndMaybeCurrency(rawText) {
  const text = toEnglishDigits(rawText);
  let price = extractNumber(text);

  if (!Number.isFinite(price)) {
    const w = parseArabicWordNumber(rawText);
    if (Number.isFinite(w)) price = w;
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'INVALID_PRICE', price: null, currency: null, ambiguousCurrency: false };
  }

  const cur = detectCurrencyFromText(rawText);
  return { ok: true, price: Math.round(price), currency: cur.code, ambiguousCurrency: !!cur.ambiguous };
}

function normalizeContact(raw) {
  const s = toEnglishDigits(raw);
  const cleaned = String(s || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .replace(/^\+{2,}/g, '+');

  const normalized = cleaned.startsWith('+') ? '+' + cleaned.slice(1).replace(/\+/g, '') : cleaned.replace(/\+/g, '');
  return { raw: String(raw || '').trim(), normalized };
}

function isValidContactLocalOrIntl(normalized) {
  if (!normalized) return false;
  if (normalized.startsWith('+')) return /^\+\d{8,15}$/.test(normalized);
  return /^\d{7,15}$/.test(normalized);
}

function extractLatLng(s) {
  const text = toEnglishDigits(s);
  const m = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// ===== Google Maps URL -> lat/lng =====
// يدعم:
// - https://www.google.com/maps?q=15.3,44.2
// - https://www.google.com/maps/search/?api=1&query=15.3,44.2
// - .../@15.3694,44.1910,17z
// - ll=15.3,44.2
function extractLatLngFromGoogleMapsUrl(urlText) {
  const text = String(urlText || '').trim();
  if (!text) return null;
  if (!/google\.[a-z.]+\/maps/i.test(text) && !/maps\.app\.goo\.gl/i.test(text)) return null;

  const decoded = decodeURIComponent(text);

  // pattern: @lat,lng
  let m = decoded.match(/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // pattern: q=lat,lng or query=lat,lng or ll=lat,lng
  m = decoded.match(/[?&](q|query|ll)=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/);
  if (m) return { lat: Number(m[2]), lng: Number(m[3]) };

  m = decoded.match(/[?&](q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (m) return { lat: Number(m[2]), lng: Number(m[3]) };

  // بعض الروابط تكون فيها /?q=lat,lng بدون فواصل واضحة
  m = decoded.match(/\/\?q=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  return null;
}

// Yemen bounds (تقريبي)
const YEMEN_BOUNDS = { minLat: 12.0, maxLat: 19.5, minLng: 41.0, maxLng: 54.7 };
function isLikelyYemen(lat, lng) {
  return lat >= YEMEN_BOUNDS.minLat && lat <= YEMEN_BOUNDS.maxLat && lng >= YEMEN_BOUNDS.minLng && lng <= YEMEN_BOUNDS.maxLng;
}

// =========================
// Categories (match Firestore IDs exactly)
// =========================
const CATEGORY_CANON = [
  { id: 'animals', nameAr: 'حيوانات' },
  { id: 'cars', nameAr: 'سيارات' },
  { id: 'clothes', nameAr: 'ملابس' },
  { id: 'electronics', nameAr: 'إلكترونيات' },
  { id: 'furniture', nameAr: 'أثاث' },
  { id: 'heavy_equipment', nameAr: 'معدات ثقيلة' },
  { id: 'home_tools', nameAr: 'منزل وأدوات' },
  { id: 'jobs', nameAr: 'وظائف' },
  { id: 'maintenance', nameAr: 'صيانة' },
  { id: 'motorcycles', nameAr: 'دراجات نارية' },
  { id: 'networks', nameAr: 'شبكات' },
  { id: 'phones', nameAr: 'جوالات' },
  { id: 'real_estate', nameAr: 'عقارات' },
  { id: 'services', nameAr: 'خدمات' },
  { id: 'solar', nameAr: 'طاقة شمسية' },
  { id: 'other', nameAr: 'أخرى' },
];

const CATEGORY_ALIASES = new Map([
  ['سيارات', 'cars'],
  ['سيارة', 'cars'],
  ['car', 'cars'],
  ['cars', 'cars'],
  ['كارس', 'cars'],

  ['جوالات', 'phones'],
  ['جوال', 'phones'],
  ['هواتف', 'phones'],
  ['فون', 'phones'],
  ['phone', 'phones'],
  ['phones', 'phones'],
  ['mobile', 'phones'],
  ['mobiles', 'phones'],

  ['عقارات', 'real_estate'],
  ['عقار', 'real_estate'],
  ['اراضي', 'real_estate'],
  ['أراضي', 'real_estate'],
  ['realestate', 'real_estate'],
  ['real estate', 'real_estate'],
  ['real_estate', 'real_estate'],

  ['الكترونيات', 'electronics'],
  ['إلكترونيات', 'electronics'],
  ['electronics', 'electronics'],
  ['كمبيوتر', 'electronics'],
  ['لاب توب', 'electronics'],
  ['لابتوب', 'electronics'],

  ['شبكات', 'networks'],
  ['شبكة', 'networks'],
  ['انترنت', 'networks'],
  ['واي فاي', 'networks'],
  ['networks', 'networks'],

  ['خدمات', 'services'],
  ['خدمة', 'services'],
  ['services', 'services'],

  ['طاقة شمسية', 'solar'],
  ['شمسي', 'solar'],
  ['solar', 'solar'],

  ['صيانة', 'maintenance'],
  ['maintenance', 'maintenance'],

  ['معدات', 'heavy_equipment'],
  ['معدات ثقيلة', 'heavy_equipment'],
  ['heavy equipment', 'heavy_equipment'],
  ['heavy_equipment', 'heavy_equipment'],

  ['منزل', 'home_tools'],
  ['بيت', 'home_tools'],
  ['ادوات منزلية', 'home_tools'],
  ['أدوات منزلية', 'home_tools'],
  ['home tools', 'home_tools'],
  ['home_tools', 'home_tools'],

  ['اثاث', 'furniture'],
  ['أثاث', 'furniture'],
  ['furniture', 'furniture'],

  ['ملابس', 'clothes'],
  ['clothes', 'clothes'],

  ['وظائف', 'jobs'],
  ['وظيفة', 'jobs'],
  ['jobs', 'jobs'],

  ['حيوانات', 'animals'],
  ['animals', 'animals'],

  ['دراجات', 'motorcycles'],
  ['دراجة', 'motorcycles'],
  ['دراجات نارية', 'motorcycles'],
  ['motorcycles', 'motorcycles'],

  ['أخرى', 'other'],
  ['اخرى', 'other'],
  ['other', 'other'],
]);

function pickCategoryByNumber(n) {
  const idx = Number(n) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= CATEGORY_CANON.length) return null;
  const c = CATEGORY_CANON[idx];
  return { id: c.id, nameAr: c.nameAr };
}

function normalizeCategory(input) {
  const raw = String(input || '').trim();
  const t = normText(raw).replace(/[^\p{L}\p{N}\s_]/gu, '').trim();

  const num = extractNumber(toEnglishDigits(t));
  if (num && Number.isInteger(num)) {
    const picked = pickCategoryByNumber(num);
    if (picked) return picked;
  }

  if (CATEGORY_ALIASES.has(t)) {
    const id = CATEGORY_ALIASES.get(t);
    const found = CATEGORY_CANON.find((x) => x.id === id);
    return found ? { id: found.id, nameAr: found.nameAr } : { id, nameAr: raw };
  }

  const direct = CATEGORY_CANON.find((x) => normText(x.id) === t);
  if (direct) return { id: direct.id, nameAr: direct.nameAr };

  for (const [alias, id] of CATEGORY_ALIASES.entries()) {
    if (t.includes(alias)) {
      const found = CATEGORY_CANON.find((x) => x.id === id);
      return found ? { id: found.id, nameAr: found.nameAr } : { id, nameAr: raw };
    }
  }

  return { id: 'other', nameAr: 'أخرى' };
}

function categoriesMenu() {
  return CATEGORY_CANON.map((c, i) => `${i + 1}) ${c.nameAr}`).join('\n');
}

// =========================
// Session storage (Firestore)
// =========================
async function getSession(sessionId) {
  if (!sessionId) return null;
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: sessionId, ...snap.data() };
}

async function upsertSession(sessionId, patch) {
  const ref = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);
  await ref.set(
    {
      ...patch,
      updatedAt: nowTs(),
    },
    { merge: true }
  );
}

function defaultSession() {
  return {
    mode: 'add_listing_only',
    step: 'idle',
    draft: {},
    lastUser: '',
    lastPrompt: '',
    lastReplyHash: '',
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
}

function avoidRepeatReply(session, reply) {
  const h = crypto.createHash('sha1').update(reply).digest('hex');
  if (session?.lastReplyHash && session.lastReplyHash === h) return null;
  return h;
}

// =========================
// Geocoding (Nominatim) + Cache
// =========================
function geocodeCacheKey(q) {
  return crypto.createHash('sha1').update(normText(q)).digest('hex').slice(0, 24);
}

async function getGeocodeFromCache(q) {
  const key = geocodeCacheKey(q);
  const ref = adminDb.collection(GEOCODE_CACHE_COLLECTION).doc(key);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return data?.result || null;
}

async function setGeocodeCache(q, result) {
  const key = geocodeCacheKey(q);
  const ref = adminDb.collection(GEOCODE_CACHE_COLLECTION).doc(key);
  await ref.set(
    {
      q: String(q || '').trim(),
      result,
      updatedAt: nowTs(),
      createdAt: nowTs(),
    },
    { merge: true }
  );
}

async function geocodePlaceNominatim(query) {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: 'EMPTY_QUERY' };

  const cached = await getGeocodeFromCache(q);
  if (cached) return { ok: true, ...cached, cached: true };

  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ye',
      'accept-language': 'ar',
    }).toString();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'sooqyemen/1.0 (contact: support@sooqyemen.local)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) return { ok: false, error: 'GEOCODE_HTTP', status: res.status };

  const arr = await res.json().catch(() => null);
  if (!Array.isArray(arr) || arr.length === 0) {
    const pack = { ok: false, error: 'NO_RESULTS' };
    await setGeocodeCache(q, { ok: false, error: 'NO_RESULTS' });
    return pack;
  }

  const mapped = arr
    .map((x) => ({
      display: x.display_name,
      lat: Number(x.lat),
      lng: Number(x.lon),
      importance: Number(x.importance || 0),
    }))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));

  const inside = mapped.filter((x) => isLikelyYemen(x.lat, x.lng));
  const pickFrom = inside.length ? inside : mapped;

  pickFrom.sort((a, b) => (b.importance || 0) - (a.importance || 0));
  const options = pickFrom.slice(0, 3);

  const payload =
    options.length === 1
      ? { ok: true, single: true, lat: options[0].lat, lng: options[0].lng, display: options[0].display }
      : { ok: true, single: false, options };

  await setGeocodeCache(q, payload);
  return payload;
}

// =========================
// Listing publish (idempotency)
// =========================
async function publishListing(draft, sessionId) {
  const idemKey = crypto
    .createHash('sha1')
    .update(JSON.stringify({ sessionId, draft }))
    .digest('hex')
    .slice(0, 24);

  const idemRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(idemKey);
  const idemSnap = await idemRef.get();
  if (idemSnap.exists) {
    const data = idemSnap.data() || {};
    return { ok: true, already: true, listingId: data.listingId || null };
  }

  const listingId = shortId(20);

  const payload = {
    id: listingId,

    title: String(draft.title || '').trim(),
    description: String(draft.description || '').trim(),

    category: draft.categorySlug || 'other',
    categorySlug: draft.categorySlug || 'other',
    categoryName: draft.categoryName || 'أخرى',

    city: String(draft.city || '').trim(),

    price: draft.price,
    currency: draft.currency,

    contactRaw: String(draft.contactRaw || '').trim(),
    contact: String(draft.contact || '').trim(),

    images: Array.isArray(draft.images) ? draft.images : [],

    lat: draft.lat,
    lng: draft.lng,

    status: 'active',
    source: 'assistant',

    createdAt: nowTs(),
    updatedAt: nowTs(),
  };

  const missing = [];
  if (!payload.title || payload.title.length < 3) missing.push('title');
  if (!payload.description || payload.description.length < 10) missing.push('description');
  if (!payload.city || payload.city.length < 2) missing.push('city');
  if (!payload.categorySlug) missing.push('category');
  if (!Number.isFinite(payload.price) || payload.price <= 0) missing.push('price');
  if (!payload.currency) missing.push('currency');
  if (!payload.contact || !isValidContactLocalOrIntl(payload.contact)) missing.push('contact');
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) missing.push('location');
  if (!Array.isArray(payload.images) || payload.images.length === 0) missing.push('images');

  if (missing.length) return { ok: false, error: 'MISSING_FIELDS', missing };

  await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).set(payload);
  await idemRef.set({ listingId, createdAt: nowTs() });

  return { ok: true, already: false, listingId };
}

// =========================
// Wizard (Order 1)
// title -> description -> category -> city -> location -> price -> currency(if needed) -> contact -> images -> confirm/publish
// =========================
function buildSummary(draft) {
  const lines = [];
  lines.push(`• العنوان: ${draft.title || '-'}`);
  lines.push(`• الوصف: ${draft.description || '-'}`);
  lines.push(`• القسم: ${draft.categoryName || '-'} (${draft.categorySlug || '-'})`);
  lines.push(`• المدينة: ${draft.city || '-'}`);
  lines.push(`• الموقع: ${draft.lat && draft.lng ? `${draft.lat}, ${draft.lng}` : '-'}`);
  lines.push(`• السعر: ${draft.price ? `${draft.price} ${draft.currency || ''}`.trim() : '-'}`);
  lines.push(`• التواصل: ${draft.contactRaw || draft.contact || '-'}`);
  lines.push(`• الصور: ${Array.isArray(draft.images) && draft.images.length ? `(${draft.images.length})` : '-'}`);
  return lines.join('\n');
}

function nextPrompt(step, draft) {
  switch (step) {
    case 'ask_title':
      return `تمام ✅ اكتب *عنوان الإعلان* (قصير وواضح).`;
    case 'ask_description':
      return `اكتب *وصف الإعلان* (تفاصيل + الحالة + أي ملاحظات).`;
    case 'ask_category':
      return `اختر *القسم* (اكتب رقم أو اسم القسم):\n${categoriesMenu()}`;
    case 'ask_city':
      return `اكتب *المدينة/المنطقة* (ويُفضّل تضيف الحي إذا تعرفه مثل: صنعاء، حدة).`;
    case 'ask_location':
      return (
        `حدد *الموقع* (إلزامي لظهور الإعلان على الخريطة):\n` +
        `- اكتب اسم المكان: "صنعاء، حدة"\n` +
        `- أو ارسل إحداثيات: 15.3694, 44.1910\n` +
        `- أو ارسل رابط Google Maps (وأستخرج الإحداثيات تلقائياً)`
      );
    case 'choose_location':
      return `اختر رقم الموقع الصحيح من الخيارات.`;
    case 'ask_price':
      return `اكتب *السعر*.\nمثال: 1000 سعودي / 35000 يمني / 200 دولار / "ألف ريال سعودي"`;
    case 'ask_currency':
      return `حدد *العملة*: يمني / سعودي / دولار`;
    case 'ask_contact':
      return `اكتب *رقم التواصل* (إلزامي) بدون مفتاح دولي عادي.\nمثال: 777123456`;
    case 'ask_images':
      return `ارسل *الصور* عبر زر رفع الصور أو أرسل روابط الصور هنا.\nوعندما تخلص اكتب: تم`;
    case 'confirm':
      return `راجع الإعلان قبل النشر:\n${buildSummary(draft)}\n\nإذا تمام اكتب: نشر\nأو اكتب: تعديل العنوان / تعديل الوصف / تعديل القسم / تعديل المدينة / تعديل الموقع / تعديل السعر / تعديل العملة / تعديل التواصل / تعديل الصور\nوللإلغاء: إلغاء`;
    default:
      return `اكتب "إضافة إعلان" للبدء.`;
  }
}

function applyEditCommand(text) {
  const t = normText(text);
  if (!t.startsWith('تعديل')) return null;
  if (t.includes('عنوان')) return 'ask_title';
  if (t.includes('وصف')) return 'ask_description';
  if (t.includes('قسم')) return 'ask_category';
  if (t.includes('مدينة') || t.includes('المدينة')) return 'ask_city';
  if (t.includes('موقع') || t.includes('الموقع')) return 'ask_location';
  if (t.includes('سعر') || t.includes('السعر')) return 'ask_price';
  if (t.includes('عملة') || t.includes('العملة')) return 'ask_currency';
  if (t.includes('تواصل') || t.includes('رقم')) return 'ask_contact';
  if (t.includes('صور') || t.includes('الصورة') || t.includes('الصوره')) return 'ask_images';
  return null;
}

function extractUrls(text) {
  const s = String(text || '');
  const urls = s.match(/https?:\/\/[^\s]+/g) || [];
  return urls.map((u) => u.replace(/[),.]+$/g, '')).filter(Boolean);
}

// يلتقط روابط صور من body.images إن وُجدت (واجهة الزر)
function extractImageUrlsFromBodyImages(bodyImages) {
  if (!Array.isArray(bodyImages)) return [];
  return bodyImages
    .map((x) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') return x.url || x.downloadURL || x.src || '';
      return '';
    })
    .filter((u) => typeof u === 'string' && u.startsWith('http'));
}

async function handleWizard(session, userMessage, sessionId, bodyImages = null) {
  const raw = String(userMessage || '').trim();

  if (isCancel(raw)) {
    await upsertSession(sessionId, { ...defaultSession(), step: 'idle', draft: {} });
    return { reply: `تم الإلغاء ✅\nإذا تبغى تبدأ من جديد اكتب: إضافة إعلان`, step: 'idle', draft: {} };
  }

  if (session.step === 'idle' || isStartAdd(raw)) {
    const step = 'ask_title';
    const draft = {};
    return { reply: nextPrompt(step, draft), step, draft };
  }

  const editStep = applyEditCommand(raw);
  if (session.step === 'confirm' && editStep) {
    return { reply: nextPrompt(editStep, session.draft || {}), step: editStep, draft: session.draft || {} };
  }

  if (session.step === 'confirm' && isPublish(raw)) {
    const draft = session.draft || {};
    const res = await publishListing(draft, sessionId);

    if (!res.ok) {
      return {
        reply: `ما قدرت أنشر الإعلان لأن في بيانات ناقصة/غير صحيحة: ${Array.isArray(res.missing) ? res.missing.join(', ') : res.error}\n\n${nextPrompt('confirm', draft)}`,
        step: 'confirm',
        draft,
      };
    }

    const msg = res.already
      ? `هذا الإعلان تم نشره مسبقاً ✅\nرقم الإعلان: ${res.listingId || '-'}\n\nتبغى تضيف إعلان ثاني؟ اكتب: إضافة إعلان`
      : `تم نشر الإعلان بنجاح ✅\nرقم الإعلان: ${res.listingId}\n\nتبغى تضيف إعلان ثاني؟ اكتب: إضافة إعلان`;

    return { reply: msg, step: 'idle', draft: {} };
  }

  const draft = session.draft || {};
  let step = session.step;

  // ==== order steps ====

  if (step === 'ask_title') {
    const title = String(raw || '').trim();
    if (title.length < 3) return { reply: `العنوان قصير. اكتب عنوان أوضح.`, step, draft };
    draft.title = title.slice(0, 120);
    step = 'ask_description';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_description') {
    const desc = String(raw || '').trim();
    if (desc.length < 10) return { reply: `الوصف قصير. اكتب تفاصيل أكثر.`, step, draft };
    draft.description = desc.slice(0, 2500);
    step = 'ask_category';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_category') {
    const cat = normalizeCategory(raw);
    draft.categorySlug = cat.id;
    draft.categoryName = cat.nameAr;
    step = 'ask_city';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_city') {
    const city = String(raw || '').trim();
    if (city.length < 2) return { reply: `اكتب المدينة بشكل أوضح (مثال: صنعاء، حدة).`, step, draft };
    draft.city = city.slice(0, 80);
    step = 'ask_location';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_location') {
    const msg = toEnglishDigits(raw);

    // 1) lat,lng as text
    const ll = extractLatLng(msg);
    if (ll) {
      draft.lat = ll.lat;
      draft.lng = ll.lng;
      step = 'ask_price';
      return { reply: nextPrompt(step, draft), step, draft };
    }

    // 2) Google Maps URL
    const fromMaps = extractLatLngFromGoogleMapsUrl(raw);
    if (fromMaps && Number.isFinite(fromMaps.lat) && Number.isFinite(fromMaps.lng)) {
      draft.lat = fromMaps.lat;
      draft.lng = fromMaps.lng;
      step = 'ask_price';
      return { reply: `تم استخراج الموقع من رابط الخرائط ✅\n\n${nextPrompt(step, draft)}`, step, draft };
    }

    // 3) place name -> Nominatim
    const q = `${draft.city || ''} ${raw}`.trim();
    const geo = await geocodePlaceNominatim(q);

    if (!geo.ok) {
      return {
        reply:
          `ما قدرت أحدد الموقع من هذا الاسم.\n` +
          `جرّب تكتب أدق (مدينة + حي) مثل: "صنعاء، حدة"\n` +
          `أو ارسل الإحداثيات: 15.3694, 44.1910\n` +
          `أو ارسل رابط Google Maps`,
        step,
        draft,
      };
    }

    if (geo.single) {
      draft.lat = geo.lat;
      draft.lng = geo.lng;
      step = 'ask_price';
      return { reply: `تم تحديد الموقع ✅\n${geo.display || ''}\n\n${nextPrompt(step, draft)}`, step, draft };
    }

    draft._geoOptions = geo.options || [];
    step = 'choose_location';

    const list = (draft._geoOptions || [])
      .map((o, i) => `${i + 1}) ${o.display || ''} (${o.lat}, ${o.lng})`)
      .join('\n');

    return { reply: `اختر الموقع الصحيح برقم:\n${list}`, step, draft };
  }

  if (step === 'choose_location') {
    const n = extractNumber(toEnglishDigits(raw));
    const idx = n ? Number(n) - 1 : -1;
    const opts = Array.isArray(draft._geoOptions) ? draft._geoOptions : [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length) {
      const list = opts.map((o, i) => `${i + 1}) ${o.display || ''}`).join('\n');
      return { reply: `اكتب رقم صحيح من الخيارات:\n${list}`, step, draft };
    }
    const chosen = opts[idx];
    draft.lat = chosen.lat;
    draft.lng = chosen.lng;
    draft._geoOptions = [];
    step = 'ask_price';
    return { reply: `تم اختيار الموقع ✅\n\n${nextPrompt(step, draft)}`, step, draft };
  }

  if (step === 'ask_price') {
    const parsed = parsePriceAndMaybeCurrency(raw);

    if (!parsed.ok) {
      return { reply: `السعر غير واضح. مثال: 1000 سعودي / 35000 يمني / 200 دولار`, step, draft };
    }

    draft.price = parsed.price;

    if (parsed.currency) {
      draft.currency = parsed.currency;
      step = 'ask_contact';
      return { reply: nextPrompt(step, draft), step, draft };
    }

    step = 'ask_currency';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_currency') {
    const t = normText(raw);
    let cur = null;

    if (t.includes('يمن') || t.includes('يمني') || t === 'yer') cur = 'YER';
    if (t.includes('سعود') || t.includes('سعودي') || t.includes('ريال سعودي') || t === 'sar') cur = 'SAR';
    if (t.includes('دول') || t.includes('دولار') || t === 'usd') cur = 'USD';

    if (!cur) return { reply: `اكتب العملة: يمني / سعودي / دولار`, step, draft };

    draft.currency = cur;
    step = 'ask_contact';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_contact') {
    const { raw: contactRaw, normalized } = normalizeContact(raw);
    if (!isValidContactLocalOrIntl(normalized)) {
      return { reply: `الرقم غير واضح. اكتبه بدون مسافات مثل: 777123456`, step, draft };
    }
    draft.contactRaw = contactRaw;
    draft.contact = normalized;
    step = 'ask_images';
    return { reply: nextPrompt(step, draft), step, draft };
  }

  if (step === 'ask_images') {
    // 1) صور من body.images (زر الرفع)
    const incomingFromButton = extractImageUrlsFromBodyImages(bodyImages);
    if (incomingFromButton.length) {
      const current = Array.isArray(draft.images) ? draft.images : [];
      draft.images = [...current, ...incomingFromButton].slice(0, 12);
      return { reply: `تم استلام الصور ✅\nإذا انتهيت اكتب: تم`, step, draft };
    }

    // 2) روابط في الرسالة
    const urls = extractUrls(raw);
    if (urls.length) {
      const current = Array.isArray(draft.images) ? draft.images : [];
      draft.images = [...current, ...urls].slice(0, 12);
      return { reply: `تم إضافة ${urls.length} صورة ✅\nأرسل صور أخرى أو اكتب: تم`, step, draft };
    }

    // 3) إنهاء
    const t = normText(raw);
    if (t === 'تم' || t === 'done') {
      if (!Array.isArray(draft.images) || draft.images.length === 0) {
        return { reply: `لازم تضيف صورة واحدة على الأقل. ارفع صورة أو أرسل رابط ثم اكتب: تم`, step, draft };
      }
      step = 'confirm';
      return { reply: nextPrompt(step, draft), step, draft };
    }

    return { reply: `ارفع الصور من زر الصور أو أرسل روابط. وعندما تخلص اكتب: تم`, step, draft };
  }

  if (step === 'confirm') {
    return { reply: `اكتب "نشر" للنشر ✅ أو "تعديل ..." للتعديل، أو "إلغاء" للإلغاء.`, step, draft };
  }

  return { reply: `اكتب "إضافة إعلان" للبدء.`, step: 'idle', draft: {} };
}

// =========================
// API Handlers
// =========================
export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));

    const userMessage = body?.message ?? body?.text ?? '';
    let sessionId = body?.sessionId ?? body?.sid ?? '';
    const bodyImages = body?.images ?? body?.files ?? null;

    if (!sessionId || String(sessionId).length < 8) sessionId = shortId(18);

    rateLimitOrThrow(`${ip}:${sessionId}`);

    let session = await getSession(sessionId);
    if (!session) {
      session = { ...defaultSession(), step: 'idle', draft: {} };
      await upsertSession(sessionId, session);
    }

    // Dedup same user message (includes digit normalization)
    const msgNorm = normText(toEnglishDigits(userMessage));
    if (session.lastUser && session.lastUser === msgNorm && !Array.isArray(bodyImages)) {
      const reply = session.lastPrompt || nextPrompt(session.step || 'idle', session.draft || {});
      return NextResponse.json({ ok: true, sessionId, reply, step: session.step || 'idle', draft: session.draft || {}, dedup: true });
    }

    const result = await handleWizard(session, userMessage, sessionId, bodyImages);

    const replyHash = avoidRepeatReply(session, result.reply);
    const replyToSend = replyHash === null ? `${result.reply}\n\n${nextPrompt(result.step, result.draft)}` : result.reply;

    await upsertSession(sessionId, {
      mode: 'add_listing_only',
      step: result.step || 'idle',
      draft: result.draft || {},
      lastUser: msgNorm,
      lastPrompt: replyToSend,
      lastReplyHash: replyHash || session.lastReplyHash || '',
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      reply: replyToSend,
      step: result.step || 'idle',
      draft: result.draft || {},
      mode: 'add_listing_only',
    });
  } catch (e) {
    if (e?.code === 'RATE_LIMIT' || String(e?.message || '').includes('RATE_LIMIT')) {
      return NextResponse.json({ ok: false, error: 'RATE_LIMIT', reply: 'تم تجاوز الحد المسموح مؤقتاً. جرّب بعد قليل.' }, { status: 429 });
    }
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR', reply: 'صار خطأ في السيرفر أثناء معالجة الطلب.', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'sooqyemen assistant api',
    mode: 'add_listing_only',
    supports: ['google_maps_url_location', 'nominatim_geocode', 'images_in_body_or_links'],
    order: 'title->description->category->city->location->price->currency(if needed)->contact->images->confirm->publish',
  });
}
