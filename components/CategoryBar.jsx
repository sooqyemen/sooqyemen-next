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
  other: '📦',
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

  const cleaned = (Array.isArray(categories) ? categories : [])
    .map((c) => ({
      slug: normalizeSlug(c?.slug),
      name: String(c?.name || '').trim(),
    }))
    .filter((c) => c.slug && c.name);

  return (
    <div className="categoryBarWrap">
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
