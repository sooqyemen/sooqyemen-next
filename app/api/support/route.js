import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isValidEmail(email) {
  const e = String(email || '').trim();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function tryGetUserFromAuthHeader(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  const token = m && m[1] ? m[1].trim() : '';
  if (!token) return null;
  if (!adminAuth) return null;

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

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'support', adminReady: !!adminDb });
}

export async function POST(request) {
  if (!adminDb) {
    return NextResponse.json(
      {
        ok: false,
        error: 'admin_not_configured',
        message: 'Firebase Admin غير مفعّل في بيئة الاستضافة.',
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const name = cleanText(body?.name, 120);
  const email = cleanText(body?.email, 180);
  const subject = cleanText(body?.subject, 200);
  const message = cleanText(body?.message, 5000);

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_fields',
        message: 'الاسم والبريد والموضوع والرسالة مطلوبة.',
      },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_email',
        message: 'البريد الإلكتروني غير صحيح.',
      },
      { status: 400 }
    );
  }

  const user = await tryGetUserFromAuthHeader(request);

  const xff = request.headers.get('x-forwarded-for') || '';
  const ip =
    (String(xff).split(',')[0] || '').trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    null;

  const userAgent = request.headers.get('user-agent') || null;

  const doc = {
    name,
    email,
    subject,
    message,
    status: 'new',
    userId: user?.uid || null,
    userEmail: user?.email || null,
    userName: user?.name || null,
    ip,
    userAgent,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const ref = await adminDb.collection('support_messages').add(doc);
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[support] failed to save message', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'save_failed',
        message: 'تعذر حفظ الرسالة. حاول لاحقاً.',
      },
      { status: 500 }
    );
  }
}
