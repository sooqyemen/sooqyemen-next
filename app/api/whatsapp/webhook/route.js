// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

// ✅ لازم يكون نفس Verify Token اللي تكتبه في Meta Webhook
// الأفضل يكون في Vercel env: WA_VERIFY_TOKEN
const VERIFY_TOKEN =
  process.env.WA_VERIFY_TOKEN ||
  process.env.WHATSAPP_VERIFY_TOKEN ||
  'Mansour05010032573'; // (أنصح لاحقًا تشيله وتخليه env فقط)

const GRAPH_VERSION = process.env.WA_GRAPH_VERSION || 'v20.0';
const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID =
  process.env.WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

// Optional security: verify signature if you set WA_APP_SECRET
const APP_SECRET = process.env.WA_APP_SECRET || process.env.META_APP_SECRET || '';

/**
 * Best-effort dedup in memory (serverless may reset).
 * If you want 100% dedup, we later store message.id in Firestore.
 */
const SEEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const seen = globalThis.__wa_seen_ids || (globalThis.__wa_seen_ids = new Map());

function remember(id) {
  const now = Date.now();
  // prune occasionally
  if (seen.size > 2000) {
    for (const [k, ts] of seen.entries()) {
      if (now - ts > SEEN_TTL_MS) seen.delete(k);
    }
  }
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}

function timingSafeEqualHex(a, b) {
  try {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function verifyMetaSignature(rawBody, signatureHeader) {
  // signature header example: "sha256=abcdef..."
  if (!APP_SECRET) return true; // if no secret, skip verification
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const sigHex = signatureHeader.slice('sha256='.length).trim();
  const expected = crypto.createHmac('sha256', APP_SECRET).update(rawBody, 'utf8').digest('hex');
  return timingSafeEqualHex(sigHex, expected);
}

async function sendWhatsAppText(to, text) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log('WA send skipped: missing WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID');
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

// Meta Webhook Verification (GET)
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
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'GET webhook error' }, { status: 500 });
  }
}

// Receive Messages/Events (POST)
export async function POST(request) {
  let raw = '';
  try {
    // اقرأ raw body عشان (اختياري) نتحقق من التوقيع + نقدر نطبع payload
    raw = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';

    if (APP_SECRET) {
      const okSig = verifyMetaSignature(raw, signature);
      if (!okSig) {
        // لا ترجع 200 لو توقيع غير صحيح (هذا طلب مزيف غالبًا)
        return NextResponse.json({ ok: false, message: 'invalid_signature' }, { status: 401 });
      }
    }

    const body = raw ? JSON.parse(raw) : {};

    // Meta sometimes sends other events (statuses). We'll handle messages only.
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};

    const messages = Array.isArray(value?.messages) ? value.messages : [];
    const msg = messages[0];

    // لو ما فيه رسالة (مثلاً statuses) رجّع 200 وخلاص
    if (!msg) {
      // مفيد للديبغ
      // console.log('WA event (no message):', JSON.stringify(body));
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const messageId = msg?.id || '';
    const from = msg?.from || '';
    const type = msg?.type || '';

    // Dedup best-effort
    const already = remember(messageId);
    if (already) {
      return NextResponse.json({ ok: true, dedup: true }, { status: 200 });
    }

    let textBody = '';
    if (type === 'text') textBody = String(msg?.text?.body || '').trim();

    console.log(
      'WA inbound:',
      JSON.stringify({
        from,
        id: messageId,
        type,
        text: textBody.slice(0, 200),
      })
    );

    // ✅ رد تلقائي بسيط (تقدر تغير النص براحتك)
    const reply =
      'تم الاستلام ✅\n' +
      'اكتب طلبك بهذا الشكل:\n' +
      'مثال: مطلوب أرض حي الزمرد 312 الى 300\n' +
      'أو: فيلا للبيع  حي الياقوت';

    // نرسل الرد
    await sendWhatsAppText(from, reply);

    // لازم نرجّع 200
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.log('WA webhook POST error:', e?.message || e);
    // حتى لو صار خطأ، رجّع 200 لتجنب إعادة الإرسال المستمر من Meta
    return NextResponse.json({ ok: true, warning: 'handler_error' }, { status: 200 });
  }
}
