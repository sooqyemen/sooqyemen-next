// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// =====================
// Verify Token (GET)
// =====================
const VERIFY_TOKEN =
  process.env.WA_VERIFY_TOKEN ||
  process.env.WHATSAPP_VERIFY_TOKEN ||
  'Mansour05010032573';

// =====================
// Cloud API (Send)
// =====================
const GRAPH_VERSION = process.env.WA_GRAPH_VERSION || 'v20.0';
const ACCESS_TOKEN =
  process.env.WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID =
  process.env.WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

// =====================
// Admins
// =====================
const ADMIN_NUMBERS = (process.env.WA_ADMIN_NUMBERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAdmin(from) {
  if (!from) return false;
  if (ADMIN_NUMBERS.length === 0) return false; // أمان: لازم تحدد رقم/أرقام الأدمن
  return ADMIN_NUMBERS.includes(from);
}

// =====================
// Text utilities
// =====================
function normalizeArabic(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function parseFirstInt(text) {
  const m = String(text || '').match(/(\d{1,8})/);
  return m ? parseInt(m[1], 10) : null;
}

function parsePriceSmart(text) {
  const t = normalizeArabic(text)
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g, ' ')
    .trim();

  // رقم صريح
  const direct = t.match(/(\d{5,9})/);
  if (direct) return parseInt(direct[1], 10);

  let million = 0;
  let thousand = 0;

  const mil = t.match(/(\d+)\s*مليون/);
  if (mil) million = parseInt(mil[1], 10);

  const th = t.match(/(\d+)\s*الف/);
  if (th) thousand = parseInt(th[1], 10);

  if (million || thousand) return million * 1_000_000 + thousand * 1_000;
  return null;
}

function extractGoogleMapsUrl(text) {
  const m = String(text || '').match(/https?:\/\/\S*maps\.app\.goo\.gl\/\S+/i);
  return m ? m[0] : '';
}

function detectNeighborhood(textNorm) {
  // يلتقط "حي النور" أو "النور" لو مكتوبة بعد "حي"
  const m = textNorm.match(/حي\s+([^\n\r]+?)(?:\s|$)/);
  if (!m) return '';
  return m[1].split(' ').slice(0, 3).join(' ').trim();
}

function parseOfferFromAdminText(rawText) {
  const original = String(rawText || '').trim();
  const t = normalizeArabic(original);

  const isDirectFromOwner =
    /\bمباشر\b/.test(t) || t.includes('مباشر لدينا من المالك');

  const dealType = t.includes('ايجار') || t.includes('للايجار') ? 'rent' : 'sale';

  let propertyType = 'other';
  if (t.includes('ارض')) propertyType = 'land';
  else if (t.includes('شقه')) propertyType = 'apartment';
  else if (t.includes('فيلا')) propertyType = 'villa';

  const isCommercial = t.includes('تجاري') || t.includes('تجاريه');

  const neighborhood = detectNeighborhood(t);

  // المخطط/الجزء: نحاول نلقط أي شيء يشبه 6جس ا أو 6ج س ا
  let planPart = '';
  const mPlan = t.match(/(?:مخطط|المخطط)\s*[:\-]?\s*([^\n\r]+)/);
  if (mPlan) planPart = mPlan[1].trim();

  if (!planPart && neighborhood) {
    const mInline = t.match(new RegExp(`حي\\s+${neighborhood}\\s+([^\\n\\r]+)`));
    if (mInline) planPart = mInline[1].trim();
  }

  // الرقم: الأفضل يلتقط "رقم 1411"
  let code = '';
  const mCode = t.match(/(?:رقم|رقم\s*الارض|الرقم)\s*[:\-]?\s*(\d{1,8})/);
  if (mCode) code = String(parseInt(mCode[1], 10));
  if (!code) {
    const first = parseFirstInt(t);
    code = first ? String(first) : '';
  }

  // المساحة
  let area = null;
  const mArea = t.match(/مساحه\s*[:\-]?\s*(\d{2,6})/);
  if (mArea) area = parseInt(mArea[1], 10);
  if (!area) {
    const mArea2 = t.match(/(\d{2,6})\s*م(?:تر)?/);
    if (mArea2) area = parseInt(mArea2[1], 10);
  }

  // السعر
  let price = null;
  const mReq = t.match(/المطلوب\s*[:\-]?\s*([^\n\r]+)/);
  if (mReq) price = parsePriceSmart(mReq[1]);
  if (!price) price = parsePriceSmart(t);

  const mapsUrl = extractGoogleMapsUrl(original);

  return {
    code,
    city: 'جدة',
    dealType, // sale | rent
    propertyType, // land | apartment | villa | other
    isCommercial: !!isCommercial,
    neighborhood: neighborhood || '',
    neighborhoodNorm: normalizeArabic(neighborhood || ''),
    planPart: planPart || '',
    planPartNorm: normalizeArabic(planPart || ''),
    area: area || null,
    price: price || null,
    currency: 'SAR',
    isDirectFromOwner: !!isDirectFromOwner, // ✅ "مباشر" = مباشر من المالك
    status: 'active', // active | sold | hidden
    mapsUrl: mapsUrl || '',
    notes: original, // نخزن نص العرض كامل كما هو
  };
}

function looksLikeOfferText(textNorm) {
  // علامات تساعدنا نقول: هذه رسالة عرض
  return (
    textNorm.startsWith('عرض جديد') ||
    (textNorm.includes('حي') &&
      (textNorm.includes('مساحه') || textNorm.includes('متر')) &&
      (textNorm.includes('المطلوب') || textNorm.includes('سعر') || /\d{5,9}/.test(textNorm)))
  );
}

async function sendWhatsAppText(to, text) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log('WA send skipped: missing env', {
      hasToken: !!ACCESS_TOKEN,
      hasPhoneId: !!PHONE_NUMBER_ID,
    });
    return { ok: false, error: 'missing_env' };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log('WA send error:', res.status, JSON.stringify(data));
    return { ok: false, status: res.status, data };
  }

  return { ok: true, data };
}

// Dedup (Firestore) لمنع تكرار المعالجة
async function isDuplicateMessage(messageId) {
  if (!adminDb || !messageId) return false;
  const ref = adminDb.collection('wa_seen').doc(String(messageId));
  const snap = await ref.get();
  if (snap.exists) return true;
  await ref.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return false;
}

function formatOfferSaved(o) {
  const type =
    o.propertyType === 'land'
      ? o.isCommercial
        ? 'أرض تجارية'
        : 'أرض'
      : o.propertyType === 'apartment'
      ? 'شقة'
      : o.propertyType === 'villa'
      ? 'فيلا'
      : 'عقار';

  const deal = o.dealType === 'rent' ? 'إيجار' : 'بيع';
  const price = o.price ? `${Number(o.price).toLocaleString('en-US')} ${o.currency}` : '—';
  const area = o.area ? `${o.area}م` : '—';
  const direct = o.isDirectFromOwner ? '✅ مباشر من المالك' : '';
  const loc = `${o.neighborhood || ''}${o.planPart ? ` (${o.planPart})` : ''}`.trim();

  return `تم حفظ العرض ✅
كود: ${o.code}
${deal} | ${type}
الموقع: ${loc}
المساحة: ${area}
السعر: ${price}
${direct}${o.mapsUrl ? `\n${o.mapsUrl}` : ''}`.trim();
}

async function saveOfferToDb(offer, from) {
  if (!adminDb) throw new Error('adminDb_not_initialized');
  if (!offer.code) throw new Error('missing_code');

  await adminDb
    .collection('wa_offers')
    .doc(String(offer.code))
    .set(
      {
        ...offer,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: from,
      },
      { merge: true }
    );
}

async function updateOfferStatus(code, status, from) {
  if (!adminDb) throw new Error('adminDb_not_initialized');

  await adminDb
    .collection('wa_offers')
    .doc(String(code))
    .set(
      {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: from,
      },
      { merge: true }
    );
}

async function searchOffersSimple(queryText) {
  if (!adminDb) return [];

  const q = normalizeArabic(queryText);
  const neighborhood = detectNeighborhood(q);
  const neighborhoodNorm = normalizeArabic(neighborhood);

  let fsQuery = adminDb.collection('wa_offers').where('status', '==', 'active');

  if (neighborhoodNorm) {
    fsQuery = fsQuery.where('neighborhoodNorm', '==', neighborhoodNorm);
  }

  const snap = await fsQuery.limit(20).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // فلترة بسيطة بالنوع
  const wantsLand = q.includes('ارض');
  const wantsApt = q.includes('شقه');
  const wantsVilla = q.includes('فيلا');

  const filtered = items.filter((o) => {
    if (wantsLand && o.propertyType !== 'land') return false;
    if (wantsApt && o.propertyType !== 'apartment') return false;
    if (wantsVilla && o.propertyType !== 'villa') return false;
    return true;
  });

  // ترتيب: المباشر أولاً + أقرب مساحة لو ذكرها
  const mArea = q.match(/(\d{2,6})\s*م/);
  const targetArea = mArea ? parseInt(mArea[1], 10) : null;

  const scored = filtered
    .map((o) => {
      let score = 0;
      if (o.isDirectFromOwner) score += 3;
      if (targetArea && o.area) score -= Math.abs(Number(o.area) - targetArea) / 50;
      return { o, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.o);

  return scored;
}

function formatSearchReply(list) {
  if (!list || list.length === 0) {
    return 'ما لقيت عروض مطابقة الآن.\nاكتب طلبك مثل: أرض حي النور 600م أو شقة للإيجار حي الياقوت';
  }

  const lines = list.map((o, idx) => {
    const type =
      o.propertyType === 'land'
        ? o.isCommercial
          ? 'أرض تجارية'
          : 'أرض'
        : o.propertyType === 'apartment'
        ? 'شقة'
        : o.propertyType === 'villa'
        ? 'فيلا'
        : 'عقار';
    const deal = o.dealType === 'rent' ? 'إيجار' : 'بيع';
    const area = o.area ? `${o.area}م` : '—';
    const price = o.price ? `${Number(o.price).toLocaleString('en-US')} ${o.currency || 'SAR'}` : '—';
    const direct = o.isDirectFromOwner ? '✅ مباشر' : '';
    const loc = `${o.neighborhood || ''}${o.planPart ? ` (${o.planPart})` : ''}`.trim();
    const map = o.mapsUrl ? `\n${o.mapsUrl}` : '';
    return `${idx + 1}) ${deal} | ${type} | كود ${o.code || o.id}
${loc}
مساحة: ${area} | سعر: ${price} ${direct}${map}`;
  });

  return `أفضل العروض المتاحة:\n\n${lines.join('\n\n')}`;
}

// =====================
// GET: Verification
// =====================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({ ok: false, message: 'Verification failed' }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, message: 'GET webhook error' }, { status: 500 });
  }
}

// =====================
// POST: Receive
// =====================
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};
    const msg = Array.isArray(value?.messages) ? value.messages[0] : null;

    if (!msg) return NextResponse.json({ ok: true }, { status: 200 });

    const messageId = String(msg?.id || '');
    const from = String(msg?.from || '');
    const type = String(msg?.type || '');
    const textBody = type === 'text' ? String(msg?.text?.body || '').trim() : '';

    // Dedup
    const dup = await isDuplicateMessage(messageId);
    if (dup) return NextResponse.json({ ok: true, dedup: true }, { status: 200 });

    // =========
    // Admin Flow
    // =========
    if (type === 'text' && isAdmin(from)) {
      const t = normalizeArabic(textBody);

      // مباع / اخفاء / تفعيل
      if (t.startsWith('مباع')) {
        const code = parseFirstInt(t);
        if (code) {
          await updateOfferStatus(code, 'sold', from);
          await sendWhatsAppText(from, `تم ✅ تعليم العرض ${code} (مباع).`);
        } else {
          await sendWhatsAppText(from, 'اكتب: مباع 1411');
        }
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (t.startsWith('اخفاء') || t.startsWith('إخفاء')) {
        const code = parseFirstInt(t);
        if (code) {
          await updateOfferStatus(code, 'hidden', from);
          await sendWhatsAppText(from, `تم ✅ إخفاء العرض ${code}.`);
        } else {
          await sendWhatsAppText(from, 'اكتب: اخفاء 1411');
        }
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (t.startsWith('تفعيل')) {
        const code = parseFirstInt(t);
        if (code) {
          await updateOfferStatus(code, 'active', from);
          await sendWhatsAppText(from, `تم ✅ تفعيل العرض ${code}.`);
        } else {
          await sendWhatsAppText(from, 'اكتب: تفعيل 1411');
        }
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      // حفظ عرض (رسالة حرة مثل رسالتك)
      if (looksLikeOfferText(t)) {
        const offer = parseOfferFromAdminText(textBody);

        if (!offer.code) {
          await sendWhatsAppText(from, 'ما قدرت أحدد رقم العرض. اكتب داخل الرسالة: رقم 1411');
          return NextResponse.json({ ok: true }, { status: 200 });
        }

        await saveOfferToDb(offer, from);
        await sendWhatsAppText(from, formatOfferSaved(offer));
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      // مساعدة
      if (t === 'اوامر' || t === 'أوامر' || t === 'مساعده' || t === 'مساعدة') {
        await sendWhatsAppText(
          from,
          'أوامر الأدمن:\n' +
            '1) أرسل رسالة عرض بأي صياغة (لازم فيها: حي + رقم + مساحة + سعر/المطلوب) وسيتم حفظها.\n' +
            '2) مباع 1411\n' +
            '3) اخفاء 1411\n' +
            '4) تفعيل 1411\n' +
            'معلومة: كلمة "مباشر" تعني مباشر من المالك.'
        );
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      await sendWhatsAppText(from, 'تم ✅ لإضافة عرض أرسل تفاصيله (حي + رقم + مساحة + المطلوب). وللمساعدة اكتب: أوامر');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ===========
    // Customer Flow
    // ===========
    if (type === 'text') {
      // بحث بسيط
      const results = await searchOffersSimple(textBody);
      const reply = formatSearchReply(results);
      await sendWhatsAppText(from, reply);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.log('WA webhook error:', e?.message || e);
    return NextResponse.json({ ok: true, warning: 'handler_error' }, { status: 200 });
  }
}
