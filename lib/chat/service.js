import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { 
  normalizeText, 
  detectCategorySlug, 
  extractNumber, 
  extractLatLngFromText, 
  extractMapsLink, 
  findCityAndDistrict, 
  getCoordinates, 
  isValidPhone, 
  normalizePhone, 
  categoryNameFromSlug,
  draftSummary,
  listingNextPrompt,
  categoriesHint,
  safeJsonParse
} from './utils';
import { CATEGORIES } from './data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
const ASSISTANT_PREFER_GEMINI = String(process.env.ASSISTANT_PREFER_GEMINI || '1') !== '0';
const DRAFTS_COLLECTION = 'assistant_drafts';
const DEFAULT_SAR = 425;
const DEFAULT_USD = 1632;

// =========================
// AI Helpers
// =========================

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

export async function analyzeIntentAndSentiment(message) {
  const text = normalizeText(message);
  
  const intents = {
    isAskingForHelp: /مساعدة|مشكلة|سؤال|استفسار|كيف|طريقة/.test(text),
    isLookingToBuy: /اشتري|اريد|مطلوب|ابحث عن|شراء/.test(text),
    isLookingToSell: /للبع|معروض|بيع|اضيف|اعلان/.test(text),
    isNegotiating: /سعر|كم|تفاوض|رخيص|غالي/.test(text),
    isUrgent: /سريع|عاجل|ضروري|الان|فوري/.test(text),
    isComplaining: /مشكلة|شكوى|غلط|خطأ|احتيال|نصاب/.test(text),
    isThanking: /شكر|ممتاز|رائع|احسنت|يعطيك/.test(text),
  };
  
  const sentiment = {
    isPositive: /شكر|حلو|رائع|ممتاز|جميل|احسنت/.test(text),
    isNegative: /مشكلة|غلط|خطأ|سيء|مافهمت|احتيال|نصاب/.test(text),
    isNeutral: !/(شكر|مشكلة|احتيال|نصاب|رائع|ممتاز)/.test(text)
  };
  
  return { intents, sentiment };
}

export async function runAiFallback({ message, history }) {
  const hasOpenAi = Boolean(OPENAI_API_KEY);
  const hasGemini = Boolean(GEMINI_API_KEY);

  if (!hasOpenAi && !hasGemini) {
    return { ok: false, reply: 'عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً.' };
  }

  const schema = {
    name: 'assistant_response',
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['none', 'create_listing', 'count_listings'] },
        reply: { type: 'string' },
        category: { type: ['string', 'null'] },
        listing: { type: ['object', 'null'], properties: { /* ...simplified... */ } }
      },
      required: ['action', 'reply'],
    },
  };

  const categoriesGuide = CATEGORIES.map((c) => `${c.slug}: ${c.name}`).join('\n');
  const systemPrompt = `أنت مساعد سوق اليمن.
  روابط مهمة: /add, /categories, /login, /help.
  اختر action=create_listing للبيع.
  اختر action=count_listings للسؤال عن العدد.
  التصنيفات:
  ${categoriesGuide}`;

  try {
    if (hasGemini && ASSISTANT_PREFER_GEMINI) {
        const contents = [{ role: 'user', parts: [{ text: message }] }];
        // دمج التاريخ بشكل مبسط إذا لزم
        
        const response = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { responseMimeType: 'application/json' },
            }),
            },
            OPENAI_TIMEOUT_MS
        );

        if (response.ok) {
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = safeJsonParse(rawText);
            if (parsed) return { ok: true, ...parsed };
        }
    }
    // OpenAI Fallback logic omitted for brevity, similar structure
    return { ok: false };

  } catch (error) {
    return { ok: false };
  }
}

// =========================
// Firebase & Listing Logic
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
    } catch (e) {
      return null;
    }
}

export function adminNotReadyMessage() {
    return 'هذه الميزة تحتاج تفعيل Firebase Admin.';
}

export async function tryCountListings(categorySlug) {
    if (!adminDb) return { ok: false, reason: 'admin_not_configured' };
  
    // Simple caching logic should ideally use "unstable_cache" or Redis here
    // For now, direct DB call to keep it clean (Add caching layer if needed)
    const base = adminDb.collection('listings').where('isActive', '==', true);
    const q = categorySlug ? base.where('category', '==', categorySlug) : base;
  
    try {
        const snapshot = await q.count().get();
        const count = snapshot.data().count;
        return { ok: true, publicCount: count, approximate: false };
    } catch (e) {
        return { ok: false, reason: 'count_failed' };
    }
}

// =========================
// Wizard Helpers (State Management)
// =========================

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
      { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
}
  
async function clearDraft(uid) {
    if (!adminDb) return;
    await adminDb.collection(DRAFTS_COLLECTION).doc(uid).delete();
}

// =========================
// Main Wizard Handler
// =========================

export async function handleListingWizard({ user, message, meta }) {
    if (!adminDb || !adminAuth) return { reply: adminNotReadyMessage() };

    const msg = String(message || '').trim();
    const normalized = normalizeText(msg);

    // 1. Cancel
    if (normalized === 'الغاء' || normalized.includes('الغاء')) {
        await clearDraft(user.uid);
        return { reply: 'تم إلغاء مسودة الإعلان ✅\nإذا حبيت نبدأ من جديد اكتب: أضف إعلان' };
    }

    // 2. Load Draft
    let draft = await loadDraft(user.uid);
    
    // 3. Start New
    if (!draft) {
        // Logic to start new draft...
        await saveDraft(user.uid, { step: 'category', data: {} });
        return {
             reply: 'بدأنا من جديد ✅\n\nالخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' + categoriesHint() 
        };
    }

    const step = draft.step || 'category';
    const data = draft.data || {};

    // 4. Wizard Steps Logic
    if (step === 'category') {
        const cat = detectCategorySlug(msg);
        if (!cat) return { reply: 'ما قدرت أحدد القسم 🤔\nاكتب اسم القسم (مثلاً: سيارات).' };
        await saveDraft(user.uid, { step: 'title', data: { ...data, category: cat } });
        return { reply: `تمام ✅ القسم: ${categoryNameFromSlug(cat)}\n\nالخطوة 2/7: اكتب عنوان الإعلان.` };
    }

    if (step === 'title') {
        if (msg.length < 5) return { reply: 'العنوان قصير جداً.' };
        await saveDraft(user.uid, { step: 'description', data: { ...data, title: msg } });
        return { reply: 'تمام ✅\n\nالخطوة 3/7: اكتب وصف الإعلان.' };
    }

    if (step === 'description') {
        if (msg.length < 10) return { reply: 'الوصف قصير جداً.' };
        await saveDraft(user.uid, { step: 'city', data: { ...data, description: msg } });
        return { reply: 'تمام ✅\n\nالخطوة 4/7: اكتب اسم المدينة.' };
    }

    if (step === 'city') {
        const { city } = findCityAndDistrict(msg);
        const actualCity = city || msg;
        const coords = getCoordinates(actualCity);
        const newData = { ...data, city: actualCity };
        if (coords) {
            newData.lat = coords.lat;
            newData.lng = coords.lng;
            newData.locationLabel = coords.label;
        }
        await saveDraft(user.uid, { step: 'phone', data: newData });
        return { reply: `تمام ✅ المدينة: ${actualCity}\n\nالخطوة 5/7: اكتب رقم الجوال.` };
    }

    if (step === 'phone') {
        const phone = normalizePhone(msg);
        if (!isValidPhone(phone)) return { reply: 'رقم الجوال غير صحيح.' };
        await saveDraft(user.uid, { step: 'location', data: { ...data, phone } });
        return { reply: 'تمام ✅\n\nالخطوة 6/7: حدد الموقع (اكتب الإحداثيات أو أرسل رابط).' };
    }

    if (step === 'location') {
        let lat, lng, label;
        // Try parsing coords
        const coords = extractLatLngFromText(msg);
        if (coords) { lat = coords.lat; lng = coords.lng; }
        // Try parsing link
        else if (extractMapsLink(msg)) { label = `رابط: ${extractMapsLink(msg)}`; }
        // Fallback or meta
        else if (meta?.location) { lat = meta.location.lat; lng = meta.location.lng; }

        await saveDraft(user.uid, { step: 'price', data: { ...data, lat, lng, locationLabel: label || msg } });
        return { reply: 'تم حفظ الموقع ✅\n\nالخطوة 7/7: اكتب السعر.' };
    }

    if (step === 'price') {
        const price = extractNumber(msg);
        if (!price) return { reply: 'ما فهمت السعر.' };
        await saveDraft(user.uid, { step: 'confirm', data: { ...data, originalPrice: price } });
        return { 
            reply: 'وصلنا للنهاية ✅\n' + draftSummary({ data: { ...data, originalPrice: price } }) + '\n\nاكتب: نشر للاعتماد.'
        };
    }

    if (step === 'confirm') {
        if (normalized === 'نشر') {
            // Finalize and save to DB
             const listing = {
                ...data,
                userId: user.uid,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                priceYER: Number(data.originalPrice) // Simplified currency logic
            };
            const ref = await adminDb.collection('listings').add(listing);
            await clearDraft(user.uid);
            return { reply: `تم نشر الإعلان بنجاح! 🎉\nرابط الإعلان: /listing/${ref.id}` };
        }
        return { reply: 'اكتب "نشر" للاعتماد أو "إلغاء".' };
    }

    return { reply: 'حدث خطأ غير متوقع في المعالج.' };
}
