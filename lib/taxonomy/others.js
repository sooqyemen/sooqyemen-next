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

export const MOTORCYCLE_BRANDS = [
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'yamaha', label: 'ياماها', aliases: ['yamaha', 'ياماها'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },
  { key: 'bajaj', label: 'باجاج', aliases: ['bajaj', 'باجاج'] },
  { key: 'tvs', label: 'TVS', aliases: ['tvs'] },
  { key: 'ktm', label: 'KTM', aliases: ['ktm'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

// ===== Normalizers / Detectors / Labels =====
function makeHelpers(items) {
  return {
    normalize: (v) => matchKeyFromValue(v, items) || '',
    detect: (text) => detectKeyFromText(text, items) || '',
    label: (key) => (items.find((x) => x.key === key)?.label || ''),
  };
}

const _electronics = makeHelpers(ELECTRONICS_TYPES);
export const normalizeElectronicsType = _electronics.normalize;
export const detectElectronicsTypeFromText = _electronics.detect;
export const electronicsTypeLabel = _electronics.label;

const _heavy = makeHelpers(HEAVY_EQUIPMENT_TYPES);
export const normalizeHeavyEquipmentType = _heavy.normalize;
export const detectHeavyEquipmentTypeFromText = _heavy.detect;
export const heavyEquipmentTypeLabel = _heavy.label;

const _solar = makeHelpers(SOLAR_TYPES);
export const normalizeSolarType = _solar.normalize;
export const detectSolarTypeFromText = _solar.detect;
export const solarTypeLabel = _solar.label;

const _network = makeHelpers(NETWORK_TYPES);
export const normalizeNetworkType = _network.normalize;
export const detectNetworkTypeFromText = _network.detect;
export const networkTypeLabel = _network.label;

const _maint = makeHelpers(MAINTENANCE_TYPES);
export const normalizeMaintenanceType = _maint.normalize;
export const detectMaintenanceTypeFromText = _maint.detect;
export const maintenanceTypeLabel = _maint.label;

const _furn = makeHelpers(FURNITURE_TYPES);
export const normalizeFurnitureType = _furn.normalize;
export const detectFurnitureTypeFromText = _furn.detect;
export const furnitureTypeLabel = _furn.label;

const _home = makeHelpers(HOME_TOOLS_TYPES);
export const normalizeHomeToolsType = _home.normalize;
export const detectHomeToolsTypeFromText = _home.detect;
export const homeToolsTypeLabel = _home.label;

const _clothes = makeHelpers(CLOTHES_TYPES);
export const normalizeClothesType = _clothes.normalize;
export const detectClothesTypeFromText = _clothes.detect;
export const clothesTypeLabel = _clothes.label;

const _animal = makeHelpers(ANIMAL_TYPES);
export const normalizeAnimalType = _animal.normalize;
export const detectAnimalTypeFromText = _animal.detect;
export const animalTypeLabel = _animal.label;

const _job = makeHelpers(JOB_TYPES);
export const normalizeJobType = _job.normalize;
export const detectJobTypeFromText = _job.detect;
export const jobTypeLabel = _job.label;

const _service = makeHelpers(SERVICE_TYPES);
export const normalizeServiceType = _service.normalize;
export const detectServiceTypeFromText = _service.detect;
export const serviceTypeLabel = _service.label;

const _moto = makeHelpers(MOTORCYCLE_BRANDS);
export const normalizeMotorcycleBrand = _moto.normalize;
export const detectMotorcycleBrandFromText = _moto.detect;
export const motorcycleBrandLabel = _moto.label;
