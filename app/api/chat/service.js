import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import {
  normalizeText,
  detectCategorySlug,
  parsePriceAndCurrency,
  normalizePhone,
  isValidPhone,
  parseLocationFromTextOrMeta,
  findCityAndDistrict,
  getCoordinates,
  categoryNameFromSlug,
  findBestMatch,
  checkRateLimit,
  draftSummary,
  listingNextPrompt,
  isCommand,
} from './utils';
import { CATEGORIES, LISTING_WIZARD } from './data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 15000);
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';

const DRAFTS_COLLECTION = 'assistant_drafts';
const IDEMPOTENCY_COLLECTION = 'assistant_idempotency';

// افتراضي (لو ما عندك جدول أسعار في قاعدة البيانات)
const DEFAULT_RATE_SAR_TO_YER = Number(process.env.DEFAULT_RATE_SAR_TO_YER || 425);
const DEFAULT_RATE_USD_TO_YER = Number(process.env.DEFAULT_RATE_USD_TO_YER || 1632);

const STEP_ORDER = ['title', 'description', 'city', 'category', 'price', 'currency', 'phone', 'images', 'location', 'confirm'];

// =========================
// Helpers
// =========================

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getRatesFromDb() {
  // اختيارياً: ضع وثيقة rates في settings/rates
  if (!adminDb) return null;
  try {
    const snap = await adminDb.collection('settings').doc('rates').get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const sar = Number(d.SAR_TO_YER || d.sarToYer || d.sar || 0) || null;
    const usd = Number(d.USD_TO_YER || d.usdToYer || d.usd || 0) || null;
    return { sarToYer: sar, usdToYer: usd };
  } catch {
    return null;
  }
}

async function computePriceYER(originalPrice, originalCurrency) {
  const p = Number(originalPrice);
  if (!isFinite(p) || p <= 0) return null;
  const c = String(originalCurrency || 'YER').toUpperCase();

  if (c === 'YER') return Math.round(p);

  const rates = (await getRatesFromDb()) || {};
  const sarToYer = Number(rates.sarToYer || DEFAULT_RATE_SAR_TO_YER);
  const usdToYer = Number(rates.usdToYer || DEFAULT_RATE_USD_TO_YER);

  if (c === 'SAR') return Math.round(p * sarToYer);
  if (c === 'USD') return Math.round(p * usdToYer);
  return Math.round(p);
}

function stepIndex(step) {
  const i = STEP_ORDER.indexOf(step);
  return i === -1 ? 0 : i;
}

function nextStep(step) {
  const i = stepIndex(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
}

function prevStep(step) {
  const i = stepIndex(step);
  return STEP_ORDER[Math.max(i - 1, 0)];
}

function clampText(s, max) {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function pickCategoryGuide() {
  return CATEGORIES.map((c) => `• ${c.name} (${c.slug})`).join('\n');
}

function needLoginForListing() {
  return 'لإضافة إعلان عبر الشات لازم تسجل دخول أولاً ✅\n\nروابط سريعة:\n• تسجيل الدخول: /login\n• إضافة إعلان: /add';
}

async function loadDraft(uid) {
  if (!adminDb) return null;
  const ref = adminDb.collection(DRAFTS_COLLECTION).doc(uid);
  const snap = await ref.get();
  return snap.exists ? snap.data() : null;
}

async function saveDraft(uid, draft) {
  if (!adminDb) return;
  const ref = adminDb.collection(DRAFTS_COLLECTION).doc(uid);
  const payload = {
    ...draft,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(payload, { merge: true });
}

async function clearDraft(uid) {
  if (!adminDb) return;
  await adminDb.collection(DRAFTS_COLLECTION).doc(uid).delete();
}

async function markIdempotent(uid, key) {
  if (!adminDb) return false;
  const ref = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(`${uid}_${key}`);
  const snap = await ref.get();
  if (snap.exists) return true;
  await ref.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return false;
}

function mergeMeta(draftData, meta) {
  const data = { ...(draftData || {}) };

  // صور
  if (meta && Array.isArray(meta.images) && meta.images.length) {
    const existing = Array.isArray(data.images) ? data.images : [];
    const merged = [...existing];
    for (const url of meta.images) {
      if (typeof url === 'string' && url.trim() && !merged.includes(url.trim())) merged.push(url.trim());
    }
    data.images = merged.slice(0, LISTING_WIZARD.MAX_IMAGES);
  }

  // موقع مباشر
  if (meta && meta.location && typeof meta.location === 'object') {
    const { lat, lng } = meta.location;
    if (isFinite(Number(lat)) && isFinite(Number(lng))) {
      data.lat = Number(lat);
      data.lng = Number(lng);
      if (!data.locationLabel) data.locationLabel = 'موقعي (من الجهاز)';
    }
  }

  return data;
}

// =========================
// Auth
// =========================

export async function getUserFromRequest(request) {
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
  } catch {
    return null;
  }
}

export function adminNotReadyMessage() {
  return 'هذه الميزة تحتاج تفعيل Firebase Admin.';
}

// =========================
// Optional: counts
// =========================

export async function tryCountListings(categorySlug) {
  if (!adminDb) return { ok: false, reason: 'admin_not_configured' };
  const base = adminDb.collection('listings').where('isActive', '==', true);
  const q = categorySlug ? base.where('category', '==', categorySlug) : base;

  try {
    const snapshot = await q.count().get();
    const count = snapshot.data().count;
    return { ok: true, count };
  } catch {
    return { ok: false, reason: 'count_failed' };
  }
}

// =========================
// AI fallback (اختياري)
// =========================

async function runAiFallback(message) {
  const hasGemini = Boolean(GEMINI_API_KEY);
  const hasOpenAi = Boolean(OPENAI_API_KEY);

  if (!hasGemini && !hasOpenAi) {
    return { ok: false };
  }

  const categoriesGuide = CATEGORIES.map((c) => `${c.slug}: ${c.name}`).join('\n');
  const systemPrompt =
    `أنت مساعد موقع "سوق اليمن".\n` +
    `جاوب بإيجاز وبالعربي.\n` +
    `لو المستخدم سأل عن إضافة إعلان، وجّهه إلى /add أو اقترح كتابة: أضف إعلان.\n` +
    `التصنيفات:\n${categoriesGuide}`;

  // Gemini
  if (hasGemini && ASSISTANT_PREFER_GEMINI) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
          }),
        },
        AI_TIMEOUT_MS
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && String(text).trim()) return { ok: true, reply: String(text).trim() };
      }
    } catch {
      // ignore
    }
  }

  // OpenAI (اختياري)
  if (hasOpenAi) {
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
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.3,
          }),
        },
        AI_TIMEOUT_MS
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && String(text).trim()) return { ok: true, reply: String(text).trim() };
      }
    } catch {
      // ignore
    }
  }

  return { ok: false };
}

// =========================
// Wizard
// =========================

export async function handleListingWizard({ user, message, meta }) {
  if (!adminDb || !adminAuth) return { reply: adminNotReadyMessage() };
  if (!user || !user.uid) return { reply: needLoginForListing() };

  const msg = String(message || '').trim();
  const t = normalizeText(msg);

  // Global commands
  if (isCommand(msg, 'cancel')) {
    await clearDraft(user.uid);
    return { reply: 'تم إلغاء مسودة الإعلان ✅\nإذا حبيت نبدأ من جديد اكتب: أضف إعلان' };
  }

  // Load
  let draft = await loadDraft(user.uid);

  // Start new if none
  if (!draft) {
    const newDraft = {
      step: 'title',
      data: mergeMeta({}, meta),
      lastAssistantStep: null,
    };
    await saveDraft(user.uid, newDraft);
    return {
      reply:
        'بدأنا إضافة إعلان عبر الشات ✅\n\n' +
        'الترتيب: عنوان → وصف → مدينة → قسم → سعر → عملة → رقم تواصل → صور → موقع → نشر\n\n' +
        listingNextPrompt('title', newDraft),
    };
  }

  // Merge meta every request
  draft.data = mergeMeta(draft.data, meta);

  // Summary
  if (isCommand(msg, 'summary')) {
    const step = draft.step || 'title';
    await saveDraft(user.uid, draft);
    return { reply: `هذه مسودة الإعلان الحالية:\n\n${draftSummary(draft)}\n\n${listingNextPrompt(step, draft)}` };
  }

  // Back
  if (isCommand(msg, 'back')) {
    draft.step = prevStep(draft.step || 'title');
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt(draft.step, draft) };
  }

  // Skip (للخطوات الاختيارية)
  if (isCommand(msg, 'skip')) {
    const s = draft.step || 'title';
    if (s === 'images' || s === 'location') {
      draft.step = nextStep(s);
      await saveDraft(user.uid, draft);
      return { reply: listingNextPrompt(draft.step, draft) };
    }
    return { reply: 'ما تقدر تتخطى هذه الخطوة. اكتب (رجوع) أو كمل إدخال البيانات.' };
  }

  const step = draft.step || 'title';
  const data = draft.data || {};

  // Step handlers
  if (step === 'title') {
    if (msg.length < LISTING_WIZARD.MIN_TITLE) return { reply: `العنوان قصير. اكتب عنوان أوضح (على الأقل ${LISTING_WIZARD.MIN_TITLE} أحرف).` };
    draft.data = { ...data, title: clampText(msg, LISTING_WIZARD.MAX_TITLE) };
    draft.step = 'description';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('description', draft) };
  }

  if (step === 'description') {
    if (msg.length < LISTING_WIZARD.MIN_DESC) return { reply: `الوصف قصير. اكتب وصف أطول (على الأقل ${LISTING_WIZARD.MIN_DESC} أحرف).` };
    draft.data = { ...data, description: msg };
    draft.step = 'city';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('city', draft) };
  }

  if (step === 'city') {
    const found = findCityAndDistrict(msg);
    const city = found.city || msg;
    const district = found.district || null;
    const coords = getCoordinates(city, district);

    const nextData = { ...data, city, district };
    if (coords) {
      nextData.lat = coords.lat;
      nextData.lng = coords.lng;
      nextData.locationLabel = coords.label;
    }

    draft.data = nextData;
    draft.step = 'category';
    await saveDraft(user.uid, draft);
    return { reply: `تمام ✅ المدينة: ${city}${district ? ` - ${district}` : ''}\n\n${listingNextPrompt('category', draft)}` };
  }

  if (step === 'category') {
    const cat = detectCategorySlug(msg);
    if (!cat) {
      return { reply: `ما قدرت أحدد القسم 🤔\nاكتب اسم القسم (مثلاً: سيارات).\n\n${pickCategoryGuide()}` };
    }
    draft.data = { ...data, category: cat };
    draft.step = 'price';
    await saveDraft(user.uid, draft);
    return { reply: `تمام ✅ القسم: ${categoryNameFromSlug(cat)}\n\n${listingNextPrompt('price', draft)}` };
  }

  if (step === 'price') {
    const { amount, currency, needsCurrency, currencySource } = parsePriceAndCurrency(msg);

    if (!amount) {
      return { reply: 'ما فهمت السعر. اكتب رقم السعر (مثال: 100000) أو (1000 سعودي).' };
    }

    draft.data = { ...data, originalPrice: amount };

    if (currency && !needsCurrency) {
      // عرفنا العملة من نفس الرسالة
      draft.data.originalCurrency = currency;
      draft.step = 'phone';
      await saveDraft(user.uid, draft);
      return { reply: `تمام ✅ السعر: ${amount} ${currency}${currencySource === 'text' ? '' : ''}\n\n${listingNextPrompt('phone', draft)}` };
    }

    // ما عرفنا العملة أو كانت "ريال" فقط
    draft.step = 'currency';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('currency', draft) };
  }

  if (step === 'currency') {
    const { currency, needsCurrency } = parsePriceAndCurrency(msg);

    if (!currency || needsCurrency) {
      return {
        reply:
          'اختر العملة من التالي: YER (يمني) / SAR (سعودي) / USD (دولار)\n' +
          'مثال: يمني أو سعودي أو دولار',
      };
    }

    draft.data = { ...data, originalCurrency: currency };
    draft.step = 'phone';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('phone', draft) };
  }

  if (step === 'phone') {
    const phone = normalizePhone(msg);
    if (!isValidPhone(phone)) {
      return { reply: 'رقم التواصل غير صحيح. اكتب رقم صحيح مثل: 777123456 (بدون مفتاح دولي عادي).' };
    }
    draft.data = { ...data, phone };
    draft.step = 'images';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('images', draft) };
  }

  if (step === 'images') {
    // المستخدم قد يكتب "تم" أو يرسل صور
    const hasImages = Array.isArray(data.images) && data.images.length;

    if (!hasImages && !isCommand(msg, 'skip') && normalizeText(msg) !== 'تم' && normalizeText(msg) !== 'جاهز') {
      return { reply: `لو عندك صور اضغط زر 📷 وارفعها.\nأو اكتب (تخطي) لو ما عندك صور.` };
    }

    draft.step = 'location';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('location', draft) };
  }

  if (step === 'location') {
    // يدعم: lat,lng أو رابط خرائط أو نص مكان أو meta.location
    const loc = parseLocationFromTextOrMeta(msg, meta);

    const nextData = { ...data };

    if (loc && loc.lat != null && loc.lng != null) {
      nextData.lat = loc.lat;
      nextData.lng = loc.lng;
      nextData.locationLabel = loc.label || nextData.locationLabel || 'موقع من رابط/إحداثيات';
      if (loc.link) nextData.mapsLink = loc.link;
    } else {
      // جرب نفهمها كمدينة/منطقة
      const found = findCityAndDistrict(msg);
      const city = found.city || nextData.city;
      const district = found.district || nextData.district;
      const coords = getCoordinates(city, district);
      if (coords) {
        nextData.lat = coords.lat;
        nextData.lng = coords.lng;
        nextData.locationLabel = coords.label;
        nextData.city = city;
        nextData.district = district;
      } else {
        // إذا ما قدرنا، نخليه اختياري (نعتمد موقع المدينة إن وجد)
        if (nextData.lat == null || nextData.lng == null) {
          const coords2 = getCoordinates(nextData.city, nextData.district);
          if (coords2) {
            nextData.lat = coords2.lat;
            nextData.lng = coords2.lng;
            nextData.locationLabel = coords2.label;
          }
        }
      }
    }

    draft.data = nextData;
    draft.step = 'confirm';
    await saveDraft(user.uid, draft);
    return { reply: listingNextPrompt('confirm', draft) };
  }

  if (step === 'confirm') {
    if (!isCommand(msg, 'publish')) {
      return { reply: `اكتب (نشر) لاعتماد الإعلان أو (رجوع) لتعديل أو (إلغاء).\n\n${draftSummary(draft)}` };
    }

    const d = draft.data || {};

    // تحقق سريع
    const required = ['title', 'description', 'city', 'category', 'originalPrice', 'originalCurrency', 'phone'];
    const missing = required.filter((k) => !d[k]);
    if (missing.length) {
      draft.step = STEP_ORDER.find((s) => {
        const map = {
          title: 'title',
          description: 'description',
          city: 'city',
          category: 'category',
          originalPrice: 'price',
          originalCurrency: 'currency',
          phone: 'phone',
        };
        return map[missing[0]] === s;
      }) || 'title';
      await saveDraft(user.uid, draft);
      return { reply: `في بيانات ناقصة قبل النشر: ${missing.join(', ')}\n\n${listingNextPrompt(draft.step, draft)}` };
    }

    const idKey = String(d.title || '').slice(0, 30) + '_' + String(d.originalPrice || '');
    const already = await markIdempotent(user.uid, idKey);
    if (already) {
      return { reply: 'تم استلام طلب النشر سابقاً ✅ إذا ما ظهر الإعلان، حدث الصفحة وحاول بعد دقيقة.' };
    }

    const priceYER = await computePriceYER(d.originalPrice, d.originalCurrency);

    const listing = {
      category: d.category,
      title: d.title,
      description: d.description,
      city: d.city,
      district: d.district || null,
      phone: d.phone,
      images: Array.isArray(d.images) ? d.images.slice(0, LISTING_WIZARD.MAX_IMAGES) : [],
      lat: d.lat != null ? Number(d.lat) : null,
      lng: d.lng != null ? Number(d.lng) : null,
      locationLabel: d.locationLabel || null,
      mapsLink: d.mapsLink || null,
      originalPrice: Number(d.originalPrice),
      originalCurrency: String(d.originalCurrency || 'YER').toUpperCase(),
      priceYER: priceYER,
      isActive: true,
      source: 'assistant',
      userId: user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const ref = await adminDb.collection('listings').add(listing);
      await clearDraft(user.uid);
      return { reply: `تم نشر الإعلان بنجاح! 🎉\nرابط الإعلان: /listing/${ref.id}` };
    } catch {
      return { reply: 'صار خطأ أثناء النشر. حاول مرة ثانية بعد قليل.' };
    }
  }

  // fallback
  return { reply: listingNextPrompt(step, draft) };
}

// =========================
// Main chat entry
// =========================

function looksLikeCountQuestion(t) {
  return /(كم|عدد|كم عدد|كم فيه|كم اعلان|كم إعلان)/.test(t);
}

export async function handleChatMessage({ user, message, history, meta }) {
  const msg = String(message || '').trim();
  if (!msg) return { reply: 'اكتب سؤالك أو اكتب: أضف إعلان' };

  const userId = user && user.uid ? user.uid : 'anon';
  if (!checkRateLimit(userId, 'chat')) {
    return { reply: 'طلبات كثيرة بسرعة 😅 انتظر دقيقة وجرب مرة ثانية.' };
  }

  // إذا عنده مسودة شغالة: نكمل على طول
  if (user && user.uid && adminDb) {
    const existingDraft = await loadDraft(user.uid);
    if (existingDraft) {
      return await handleListingWizard({ user, message: msg, meta });
    }
  }

  // بدء إضافة إعلان
  if (isCommand(msg, 'startListing')) {
    if (!user || !user.uid) return { reply: needLoginForListing() };
    return await handleListingWizard({ user, message: msg, meta });
  }

  // FAQ / قاعدة المعرفة
  const kb = findBestMatch(msg);
  if (kb) return { reply: kb };

  // عدّ الإعلانات
  const t = normalizeText(msg);
  if (looksLikeCountQuestion(t)) {
    const cat = detectCategorySlug(msg);
    const res = await tryCountListings(cat);
    if (res.ok) {
      return { reply: cat ? `عدد إعلانات قسم ${categoryNameFromSlug(cat)} حالياً: ${res.count}` : `عدد الإعلانات النشطة حالياً: ${res.count}` };
    }
  }

  // AI fallback اختياري (آخر خيار)
  const ai = await runAiFallback(msg);
  if (ai.ok) return { reply: ai.reply };

  return {
    reply:
      'أقدر أساعدك في:\n' +
      '• إضافة إعلان عبر الشات: اكتب "أضف إعلان"\n' +
      '• أسئلة عن الفئات/الحساب/المزادات/الدعم\n\n' +
      'روابط سريعة: /add /categories /help',
  };
}
