// app/api/whatsapp/webhook/route.js
import { NextResponse } from 'next/server';

// ✅ حط نفس التوكن اللي بتحطه في Meta (Verify Token)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sooqyemen_whatsapp_verify_2026';

// Meta Webhook Verification (GET)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // لازم نرجّع challenge كـ نص
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
    const body = await request.json().catch(() => ({}));

    // 👇 هنا لاحقًا بنفك البيانات ونرد/نخزن… الخ
    // حاليًا أهم شيء نرجع 200 بسرعة عشان Meta ما تعتبره فشل
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    // حتى لو صار خطأ، الأفضل نرجع 200 أحيانًا لتجنب إعادة الإرسال
    return NextResponse.json({ ok: true, warning: 'parse_error' }, { status: 200 });
  }
}
