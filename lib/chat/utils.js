import { yemenCities, CATEGORIES, knowledgeBase } from './data';

// =========================
// معالجة النصوص
// =========================

export function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function convertArabicNumbers(text) {
  const arabicToLatin = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return String(text).replace(/[٠١٢٣٤٥٦٧٨٩]/g, (match) => arabicToLatin[match] || match);
}

// =========================
// استخراج البيانات
// =========================

export function extractNumber(messageRaw) {
  const converted = convertArabicNumbers(String(messageRaw || ''));
  // إزالة الفواصل (مثل 100,000 تصبح 100000)
  const t = converted.replace(/[,،]/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function normalizePhone(raw) {
  const converted = convertArabicNumbers(String(raw || ''));
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

  if (digits.length === 9 && digits.startsWith('7')) return true;
  if (digits.length === 12 && digits.startsWith('9677')) return true;
  return digits.length >= 7 && digits.length <= 15;
}

export function extractLatLngFromText(messageRaw) {
  const t = String(messageRaw || '');
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
  if (!m) return null;
  const url = m[0];
  if (/google\.[^/]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|openstreetmap\.org/i.test(url)) return url;
  return url;
}

// =========================
// المنطق الجغرافي
// =========================

export function findCityAndDistrict(text) {
  const normalized = normalizeText(text);
  let foundCity = null;
  let foundDistrict = null;

  for (const city in yemenCities) {
    const cityNorm = normalizeText(city);
    if (normalized.includes(cityNorm)) {
      foundCity = city;
      if (yemenCities[city].districts) {
        for (const district of yemenCities[city].districts) {
          const districtNorm = normalizeText(district);
          if (normalized.includes(districtNorm)) {
            foundDistrict = district;
            break;
          }
        }
      }
      break;
    }
  }

  if (!foundCity) {
    for (const location in yemenCities) {
      const locationNorm = normalizeText(location);
      if (normalized.includes(locationNorm)) {
        if (yemenCities[location].parent) {
          foundCity = yemenCities[location].parent;
          foundDistrict = location;
        } else {
          foundCity = location;
        }
        break;
      }
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
      label: `${district}, ${city}`
    };
  }

  if (yemenCities[city]) {
    return {
      lat: yemenCities[city].lat,
      lng: yemenCities[city].lng,
      label: city
    };
  }

  return null;
}

// =========================
// التصنيفات و FAQ
// =========================

export function detectCategorySlug(raw) {
  const t = normalizeText(raw);
  for (const c of CATEGORIES) {
    if (t.includes(normalizeText(c.slug))) return c.slug;
  }
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      const k = normalizeText(kw);
      if (k && t.includes(k)) return c.slug;
    }
  }
  return null;
}

export function categoryNameFromSlug(slug) {
  const item = CATEGORIES.find((c) => c.slug === slug);
  return item ? item.name : slug;
}

export function findBestMatch(message) {
  const lowerMessage = normalizeText(message);
  for (const [pattern, response] of Object.entries(knowledgeBase)) {
    const patterns = pattern.split('|');
    if (
      patterns.some((p) => {
        const p2 = normalizeText(p);
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
// Rate Limiting (In-Memory)
// =========================
// ملاحظة: في بيئة Serverless، هذا المتغير قد يتم إعادة تعيينه مع كل طلب جديد.
// للحصول على حماية حقيقية، يفضل استخدام Redis أو قاعدة بيانات.
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

export function checkRateLimit(userId, action) {
  const key = `${userId || 'anonymous'}_${action}`;
  const now = Date.now();
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }
  
  const timestamps = rateLimiter.get(key);
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  validTimestamps.push(now);
  rateLimiter.set(key, validTimestamps);
  
  // تنظيف الذاكرة
  if (validTimestamps.length === 1) {
    setTimeout(() => {
        // تحقق من وجود المفتاح قبل الحذف لتجنب الأخطاء
        if(rateLimiter.has(key)) rateLimiter.delete(key);
    }, RATE_LIMIT_WINDOW + 1000);
  }
  
  return true;
}

export function categoriesHint() {
  return CATEGORIES.map((c) => `• ${c.name} (${c.slug})`).join('\n');
}

export function draftSummary(d) {
    const data = d?.data || {};
    const parts = [];
    if (data.category) parts.push(`القسم: ${categoryNameFromSlug(data.category)}`);
    if (data.title) parts.push(`العنوان: ${data.title}`);
    if (data.description) parts.push(`الوصف: ${data.description}`);
    if (data.city) parts.push(`المدينة: ${data.city}`);
    if (data.phone) parts.push(`الجوال: ${data.phone}`);
    if (data.locationLabel) parts.push(`الموقع: ${data.locationLabel}`);
    if (data.lat != null && data.lng != null) parts.push(`الإحداثيات: ${data.lat}, ${data.lng}`);
    if (data.originalPrice) {
      parts.push(`السعر: ${data.originalPrice} ${data.originalCurrency || 'YER'}`);
    }
    if (Array.isArray(data.images) && data.images.length) {
      parts.push(`الصور: ${data.images.length}`);
    }
    return parts.join('\n');
}
  
export function listingNextPrompt(step, draft) {
    if (step === 'category') {
      return (
        'الخطوة 1/7: اختر القسم (اكتب اسم القسم):\n' +
        categoriesHint() +
        '\n\n(تقدر تلغي بأي وقت بكتابة: إلغاء)'
      );
    }
  
    if (step === 'title') {
      return 'الخطوة 2/7: اكتب عنوان الإعلان.';
    }
  
    if (step === 'description') {
      return 'الخطوة 3/7: اكتب وصف الإعلان (على الأقل 10 أحرف).';
    }
  
    if (step === 'city') {
      return 'الخطوة 4/7: اكتب اسم المدينة (مثال: صنعاء).';
    }
  
    if (step === 'phone') {
      return 'الخطوة 5/7: اكتب رقم الجوال للتواصل (مثال: 777123456 أو +967777123456).';
    }
  
    if (step === 'location') {
      return (
        'الخطوة 6/7: حدّد موقع الإعلان.\n' +
        '• اضغط زر "📍 موقعي" داخل الشات لإرسال الإحداثيات تلقائياً\n' +
        '• أو اكتب اسم المدينة والمنطقة (مثال: صنعاء - حدة) وسأحدد الإحداثيات تلقائياً\n' +
        '• أو اكتب الإحداثيات بهذا الشكل: 15.3694, 44.1910\n' +
        '• أو أرسل رابط خرائط جوجل'
      );
    }
  
    if (step === 'price') {
      return 'الخطوة 7/7: اكتب السعر (مثال: 100000) ويمكن تكتب العملة معها مثل: 100 USD أو 100 SAR.';
    }
  
    return (
      'هذه مسودة الإعلان الحالية:\n\n' +
      draftSummary(draft) +
      '\n\nيمكنك إضافة صور الآن عبر زر 📷 صور داخل الشات.\n\nإذا كل شيء تمام اكتب: نشر\nأو اكتب: إلغاء لإلغاء المسودة.'
    );
}

export function safeJsonParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
}
