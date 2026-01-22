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
  // أنظمة جاهزة
  { key: 'systems_complete', label: 'أنظمة طاقة شمسية متكاملة', aliases: ['system', 'systems', 'kit', 'انظمة', 'أنظمة', 'منظومة', 'منظومات', 'طقم طاقة', 'طقم شمسي', 'طاقه شمسيه'] },
  { key: 'home_systems', label: 'أنظمة منزلية', aliases: ['home system', 'منزل', 'بيت', 'منزلي', 'منزلية'] },
  { key: 'shop_systems', label: 'أنظمة للمحلات', aliases: ['shop', 'محل', 'محلات', 'تجاري', 'تجارية'] },
  { key: 'farm_systems', label: 'أنظمة مزارع وآبار', aliases: ['farm', 'مزرعة', 'مزارع', 'بئر', 'آبار', 'ري', 'زراعة'] },
  { key: 'portable_kits', label: 'طاقة شمسية متنقلة', aliases: ['portable', 'متنقل', 'متنقلة', 'شنطة', 'حقيبة', 'power station', 'باورستيشن'] },

  // الألواح والحوامل
  { key: 'panels', label: 'ألواح شمسية', aliases: ['panels', 'panel', 'solar panel', 'ألواح', 'لوح', 'شمسي'] },
  { key: 'panel_mounts', label: 'حوامل وقواعد ألواح', aliases: ['mount', 'mounts', 'stand', 'rack', 'قواعد', 'حوامل', 'هيكل', 'ستاند'] },

  // البطاريات
  { key: 'batteries', label: 'بطاريات طاقة شمسية', aliases: ['battery', 'batteries', 'بطارية', 'بطاريات', 'بطاريات طاقة'] },
  { key: 'battery_lithium', label: 'بطاريات ليثيوم', aliases: ['lithium', 'lifepo4', 'ليثيوم', 'ليفبو4', 'LiFePO4'] },
  { key: 'battery_gel', label: 'بطاريات جل', aliases: ['gel', 'جل'] },
  { key: 'battery_agm', label: 'بطاريات AGM', aliases: ['agm', 'AGM'] },
  { key: 'battery_flooded', label: 'بطاريات سائلة', aliases: ['flooded', 'سائلة', 'حامض', 'acid', 'lead acid'] },
  { key: 'battery_racks', label: 'رفوف/حوامل بطاريات', aliases: ['rack', 'racks', 'رفوف', 'حوامل بطاريات'] },
  { key: 'battery_accessories', label: 'إكسسوارات البطاريات', aliases: ['terminal', 'terminals', 'أقطاب', 'وصلات بطارية', 'كابلات بطارية', 'battery cables'] },

  // الانفرترات والمنظمات والشواحن
  { key: 'inverters', label: 'انفرترات / محولات', aliases: ['inverter', 'انفرتر', 'محول', 'محولات', 'UPS'] },
  { key: 'inverter_hybrid', label: 'انفرتر هايبرد', aliases: ['hybrid', 'هايبرد', 'هجين'] },
  { key: 'inverter_pure_sine', label: 'انفرتر موجة صافية', aliases: ['pure sine', 'موجه صافية', 'موجة صافية', 'sine wave'] },
  { key: 'charge_controllers', label: 'منظمات شحن', aliases: ['controller', 'controllers', 'منظم', 'منظمات', 'regulator', 'شاحن شمسي'] },
  { key: 'mppt', label: 'منظم MPPT', aliases: ['mppt', 'MPPT'] },
  { key: 'pwm', label: 'منظم PWM', aliases: ['pwm', 'PWM'] },
  { key: 'battery_chargers', label: 'شواحن بطاريات', aliases: ['charger', 'chargers', 'شاحن', 'شواحن', 'شاحن بطارية'] },

  // الكابلات والحماية والتوزيع
  { key: 'cables', label: 'كيابل وأسلاك', aliases: ['cable', 'cables', 'wire', 'wires', 'كيبل', 'كيابل', 'سلك', 'أسلاك'] },
  { key: 'mc4_connectors', label: 'وصلات MC4', aliases: ['mc4', 'MC4', 'connector', 'connectors', 'وصلة', 'وصلات'] },
  { key: 'combiner_boxes', label: 'صناديق تجميع (Combiner Box)', aliases: ['combiner', 'combiner box', 'صندوق تجميع', 'صناديق تجميع'] },
  { key: 'breakers_fuses', label: 'قواطع وفيوزات', aliases: ['breaker', 'breakers', 'fuse', 'fuses', 'قاطع', 'قواطع', 'فيوز', 'فيوزات'] },
  { key: 'surge_protection', label: 'حماية صواعق/Surge', aliases: ['surge', 'spd', 'صواعق', 'حماية', 'مانع صواعق'] },
  { key: 'distribution_boards', label: 'لوحات توزيع', aliases: ['distribution', 'panel board', 'لوحة توزيع', 'لوحات توزيع'] },
  { key: 'meters_monitors', label: 'عدادات وقياس ومراقبة', aliases: ['meter', 'meters', 'monitor', 'monitoring', 'عداد', 'عدادات', 'قياس', 'فولت', 'أمبير'] },

  // إنارة شمسية
  { key: 'solar_lights', label: 'إنارة شمسية', aliases: ['solar light', 'lights', 'إنارة', 'لمبات شمسية', 'إنارة شمسية'] },
  { key: 'street_lights', label: 'لمبات شارع شمسية', aliases: ['street light', 'شارع', 'إنارة شارع', 'كشاف شارع'] },
  { key: 'flood_lights', label: 'كشافات شمسية', aliases: ['flood light', 'كشاف', 'كشافات', 'ليد'] },
  { key: 'garden_lights', label: 'إنارة حدائق شمسية', aliases: ['garden', 'حديقة', 'حدائق'] },
  { key: 'led_bulbs', label: 'لمبات LED (12/24 فولت)', aliases: ['led', 'لمبة', 'لمبات', '12v', '24v', 'دي سي', 'dc'] },

  // أجهزة تعمل على الطاقة
  { key: 'solar_fans', label: 'مراوح على الطاقة الشمسية', aliases: ['fan', 'fans', 'مروحة', 'مراوح', 'مروحة شمسية'] },
  { key: 'solar_fridges', label: 'ثلاجات/فريزرات على الطاقة', aliases: ['fridge', 'freezer', 'ثلاجة', 'فريزر', 'تبريد'] },
  { key: 'solar_tvs', label: 'شاشات/تلفزيون على الطاقة', aliases: ['tv', 'screen', 'شاشة', 'تلفزيون'] },
  { key: 'solar_pumps', label: 'مضخات مياه شمسية (غطاسات/سطحية)', aliases: ['pump', 'pumps', 'مضخة', 'مضخات', 'غطاس', 'غطاسات', 'ري'] },
  { key: 'water_heaters', label: 'سخانات مياه شمسية', aliases: ['heater', 'سخان', 'سخانات', 'ماء ساخن'] },

  // تخزين طاقة
  { key: 'power_stations', label: 'باورستيشن / محطة طاقة', aliases: ['power station', 'powerstation', 'باورستيشن', 'محطة طاقة'] },
  { key: 'power_banks', label: 'باور بنك/شواحن متنقلة', aliases: ['power bank', 'باور بنك', 'شاحن متنقل'] },

  // خدمات وقطع غيار
  { key: 'installation', label: 'تركيب', aliases: ['installation', 'install', 'تركيب', 'تركيب منظومة'] },
  { key: 'maintenance', label: 'صيانة وإصلاح', aliases: ['maintenance', 'repair', 'صيانة', 'تصليح', 'إصلاح'] },
  { key: 'spare_parts', label: 'قطع غيار وإكسسوارات', aliases: ['spare', 'parts', 'قطع', 'قطع غيار', 'اكسسوارات', 'إكسسوارات'] },

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
  // مجالس وكُنَب
  { key: 'sofas', label: 'كنب (أطقم كنب)', aliases: ['sofa', 'sofas', 'كنب', 'طقم كنب', 'أطقم'] },
  { key: 'arab_majlis', label: 'مجالس عربية', aliases: ['majlis', 'مجالس', 'مجلس عربي', 'عربي', 'جلسات عربية'] },
  { key: 'floor_seating', label: 'جلسات أرضية / فرش مجلس', aliases: ['floor', 'أرضي', 'فرش', 'فرش مجلس', 'جلسة أرضية'] },
  { key: 'cushions', label: 'مساند ومخدات (وسائد)', aliases: ['cushion', 'cushions', 'وسائد', 'مخدات', 'مساند'] },
  { key: 'chairs', label: 'كراسي', aliases: ['chair', 'chairs', 'كرسي', 'كراسي'] },

  // غرف النوم
  { key: 'bedrooms', label: 'غرف نوم كاملة', aliases: ['bedroom', 'bedrooms', 'غرفة نوم', 'غرف نوم'] },
  { key: 'beds', label: 'سرائر / تخت', aliases: ['bed', 'beds', 'تخت', 'سرير', 'سراير'] },
  { key: 'mattresses', label: 'مراتب', aliases: ['mattress', 'mattresses', 'مرتبة', 'مراتب'] },
  { key: 'wardrobes', label: 'دواليب ملابس', aliases: ['wardrobe', 'closet', 'دولاب', 'دواليب'] },
  { key: 'dressers', label: 'تسريحة/كومود/دُرج', aliases: ['dresser', 'تسريحة', 'كومود', 'دُرج', 'ادراج'] },

  // سفرة وصالات
  { key: 'dining_sets', label: 'طقم سفرة / طاولات طعام', aliases: ['dining', 'سفرة', 'طاولة طعام', 'طقم سفرة'] },
  { key: 'tables', label: 'طاولات (وسط/جانبية)', aliases: ['table', 'tables', 'طاولة', 'طاولات', 'ترابيزة'] },
  { key: 'tv_units', label: 'طاولات تلفزيون / وحدات TV', aliases: ['tv unit', 'شاشة', 'طاولة تلفزيون', 'وحدة تلفزيون'] },

  // مكتبي وتخزين
  { key: 'office_furniture', label: 'أثاث مكتبي', aliases: ['office', 'مكتبي', 'أثاث مكتبي'] },
  { key: 'desks', label: 'مكاتب', aliases: ['desk', 'desks', 'مكتب', 'مكاتب'] },
  { key: 'bookcases', label: 'مكتبات/رفوف', aliases: ['bookcase', 'shelf', 'رفوف', 'مكتبة'] },
  { key: 'cabinets', label: 'خزائن/دواليب تخزين', aliases: ['cabinet', 'خزانة', 'خزائن', 'دواليب تخزين'] },

  // مفارش وستائر وسجاد
  { key: 'curtains', label: 'ستائر', aliases: ['curtain', 'curtains', 'ستارة', 'ستائر'] },
  { key: 'carpets', label: 'سجاد', aliases: ['carpet', 'carpets', 'سجاد'] },
  { key: 'rugs', label: 'موكيت/زوالي/فرش أرضي', aliases: ['rug', 'rugs', 'موكيت', 'زوالي', 'فرش أرضي'] },
  { key: 'bedspreads', label: 'مفارش', aliases: ['bedspread', 'bedspreads', 'مفرش', 'مفارش'] },
  { key: 'blankets', label: 'بطانيات', aliases: ['blanket', 'blankets', 'بطانية', 'بطانيات'] },
  { key: 'pillows', label: 'مخدات/وسائد', aliases: ['pillow', 'pillows', 'مخدة', 'مخدات', 'وسادة', 'وسائد'] },

  // مطابخ/تفصيل
  { key: 'kitchen_units', label: 'مطابخ/دواليب مطبخ', aliases: ['kitchen', 'مطابخ', 'دولاب مطبخ', 'خزائن مطبخ'] },
  { key: 'doors_windows', label: 'أبواب/نوافذ', aliases: ['door', 'doors', 'window', 'windows', 'باب', 'أبواب', 'نافذة', 'نوافذ'] },
  { key: 'custom_upholstery', label: 'تفصيل وتنجيد', aliases: ['upholstery', 'تنجيد', 'تفصيل', 'تنجييد', 'تخييط'] },

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
  // فئات عامة
  { key: 'men', label: 'ملابس رجالية', aliases: ['men', 'رجالي', 'رجالية'] },
  { key: 'women', label: 'ملابس نسائية', aliases: ['women', 'نسائي', 'نسائية', 'حريم'] },
  { key: 'boys', label: 'ملابس ولادي (أولاد)', aliases: ['boys', 'ولد', 'ولادي', 'أولاد', 'اولاد'] },
  { key: 'girls', label: 'ملابس بناتي (بنات)', aliases: ['girls', 'بناتي', 'بنات', 'بنت'] },
  { key: 'youth', label: 'شبابي', aliases: ['youth', 'شباب', 'شبابي'] },
  { key: 'babies', label: 'مواليد/رضّع', aliases: ['baby', 'babies', 'مواليد', 'رضع', 'رضيع'] },

  // رجالي
  { key: 'men_thobes', label: 'ثياب رجالية', aliases: ['thobe', 'ثوب', 'ثياب', 'ثياب رجالي'] },
  { key: 'men_shirts', label: 'قمصان رجالية', aliases: ['shirt', 'shirts', 'قميص', 'قمصان'] },
  { key: 'men_pants', label: 'بناطيل رجالية', aliases: ['pants', 'بنطلون', 'بناطيل', 'جينز'] },
  { key: 'men_jackets', label: 'جاكيتات/معاطف رجالية', aliases: ['jacket', 'coat', 'جاكيت', 'معطف'] },
  { key: 'men_sportswear', label: 'ملابس رياضية رجالية', aliases: ['sports', 'رياضي', 'بدلة رياضية', 'تريننق'] },
  { key: 'men_underwear', label: 'ملابس داخلية رجالية', aliases: ['underwear', 'داخلي', 'ملابس داخلية'] },
  { key: 'men_traditional_futah', label: 'معوز/فوطة (زي يمني)', aliases: ['futah', 'معوز', 'فوطة', 'وزار'] },

  // نسائي
  { key: 'women_abayas', label: 'عبايات', aliases: ['abaya', 'عباية', 'عبايات'] },
  { key: 'women_dresses', label: 'فساتين', aliases: ['dress', 'dresses', 'فستان', 'فساتين'] },
  { key: 'women_blouses', label: 'بلايز/قمصان نسائية', aliases: ['blouse', 'بلوزة', 'بلايز', 'قميص نسائي'] },
  { key: 'women_pants', label: 'بناطيل/تنانير', aliases: ['skirt', 'تنورة', 'تنانير', 'بنطلون نسائي', 'بناطيل نسائي'] },
  { key: 'women_jackets', label: 'جاكيتات/معاطف نسائية', aliases: ['jacket', 'coat', 'جاكيت نسائي', 'معطف نسائي'] },
  { key: 'women_hijab', label: 'حجاب/شيلان/طرح', aliases: ['hijab', 'حجاب', 'شيلة', 'شيلان', 'طرحة', 'طرح'] },
  { key: 'women_niqab', label: 'نقاب/برقع', aliases: ['niqab', 'نقاب', 'برقع'] },
  { key: 'women_sportswear', label: 'ملابس رياضية نسائية', aliases: ['sports', 'رياضي', 'بدلة رياضية نسائي'] },
  { key: 'women_underwear', label: 'ملابس داخلية نسائية', aliases: ['underwear', 'ملابس داخلية نسائي'] },

  // أطفال
  { key: 'kids_sets', label: 'أطقم أطفال', aliases: ['set', 'sets', 'طقم', 'أطقم', 'اطقم'] },
  { key: 'kids_school_uniform', label: 'زي مدرسي', aliases: ['uniform', 'مدرسي', 'زي مدرسي'] },
  { key: 'kids_jackets', label: 'جاكيتات أطفال', aliases: ['kids jacket', 'جاكيت أطفال', 'معطف أطفال'] },
  { key: 'kids_sportswear', label: 'ملابس رياضية أطفال', aliases: ['kids sports', 'رياضي أطفال', 'بدلة رياضية أطفال'] },

  // مناسبات
  { key: 'wedding', label: 'ملابس مناسبات/أعراس', aliases: ['wedding', 'عرس', 'أعراس', 'مناسبات'] },
  { key: 'traditional', label: 'ملابس شعبية/تراثية', aliases: ['traditional', 'تراثي', 'شعبي', 'زي شعبي'] },

  // أحذية وإكسسوارات
  { key: 'shoes', label: 'أحذية', aliases: ['shoes', 'shoe', 'حذاء', 'أحذية', 'نعال', 'صندل'] },
  { key: 'bags', label: 'شنط', aliases: ['bag', 'bags', 'شنطة', 'شنط', 'حقيبة'] },
  { key: 'accessories', label: 'إكسسوارات', aliases: ['accessory', 'accessories', 'إكسسوارات', 'اكسسوارات', 'حزام', 'قبعة', 'نظارة'] },

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
  { key: 'design', label: 'تصميم', aliases: ['design', 'designer', 'تصميم', 'مصمم'] },
  { key: 'marketing', label: 'تسويق', aliases: ['marketing', 'digital marketing', 'تسويق', 'سوشيال ميديا'] },
  { key: 'hr', label: 'موارد بشرية', aliases: ['hr', 'human resources', 'موارد بشرية'] },
  { key: 'admin', label: 'إداري', aliases: ['admin', 'إداري', 'اداري'] },
  { key: 'customer_service', label: 'خدمة عملاء', aliases: ['customer service', 'call center', 'خدمة عملاء', 'كول سنتر'] },
  { key: 'education', label: 'تعليم/تدريس', aliases: ['teacher', 'teaching', 'education', 'تعليم', 'تدريس', 'مدرس'] },
  { key: 'healthcare', label: 'صحة/تمريض', aliases: ['health', 'healthcare', 'nurse', 'طبيب', 'تمريض', 'صحة'] },
  { key: 'driver', label: 'سائق', aliases: ['driver', 'سائق'] },
  { key: 'logistics', label: 'لوجستيات/مخازن', aliases: ['logistics', 'warehouse', 'لوجستيات', 'مخازن'] },
  { key: 'security', label: 'أمن/حراسة', aliases: ['security', 'guard', 'أمن', 'حراسة'] },
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
    label: (key) => {
      if (!key) return '';
      const item = items.find((x) => x.key === key);
      return item?.label ?? '';
    },
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
