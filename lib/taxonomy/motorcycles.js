// lib/taxonomy/motorcycles.js
import { matchKeyFromValue, detectKeyFromText, normStr, compactSpaces } from './helpers';

// =========================
// ماركات الدراجات النارية (تركيز: الشائع في اليمن + الصيني)
// =========================
export const MOTORCYCLE_BRANDS = [
  // ياباني/هندي شائع
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'yamaha', label: 'ياماها', aliases: ['yamaha', 'ياماها'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },
  { key: 'bajaj', label: 'باجاج', aliases: ['bajaj', 'باجاج'] },
  { key: 'tvs', label: 'TVS', aliases: ['tvs', 'تي في اس', 't v s'] },
  { key: 'ktm', label: 'KTM', aliases: ['ktm'] },

  // صيني شائع في اليمن
  { key: 'sanya', label: 'سانيا', aliases: ['sanya', 'سانيا', 'ساينا', 'sanya moto'] },
  { key: 'haojue', label: 'هاوجي', aliases: ['haojue', 'هاوجي', 'هاوجو', 'haojoue'] },
  { key: 'lifan', label: 'ليفان', aliases: ['lifan', 'ليفان'] },
  { key: 'dayun', label: 'دايون', aliases: ['dayun', 'دايون', 'دايون موتور'] },
  { key: 'loncin', label: 'لونسين', aliases: ['loncin', 'لونسين', 'لونسن'] },
  { key: 'shineray', label: 'شينراي', aliases: ['shineray', 'شينراي', 'شين راي'] },
  { key: 'haojin', label: 'هوجن', aliases: ['haojin', 'هوجن', 'هاوجين'] },
  { key: 'comata', label: 'كوماتا', aliases: ['comata', 'كوماتا', 'كومـاتا', 'comata moto'] },

  // صيني إضافي (منتشر)
  { key: 'zongshen', label: 'زونشن', aliases: ['zongshen', 'زونشن', 'zong shen'] },
  { key: 'qingqi', label: 'كينجكي', aliases: ['qingqi', 'كينجكي', 'qinqi'] },
  { key: 'jialing', label: 'جيالينغ', aliases: ['jialing', 'جيالينغ', 'جالينج'] },
  { key: 'keeway', label: 'كي واي', aliases: ['keeway', 'كي واي', 'keway'] },
  { key: 'sym', label: 'SYM', aliases: ['sym'] },
  { key: 'kymco', label: 'KYMCO', aliases: ['kymco', 'kimco'] },

  // ✅ غير مصنّف
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى', 'غير مصنف', 'غير_مصنف', 'بدون ماركة', 'صيني'] },
];

// =========================
// موديلات الدراجات (هرمي: ماركة -> موديلات)
// =========================
const COMMON_SIZES = [
  { key: '50', label: '50cc', aliases: ['50', '50cc', '٥٠'] },
  { key: '70', label: '70cc', aliases: ['70', '70cc', '٧٠'] },
  { key: '100', label: '100cc', aliases: ['100', '100cc', '١٠٠'] },
  { key: '110', label: '110cc', aliases: ['110', '110cc', '١١٠'] },
  { key: '125', label: '125cc', aliases: ['125', '125cc', '١٢٥'] },
  { key: '150', label: '150cc', aliases: ['150', '150cc', '١٥٠'] },
  { key: '200', label: '200cc', aliases: ['200', '200cc', '٢٠٠'] },
  { key: '250', label: '250cc', aliases: ['250', '250cc', '٢٥٠'] },
  { key: '300', label: '300cc', aliases: ['300', '300cc', '٣٠٠'] },
];

// ✅ موديلات عامة (غير مصنّف) — مهمة جدًا لليمن
const OTHER_COMMON_MODELS = [
  { key: 'cg125', label: 'CG 125', aliases: ['cg125', 'cg 125', 'سي جي 125', 'سي جي'] },
  { key: 'cg150', label: 'CG 150', aliases: ['cg150', 'cg 150', 'سي جي 150'] },
  { key: 'cg200', label: 'CG 200', aliases: ['cg200', 'cg 200', 'سي جي 200'] },

  { key: 'gn125', label: 'GN 125', aliases: ['gn125', 'gn 125', 'جي ان 125', 'gn'] },
  { key: 'gn150', label: 'GN 150', aliases: ['gn150', 'gn 150', 'جي ان 150'] },

  { key: 'gy150', label: 'GY 150 (جبلي)', aliases: ['gy150', 'gy 150', 'جبلي 150'] },
  { key: 'gy200', label: 'GY 200 (جبلي)', aliases: ['gy200', 'gy 200', 'جبلي 200'] },
  { key: 'gy250', label: 'GY 250 (جبلي)', aliases: ['gy250', 'gy 250', 'جبلي 250'] },

  { key: 'scooter110', label: 'سكوتر 110', aliases: ['سكوتر 110', 'scooter 110'] },
  { key: 'scooter125', label: 'سكوتر 125', aliases: ['سكوتر 125', 'scooter 125'] },
  { key: 'scooter150', label: 'سكوتر 150', aliases: ['سكوتر 150', 'scooter 150', 'gy6 150', 'gy6-150'] },

  { key: 'tricycle150', label: 'ثلاثي 150 (نقل)', aliases: ['ثلاثي 150', 'tricycle 150'] },
  { key: 'tricycle200', label: 'ثلاثي 200 (نقل)', aliases: ['ثلاثي 200', 'tricycle 200'] },
  { key: 'tricycle250', label: 'ثلاثي 250 (نقل)', aliases: ['ثلاثي 250', 'tricycle 250'] },

  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى', 'غير معروف'] },
];

export const MOTORCYCLE_MODELS_BY_BRAND = {
  honda: [
    { key: 'cg125', label: 'CG 125', aliases: ['cg', 'cg125', 'cg 125', 'سي جي', 'سي جي 125'] },
    { key: 'cgl125', label: 'CGL 125', aliases: ['cgl', 'cgl125', 'cgl 125'] },
    { key: 'wave110', label: 'Wave 110', aliases: ['wave', 'wave110', 'ويف', 'ويف 110'] },
    { key: 'cb150', label: 'CB 150', aliases: ['cb', 'cb150', 'cb 150'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  yamaha: [
    { key: 'ybr125', label: 'YBR 125', aliases: ['ybr', 'ybr125', 'ybr 125'] },
    { key: 'fz150', label: 'FZ 150', aliases: ['fz', 'fz150', 'fz 150'] },
    { key: 'crypton', label: 'Crypton', aliases: ['crypton', 'كريبتون'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  suzuki: [
    { key: 'ax100', label: 'AX 100', aliases: ['ax', 'ax100', 'ax 100'] },
    { key: 'gn125', label: 'GN 125', aliases: ['gn', 'gn125', 'gn 125'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],

  sanya: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  haojue: [
    { key: 'hj125', label: 'HJ 125', aliases: ['hj125', 'hj 125', 'haojue 125', 'هاوجي 125'] },
    { key: 'hj150', label: 'HJ 150', aliases: ['hj150', 'hj 150', 'هاوجي 150'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  lifan: [
    { key: 'lf125', label: 'LF 125', aliases: ['lf125', 'lf 125', 'ليفان 125'] },
    { key: 'lf150', label: 'LF 150', aliases: ['lf150', 'lf 150', 'ليفان 150'] },
    { key: 'lf200', label: 'LF 200', aliases: ['lf200', 'lf 200', 'ليفان 200'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  dayun: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  loncin: [
    { key: 'lx150', label: 'LX 150', aliases: ['lx150', 'lx 150', 'لونسين 150'] },
    { key: 'lx200', label: 'LX 200', aliases: ['lx200', 'lx 200', 'لونسين 200'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  shineray: [
    { key: 'xy150', label: 'XY 150', aliases: ['xy150', 'xy 150', 'شينراي 150'] },
    { key: 'xy200', label: 'XY 200', aliases: ['xy200', 'xy 200', 'شينراي 200'] },
    ...COMMON_SIZES,
    { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
  ],
  haojin: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  comata: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],

  zongshen: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  qingqi: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  jialing: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  keeway: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  sym: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],
  kymco: [...COMMON_SIZES, { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] }],

  // ✅ الآن "other" فيه موديلات عامة فعلًا
  other: [...OTHER_COMMON_MODELS, ...COMMON_SIZES],
};

// ===== Normalizers / Detectors / Labels =====

export function normalizeMotorcycleBrand(v) {
  return matchKeyFromValue(v, MOTORCYCLE_BRANDS) || '';
}

export function detectMotorcycleBrandFromText(text) {
  return detectKeyFromText(text, MOTORCYCLE_BRANDS) || '';
}

export function motorcycleBrandLabel(key) {
  return MOTORCYCLE_BRANDS.find((x) => x.key === key)?.label || '';
}

// ✅ تصحيح مهم: نطبع brandKey قبل ما نجيب الموديلات
export function getMotorcycleModelsByBrand(brandKey) {
  const raw = String(brandKey || '').trim();
  const k = normalizeMotorcycleBrand(raw) || raw;

  // إذا فشلنا، خلّه other
  const safeKey = k || 'other';

  // رجّع موديلات حتى لـ other (عشان “غير مصنّف”)
  return Array.isArray(MOTORCYCLE_MODELS_BY_BRAND?.[safeKey])
    ? MOTORCYCLE_MODELS_BY_BRAND[safeKey]
    : (MOTORCYCLE_MODELS_BY_BRAND.other || []);
}

export function normalizeMotorcycleModel(brandKey, v) {
  const models = getMotorcycleModelsByBrand(brandKey);
  return matchKeyFromValue(v, models) || '';
}

export function detectMotorcycleModelFromText(brandKey, text) {
  const models = getMotorcycleModelsByBrand(brandKey);
  return detectKeyFromText(text, models) || '';
}

export function motorcycleModelLabel(brandKey, modelKey) {
  const models = getMotorcycleModelsByBrand(brandKey);
  return models.find((x) => x.key === modelKey)?.label || '';
}

// ✅ مساعد جاهز للاستخدام داخل inferListingTaxonomy
export function inferMotorcycleFromListing(listing) {
  const title = normStr(listing?.title);
  const desc = normStr(listing?.description);
  const text = compactSpaces(`${title} ${desc}`);

  const brandField =
    listing?.motorcycleBrand ??
    listing?.bikeBrand ??
    listing?.brand ??
    listing?.make ??
    listing?.company ??
    listing?.manufacturer ??
    '';

  const brand =
    normalizeMotorcycleBrand(brandField) ||
    detectMotorcycleBrandFromText(text) ||
    'other';

  const modelField =
    listing?.motorcycleModel ??
    listing?.bikeModel ??
    listing?.model ??
    listing?.type ??
    listing?.motorcycle_model ??
    '';

  // ✅ حتى لو brand=other نقدر نلقط موديل عام (CG/GN/GY/سكوتر..)
  const model =
    normalizeMotorcycleModel(brand, modelField) ||
    detectMotorcycleModelFromText(brand, text) ||
    '';

  return { motorcycleBrand: brand, motorcycleModel: model };
}
