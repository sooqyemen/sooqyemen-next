import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isPrivateIpV4(host) {
  const parts = host.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isBlockedHost(host) {
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPrivateIpV4(host);
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
  return false;
}

function allowedByEnv(host) {
  const raw = (process.env.IMPORT_ALLOWED_HOSTS || '').trim();
  if (!raw) return true;
  const allowed = raw
    .split(',')
    .map((s) => s.trim().replace(/^www\./, '').toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return true;
  return allowed.some((a) => host === a || host.endsWith('.' + a));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = String(searchParams.get('url') || '').trim();

    if (!url || !isHttpUrl(url)) {
      return NextResponse.json({ ok: false, message: 'رابط الصورة غير صحيح.' }, { status: 400 });
    }

    const host = getHost(url);

    if (isBlockedHost(host)) {
      return NextResponse.json({ ok: false, message: 'مصدر الصورة غير مسموح.' }, { status: 422 });
    }

    if (!allowedByEnv(host)) {
      return NextResponse.json({ ok: false, message: 'مصدر الصورة غير مضاف ضمن المواقع المسموحة.' }, { status: 422 });
    }

    if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('instagram.com')) {
      return NextResponse.json({ ok: false, message: 'صور فيسبوك/انستقرام لا يمكن استيرادها مباشرة.' }, { status: 422 });
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'SooqYemen Importer',
        'Accept': 'image/*,*/*;q=0.8',
      },
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      return NextResponse.json({ ok: false, message: `فشل تحميل الصورة (${res.status}).` }, { status: 502 });
    }

    const ct = String(res.headers.get('content-type') || 'application/octet-stream');
    if (!ct.startsWith('image/')) {
      return NextResponse.json({ ok: false, message: 'الرابط لا يشير إلى صورة.' }, { status: 415 });
    }

    const buf = await res.arrayBuffer();
    // 12MB cap
    if (buf.byteLength > 12 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: 'حجم الصورة كبير جداً.' }, { status: 413 });
    }

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('import-image error:', err);
    return NextResponse.json({ ok: false, message: 'تعذر تحميل الصورة.' }, { status: 500 });
  }
}
