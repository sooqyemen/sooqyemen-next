// lib/taxonomy/others.js
// تصنيفات إضافية (Seed) قابلة للتوسع حسب السوق اليمني.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

export const ELECTRONICS_TYPES = [
  { key: 'laptop', label: 'لابتوب', aliases: ['laptop', 'لابتوب', 'لاب توب', 'notebook'] },
  { key: 'desktop', label: 'كمبيوتر مكتبي', aliases: ['desktop', 'pc', 'كمبيوتر', 'حاسوب'] },
  { key: 'tablet', label: 'تابلت', aliases: ['tablet', 'تابلت', 'آيباد', 'ipad'] },
  { key: 'tv', label: 'تلفزيون/شاشة', aliases: ['tv', 'شاشة', 'تلفزيون', 'سمارت'] },
  { key: 'camera', label: 'كاميرا', aliases: ['camera', 'كاميرا', 'canon', 'nikon', 'sony'] },
  { key: 'gaming', label: 'ألعاب/بلايستيشن', aliases: ['playstation', 'ps', 'xbox', 'gaming', 'بلايستيشن'] },
  { key: 'printer', label: 'طابعة', aliases: ['printer', 'طابعة'] },
  { key: 'audio', label: 'صوتيات', aliases: ['speaker', 'audio', 'صوت', 'سماعات'] },
  { key: 'accessories', label: 'إكسسوارات', aliases: ['accessories', 'اكسسوارات', 'إكسسوارات', 'شاحن', 'كيابل'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const HEAVY_EQUIPMENT_TYPES = [
  { key: 'excavator', label: 'حفّار', aliases: ['excavator', 'حفار', 'بوكلين'] },
  { key: 'loader', label: 'شيول/لودر', aliases: ['loader', 'شيول', 'لودر'] },
  { key: 'bulldozer', label: 'بلدوزر', aliases: ['bulldozer', 'بلدوزر'] },
  { key: 'crane', label: 'كرين', aliases: ['crane', 'كرين', 'ونش'] },
  { key: 'forklift', label: 'فوركلفت', aliases: ['forklift', 'رافعة شوكية', 'فوركلفت'] },
  { key: 'dump_truck', label: 'قلاب', aliases: ['dump', 'قلاب'] },
  { key: 'generator', label: 'مولّد', aliases: ['generator', 'مولد', 'مولّد'] },
  { key: 'tractor', label: 'جرّار', aliases: ['tractor', 'جرار', 'تركتور'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const SOLAR_TYPES = [
  { key: 'panels', label: 'ألواح شمسية', aliases: ['panels', 'panel', 'ألواح', 'لوح'] },
  { key: 'inverter', label: 'انفرتر', aliases: ['inverter', 'انفرتر', 'محول'] },
  { key: 'batteries', label: 'بطاريات', aliases: ['battery', 'batteries', 'بطارية', 'بطاريات'] },
  { key: 'controller', label: 'منظم شحن', aliases: ['controller', 'منظم', 'regulator'] },
  { key: 'solar_pump', label: 'مضخة/غطاس شمسي', aliases: ['pump', 'مضخة', 'غطاس'] },
  { key: 'installation', label: 'تركيب وصيانة', aliases: ['installation', 'تركيب', 'صيانة'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const NETWORK_TYPES = [
  { key: 'router', label: 'راوتر', aliases: ['router', 'راوتر'] },
  { key: 'access_point', label: 'أكسس بوينت', aliases: ['access point', 'access_point', 'اكسس', 'أكسس'] },
  { key: 'switch', label: 'سويتش', aliases: ['switch', 'سويتش'] },
  { key: 'cameras', label: 'كاميرات مراقبة', aliases: ['camera', 'cctv', 'كاميرات', 'مراقبة'] },
  { key: 'nvr_dvr', label: 'NVR/DVR', aliases: ['nvr', 'dvr'] },
  { key: 'fiber', label: 'فايبر/تمديدات', aliases: ['fiber', 'فايبر', 'تمديدات'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const MAINTENANCE_TYPES = [
  { key: 'electricity', label: 'كهرباء', aliases: ['electric', 'كهرباء'] },
  { key: 'plumbing', label: 'سباكة', aliases: ['plumbing', 'سباكة'] },
  { key: 'ac', label: 'تكييف', aliases: ['ac', 'air condition', 'مكيف', 'تكييف'] },
  { key: 'car', label: 'صيانة سيارات', aliases: ['car service', 'ميكانيك', 'سمكرة', 'صيانة سيارات'] },
  { key: 'devices', label: 'صيانة أجهزة', aliases: ['repair', 'صيانة', 'أجهزة'] },
  { key: 'phones', label: 'صيانة جوالات', aliases: ['phones', 'جوالات', 'صيانة جوالات'] },
  { key: 'building', label: 'ترميم وبناء', aliases: ['building', 'ترميم', 'بناء'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const FURNITURE_TYPES = [
  { key: 'living', label: 'مجلس/كنب', aliases: ['living', 'كنب', 'مجلس'] },
  { key: 'bedroom', label: 'غرف نوم', aliases: ['bedroom', 'غرفة نوم', 'غرف نوم'] },
  { key: 'dining', label: 'سفرة', aliases: ['dining', 'سفرة', 'طاولة'] },
  { key: 'office', label: 'أثاث مكتبي', aliases: ['office', 'مكتبي', 'مكتب'] },
  { key: 'carpets', label: 'سجاد', aliases: ['carpet', 'سجاد'] },
  { key: 'curtains', label: 'ستائر', aliases: ['curtain', 'ستائر'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const HOME_TOOLS_TYPES = [
  { key: 'kitchen', label: 'مطبخ', aliases: ['kitchen', 'مطبخ'] },
  { key: 'appliances', label: 'أجهزة منزلية', aliases: ['appliance', 'ثلاجة', 'غسالة', 'فرن'] },
  { key: 'cleaning', label: 'تنظيف', aliases: ['cleaning', 'تنظيف'] },
  { key: 'tools', label: 'عدة/أدوات', aliases: ['tools', 'عدة', 'ادوات', 'أدوات'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const CLOTHES_TYPES = [
  { key: 'men', label: 'رجالي', aliases: ['men', 'رجالي'] },
  { key: 'women', label: 'نسائي', aliases: ['women', 'نسائي'] },
  { key: 'kids', label: 'أطفال', aliases: ['kids', 'أطفال', 'اطفال'] },
  { key: 'shoes', label: 'أحذية', aliases: ['shoes', 'حذاء', 'أحذية'] },
  { key: 'bags', label: 'شنط', aliases: ['bags', 'شنط', 'شنطة'] },
  { key: 'accessories', label: 'إكسسوارات', aliases: ['accessories', 'اكسسوارات', 'إكسسوارات'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const ANIMAL_TYPES = [
  { key: 'sheep', label: 'غنم', aliases: ['sheep', 'غنم'] },
  { key: 'goats', label: 'ماعز', aliases: ['goat', 'goats', 'ماعز'] },
  { key: 'cows', label: 'أبقار', aliases: ['cow', 'cows', 'بقر', 'أبقار'] },
  { key: 'camels', label: 'إبل', aliases: ['camel', 'camels', 'جمل', 'إبل'] },
  { key: 'poultry', label: 'دواجن', aliases: ['poultry', 'دواجن'] },
  { key: 'birds', label: 'طيور', aliases: ['birds', 'طيور'] },
  { key: 'cats', label: 'قطط', aliases: ['cats', 'cat', 'قطط', 'قطة'] },
  { key: 'dogs', label: 'كلاب', aliases: ['dogs', 'dog', 'كلاب', 'كلب'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const JOB_TYPES = [
  { key: 'sales', label: 'مبيعات', aliases: ['sales', 'مبيعات'] },
  { key: 'accounting', label: 'محاسبة', aliases: ['accounting', 'محاسب', 'محاسبة'] },
  { key: 'it', label: 'تقنية/IT', aliases: ['it', 'developer', 'مبرمج', 'تقنية'] },
  { key: 'engineering', label: 'هندسة', aliases: ['engineering', 'مهندس', 'هندسة'] },
  { key: 'driver', label: 'سائق', aliases: ['driver', 'سائق'] },
  { key: 'admin', label: 'إداري', aliases: ['admin', 'إداري', 'اداري'] },
  { key: 'hospitality', label: 'مطاعم/فنادق', aliases: ['restaurant', 'hotel', 'مطعم', 'فندق'] },
  { key: 'construction', label: 'مقاولات/بناء', aliases: ['construction', 'مقاولات', 'بناء'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export const SERVICE_TYPES = [
  { key: 'transport', label: 'نقل/شحن', aliases: ['transport', 'shipping', 'نقل', 'شحن'] },
  { key: 'cleaning', label: 'تنظيف', aliases: ['cleaning', 'تنظيف'] },
  { key: 'design', label: 'تصميم', aliases: ['design', 'تصميم'] },
  { key: 'programming', label: 'برمجة', aliases: ['programming', 'برمجة', 'developer'] },
  { key: 'marketing', label: 'تسويق', aliases: ['marketing', 'تسويق'] },
  { key: 'photography', label: 'تصوير', aliases: ['photo', 'photography', 'تصوير'] },
  { key: 'teaching', label: 'تعليم/تدريب', aliases: ['teaching', 'training', 'تعليم', 'تدريب'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

// =========================
// Helpers: normalization / detection / labels
// =========================

const _norm = (v) => String(v || '').trim().toLowerCase();

const _flatten = (v) =>
  _norm(v)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const _findByKeyOrAlias = (list, value) => {
  const v = _flatten(value);
  if (!v) return null;

  // direct key
  const direct = list.find((x) => _norm(x.key) === v);
  if (direct) return direct;

  // label match
  const byLabel = list.find((x) => _flatten(x.label) === v);
  if (byLabel) return byLabel;

  // aliases
  for (const x of list) {
    const aliases = Array.isArray(x.aliases) ? x.aliases : [];
    for (const a of aliases) {
      if (_flatten(a) === v) return x;
    }
  }
  return null;
};

const _detectFromText = (list, text) => {
  const t = _flatten(text);
  if (!t) return null;

  // prefer longer aliases first
  const entries = [];
  for (const x of list) {
    const aliases = new Set([x.label, x.key, ...(Array.isArray(x.aliases) ? x.aliases : [])]);
    for (const a of aliases) {
      const aa = _flatten(a);
      if (aa) entries.push([aa, x]);
    }
  }
  entries.sort((a, b) => b[0].length - a[0].length);

  for (const [a, x] of entries) {
    if (a && t.includes(a)) return x;
  }
  return null;
};

const _labelFor = (list, key) => {
  const k = _norm(key);
  if (!k) return '';
  const x = list.find((i) => _norm(i.key) === k);
  return x ? x.label : key;
};

// ---------- Electronics ----------
export function normalizeElectronicsType(value) {
  const x = _findByKeyOrAlias(ELECTRONICS_TYPES, value);
  return x ? x.key : '';
}
export function detectElectronicsTypeFromText(text) {
  const x = _detectFromText(ELECTRONICS_TYPES, text);
  return x ? x.key : '';
}
export function electronicsTypeLabel(key) {
  return _labelFor(ELECTRONICS_TYPES, key);
}

// ---------- Heavy Equipment ----------
export function normalizeHeavyEquipmentType(value) {
  const x = _findByKeyOrAlias(HEAVY_EQUIPMENT_TYPES, value);
  return x ? x.key : '';
}
export function detectHeavyEquipmentTypeFromText(text) {
  const x = _detectFromText(HEAVY_EQUIPMENT_TYPES, text);
  return x ? x.key : '';
}
export function heavyEquipmentTypeLabel(key) {
  return _labelFor(HEAVY_EQUIPMENT_TYPES, key);
}

// ---------- Solar ----------
export function normalizeSolarType(value) {
  const x = _findByKeyOrAlias(SOLAR_TYPES, value);
  return x ? x.key : '';
}
export function detectSolarTypeFromText(text) {
  const x = _detectFromText(SOLAR_TYPES, text);
  return x ? x.key : '';
}
export function solarTypeLabel(key) {
  return _labelFor(SOLAR_TYPES, key);
}

// ---------- Networks ----------
export function normalizeNetworkType(value) {
  const x = _findByKeyOrAlias(NETWORK_TYPES, value);
  return x ? x.key : '';
}
export function detectNetworkTypeFromText(text) {
  const x = _detectFromText(NETWORK_TYPES, text);
  return x ? x.key : '';
}
export function networkTypeLabel(key) {
  return _labelFor(NETWORK_TYPES, key);
}

// ---------- Maintenance ----------
export function normalizeMaintenanceType(value) {
  const x = _findByKeyOrAlias(MAINTENANCE_TYPES, value);
  return x ? x.key : '';
}
export function detectMaintenanceTypeFromText(text) {
  const x = _detectFromText(MAINTENANCE_TYPES, text);
  return x ? x.key : '';
}
export function maintenanceTypeLabel(key) {
  return _labelFor(MAINTENANCE_TYPES, key);
}

// ---------- Furniture ----------
export function normalizeFurnitureType(value) {
  const x = _findByKeyOrAlias(FURNITURE_TYPES, value);
  return x ? x.key : '';
}
export function detectFurnitureTypeFromText(text) {
  const x = _detectFromText(FURNITURE_TYPES, text);
  return x ? x.key : '';
}
export function furnitureTypeLabel(key) {
  return _labelFor(FURNITURE_TYPES, key);
}

// ---------- Home Tools ----------
export function normalizeHomeToolsType(value) {
  const x = _findByKeyOrAlias(HOME_TOOLS_TYPES, value);
  return x ? x.key : '';
}
export function detectHomeToolsTypeFromText(text) {
  const x = _detectFromText(HOME_TOOLS_TYPES, text);
  return x ? x.key : '';
}
export function homeToolsTypeLabel(key) {
  return _labelFor(HOME_TOOLS_TYPES, key);
}

// ---------- Clothes ----------
export function normalizeClothesType(value) {
  const x = _findByKeyOrAlias(CLOTHES_TYPES, value);
  return x ? x.key : '';
}
export function detectClothesTypeFromText(text) {
  const x = _detectFromText(CLOTHES_TYPES, text);
  return x ? x.key : '';
}
export function clothesTypeLabel(key) {
  return _labelFor(CLOTHES_TYPES, key);
}

// ---------- Animals ----------
export function normalizeAnimalType(value) {
  const x = _findByKeyOrAlias(ANIMAL_TYPES, value);
  return x ? x.key : '';
}
export function detectAnimalTypeFromText(text) {
  const x = _detectFromText(ANIMAL_TYPES, text);
  return x ? x.key : '';
}
export function animalTypeLabel(key) {
  return _labelFor(ANIMAL_TYPES, key);
}

// ---------- Jobs ----------
export function normalizeJobType(value) {
  const x = _findByKeyOrAlias(JOB_TYPES, value);
  return x ? x.key : '';
}
export function detectJobTypeFromText(text) {
  const x = _detectFromText(JOB_TYPES, text);
  return x ? x.key : '';
}
export function jobTypeLabel(key) {
  return _labelFor(JOB_TYPES, key);
}

// ---------- Services ----------
export function normalizeServiceType(value) {
  const x = _findByKeyOrAlias(SERVICE_TYPES, value);
  return x ? x.key : '';
}
export function detectServiceTypeFromText(text) {
  const x = _detectFromText(SERVICE_TYPES, text);
  return x ? x.key : '';
}
export function serviceTypeLabel(key) {
  return _labelFor(SERVICE_TYPES, key);
}


