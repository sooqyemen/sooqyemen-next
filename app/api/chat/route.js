import { NextResponse } from 'next/server';
import { getUserFromRequest, handleChatMessage } from './service';
import { checkRateLimit, normalizeText } from './utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status, message, extra = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET() {
  return NextResponse.json({ ok: true, name: 'sooqyemen-assistant', version: 2 });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const meta = body?.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!message) return jsonError(400, 'اكتب رسالة أولاً.');
    if (message.length > 2000) return jsonError(413, 'الرسالة طويلة جداً، اختصرها.');

    const user = await getUserFromRequest(request);
    const userId = user?.uid || 'anonymous';

    const norm = normalizeText(message);
    const isWizard = norm.includes(normalizeText('اضف اعلان')) || norm.includes(normalizeText('إضافة إعلان')) || norm.includes(normalizeText('اضافة اعلان'));
    const actionKey = isWizard ? 'wizard' : 'chat';

    if (!checkRateLimit(userId, actionKey)) {
      return jsonError(429, 'طلبات كثيرة بسرعة 😅 جرب بعد دقيقة.');
    }

    const result = await handleChatMessage({ user, message, history, meta });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[api/chat] error:', e);
    return jsonError(500, 'صار خطأ داخلي. حاول مرة ثانية.');
  }
}
