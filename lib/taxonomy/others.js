// lib/taxonomy/others.js
// هذا الملف يحتوي على أنواع الأقسام (Sub-types) + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مهم: مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// حقول عامة (إن احتجتها لاحقاً)
// ============
export const FUEL_TYPES = [
  { key: 'petrol', label: 'بنزين', aliases: ['بنزين', 'petrol', 'gas'] },
  { key: 'diesel', label: 'ديزل', aliases: ['ديزل', 'diesel'] },
  { key: 'hybrid', label: 'هايبرد', aliases: ['هجين', 'هايبرد', 'hybrid'] },
  { key: 'electric', label: 'كهرباء', aliases: ['كهربائي', 'كهرباء', 'electric', 'ev'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export const TRANSMISSION_TYPES = [
  { key: 'automatic', label: 'أوتوماتيك', aliases: ['اوتوماتيك', 'أوتوماتيك', 'automatic', 'auto'] },
  { key: 'manual', label: 'عادي (يدوي)', aliases: ['عادي', 'يدوي', 'manual'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

// ============
// إلكترونيات
// ============
export const ELECTRONICS_TYPES = [
  { key: 'laptop', label: 'لابتوب', aliases: ['laptop', 'لاب', 'كمبيوتر محمول'] },
  { key: 'desktop', label: 'كمبيوتر مكتبي', aliases: ['desktop', 'pc', 'مكتبي'] },
  { key: 'tablet', label: 'تابلت', aliases: ['tablet', 'تابلت'] },
  { key: 'tv', label: 'شاشات / تلفزيون', aliases: ['tv', 'تلفزيون', 'شاشة'] },
  { key: 'camera', label: 'كاميرات', aliases: ['camera', 'كاميرا', 'كاميرات'] },
  { key: 'console', label: 'ألعاب / بلايستيشن', aliases: ['ps', 'playstation', 'xbox', 'console', 'بلايستيشن'] },
  { key: 'printer', label: 'طابعات', aliases: ['printer', 'طابعة'] },
  { key: 'accessories', label: 'ملحقات', aliases: ['accessories', 'ملحقات', 'اكسسوارات'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeElectronicsType(v) {
  return matchKeyFromValue(v, ELECTRONICS_TYPES);
}
export function detectElectronicsTypeFromText(text) {
  return detectKeyFromText(text, ELECTRONICS_TYPES);
}
export function electronicsTypeLabel(key) {
  const k = String(key || '').trim();
  const item = ELECTRONICS_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// معدات ثقيلة
// ============
export const HEAVY_EQUIPMENT_TYPES = [
  { key: 'excavator', label: 'حفّار', aliases: ['excavator', 'حفار'] },
  { key: 'loader', label: 'شيول / لودر', aliases: ['loader', 'لودر', 'شيول'] },
  { key: 'bulldozer', label: 'بلدوزر', aliases: ['bulldozer', 'بلدوزر'] },
  { key: 'crane', label: 'رافعة', aliases: ['crane', 'رافعة'] },
  { key: 'generator', label: 'مولد كهرباء', aliases: ['generator', 'مولد'] },
  { key: 'forklift', label: 'رافعة شوكية', aliases: ['forklift', 'فوركلفت', 'رافعة شوكية'] },
  { key: 'spare_parts', label: 'قطع غيار', aliases: ['قطع', 'spare', 'spare parts', 'قطع غيار'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeHeavyEquipmentType(v) {
  return matchKeyFromValue(v, HEAVY_EQUIPMENT_TYPES);
}
export function detectHeavyEquipmentTypeFromText(text) {
  return detectKeyFromText(text, HEAVY_EQUIPMENT_TYPES);
}
export function heavyEquipmentTypeLabel(key) {
  const k = String(key || '').trim();
  const item = HEAVY_EQUIPMENT_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// طاقة شمسية
// ============
export const SOLAR_TYPES = [
  { key: 'panels', label: 'ألواح شمسية', aliases: ['panel', 'panels', 'الواح', 'ألواح'] },
  { key: 'inverter', label: 'انفرتر', aliases: ['inverter', 'انفرتر'] },
  { key: 'batteries', label: 'بطاريات', aliases: ['battery', 'batteries', 'بطارية', 'بطاريات'] },
  { key: 'controller', label: 'منظم شحن', aliases: ['controller', 'منظم', 'منظم شحن'] },
  { key: 'pumps', label: 'مضخات / غطاسات', aliases: ['pump', 'pumps', 'مضخة', 'غطاس', 'غطاسات'] },
  { key: 'wiring', label: 'أسلاك وملحقات', aliases: ['wire', 'wiring', 'اسلاك', 'أسلاك'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeSolarType(v) {
  return matchKeyFromValue(v, SOLAR_TYPES);
}
export function detectSolarTypeFromText(text) {
  return detectKeyFromText(text, SOLAR_TYPES);
}
export function solarTypeLabel(key) {
  const k = String(key || '').trim();
  const item = SOLAR_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// نت وشبكات
// ============
export const NETWORK_TYPES = [
  { key: 'router', label: 'راوتر', aliases: ['router', 'راوتر'] },
  { key: 'switch', label: 'سويتش', aliases: ['switch', 'سويتش'] },
  { key: 'access_point', label: 'Access Point', aliases: ['ap', 'access point', 'نقطة وصول'] },
  { key: 'cable', label: 'كيابل / وصلات', aliases: ['cable', 'كيبل', 'كيابل'] },
  { key: 'internet_service', label: 'اشتراك / خدمة إنترنت', aliases: ['internet', 'نت', 'انترنت', 'اشتراك'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeNetworkType(v) {
  return matchKeyFromValue(v, NETWORK_TYPES);
}
export function detectNetworkTypeFromText(text) {
  return detectKeyFromText(text, NETWORK_TYPES);
}
export function networkTypeLabel(key) {
  const k = String(key || '').trim();
  const item = NETWORK_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// صيانة
// ============
export const MAINTENANCE_TYPES = [
  { key: 'electronics', label: 'صيانة إلكترونيات', aliases: ['electronics', 'الكترونيات', 'إلكترونيات'] },
  { key: 'phones', label: 'صيانة جوالات', aliases: ['phones', 'جوالات', 'موبايلات'] },
  { key: 'cars', label: 'صيانة سيارات', aliases: ['cars', 'سيارات'] },
  { key: 'home', label: 'صيانة منزلية', aliases: ['home', 'منزل', 'منزلية'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeMaintenanceType(v) {
  return matchKeyFromValue(v, MAINTENANCE_TYPES);
}
export function detectMaintenanceTypeFromText(text) {
  return detectKeyFromText(text, MAINTENANCE_TYPES);
}
export function maintenanceTypeLabel(key) {
  const k = String(key || '').trim();
  const item = MAINTENANCE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// أثاث
// ============
export const FURNITURE_TYPES = [
  { key: 'bedroom', label: 'غرف نوم', aliases: ['bedroom', 'نوم'] },
  { key: 'living', label: 'مجالس / صالات', aliases: ['living', 'مجلس', 'مجالس', 'صالون', 'صالات'] },
  { key: 'kitchen', label: 'مطابخ', aliases: ['kitchen', 'مطبخ', 'مطابخ'] },
  { key: 'office', label: 'أثاث مكتبي', aliases: ['office', 'مكتبي'] },
  { key: 'decor', label: 'ديكور', aliases: ['decor', 'ديكور'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeFurnitureType(v) {
  return matchKeyFromValue(v, FURNITURE_TYPES);
}
export function detectFurnitureTypeFromText(text) {
  return detectKeyFromText(text, FURNITURE_TYPES);
}
export function furnitureTypeLabel(key) {
  const k = String(key || '').trim();
  const item = FURNITURE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// أدوات منزلية
// ============
export const HOME_TOOLS_TYPES = [
  { key: 'kitchen_tools', label: 'أدوات مطبخ', aliases: ['kitchen', 'مطبخ'] },
  { key: 'cleaning', label: 'تنظيف', aliases: ['cleaning', 'تنظيف'] },
  { key: 'appliances', label: 'أجهزة منزلية', aliases: ['appliance', 'أجهزة', 'ثلاجة', 'غسالة'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeHomeToolsType(v) {
  return matchKeyFromValue(v, HOME_TOOLS_TYPES);
}
export function detectHomeToolsTypeFromText(text) {
  return detectKeyFromText(text, HOME_TOOLS_TYPES);
}
export function homeToolsTypeLabel(key) {
  const k = String(key || '').trim();
  const item = HOME_TOOLS_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// ملابس
// ============
export const CLOTHES_TYPES = [
  { key: 'men', label: 'رجالي', aliases: ['men', 'رجال', 'رجالي'] },
  { key: 'women', label: 'نسائي', aliases: ['women', 'نساء', 'نسائي'] },
  { key: 'kids', label: 'أطفال', aliases: ['kids', 'اطفال', 'أطفال'] },
  { key: 'shoes', label: 'أحذية', aliases: ['shoes', 'حذاء', 'أحذية'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeClothesType(v) {
  return matchKeyFromValue(v, CLOTHES_TYPES);
}
export function detectClothesTypeFromText(text) {
  return detectKeyFromText(text, CLOTHES_TYPES);
}
export function clothesTypeLabel(key) {
  const k = String(key || '').trim();
  const item = CLOTHES_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// حيوانات
// ============
export const ANIMAL_TYPES = [
  { key: 'birds', label: 'طيور', aliases: ['birds', 'طيور'] },
  { key: 'sheep', label: 'غنم', aliases: ['sheep', 'غنم', 'ضأن'] },
  { key: 'goats', label: 'ماعز', aliases: ['goat', 'goats', 'ماعز'] },
  { key: 'cows', label: 'بقر', aliases: ['cow', 'cows', 'بقر'] },
  { key: 'camels', label: 'إبل', aliases: ['camel', 'camels', 'ابل', 'إبل'] },
  { key: 'pets', label: 'حيوانات أليفة', aliases: ['pets', 'قطط', 'كلاب'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeAnimalType(v) {
  return matchKeyFromValue(v, ANIMAL_TYPES);
}
export function detectAnimalTypeFromText(text) {
  return detectKeyFromText(text, ANIMAL_TYPES);
}
export function animalTypeLabel(key) {
  const k = String(key || '').trim();
  const item = ANIMAL_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// وظائف
// ============
export const JOB_TYPES = [
  { key: 'full_time', label: 'دوام كامل', aliases: ['full time', 'full_time', 'دوام كامل'] },
  { key: 'part_time', label: 'دوام جزئي', aliases: ['part time', 'part_time', 'جزئي'] },
  { key: 'remote', label: 'عن بُعد', aliases: ['remote', 'عن بعد', 'عن بُعد'] },
  { key: 'contract', label: 'عقد / مؤقت', aliases: ['contract', 'مؤقت', 'عقد'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeJobType(v) {
  return matchKeyFromValue(v, JOB_TYPES);
}
export function detectJobTypeFromText(text) {
  return detectKeyFromText(text, JOB_TYPES);
}
export function jobTypeLabel(key) {
  const k = String(key || '').trim();
  const item = JOB_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// خدمات
// ============
export const SERVICE_TYPES = [
  { key: 'transport', label: 'نقل', aliases: ['transport', 'نقل'] },
  { key: 'construction', label: 'بناء ومقاولات', aliases: ['construction', 'مقاولات', 'بناء'] },
  { key: 'education', label: 'تعليم ودورات', aliases: ['education', 'تعليم', 'دورات'] },
  { key: 'design', label: 'تصميم', aliases: ['design', 'تصميم'] },
  { key: 'marketing', label: 'تسويق', aliases: ['marketing', 'تسويق'] },
  { key: 'repair', label: 'صيانة/تصليح', aliases: ['repair', 'صيانة', 'تصليح'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeServiceType(v) {
  return matchKeyFromValue(v, SERVICE_TYPES);
}
export function detectServiceTypeFromText(text) {
  return detectKeyFromText(text, SERVICE_TYPES);
}
export function serviceTypeLabel(key) {
  const k = String(key || '').trim();
  const item = SERVICE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// دراجات نارية (ماركات + موديلات)
// ============
export const MOTORCYCLE_BRANDS = [
  { key: 'yamaha', label: 'ياماها', aliases: ['yamaha', 'ياماها'] },
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },
  { key: 'bajaj', label: 'باجاج', aliases: ['bajaj', 'باجاج'] },
  { key: 'tvs', label: 'TVS', aliases: ['tvs'] },
  { key: 'royal_enfield', label: 'Royal Enfield', aliases: ['royal enfield', 'royal_enfield'] },
  { key: 'ktm', label: 'KTM', aliases: ['ktm'] },
  { key: 'sym', label: 'SYM', aliases: ['sym'] },
  { key: 'kymco', label: 'KYMCO', aliases: ['kymco'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeMotorcycleBrand(v) {
  return matchKeyFromValue(v, MOTORCYCLE_BRANDS);
}
export function detectMotorcycleBrandFromText(text) {
  return detectKeyFromText(text, MOTORCYCLE_BRANDS);
}
export function motorcycleBrandLabel(key) {
  const k = String(key || '').trim();
  const item = MOTORCYCLE_BRANDS.find((x) => x.key === k);
  return item ? item.label : '';
}

export const MOTORCYCLE_MODELS_BY_BRAND = {
  yamaha: [
    { key: 'ybr', label: 'YBR' },
    { key: 'fzs', label: 'FZS' },
    { key: 'mt15', label: 'MT-15' },
    { key: 'other', label: 'أخرى…' },
  ],
  honda: [
    { key: 'cbr', label: 'CBR' },
    { key: 'cb', label: 'CB' },
    { key: 'wave', label: 'Wave' },
    { key: 'other', label: 'أخرى…' },
  ],
  suzuki: [
    { key: 'gs', label: 'GS' },
    { key: 'gsx', label: 'GSX' },
    { key: 'other', label: 'أخرى…' },
  ],
  bajaj: [
    { key: 'boxer', label: 'Boxer' },
    { key: 'discover', label: 'Discover' },
    { key: 'pulsar', label: 'Pulsar' },
    { key: 'other', label: 'أخرى…' },
  ],
  tvs: [
    { key: 'apache', label: 'Apache' },
    { key: 'other', label: 'أخرى…' },
  ],
  royal_enfield: [
    { key: 'classic', label: 'Classic' },
    { key: 'bullet', label: 'Bullet' },
    { key: 'other', label: 'أخرى…' },
  ],
  ktm: [
    { key: 'duke', label: 'Duke' },
    { key: 'rc', label: 'RC' },
    { key: 'other', label: 'أخرى…' },
  ],
  sym: [
    { key: 'symphony', label: 'Symphony' },
    { key: 'jet', label: 'Jet' },
    { key: 'other', label: 'أخرى…' },
  ],
  kymco: [
    { key: 'agility', label: 'Agility' },
    { key: 'like', label: 'Like' },
    { key: 'other', label: 'أخرى…' },
  ],
};

// ✅ جلب موديلات الماركة (واجهة موحّدة)
export function getMotorcycleModelsByBrand(brandKey) {
  const k = String(brandKey || '').trim().toLowerCase();
  const arr = MOTORCYCLE_MODELS_BY_BRAND[k];
  if (!Array.isArray(arr)) return [];
  return arr;
}
