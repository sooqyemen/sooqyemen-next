// components/CategoryBar.jsx
'use client';

const ICONS = {
  all: '📋',
  cars: '🚗',
  real_estate: '🏠',
  phones: '📱',
  jobs: '💼',
  solar: '🔋',
  furniture: '🛋️',
  yemeni_products: '🧺',
};

function getIcon(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoryBar({ categories = [], active, onChange }) {
  const items = [{ slug: 'all', name: 'الكل' }, ...categories];

  return (
    <div
      className="row"
      style={{
        overflowX: 'auto',
        paddingBottom: 6,
        flexWrap: 'nowrap',
      }}
    >
      {items.map((cat) => {
        const isActive = active === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            className={'btn ' + (isActive ? 'btnPrimary' : '')}
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{getIcon(cat.slug)}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
