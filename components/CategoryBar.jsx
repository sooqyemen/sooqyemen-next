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

// ✅ توحيد أي مفاتيح قديمة/مختلفة إلى المفاتيح المعتمدة عندك في Firestore
function normalizeSlug(slug) {
  const s = String(slug || '').trim();

  // حالات شائعة للاختلافات
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

  // ✅ نظّف categories (slug + name)
  const cleaned = (Array.isArray(categories) ? categories : [])
    .map((c) => ({
      slug: normalizeSlug(c?.slug),
      name: String(c?.name || '').trim(),
    }))
    .filter((c) => c.slug && c.name);

  return (
    <div className="wrap">
      {/* ✅ صف: الكل + تبديل العرض */}
      <div className="topRow">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={'btn ' + (activeSlug === 'all' ? 'btnPrimary' : '')}
        >
          <span className="ic">{getIcon('all')}</span>
          <span>الكل</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView(view === 'map' ? 'list' : 'map')}
          className={'btn ' + (view === 'map' ? 'btnPrimary' : '')}
        >
          <span className="ic">{getIcon('map')}</span>
          <span>{view === 'map' ? 'عرض كقائمة' : 'عرض على الخريطة'}</span>
        </button>
      </div>

      {/* ✅ سلايدر أفقي للأقسام */}
      <div className="slider" role="tablist" aria-label="الأقسام">
        {cleaned.map((cat) => {
          const isActive = activeSlug === cat.slug;

          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(cat.slug)}
              className={'btn pill ' + (isActive ? 'btnPrimary' : '')}
            >
              <span className="ic">{getIcon(cat.slug)}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .wrap {
          display: grid;
          gap: 10px;
        }

        .topRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .slider {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          flex-wrap: nowrap;
        }

        .pill {
          white-space: nowrap;
          flex-shrink: 0;
          scroll-snap-align: start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ic {
          font-size: 16px;
          line-height: 1;
        }

        /* ✅ جوال: أزرار أصغر ومتناسقة */
        @media (max-width: 768px) {
          :global(.btn) {
            padding: 8px 10px;
            font-size: 13px;
          }

          .topRow {
            justify-content: stretch;
          }

          .topRow :global(.btn) {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
