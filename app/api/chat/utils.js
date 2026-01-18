import { yemenCities, CATEGORIES, knowledgeBase, CATEGORY_ALIASES, CURRENCY_ALIASES, ASSISTANT_COMMANDS, LISTING_WIZARD } from './data';

// =========================
// نصوص / تطبيع
// =========================

export function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function convertArabicNumbers(text) {
  const map = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  return String(text || '').replace(/[٠١٢٣٤٥٦٧٨٩]/g, (m) => map[m] || m);
}

// =========================
// أرقام / هاتف / سعر
// =========================

export function extractNumber(messageRaw) {
  const converted = convertArabicNumbers(String(messageRaw || ''));
  const t = converted.replace(/[,،\s]/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function normalizePhone(raw) {
  const converted = convertArabicNumbers(String(raw || ''));
  // لا نلزم مفتاح دولي، لكن نقبله لو وجد.
  const s = converted
    .trim()
    .replace(/[\s\-()]/g, '')
    .replace(/[^0-9+]/g, '');

  if (s.startsWith('+')) {
    const digits = s.replace(/[^0-9]/g, '');
    return `+${digits}`;
  }
  return s;
}

export function isValidPhone(phone) {
  const p = normalizePhone(phone);
  const digits = p.replace(/[^0-9]/g, '');

  // اليمن: 7xxxxxxxx (9 أرقام)
  if (digits.length === 9 && digits.startsWith('7')) return true;

  // +9677xxxxxxxx (12 رقم)
  if (digits.length === 12 && digits.startsWith('9677')) return true;

  // مرونة لباقي الحالات
  return digits.length >= 7 && digits.length <= 15;
}

export function detectCurrencyCodeFromText(messageRaw) {
  const t = normalizeText(messageRaw);

  // ترتيب مهم: نصوص محددة قبل العامة
  const keys = Object.keys(CURRENCY_ALIASES)
    .sort((a, b) => b.length - a.length)
    .map((k) => normalizeText(k));

  for (const k of keys) {
    if (!k) continue;
    if (t.includes(k)) {
      const code = CURRENCY_ALIASES[k];
      return code || null;
    }
  }
  return null;
}

export function parsePriceAndCurrency(messageRaw) {
  const amount = extractNumber(messageRaw);
  const c = detectCurrencyCodeFromText(messageRaw);

  // كلمة "ريال" فقط -> غير محدد
  if (c === 'AMBIGUOUS_RIYAL') {
    return { amount, currency: null, needsCurrency: true, ambiguousRiyal: true };
  }

  if (!amount) {
    return { amount: null, currency: c && c !== 'AMBIGUOUS_RIYAL' ? c : null, needsCurrency: false, ambiguousRiyal: false };
  }

  if (!c) {
    return { amount, currency: null, needsCurrency: true, ambiguousRiyal: false };
  }

  return { amount, currency: c, needsCurrency: false, ambiguousRiyal: false };
}

// =========================
// تصنيفات / FAQ
// =========================

export function categoryNameFromSlug(slug) {
  const item = CATEGORIES.find((c) => c.slug === slug);
  return item ? item.name : slug;
}

export function detectCategorySlug(raw) {
  const t = normalizeText(raw);
  if (!t) return null;

  // 1) aliases
  for (const [k, v] of Object.entries(CATEGORY_ALIASES || {})) {
    const kk = normalizeText(k);
    if (kk && t.includes(kk)) return v;
  }

  // 2) slug itself
  for (const c of CATEGORIES) {
    if (t.includes(normalizeText(c.slug))) return c.slug;
  }

  // 3) keywords
  for (const c of CATEGORIES) {
    for (const kw of c.keywords || []) {
      const k = normalizeText(kw);
      if (k && t.includes(k)) return c.slug;
    }
  }

  return null;
}

export function categoriesHint() {
  return CATEGORIES.map((c) => `• ${c.name} (${c.slug})`).join('\n');
}

export function findBestMatch(message) {
  const lowerMessage = normalizeText(message);

  for (const [pattern, response] of Object.entries(knowledgeBase || {})) {
    const patterns = String(pattern).split('|');
    if (
      patterns.some((p) => {
        const p2 = normalizeText(p);
        if (!p2) return false;
        const regex = new RegExp(`(^|\\s)${escapeRegex(p2)}($|\\s|[،.؟!])`, 'i');
        return regex.test(lowerMessage) || lowerMessage.includes(p2);
      })
    ) {
      return response;
    }
  }

  return null;
}

// =========================
// موقع / خرائط
// =========================

export function extractLatLngFromText(messageRaw) {
  const t = convertArabicNumbers(String(messageRaw || '')).trim();
  const m = t.match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function extractMapsLink(messageRaw) {
  const t = String(messageRaw || '');
  const m = t.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}

export function extractLatLngFromMapsUrl(url) {
  if (!url) return null;
  const u = String(url);

  // نمط @lat,lng
  let m = u.match(/@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // q=lat,lng
  m = u.match(/[?&]q=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  // ll=lat,lng
  m = u.match(/[?&]ll=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

  return null;
}

export function findCityAndDistrict(text) {
  const normalized = normalizeText(text);
  let foundCity = null;
  let foundDistrict = null;

  // 1) اسم مدينة أساسي + حي
  for (const city in yemenCities) {
    const cityObj = yemenCities[city];
    if (!cityObj || !cityObj.districts) continue;

    const cityNorm = normalizeText(city);
    if (cityNorm && normalized.includes(cityNorm)) {
      foundCity = city;

      for (const district of cityObj.districts) {
        const districtNorm = normalizeText(district);
        if (districtNorm && normalized.includes(districtNorm)) {
          foundDistrict = district;
          break;
        }
      }

      break;
    }
  }

  // 2) حي مستقل له parent
  if (!foundCity) {
    for (const location in yemenCities) {
      const obj = yemenCities[location];
      const locationNorm = normalizeText(location);
      if (!locationNorm || !normalized.includes(locationNorm)) continue;

      if (obj && obj.parent) {
        foundCity = obj.parent;
        foundDistrict = location;
      } else {
        foundCity = location;
      }
      break;
    }
  }

  return { city: foundCity, district: foundDistrict };
}

export function getCoordinates(city, district = null) {
  if (!city) return null;

  if (district && yemenCities[district]) {
    return {
      lat: yemenCities[district].lat,
      lng: yemenCities[district].lng,
      label: `${district}, ${city}`,
    };
  }

  if (yemenCities[city]) {
    return {
      lat: yemenCities[city].lat,
      lng: yemenCities[city].lng,
      label: city,
    };
  }

  return null;
}

export function parseLocationFromTextOrMeta(messageRaw, meta) {
  // 1) meta.location
  const ml = meta && meta.location ? meta.location : null;
  if (ml && isFinite(Number(ml.lat)) && isFinite(Number(ml.lng))) {
    return {
      lat: Number(ml.lat),
      lng: Number(ml.lng),
      label: ml.label || 'موقع المستخدم',
      link: null,
    };
  }

  // 2) lat,lng
  const coords = extractLatLngFromText(messageRaw);
  if (coords) {
    return { lat: coords.lat, lng: coords.lng, label: 'إحداثيات', link: null };
  }

  // 3) maps link
  const link = extractMapsLink(messageRaw);
  if (link) {
    const c2 = extractLatLngFromMapsUrl(link);
    return {
      lat: c2 ? c2.lat : null,
      lng: c2 ? c2.lng : null,
      label: 'رابط خرائط',
      link,
    };
  }

  // 4) city/district
  const { city, district } = findCityAndDistrict(messageRaw);
  if (city) {
    const c3 = getCoordinates(city, district);
    if (c3) {
      return { lat: c3.lat, lng: c3.lng, label: c3.label, link: null, city, district };
    }
  }

  return null;
}

// =========================
// Rate limiting (ذاكرة)
// =========================

const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

export function checkRateLimit(userId, action) {
  const key = `${userId || 'anonymous'}_${action}`;
  const now = Date.now();

  if (!rateLimiter.has(key)) rateLimiter.set(key, []);

  const timestamps = rateLimiter.get(key) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (valid.length >= MAX_REQUESTS_PER_WINDOW) return false;

  valid.push(now);
  rateLimiter.set(key, valid);

  if (valid.length === 1) {
    setTimeout(() => {
      if (rateLimiter.has(key)) rateLimiter.delete(key);
    }, RATE_LIMIT_WINDOW + 1000);
  }

  return true;
}

// =========================
// Wizard helpers
// =========================

export function draftSummary(d) {
  const data = d && d.data ? d.data : (d || {});
  const parts = [];

  if (data.title) parts.push(`العنوان: ${data.title}`);
  if (data.description) parts.push(`الوصف: ${data.description}`);
  if (data.city) parts.push(`المدينة: ${data.city}${data.district ? ` - ${data.district}` : ''}`);
  if (data.category) parts.push(`القسم: ${categoryNameFromSlug(data.category)}`);
  if (data.originalPrice != null) {
    parts.push(`السعر: ${data.originalPrice} ${data.originalCurrency || ''}`.trim());
  }
  if (data.phone) parts.push(`التواصل: ${data.phone}`);

  if (Array.isArray(data.images) && data.images.length) {
    parts.push(`الصور: ${data.images.length}/${LISTING_WIZARD.MAX_IMAGES}`);
  }

  if (data.lat != null && data.lng != null) {
    parts.push(`الموقع: ${data.locationLabel || ''}`.trim());
    parts.push(`الإحداثيات: ${data.lat}, ${data.lng}`);
  } else if (data.locationLabel) {
    parts.push(`الموقع: ${data.locationLabel}`);
  }

  return parts.join('\n');
}

export function listingNextPrompt(step, draft) {
  const s = String(step || '').trim();

  if (s === 'title') {
    return `الخطوة 1/10: اكتب عنوان الإعلان (مثال: تويوتا كورولا 2012 نظيفة)\n(تقدر تلغي بأي وقت بكتابة: إلغاء)`;
  }

  if (s === 'description') {
    return `الخطوة 2/10: اكتب وصف الإعلان (مواصفات، حالة، سبب البيع... إلخ)\n(على الأقل ${LISTING_WIZARD.MIN_DESC} أحرف)`;
  }

  if (s === 'city') {
    return 'الخطوة 3/10: اكتب المدينة (مثال: صنعاء) ويمكن تكتب الحي (مثال: صنعاء - حدة).';
  }

  if (s === 'category') {
    return (
      'الخطوة 4/10: اختر القسم (اكتب اسم القسم):\n' +
      categoriesHint() +
      '\n\nمثال: سيارات\n(لو كتبت اسم مختلف أنا بسويه مطابق للسلاج الصحيح)'
    );
  }

  if (s === 'price') {
    return 'الخطوة 5/10: اكتب السعر (مثال: 100000 أو 250 سعودي أو 50$).';
  }

  if (s === 'currency') {
    return 'الخطوة 6/10: اختر العملة: ريال يمني / ريال سعودي / دولار';
  }

  if (s === 'phone') {
    return 'الخطوة 7/10: اكتب رقم التواصل (بدون مفتاح دولي عادي) مثال: 777123456';
  }

  if (s === 'images') {
    return `الخطوة 8/10: أضف الصور عبر زر 📷 داخل الشات (حتى ${LISTING_WIZARD.MAX_IMAGES} صور).\nاكتب (تخطي) لو ما عندك صور.`;
  }

  if (s === 'location') {
    return (
      'الخطوة 9/10: حدّد موقع الإعلان:\n' +
      '• اضغط زر "📍 موقعي" لإرسال الإحداثيات\n' +
      '• أو اكتب اسم المكان (مثال: صنعاء - حدة)\n' +
      '• أو اكتب lat,lng مثل: 15.3694, 44.1910\n' +
      '• أو أرسل رابط خرائط جوجل\n\nاكتب (تخطي) لو تبي نعتمد موقع المدينة فقط.'
    );
  }

  if (s === 'confirm') {
    return (
      'الخطوة 10/10: راجع المسودة ثم اكتب (نشر)\n\n' +
      draftSummary(draft) +
      '\n\nأوامر: نشر / رجوع / إلغاء'
    );
  }

  return 'اكتب: أضف إعلان لبدء إضافة إعلان عبر الشات.';
}

export function isCommand(messageRaw, commandKey) {
  const list = (ASSISTANT_COMMANDS && ASSISTANT_COMMANDS[commandKey]) || [];
  const t = normalizeText(messageRaw);
  return list.some((w) => normalizeText(w) === t || t.includes(normalizeText(w)));
}

export function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
