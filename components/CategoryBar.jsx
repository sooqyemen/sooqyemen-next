// components/CategoryBar.jsx
'use client';

const ICONS = {
  all: '📋',
  map: '🗺️',
  cars: '🚗',
  realestate: '🏠',
  electronics: '💻',
  motorcycles: '🏍️',
  heavy_equipment: '🚜',
  solar: '🔋',
  networks: '📡',
  maintenance: '🛠️',
  furniture: '🛋️',
  clothes: '👕',
  animals: '🐦',
  jobs: '💼',
  services: '🧰',
  phones: '📱',
  home_tools: '🧹', // ✅ الأدوات المنزلية
  other: '📦',
};

const FALLBACK_NAMES = {
  cars: 'السيارات',
  realestate: 'العقارات',
  electronics: 'الإلكترونيات',
  motorcycles: 'الدراجات النارية',
  heavy_equipment: 'المعدات الثقيلة',
  solar: 'الطاقة الشمسية',
  networks: 'الشبكات',
  maintenance: 'الصيانة',
  furniture: 'الأثاث',
  clothes: 'الملابس',
  animals: 'الحيوانات',
  jobs: 'الوظائف',
  services: 'الخدمات',
  phones: 'الجوالات',
  home_tools: 'الأدوات المنزلية',
  other: 'أخرى',
};

function normalizeSlug(slug) {
  const s = String(slug || '').trim();

  if (s === 'real_estate') return 'realestate';
  if (s === 'heavy-equipment') return 'heavy_equipment';
  if (s === 'heavyEquipment') return 'heavy_equipment';
  if (s === 'net') return 'networks';
  if (s === 'network') return 'networks';

  return s;
}

function nameFor(slug, providedName) {
  const n = String(providedName || '').trim();
  if (n) return n;
  if (FALLBACK_NAMES[slug]) return FALLBACK_NAMES[slug];
  return slug.replace(/_/g, ' ');
}

function getIcon(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoryBar({
  categories = [],
  active,
  onChange,
  view = 'list', // 'list' | 'map'
  onChangeView = () => {},
}) {
  const activeSlug = normalizeSlug(active);

  // ✅ تنظيف الفئات + دعم أكثر من اسم للحقل (name/label/title)
  const cleanedRaw = (Array.isArray(categories) ? categories : [])
    .map((c) => {
      const slug = normalizeSlug(c?.slug || c?.id || c?._id || '');
      const providedName = c?.name ?? c?.label ?? c?.title ?? '';
      const name = nameFor(slug, providedName);
      return { slug, name };
    })
    .filter((c) => c.slug); // ✅ ما عاد نحذف إذا الاسم ناقص

  // ✅ إزالة التكرار
  const seen = new Set();
  const cleaned = [];
  for (const c of cleanedRaw) {
    if (!c.slug) continue;
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    cleaned.push(c);
  }

  // ✅ ضمان ظهور الأدوات المنزلية حتى لو الداتا ناقصة
  if (!seen.has('home_tools')) {
    cleaned.push({ slug: 'home_tools', name: FALLBACK_NAMES.home_tools });
  }

  return (
    <div className="categoryBarWrap">
      {/* صف: الكل + تبديل العرض */}
      <div className="categoryBarTop">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={'btn ' + (activeSlug === 'all' ? 'btnPrimary' : '')}
        >
          <span className="categoryBarIc">{getIcon('all')}</span>
          <span>الكل</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView(view === 'map' ? 'list' : 'map')}
          className={'btn ' + (view === 'map' ? 'btnPrimary' : '')}
        >
          <span className="categoryBarIc">{getIcon('map')}</span>
          <span>{view === 'map' ? 'عرض كقائمة' : 'عرض على الخريطة'}</span>
        </button>
      </div>

      {/* سلايدر الأقسام */}
      <div className="categoryBarSlider" role="tablist" aria-label="الأقسام">
        {cleaned.map((cat) => {
          const isActive = activeSlug === cat.slug;

          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(cat.slug)}
              className={'btn categoryBarPill ' + (isActive ? 'btnPrimary' : '')}
            >
              <span className="categoryBarIc">{getIcon(cat.slug)}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
