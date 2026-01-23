// lib/categories.js
// ✅ أدوات موحّدة للأقسام (Slug -> اسم عربي + أيقونة + رابط)

// ملاحظة مهمة:
// - نخزّن القسم في Firestore غالباً كـ slug (مثل realestate / phones ...)
// - المستخدم لازم يشوف اسم عربي مفهوم، وليس الـ slug.

export const CATEGORY_MAP = {
  cars: { label: 'سيارات', icon: '🚗', href: '/cars' },
  realestate: { label: 'عقارات', icon: '🏡', href: '/realestate' },
  phones: { label: 'جوالات', icon: '📱', href: '/phones' },
  electronics: { label: 'إلكترونيات', icon: '💻', href: '/electronics' },
  motorcycles: { label: 'دراجات نارية', icon: '🏍️', href: '/motorcycles' },
  heavy_equipment: { label: 'معدات ثقيلة', icon: '🚜', href: '/heavy_equipment' },
  solar: { label: 'طاقة شمسية', icon: '☀️', href: '/solar' },
  networks: { label: 'نت وشبكات', icon: '📡', href: '/networks' },
  maintenance: { label: 'صيانة', icon: '🛠️', href: '/maintenance' },
  furniture: { label: 'أثاث', icon: '🛋️', href: '/furniture' },
  home_tools: { label: 'أدوات منزلية', icon: '🧹', href: '/home_tools' },
  clothes: { label: 'ملابس', icon: '👕', href: '/clothes' },
  animals: { label: 'حيوانات وطيور', icon: '🐑', href: '/animals' },
  jobs: { label: 'وظائف', icon: '💼', href: '/jobs' },
  services: { label: 'خدمات', icon: '🧰', href: '/services' },
  other: { label: 'أخرى', icon: '📦', href: '/other' },
};

// ✅ تطبيع كل الاختلافات الشائعة إلى مفتاح واحد ثابت
export function normalizeCategoryKey(v) {
  // NOTE: Firestore/المشروع قد يخزن القسم كـ string أو object (مثل {slug,label} أو {key,value})
  // لذلك نستخرج أفضل قيمة نصية قبل التطبيع لتجنب "[object Object]".
  const extractText = (x, depth = 0) => {
    if (x == null) return '';
    if (depth > 3) return '';
    const t = typeof x;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(x).trim();
    if (Array.isArray(x)) {
      for (const it of x) {
        const s = extractText(it, depth + 1);
        if (s) return s;
      }
      return '';
    }
    if (t === 'object') {
      const keys = [
        'slug', 'key', 'value', 'id',
        'category', 'categoryKey', 'categorySlug', 'rootCategory',
        'name', 'label', 'title', 'type'
      ];
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(x, k)) {
          const s = extractText(x[k], depth + 1);
          if (s) return s;
        }
      }
      return '';
    }
    return '';
  };

  const raw = extractText(v);
  if (!raw) return '';

  // لو النص فيه عربي، قد يكون "عقارات"... إلخ
  // نخليه يمر على جدول التحويل أدناه.
  const lowered = raw.toLowerCase();
  const norm = lowered.replace(/\s+/g, '_').replace(/-/g, '_').replace(/__+/g, '_');

  const map = {
    // إنجليزي/اختلافات
    real_estate: 'realestate',
    realestate: 'realestate',
    'real estate': 'realestate',
    mobiles: 'phones',
    mobile: 'phones',
    phone: 'phones',
    phones: 'phones',
    animals_birds: 'animals',
    animalsbirds: 'animals',
    animals: 'animals',
    heavy_equipment: 'heavy_equipment',
    heavyequipment: 'heavy_equipment',
    'heavy equipment': 'heavy_equipment',
    network: 'networks',
    net: 'networks',
    networks: 'networks',
    home_tools: 'home_tools',
    hometools: 'home_tools',
    'home tools': 'home_tools',

    // دراجات (إنجليزي)
    motorcycle: 'motorcycles',
    motorbike: 'motorcycles',
    motor_bike: 'motorcycles',
    bike: 'motorcycles',
    bikes: 'motorcycles',


    // عربي
    سيارات: 'cars',
    السيارة: 'cars',
    السيارات: 'cars',
    عقارات: 'realestate',
    العقارات: 'realestate',
    جوالات: 'phones',
    الجوالات: 'phones',
    موبايلات: 'phones',
    إلكترونيات: 'electronics',
    الكترونيات: 'electronics',
    الإلكترونيات: 'electronics',
    دراجات_نارية: 'motorcycles',
    دراجات: 'motorcycles',
    دراجة: 'motorcycles',
    دراجه: 'motorcycles',
    دباب: 'motorcycles',
    دبابات: 'motorcycles',
    موتر: 'motorcycles',
    موتور: 'motorcycles',
    موتورات: 'motorcycles',
    موتوسيكل: 'motorcycles',
    معدات_ثقيلة: 'heavy_equipment',
    طاقة_شمسية: 'solar',
    نت_وشبكات: 'networks',
    نت_و_شبكات: 'networks',
    شبكات: 'networks',
    صيانة: 'maintenance',
    أثاث: 'furniture',
    اثاث: 'furniture',
    ملابس: 'clothes',
    حيوانات_وطيور: 'animals',
    حيوانات: 'animals',
    وظائف: 'jobs',
    خدمات: 'services',
    اخرى: 'other',
    أخرى: 'other',
    أدوات_منزلية: 'home_tools',
    ادوات_منزلية: 'home_tools',
    'أدوات منزلية': 'home_tools',
    'ادوات منزلية': 'home_tools',
  };

  return map[norm] || map[raw] || norm;
}

// ✅ اسم القسم المناسب للعرض
export function getCategoryLabel(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';

  // إذا المستخدم أدخل عربي، نعرضه كما هو
  if (/[\u0600-\u06FF]/.test(raw)) return raw;

  const key = normalizeCategoryKey(raw);
  return CATEGORY_MAP[key]?.label || raw;
}

export function getCategoryIcon(v) {
  const key = normalizeCategoryKey(v);
  return CATEGORY_MAP[key]?.icon || '📋';
}

export function getCategoryHref(v) {
  const key = normalizeCategoryKey(v);
  return CATEGORY_MAP[key]?.href || '/categories';
}
