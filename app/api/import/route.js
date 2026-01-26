import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ==============================
// Helpers
// ==============================
function safeJson(status, body) {
  return NextResponse.json(body, { status });
}

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

function isIp(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[[0-9a-fA-F:]+\]$/.test(host);
}

function isPrivateIpV4(host) {
  // host is IPv4
  const parts = host.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;

  // 127.0.0.0/8 loopback
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;

  return false;
}

function isBlockedHost(host) {
  if (!host) return true;

  // Block obvious local/internal targets (SSRF safety)
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan')
  ) return true;

  // Block IPv4 private/loopback
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateIpV4(host);
  }

  // Block IPv6 loopback/link-local (best-effort)
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;

  return false;
}

function allowedByEnv(host) {
  // Optional allowlist via env: IMPORT_ALLOWED_HOSTS="example.com,sub.example.com"
  const raw = (process.env.IMPORT_ALLOWED_HOSTS || '').trim();
  if (!raw) return true; // allow all (except blocked) by default

  const allowed = raw
    .split(',')
    .map((s) => s.trim().replace(/^www\./, '').toLowerCase())
    .filter(Boolean);

  if (!allowed.length) return true;

  return allowed.some((a) => host === a || host.endsWith('.' + a));
}

function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(s) {
  // Minimal decode for common entities.
  if (!s) return '';
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function toLatinDigits(input) {
  const s = String(input || '');
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  let out = '';
  for (const ch of s) {
    const ai = arabicIndic.indexOf(ch);
    if (ai !== -1) { out += String(ai); continue; }
    const ei = easternArabicIndic.indexOf(ch);
    if (ei !== -1) { out += String(ei); continue; }
    out += ch;
  }
  return out;
}

function normArabic(s) {
  return toLatinDigits(String(s || ''))
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function resolveUrl(base, maybeUrl) {
  if (!maybeUrl) return '';
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return String(maybeUrl);
  }
}

const GOV_ALIASES = [
  { key: 'amanat_al_asimah', aliases: ['امانة العاصمة', 'أمانة العاصمة', 'العاصمه', 'صنعاء امانه', 'صنعاء (امانه)'] },
  { key: 'sanaa', aliases: ['صنعاء', 'صنعاء محافظه', 'محافظة صنعاء'] },
  { key: 'aden', aliases: ['عدن'] },
  { key: 'taiz', aliases: ['تعز', 'تعكس', 'تعزّ'] },
  { key: 'ibb', aliases: ['اب', 'إب'] },
  { key: 'al_hudaydah', aliases: ['الحديدة', 'الحديده', 'حديدة'] },
  { key: 'hadramaut', aliases: ['حضرموت', 'الوادي', 'سيئون', 'المكلا'] },
  { key: 'dhamar', aliases: ['ذمار'] },
  { key: 'al_bayda', aliases: ['البيضاء', 'البيضا'] },
  { key: 'hajjah', aliases: ['حجه', 'حجة'] },
  { key: 'lahij', aliases: ['لحج'] },
  { key: 'abyan', aliases: ['ابين', 'أبين'] },
  { key: 'al_dhale', aliases: ['الضالع'] },
  { key: 'al_mahrah', aliases: ['المهره', 'المهرة', 'الغيضه', 'الغيضة'] },
  { key: 'al_jawf', aliases: ['الجوف'] },
  { key: 'al_mahwit', aliases: ['المحويت'] },
  { key: 'marib', aliases: ['مارب', 'مأرب'] },
  { key: 'raymah', aliases: ['ريمه', 'ريمة'] },
  { key: 'saada', aliases: ['صعده', 'صعدة'] },
  { key: 'shabwah', aliases: ['شبوه', 'شبوة', 'عتق'] },
  { key: 'amran', aliases: ['عمران'] },
  { key: 'socotra', aliases: ['سقطرى', 'سقطره', 'صقطرى', 'صقطرة', 'سقطرا', 'سقطره'] },
];

// centers (approximation). User can pick exact point on the map.
const GOV_CENTER = {
  amanat_al_asimah: [15.369445, 44.191006],
  sanaa: [15.369445, 44.191006],
  aden: [12.785496, 45.018654],
  taiz: [13.57952, 44.02091],
  socotra: [12.64881, 54.01895],
};

function detectGovKey(text) {
  const t = normArabic(text);
  if (!t) return '';
  for (const g of GOV_ALIASES) {
    for (const a of g.aliases || []) {
      const al = normArabic(a);
      if (al && t.includes(al)) return g.key;
    }
  }
  return '';
}

function extractPhone(text) {
  const s = toLatinDigits(String(text || ''));
  const m =
    s.match(/(\+?967|00967)?\s*([0-9]{7,9})\b/) ||
    s.match(/\b(7[0-9]{8})\b/) ||
    s.match(/\b(0[0-9]{8,10})\b/);
  if (!m) return '';
  const raw = (m[2] || m[1] || '').replace(/\D/g, '');
  if (!raw) return '';
  if (raw.startsWith('967')) return '+' + raw;
  if (raw.length === 9 && raw.startsWith('7')) return '+967' + raw;
  return raw;
}

function extractPriceAndCurrency(text) {
  const t = normArabic(text);
  const s = toLatinDigits(String(text || ''));

  let currency = 'YER';
  if (t.includes('سعودي') || /\bSAR\b/i.test(s)) currency = 'SAR';
  else if (t.includes('دولار') || /\bUSD\b/i.test(s) || s.includes('$')) currency = 'USD';
  else if (t.includes('ريال') || t.includes('يمني') || t.includes('ر.ي')) currency = 'YER';

  // Remove phone-like chunks to reduce false positives
  const withoutPhones = s.replace(/\b(7\d{8})\b/g, ' ').replace(/\b(00967|967)\d+\b/g, ' ');

  const nums = [];
  const reNum = /\b\d{1,3}(?:[\s,._]\d{3})+\b|\b\d{4,9}\b/g;
  const matches = withoutPhones.match(reNum) || [];
  for (const m of matches) {
    const n = Number(String(m).replace(/[\s,._]/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    // ignore suspiciously long numbers (often IDs)
    if (String(n).length >= 10) continue;
    nums.push(n);
  }

  // If there are many numbers, prefer the one near words like "السعر/ريال"
  let price = null;
  if (nums.length) price = Math.max(...nums);

  return { price: price != null ? String(price) : '', currency };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'SooqYemen Importer',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
    let html = await res.text();
    if (html.length > 1_500_000) html = html.slice(0, 1_500_000);
    return html;
  } finally {
    clearTimeout(t);
  }
}

function parseMetaTags(html) {
  const metas = [];
  const re = /<meta\b[^>]*>/ig;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const attrs = {};
    const aRe = /([a-zA-Z0-9:_-]+)\s*=\s*["']([^"']*)["']/g;
    let a;
    while ((a = aRe.exec(tag))) {
      attrs[a[1].toLowerCase()] = a[2];
    }
    metas.push(attrs);
    if (metas.length > 5000) break; // safety
  }
  return metas;
}

function pickMetaFromList(metas, keys) {
  // keys: [{attr:'property'|'name', key:'og:title'}...]
  for (const k of keys) {
    const wantKey = String(k.key || '').toLowerCase();
    const wantAttr = String(k.attr || '').toLowerCase();
    for (const meta of metas) {
      const got = String(meta[wantAttr] || '').toLowerCase();
      if (got === wantKey) {
        const c = meta.content || meta['content'];
        if (c) return decodeEntities(c);
      }
    }
  }
  return '';
}

function pickAllMetaFromList(metas, attr, key) {
  const out = [];
  const wantKey = String(key || '').toLowerCase();
  const wantAttr = String(attr || '').toLowerCase();
  for (const meta of metas) {
    const got = String(meta[wantAttr] || '').toLowerCase();
    if (got === wantKey) {
      const c = meta.content || meta['content'];
      if (c) out.push(decodeEntities(c));
      if (out.length >= 10) break;
    }
  }
  return out;
}

function pickTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? decodeEntities(m[1]).trim() : '';
}

function pickJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/ig;
  let m;
  while ((m = re.exec(html))) {
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // ignore invalid JSON-LD blocks
    }
    if (out.length >= 5) break;
  }
  return out;
}

function extractFromJsonLd(jsonlds) {
  const flat = [];
  const pushObj = (o) => {
    if (!o) return;
    if (Array.isArray(o)) { o.forEach(pushObj); return; }
    if (typeof o === 'object') {
      if (o['@graph']) pushObj(o['@graph']);
      else flat.push(o);
    }
  };
  pushObj(jsonlds);

  const pick = (types) => {
    for (const o of flat) {
      const t = o['@type'];
      if (!t) continue;
      const tArr = Array.isArray(t) ? t : [t];
      if (tArr.some((x) => types.includes(String(x)))) return o;
    }
    return null;
  };

  const prod = pick(['Product', 'RealEstateListing', 'Vehicle', 'Offer', 'Service']);
  if (!prod) return {};

  const title = decodeEntities(prod.name || prod.headline || '');
  const desc = decodeEntities(prod.description || '');
  let images = [];
  if (prod.image) images = Array.isArray(prod.image) ? prod.image : [prod.image];

  let price = '';
  let currency = '';
  const offers = prod.offers || prod.Offers;
  if (offers) {
    const off = Array.isArray(offers) ? offers[0] : offers;
    if (off) {
      price = String(off.price || off.priceSpecification?.price || '') || '';
      currency = String(off.priceCurrency || off.priceSpecification?.priceCurrency || '') || '';
    }
  }
  return { title, desc, images: images.filter(Boolean).slice(0, 10), price, currency };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = String(body?.mode || 'text').trim().toLowerCase();
    const input = String(body?.input || '').trim();

    if (!input) return safeJson(400, { ok: false, message: 'أدخل نصاً أو رابطاً.' });
    if (input.length > 20000) return safeJson(413, { ok: false, message: 'المحتوى طويل جداً.' });

    // ------------------------------
    // URL import (best-effort)
    // ------------------------------
    if (mode === 'url') {
      if (!isHttpUrl(input)) return safeJson(400, { ok: false, message: 'الرابط غير صحيح.' });

      const host = getHost(input);

      if (isBlockedHost(host)) {
        return safeJson(422, {
          ok: false,
          code: 'BLOCKED_HOST',
          message: 'هذا الرابط غير مسموح للاستيراد. جرّب لصق نص الإعلان بدل الرابط.',
        });
      }

      if (!allowedByEnv(host)) {
        return safeJson(422, {
          ok: false,
          code: 'DOMAIN_NOT_ALLOWED',
          message: 'هذا الموقع غير مضاف ضمن قائمة المواقع المسموحة للاستيراد. جرّب لصق النص أو أضف الدومين في IMPORT_ALLOWED_HOSTS.',
        });
      }

      // Facebook/Instagram intentionally unsupported
      if (
        host.includes('facebook.com') ||
        host.includes('fb.com') ||
        host.includes('fb.watch') ||
        host.includes('instagram.com')
      ) {
        return safeJson(422, {
          ok: false,
          code: 'UNSUPPORTED_FACEBOOK',
          message: 'روابط فيسبوك/انستقرام غير مدعومة للاستيراد المباشر. انسخ نص الإعلان والصور والصقها داخل "استيراد من نص".',
        });
      }

      const html = await fetchHtml(input);
      const metas = parseMetaTags(html);

      const ogTitle = pickMetaFromList(metas, [
        { attr: 'property', key: 'og:title' },
        { attr: 'name', key: 'twitter:title' },
      ]);

      const ogDesc = pickMetaFromList(metas, [
        { attr: 'property', key: 'og:description' },
        { attr: 'name', key: 'description' },
        { attr: 'name', key: 'twitter:description' },
      ]);

      const ogImagesRaw = [
        ...pickAllMetaFromList(metas, 'property', 'og:image'),
        ...pickAllMetaFromList(metas, 'name', 'twitter:image'),
      ].filter(Boolean);

      const jsonlds = pickJsonLd(html);
      const fromJsonLd = extractFromJsonLd(jsonlds);

      const title = (fromJsonLd.title || ogTitle || pickTitle(html) || '').trim();
      const desc = (fromJsonLd.desc || ogDesc || '').trim();

      const images = (fromJsonLd.images?.length ? fromJsonLd.images : ogImagesRaw)
        .map((u) => resolveUrl(input, u))
        .filter(Boolean)
        .slice(0, 10);

      let finalDesc = desc;
      if (!finalDesc) {
        const text = stripHtml(html);
        finalDesc = text.slice(0, 1200);
      }

      let price = String(fromJsonLd.price || '').trim();
      let currency = String(fromJsonLd.currency || '').trim();
      if (!currency || !price) {
        const pc = extractPriceAndCurrency(`${title} ${finalDesc}`);
        if (!currency) currency = pc.currency;
        if (!price) price = pc.price;
      }

      const govKey = detectGovKey(`${title} ${finalDesc}`);
      const center = govKey && GOV_CENTER[govKey] ? GOV_CENTER[govKey] : null;

      return safeJson(200, {
        ok: true,
        mode: 'url',
        sourceUrl: input,
        data: {
          title,
          desc: finalDesc,
          images,
          price,
          currency: currency || 'YER',
          phone: extractPhone(`${title} ${finalDesc}`),
          govKey: govKey || '',
          coords: center,
          notes: images.length ? [] : ['قد لا يمكن سحب الصور من بعض المواقع. إذا لم تظهر الصور، ارفعها يدويًا.'],
        },
      });
    }

    // ------------------------------
    // TEXT import
    // ------------------------------
    const text = input;
    const pc = extractPriceAndCurrency(text);
    const govKey = detectGovKey(text);
    const center = govKey && GOV_CENTER[govKey] ? GOV_CENTER[govKey] : null;

    const firstLine = String(text.split('\n')[0] || '').trim();
    const title = firstLine.length >= 8 && firstLine.length <= 80 ? firstLine : '';

    return safeJson(200, {
      ok: true,
      mode: 'text',
      data: {
        title,
        desc: text.trim(),
        images: [],
        price: pc.price || '',
        currency: pc.currency || 'YER',
        phone: extractPhone(text),
        govKey: govKey || '',
        coords: center,
        notes: ['للصور: ارفعها من جهازك (لا يمكن استخراج صور واتساب/فيسبوك تلقائياً).'],
      },
    });
  } catch (err) {
    console.error('Import route error:', err);
    return safeJson(500, { ok: false, message: 'حدث خطأ أثناء الاستيراد.' });
  }
}
