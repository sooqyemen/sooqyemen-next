// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ✅ لازم يكون نفس Verify Token اللي تكتبه في Meta Webhook
const VERIFY_TOKEN =
  process.env.WA_VERIFY_TOKEN ||
  process.env.WHATSAPP_VERIFY_TOKEN ||
  'Mansour05010032573';

// Cloud API
const GRAPH_VERSION = process.env.WA_GRAPH_VERSION || 'v20.0';
const ACCESS_TOKEN =
  process.env.WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID =
  process.env.WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

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

  console.log('WA send ok:', JSON.stringify(data));
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

    return NextResponse.json(
      { ok: false, message: 'Verification failed' },
      { status: 403 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'GET webhook error' },
      { status: 500 }
    );
  }
}

// Receive Messages/Events (POST)
export async function POST(request) {
  try {
    // ✅ هذا السطر اللي قلت عليه + بيطلع لك في Vercel Logs
    console.log('WA WEBHOOK HIT ✅', new Date().toISOString());

    const body = await request.json().catch(() => ({}));

    // استخراج الرسالة
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || {};
    const msg = Array.isArray(value?.messages) ? value.messages[0] : null;

    // لو ما فيه رسالة (مثلاً status updates) نرجع 200 وخلاص
    if (!msg) {
      console.log('WA event (no message).');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const from = String(msg?.from || '');
    const type = String(msg?.type || '');
    const textBody =
      type === 'text' ? String(msg?.text?.body || '').trim() : '';

    console.log('WA inbound:', JSON.stringify({ from, type, text: textBody }));

    // ✅ رد تلقائي (غيّر النص إذا تبغى)
    const reply =
      'تم الاستلام ✅\n' +
      'اكتب طلبك بهذا الشكل:\n' +
      'مثال: أرض حي الزمرد 250م سعر 300\n' +
      'أو: شقة للإيجار حي الياقوت';

    // نرسل الرد (إذا الرسالة نصية ومن رقم معروف)
    if (from) {
      await sendWhatsAppText(from, reply);
    }

    // لازم نرجع 200
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.log('WA webhook POST error:', e?.message || e);
    // حتى لو صار خطأ، رجّع 200 لتجنب إعادة الإرسال المستمر من Meta
    return NextResponse.json({ ok: true, warning: 'handler_error' }, { status: 200 });
  }
}
