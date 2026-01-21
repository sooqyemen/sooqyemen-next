// lib/taxonomy/cars.js
import { matchKeyFromValue, detectKeyFromText } from './helpers';

// =========================
// شركات السيارات
// =========================
export const CAR_MAKES = [
  { key: 'toyota', label: 'تويوتا', aliases: ['toyota', 'تويوتا', 'تايوتا'] },
  { key: 'hyundai', label: 'هيونداي', aliases: ['hyundai', 'هيونداي', 'هيونداى'] },
  { key: 'nissan', label: 'نيسان', aliases: ['nissan', 'نيسان'] },
  { key: 'kia', label: 'كيا', aliases: ['kia', 'كيا'] },
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'mazda', label: 'مازدا', aliases: ['mazda', 'مازدا'] },
  { key: 'mitsubishi', label: 'ميتسوبيشي', aliases: ['mitsubishi', 'ميتسوبيشي', 'متسوبيشي'] },
  { key: 'ford', label: 'فورد', aliases: ['ford', 'فورد'] },
  { key: 'chevrolet', label: 'شيفروليه', aliases: ['chevrolet', 'chevy', 'شيفروليه', 'شفروليه'] },
  { key: 'gmc', label: 'جي ام سي', aliases: ['gmc', 'جي ام سي', 'جمس'] },
  { key: 'isuzu', label: 'ايسوزو', aliases: ['isuzu', 'ايسوزو', 'إيسوزو'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },
  { key: 'bmw', label: 'بي ام دبليو', aliases: ['bmw', 'بي ام دبليو'] },
  { key: 'mercedes', label: 'مرسيدس', aliases: ['mercedes', 'benz', 'مرسيدس', 'بنز'] },
  { key: 'lexus', label: 'لكزس', aliases: ['lexus', 'لكزس'] },
  { key: 'jeep', label: 'جيب', aliases: ['jeep', 'جيب'] },
  { key: 'mg', label: 'MG', aliases: ['mg', 'ام جي', 'إم جي'] },
  { key: 'geely', label: 'جيلي', aliases: ['geely', 'جيلي'] },
  { key: 'byd', label: 'BYD', aliases: ['byd', 'بي واي دي'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

// =========================
// موديلات السيارات (هرمي: شركة -> موديلات)
// تقدر توسّعها براحتك لاحقًا بدون ما نكسر شيء.
// =========================
export const CAR_MODELS_BY_MAKE = {
  toyota: [
    { key: 'corolla', label: 'كورولا', aliases: ['corolla', 'كورولا'] },
    { key: 'camry', label: 'كامري', aliases: ['camry', 'كامري'] },
    { key: 'yaris', label: 'يارس', aliases: ['yaris', 'يارس'] },
    { key: 'hilux', label: 'هايلكس', aliases: ['hilux', 'hailux', 'هايلكس', 'هايلوكس'] },
    { key: 'land_cruiser', label: 'لاندكروزر', aliases: ['land cruiser', 'landcruiser', 'لاندكروزر', 'لاند كروزر'] },
    { key: 'prado', label: 'برادو', aliases: ['prado', 'برادو'] },
    { key: 'rav4', label: 'راف 4', aliases: ['rav4', 'راف4', 'راف 4', 'راف فور'] },
    { key: 'fortuner', label: 'فورتشنر', aliases: ['fortuner', 'فورتشنر'] },
    { key: 'avanza', label: 'أفانزا', aliases: ['avanza', 'افانزا', 'أفانزا'] },
  ],

  hyundai: [
    { key: 'accent', label: 'أكسنت', aliases: ['accent', 'اكسنت', 'أكسنت'] },
    { key: 'elantra', label: 'إلنترا', aliases: ['elantra', 'النترا', 'إلنترا', 'الينترا'] },
    { key: 'sonata', label: 'سوناتا', aliases: ['sonata', 'سوناتا'] },
    { key: 'tucson', label: 'توسان', aliases: ['tucson', 'توسان', 'توكسون'] },
    { key: 'santa_fe', label: 'سنتافي', aliases: ['santa fe', 'santafe', 'سنتافي', 'سانتا في'] },
    { key: 'creta', label: 'كريتا', aliases: ['creta', 'كريتا'] },
    { key: 'palisade', label: 'باليسيد', aliases: ['palisade', 'باليسيد'] },
  ],

  nissan: [
    { key: 'sunny', label: 'صني', aliases: ['sunny', 'صني'] },
    { key: 'altima', label: 'التيما', aliases: ['altima', 'التيما'] },
    { key: 'maxima', label: 'ماكسيما', aliases: ['maxima', 'ماكسيما'] },
    { key: 'patrol', label: 'باترول', aliases: ['patrol', 'باترول'] },
    { key: 'navara', label: 'نافارا', aliases: ['navara', 'نافارا'] },
    { key: 'x_trail', label: 'إكس تريل', aliases: ['x-trail', 'x trail', 'إكس تريل', 'اكس تريل'] },
  ],

  kia: [
    { key: 'cerato', label: 'سيراتو', aliases: ['cerato', 'سيراتو'] },
    { key: 'rio', label: 'ريو', aliases: ['rio', 'ريو'] },
    { key: 'optima', label: 'أوبتيما', aliases: ['optima', 'اوبتيما', 'أوبتيما'] },
    { key: 'k5', label: 'K5', aliases: ['k5', 'كي5', 'K5'] },
    { key: 'sportage', label: 'سبورتاج', aliases: ['sportage', 'سبورتاج'] },
    { key: 'sorento', label: 'سورينتو', aliases: ['sorento', 'سورينتو'] },
    { key: 'seltos', label: 'سيلتوس', aliases: ['seltos', 'سيلتوس'] },
  ],

  honda: [
    { key: 'civic', label: 'سيفيك', aliases: ['civic', 'سيفيك'] },
    { key: 'accord', label: 'أكورد', aliases: ['accord', 'اكورد', 'أكورد'] },
    { key: 'crv', label: 'CR-V', aliases: ['crv', 'cr-v', 'CRV', 'سي ار في'] },
  ],

  mazda: [
    { key: 'mazda3', label: 'مازدا 3', aliases: ['mazda 3', 'mazda3', 'مازدا3', 'مازدا 3'] },
    { key: 'cx5', label: 'CX-5', aliases: ['cx5', 'cx-5', 'CX5', 'سي اكس 5'] },
  ],

  mitsubishi: [
    { key: 'lancer', label: 'لانسر', aliases: ['lancer', 'لانسر'] },
    { key: 'pajero', label: 'باجيرو', aliases: ['pajero', 'باجيرو'] },
    { key: 'outlander', label: 'أوتلاندر', aliases: ['outlander', 'اوتلاندر', 'أوتلاندر'] },
    { key: 'l200', label: 'L200', aliases: ['l200', 'L200', 'ال200'] },
  ],

  ford: [
    { key: 'f150', label: 'F-150', aliases: ['f150', 'f-150', 'F150', 'اف 150'] },
    { key: 'explorer', label: 'إكسبلورر', aliases: ['explorer', 'اكسبلورر', 'إكسبلورر'] },
    { key: 'ranger', label: 'رينجر', aliases: ['ranger', 'رينجر'] },
  ],

  chevrolet: [
    { key: 'tahoe', label: 'تاهو', aliases: ['tahoe', 'تاهو'] },
    { key: 'suburban', label: 'سوبربان', aliases: ['suburban', 'سوبربان'] },
    { key: 'silverado', label: 'سلفرادو', aliases: ['silverado', 'سلفرادو'] },
    { key: 'camaro', label: 'كامارو', aliases: ['camaro', 'كامارو'] },
  ],

  gmc: [
    { key: 'yukon', label: 'يوكن', aliases: ['yukon', 'يوكن', 'يوكون'] },
    { key: 'sierra', label: 'سييرا', aliases: ['sierra', 'سييرا'] },
  ],

  isuzu: [
    { key: 'dmax', label: 'دي-ماكس', aliases: ['dmax', 'd-max', 'ديماكس', 'دي-ماكس'] },
    { key: 'mux', label: 'MU-X', aliases: ['mux', 'mu-x', 'MU-X', 'ام يو اكس'] },
  ],

  suzuki: [
    { key: 'swift', label: 'سويفت', aliases: ['swift', 'سويفت'] },
    { key: 'vitara', label: 'فيتارا', aliases: ['vitara', 'فيتارا'] },
    { key: 'jimny', label: 'جيمني', aliases: ['jimny', 'جيمني'] },
  ],

  bmw: [
    { key: 'x5', label: 'X5', aliases: ['x5', 'X5'] },
    { key: 'x3', label: 'X3', aliases: ['x3', 'X3'] },
    { key: 'series3', label: 'الفئة الثالثة', aliases: ['3 series', '3-series', 'الفئة الثالثة', 'سيريس 3'] },
  ],

  mercedes: [
    { key: 'c_class', label: 'C-Class', aliases: ['c class', 'c-class', 'سي كلاس', 'C200', 'C180'] },
    { key: 'e_class', label: 'E-Class', aliases: ['e class', 'e-class', 'اي كلاس', 'E200', 'E300'] },
    { key: 'g_class', label: 'G-Class', aliases: ['g class', 'g-class', 'جي كلاس', 'G500', 'G63'] },
  ],

  lexus: [
    { key: 'es', label: 'ES', aliases: ['lexus es', 'ES', 'اي اس', 'إي إس'] },
    { key: 'ls', label: 'LS', aliases: ['lexus ls', 'LS', 'ال اس', 'إل إس'] },
    { key: 'lx', label: 'LX', aliases: ['lexus lx', 'LX', 'ال اكس', 'إل إكس'] },
  ],

  jeep: [
    { key: 'wrangler', label: 'رانجلر', aliases: ['wrangler', 'رانجلر'] },
    { key: 'grand_cherokee', label: 'جراند شيروكي', aliases: ['grand cherokee', 'جراند شيروكي', 'شيروكي'] },
  ],

  mg: [
    { key: 'zs', label: 'ZS', aliases: ['zs', 'ZS'] },
    { key: 'hs', label: 'HS', aliases: ['hs', 'HS'] },
    { key: '5', label: 'MG5', aliases: ['mg5', 'MG5', 'ام جي 5', 'إم جي 5'] },
  ],

  geely: [
    { key: 'coolray', label: 'كولراي', aliases: ['coolray', 'كولراي'] },
    { key: 'emgrand', label: 'امجراند', aliases: ['emgrand', 'امجراند', 'إمجراند'] },
  ],

  byd: [
    { key: 'atto3', label: 'Atto 3', aliases: ['atto 3', 'atto3', 'Atto3', 'أتو 3'] },
    { key: 'seal', label: 'Seal', aliases: ['seal', 'سيل'] },
    { key: 'song', label: 'Song', aliases: ['song', 'سونغ'] },
  ],
};

// =========================
// Normalize / Detect - Make
// =========================
export function normalizeCarMake(v) {
  return matchKeyFromValue(v, CAR_MAKES) || '';
}

export function detectCarMakeFromText(text) {
  return detectKeyFromText(text, CAR_MAKES) || '';
}

export function carMakeLabel(key) {
  const it = CAR_MAKES.find((x) => x.key === key);
  return it ? it.label : '';
}

// =========================
// Normalize / Detect - Model (depends on make)
// =========================
export function getCarModelsByMake(makeKey) {
  const mk = normalizeCarMake(makeKey);
  return CAR_MODELS_BY_MAKE[mk] || [];
}

export function normalizeCarModel(makeKey, v) {
  const models = getCarModelsByMake(makeKey);
  return matchKeyFromValue(v, models) || '';
}

export function detectCarModelFromText(makeKey, text) {
  const models = getCarModelsByMake(makeKey);
  return detectKeyFromText(text, models) || '';
}

export function carModelLabel(makeKey, modelKey) {
  const models = getCarModelsByMake(makeKey);
  const it = models.find((x) => x.key === modelKey);
  return it ? it.label : '';
}

// =========================
// Options helpers (UI)
// =========================
export function getCarMakeOptions() {
  // استبعاد "أخرى" لو تبغاها آخر خيار — هنا نخليها عادي ضمن القائمة
  return CAR_MAKES.map((m) => ({ value: m.key, label: m.label }));
}

export function getCarModelOptions(makeKey) {
  const models = getCarModelsByMake(makeKey);
  return models.map((m) => ({ value: m.key, label: m.label }));
}
