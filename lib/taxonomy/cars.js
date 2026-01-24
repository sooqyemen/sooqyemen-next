// lib/taxonomy/cars.js
import { matchKeyFromValue, detectKeyFromText } from './helpers';

// =========================
// شركات السيارات
// =========================
// ملاحظة مهمة:
// - بعض القيم قد تصل بصيغة "تويوتا كامري 2012" أو مع مسافات/وصف إضافي.
// - matchKeyFromValue يطابق التطابق التام غالباً، لذلك نضيف fallback بـ detectKeyFromText
//   لضمان التطبيع حتى لو كانت القيمة تحتوي سنة/وصف.
export const CAR_MAKES = [
  { key: 'toyota', label: 'تويوتا', aliases: ['toyota', 'تويوتا', 'تايوتا', 'tyota'] },
  { key: 'hyundai', label: 'هيونداي', aliases: ['hyundai', 'هيونداي', 'هيونداى', 'هيوندائ'] },
  { key: 'nissan', label: 'نيسان', aliases: ['nissan', 'نيسان'] },
  { key: 'kia', label: 'كيا', aliases: ['kia', 'كيا'] },
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'mazda', label: 'مازدا', aliases: ['mazda', 'مازدا'] },
  { key: 'mitsubishi', label: 'ميتسوبيشي', aliases: ['mitsubishi', 'ميتسوبيشي', 'متسوبيشي', 'متسوبشي'] },
  { key: 'ford', label: 'فورد', aliases: ['ford', 'فورد'] },
  { key: 'chevrolet', label: 'شيفروليه', aliases: ['chevrolet', 'chevy', 'شيفروليه', 'شفروليه', 'شيفرولية'] },
  { key: 'gmc', label: 'جي ام سي', aliases: ['gmc', 'جي ام سي', 'جمس', 'جي امسى'] },
  { key: 'isuzu', label: 'ايسوزو', aliases: ['isuzu', 'ايسوزو', 'إيسوزو', 'ايسزو'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },

  // شائع في اليمن (أوروبي)
  { key: 'volkswagen', label: 'فولكس فاجن', aliases: ['volkswagen', 'vw', 'فولكس', 'فولكس فاجن', 'فولكسفاجن', 'فكس'] },
  { key: 'audi', label: 'اودي', aliases: ['audi', 'اودي', 'أودي'] },
  { key: 'peugeot', label: 'بيجو', aliases: ['peugeot', 'بيجو'] },
  { key: 'renault', label: 'رينو', aliases: ['renault', 'رينو'] },
  { key: 'skoda', label: 'سكودا', aliases: ['skoda', 'سكودا'] },
  { key: 'opel', label: 'اوبل', aliases: ['opel', 'اوبل', 'أوبل'] },

  // شائع في اليمن (آسيوي إضافي)
  { key: 'daihatsu', label: 'دايهاتسو', aliases: ['daihatsu', 'دايهاتسو', 'دايهستو'] },
  { key: 'subaru', label: 'سوبارو', aliases: ['subaru', 'سوبارو'] },
  { key: 'daewoo', label: 'دايو', aliases: ['daewoo', 'daewo', 'دايو', 'دايوو'] },

  // فاخر
  { key: 'bmw', label: 'بي ام دبليو', aliases: ['bmw', 'بي ام دبليو', 'بي ام'] },
  { key: 'mercedes', label: 'مرسيدس', aliases: ['mercedes', 'benz', 'مرسيدس', 'بنز', 'مرسدس'] },
  { key: 'lexus', label: 'لكزس', aliases: ['lexus', 'لكزس'] },
  { key: 'jeep', label: 'جيب', aliases: ['jeep', 'جيب'] },

  // صيني منتشر
  { key: 'mg', label: 'MG', aliases: ['mg', 'ام جي', 'إم جي', 'mg motors'] },
  { key: 'geely', label: 'جيلي', aliases: ['geely', 'جيلي', 'جيلى'] },
  { key: 'byd', label: 'BYD', aliases: ['byd', 'بي واي دي', 'بى واى دى'] },
  { key: 'changan', label: 'شانجان', aliases: ['changan', 'شانجان', 'شنجان'] },
  { key: 'chery', label: 'شيري', aliases: ['chery', 'شيري', 'شيرى'] },
  { key: 'haval', label: 'هافال', aliases: ['haval', 'هافال', 'هفال'] },
  { key: 'jetour', label: 'جيتور', aliases: ['jetour', 'جيتور', 'جي تور'] },
  { key: 'jac', label: 'جاك', aliases: ['jac', 'جاك', 'جك'] },
  { key: 'gac', label: 'GAC', aliases: ['gac', 'جي اي سي', 'جي أي سي', 'GAC'] },
  { key: 'baic', label: 'بايك', aliases: ['baic', 'بايك'] },
  { key: 'dfsk', label: 'DFSK', aliases: ['dfsk', 'دي اف اس كي', 'DFSK'] },
  { key: 'dongfeng', label: 'دونغ فينغ', aliases: ['dongfeng', 'دونغ فينغ', 'دونج فينج', 'دونجفينج'] },
  { key: 'gwm', label: 'جريت وول', aliases: ['gwm', 'great wall', 'جريت وول', 'جريتوال'] },
  { key: 'wuling', label: 'وولينغ', aliases: ['wuling', 'وولينغ', 'وولنج'] },

  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

// =========================
// موديلات السيارات (هرمي: شركة -> موديلات)
// =========================
export const CAR_MODELS_BY_MAKE = {
  toyota: [
    { key: 'corolla', label: 'كورولا', aliases: ['corolla', 'كورولا', 'كرولا', 'كورلا', 'كرولا'] },
    { key: 'camry', label: 'كامري', aliases: ['camry', 'كامري', 'كمري', 'كمرى', 'كامرى', 'كامريه', 'camery'] },
    { key: 'yaris', label: 'يارس', aliases: ['yaris', 'يارس', 'ياريس'] },

    // بيك اب
    { key: 'hilux', label: 'هايلكس', aliases: ['hilux', 'hailux', 'هايلكس', 'هايلوكس', 'هيلكس'] },

    // لاندكروزر
    { key: 'land_cruiser', label: 'لاندكروزر', aliases: ['land cruiser', 'landcruiser', 'لاندكروزر', 'لاند كروزر', 'لاندكروزر v8', 'لاندكروزر 8 سلندر'] },

    // شاص (لاندكروزر 70 - بيك اب)
    // في الخليج/اليمن يتكتب غالباً "شاص" ويقصد LC70 Pickup
    { key: 'shas', label: 'شاص', aliases: ['شاص', 'الشاص', 'شاص تويوتا', 'تويوتا شاص', 'شاص 70', 'شاص70', 'شاص 79', 'شاص79', 'شاص 78', 'land cruiser 70', 'lc70', 'landcruiser 70', 'lc 70', 'pickup lc70'] },

    { key: 'prado', label: 'برادو', aliases: ['prado', 'برادو', 'برادو جي اكس', 'برادو gx', 'prado gx'] },
    { key: 'rav4', label: 'راف 4', aliases: ['rav4', 'راف4', 'راف 4', 'راف فور', 'راففور'] },
    { key: 'fortuner', label: 'فورتشنر', aliases: ['fortuner', 'فورتشنر', 'فورتينر'] },
    { key: 'avanza', label: 'أفانزا', aliases: ['avanza', 'افانزا', 'أفانزا'] },

    // سيارات/فانات شائعة في اليمن
    { key: 'hiace', label: 'هايس', aliases: ['hiace', 'هايس', 'هايس تويوتا', 'تويوتا هايس', 'هاي اس', 'هاياس'] },
    { key: 'coaster', label: 'كوستر', aliases: ['coaster', 'كوستر', 'تويوتا كوستر', 'كوستر باص', 'باص كوستر'] },
    { key: 'dyna', label: 'دينا', aliases: ['dyna', 'دينا', 'داينا', 'تويوتا دينا', 'تويوتا داينا'] },
    { key: 'innova', label: 'إنوفا', aliases: ['innova', 'inova', 'إنوفا', 'انوفا'] },
    { key: 'aurion', label: 'أوريون', aliases: ['aurion', 'أوريون', 'اوريون', 'orion'] },
    { key: 'prius', label: 'بريوس', aliases: ['prius', 'بريوس', 'بريوس هايبرد', 'هايبرد بريوس'] },
    { key: 'c_hr', label: 'C-HR', aliases: ['c-hr', 'chr', 'c hr', 'سي اتش ار', 'سي-اتش-ار'] },
    { key: 'four_runner', label: 'فور رنر', aliases: ['4runner', '4 runner', 'four runner', 'فور رنر', 'فوررنر'] },
  ],

  hyundai: [
    { key: 'accent', label: 'أكسنت', aliases: ['accent', 'اكسنت', 'أكسنت', 'اكسن', 'اكسنت 2012'] },
    { key: 'elantra', label: 'إلنترا', aliases: ['elantra', 'النترا', 'إلنترا', 'الينترا', 'النترا md', 'النترا hd', 'avante', 'افانتي', 'أفانتي'] },
    { key: 'sonata', label: 'سوناتا', aliases: ['sonata', 'سوناتا', 'سنتافي سوناتا'] },
    { key: 'tucson', label: 'توسان', aliases: ['tucson', 'توسان', 'توكسون', 'توكسان'] },
    { key: 'santa_fe', label: 'سنتافي', aliases: ['santa fe', 'santafe', 'سنتافي', 'سانتا في', 'سانتافي'] },
    { key: 'creta', label: 'كريتا', aliases: ['creta', 'كريتا'] },
    { key: 'palisade', label: 'باليسيد', aliases: ['palisade', 'باليسيد'] },

    // شائع
    { key: 'h1', label: 'H-1', aliases: ['h1', 'h-1', 'H1', 'اتش 1', 'اتش-1', 'اتش1', 'اتش ون'] },
    { key: 'starex', label: 'ستاركس', aliases: ['starex', 'ستاركس', 'ستاركز', 'H1 Starex', 'اتش1 ستاركس'] },
    { key: 'porter', label: 'بورتر', aliases: ['porter', 'بورتر', 'بورتير'] },
    { key: 'kona', label: 'كونا', aliases: ['kona', 'كونا'] },
    { key: 'i10', label: 'i10', aliases: ['i10', 'i-10', 'اي10', 'آي10'] },
  ],

  nissan: [
    { key: 'sunny', label: 'صني', aliases: ['sunny', 'صني', 'سني'] },
    { key: 'altima', label: 'التيما', aliases: ['altima', 'التيما', 'ألتيمـا'] },
    { key: 'maxima', label: 'ماكسيما', aliases: ['maxima', 'ماكسيما'] },
    { key: 'patrol', label: 'باترول', aliases: ['patrol', 'باترول', 'فورتي', 'نيسان باترول'] },
    { key: 'navara', label: 'نافارا', aliases: ['navara', 'نافارا'] },
    { key: 'x_trail', label: 'إكس تريل', aliases: ['x-trail', 'x trail', 'إكس تريل', 'اكس تريل', 'اكستريل'] },

    // شائع جداً في اليمن
    { key: 'tida', label: 'تيدا', aliases: ['tida', 'tiida', 'تيدا', 'تيداء'] },
    { key: 'sentra', label: 'سنترا', aliases: ['sentra', 'سنترا'] },
    { key: 'datsun', label: 'ددسن', aliases: ['datsun', 'داتسن', 'ددسن', 'دسن'] },
    { key: 'qashqai', label: 'قشقاي', aliases: ['qashqai', 'قشقاي', 'قشقاى', 'كاشكاي', 'كشكاي'] },
    { key: 'pathfinder', label: 'باثفايندر', aliases: ['pathfinder', 'باثفايندر', 'باث فايندر'] },
  ],

  kia: [
    { key: 'cerato', label: 'سيراتو', aliases: ['cerato', 'سيراتو', 'سيرتو'] },
    { key: 'rio', label: 'ريو', aliases: ['rio', 'ريو'] },
    { key: 'optima', label: 'أوبتيما', aliases: ['optima', 'اوبتيما', 'أوبتيما', 'اوبتما'] },
    { key: 'k5', label: 'K5', aliases: ['k5', 'كي5', 'K5', 'k 5'] },
    { key: 'sportage', label: 'سبورتاج', aliases: ['sportage', 'سبورتاج', 'سبورتاجي'] },
    { key: 'sorento', label: 'سورينتو', aliases: ['sorento', 'سورينتو'] },
    { key: 'seltos', label: 'سيلتوس', aliases: ['seltos', 'سيلتوس'] },

    // شائع
    { key: 'picanto', label: 'بيكانتو', aliases: ['picanto', 'بيكانتو', 'بيكانتوا'] },
    { key: 'carnival', label: 'كرنفال', aliases: ['carnival', 'كرنفال', 'كارنفال'] },
  ],

  honda: [
    { key: 'civic', label: 'سيفيك', aliases: ['civic', 'سيفيك', 'سيفك'] },
    { key: 'accord', label: 'أكورد', aliases: ['accord', 'اكورد', 'أكورد', 'اكرد'] },
    { key: 'crv', label: 'CR-V', aliases: ['crv', 'cr-v', 'CRV', 'سي ار في', 'سي ار-في'] },
    { key: 'city', label: 'سيتي', aliases: ['city', 'سيتي', 'هوندا سيتي'] },
  ],

  mazda: [
    { key: 'mazda3', label: 'مازدا 3', aliases: ['mazda 3', 'mazda3', 'مازدا3', 'مازدا 3', 'مازدا ثلاثه'] },
    { key: 'cx5', label: 'CX-5', aliases: ['cx5', 'cx-5', 'CX5', 'سي اكس 5', 'سي-اكس5'] },
    { key: 'cx9', label: 'CX-9', aliases: ['cx9', 'cx-9', 'CX9', 'سي اكس 9', 'سي-اكس9'] },
  ],

  mitsubishi: [
    { key: 'lancer', label: 'لانسر', aliases: ['lancer', 'لانسر'] },
    { key: 'pajero', label: 'باجيرو', aliases: ['pajero', 'باجيرو', 'باجيرو 3.5'] },
    { key: 'outlander', label: 'أوتلاندر', aliases: ['outlander', 'اوتلاندر', 'أوتلاندر'] },
    { key: 'l200', label: 'L200', aliases: ['l200', 'L200', 'ال200', 'ال 200'] },
    { key: 'attrage', label: 'أتراج', aliases: ['attrage', 'اتراج', 'أتراج'] },
  ],

  ford: [
    { key: 'f150', label: 'F-150', aliases: ['f150', 'f-150', 'F150', 'اف 150', 'ف 150'] },
    { key: 'explorer', label: 'إكسبلورر', aliases: ['explorer', 'اكسبلورر', 'إكسبلورر'] },
    { key: 'ranger', label: 'رينجر', aliases: ['ranger', 'رينجر'] },
    { key: 'edge', label: 'إيدج', aliases: ['edge', 'ايدج', 'إيدج'] },
  ],

  chevrolet: [
    { key: 'tahoe', label: 'تاهو', aliases: ['tahoe', 'تاهو'] },
    { key: 'suburban', label: 'سوبربان', aliases: ['suburban', 'سوبربان', 'سبر بان'] },
    { key: 'silverado', label: 'سلفرادو', aliases: ['silverado', 'سلفرادو', 'سيلفرادو'] },
    { key: 'camaro', label: 'كامارو', aliases: ['camaro', 'كامارو'] },
    { key: 'caprice', label: 'كابرس', aliases: ['caprice', 'كابرس', 'كبريس'] },
  ],

  gmc: [
    { key: 'yukon', label: 'يوكن', aliases: ['yukon', 'يوكن', 'يوكون'] },
    { key: 'sierra', label: 'سييرا', aliases: ['sierra', 'سييرا'] },
    { key: 'acadia', label: 'أكاديا', aliases: ['acadia', 'اكاديا', 'أكاديا'] },
  ],

  isuzu: [
    { key: 'dmax', label: 'دي-ماكس', aliases: ['dmax', 'd-max', 'ديماكس', 'دي-ماكس', 'دي ماكس'] },
    { key: 'mux', label: 'MU-X', aliases: ['mux', 'mu-x', 'MU-X', 'ام يو اكس', 'ام يو-اكس'] },
    { key: 'npr', label: 'NPR', aliases: ['npr', 'NPR', 'ايسوزو npr', 'دينا ايسوزو'] },
  ],

  suzuki: [
    { key: 'swift', label: 'سويفت', aliases: ['swift', 'سويفت'] },
    { key: 'vitara', label: 'فيتارا', aliases: ['vitara', 'فيتارا'] },
    { key: 'jimny', label: 'جيمني', aliases: ['jimny', 'جيمني', 'جميني'] },
    { key: 'alto', label: 'ألتو', aliases: ['alto', 'التو', 'ألتو', 'التو سوزوكي'] },
    { key: 'carry', label: 'كاري', aliases: ['carry', 'كاري', 'سوزوكي كاري'] },
  ],

  volkswagen: [
    { key: 'golf', label: 'جولف', aliases: ['golf', 'جولف'] },
    { key: 'jetta', label: 'جيتا', aliases: ['jetta', 'جيتا', 'جيتا فولكس'] },
    { key: 'passat', label: 'باسات', aliases: ['passat', 'باسات'] },
  ],

  bmw: [
    { key: 'x5', label: 'X5', aliases: ['x5', 'X5'] },
    { key: 'x3', label: 'X3', aliases: ['x3', 'X3'] },
    { key: 'series3', label: 'الفئة الثالثة', aliases: ['3 series', '3-series', 'الفئة الثالثة', 'سيريس 3', 'سيريز 3'] },
  ],

  mercedes: [
    { key: 'c_class', label: 'C-Class', aliases: ['c class', 'c-class', 'سي كلاس', 'C200', 'C180', 'c180', 'c200'] },
    { key: 'e_class', label: 'E-Class', aliases: ['e class', 'e-class', 'اي كلاس', 'E200', 'E300', 'e200', 'e300'] },
    { key: 'g_class', label: 'G-Class', aliases: ['g class', 'g-class', 'جي كلاس', 'G500', 'G63', 'g63'] },
  ],

  lexus: [
    { key: 'es', label: 'ES', aliases: ['lexus es', 'ES', 'اي اس', 'إي إس', 'es'] },
    { key: 'ls', label: 'LS', aliases: ['lexus ls', 'LS', 'ال اس', 'إل إس', 'ls'] },
    { key: 'lx', label: 'LX', aliases: ['lexus lx', 'LX', 'ال اكس', 'إل إكس', 'lx'] },
  ],

  jeep: [
    { key: 'wrangler', label: 'رانجلر', aliases: ['wrangler', 'رانجلر'] },
    { key: 'grand_cherokee', label: 'جراند شيروكي', aliases: ['grand cherokee', 'جراند شيروكي', 'شيروكي', 'جراندشيروك', 'cherokee'] },
  ],

  mg: [
    { key: 'zs', label: 'ZS', aliases: ['zs', 'ZS', 'ام جي zs', 'mg zs'] },
    { key: 'hs', label: 'HS', aliases: ['hs', 'HS', 'ام جي hs', 'mg hs'] },
    { key: '5', label: 'MG5', aliases: ['mg5', 'MG5', 'ام جي 5', 'إم جي 5', 'mg 5'] },
  ],

  geely: [
    { key: 'coolray', label: 'كولراي', aliases: ['coolray', 'كولراي', 'كول راي'] },
    { key: 'emgrand', label: 'امجراند', aliases: ['emgrand', 'امجراند', 'إمجراند', 'ام جراند'] },
  ],

  byd: [
    { key: 'atto3', label: 'Atto 3', aliases: ['atto 3', 'atto3', 'Atto3', 'أتو 3', 'اتو3'] },
    { key: 'seal', label: 'Seal', aliases: ['seal', 'سيل'] },
    { key: 'song', label: 'Song', aliases: ['song', 'سونغ'] },
  ],

  changan: [
    { key: 'cs35', label: 'CS35', aliases: ['cs35', 'cs-35', 'CS35', 'سي اس 35'] },
    { key: 'cs55', label: 'CS55', aliases: ['cs55', 'cs-55', 'CS55', 'سي اس 55'] },
    { key: 'alsvin', label: 'السفين', aliases: ['alsvin', 'al svin', 'السفين', 'السفين شانجان'] },
  ],

  chery: [
    { key: 'tiggo', label: 'تيجو', aliases: ['tiggo', 'تيجو', 'تيقو', 'tiggo 7', 'tiggo7'] },
    { key: 'arrizo', label: 'أريزو', aliases: ['arrizo', 'ارريزو', 'أريزو', 'arrizo 5', 'arrizo5'] },
  ],

  haval: [
    { key: 'h6', label: 'H6', aliases: ['h6', 'H6', 'هافال h6', 'haval h6'] },
    { key: 'jolion', label: 'جوليان', aliases: ['jolion', 'جوليان', 'جوليون'] },
  ],

  jetour: [
    { key: 'x70', label: 'X70', aliases: ['x70', 'X70', 'جيتور x70', 'jetour x70'] },
    { key: 'x90', label: 'X90', aliases: ['x90', 'X90', 'جيتور x90', 'jetour x90'] },
  ],

  jac: [
    { key: 's3', label: 'S3', aliases: ['s3', 'S3', 'جاك s3', 'jac s3'] },
    { key: 's5', label: 'S5', aliases: ['s5', 'S5', 'جاك s5', 'jac s5'] },
  ],
};

// =========================
// Normalize / Detect - Make
// =========================
export function normalizeCarMake(v) {
  return matchKeyFromValue(v, CAR_MAKES) || detectKeyFromText(v, CAR_MAKES) || '';
}

export function detectCarMakeFromText(text) {
  return detectKeyFromText(text, CAR_MAKES) || '';
}

export function carMakeLabel(key) {
  if (!key) return '';
  const it = CAR_MAKES.find((x) => x.key === key);
  return it?.label ?? '';
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
  // fallback detect to support values like "كامري 2012" أو "Camry LE"
  return matchKeyFromValue(v, models) || detectKeyFromText(v, models) || '';
}

export function detectCarModelFromText(makeKey, text) {
  const models = getCarModelsByMake(makeKey);
  return detectKeyFromText(text, models) || '';
}

export function carModelLabel(makeKey, modelKey) {
  if (!modelKey) return '';
  const models = getCarModelsByMake(makeKey);
  const it = models.find((x) => x.key === modelKey);
  return it?.label ?? '';
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
