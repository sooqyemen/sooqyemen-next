// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';

// ✅ لازم يكون نفس Verify Token اللي تكتبه في Meta Webhook
// نقرأ من Vercel: WA_VERIFY_TOKEN (حسب متغيراتك الحالية)
// وندعم WHATSAPP_VERIFY_TOKEN احتياط لو غيرت الاسم لاحقًا
const VERIFY_TOKEN =
  process.env.WA_VERIFY_TOKEN ||
  process.env.WHATSAPP_VERIFY_TOKEN ||
  'Mansour05010032573';

// Meta Webhook Verification (GET)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // لازم نرجّع challenge كنص
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
    // مهم: نقرأ البودي حتى ما يعتبرها فشل، لكن نرجع 200 بسرعة
    await request.json().catch(() => ({}));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // حتى لو صار خطأ، رجّع 200 لتجنب إعادة الإرسال المستمر من Meta
    return NextResponse.json(
      { ok: true, warning: 'parse_error' },
      { status: 200 }
    );
  }
}
