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
  animals: '🐑',
};

function getIcon(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoryBar({ categories = [], active, onChange }) {
  // تثبيت زر "الكل" في البداية
  const items = [{ slug: 'all', name: 'الكل' }, ...categories];

  return (
    <div
      className="category-bar"
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
      }}
    >
      {items.map((cat) => {
        const isActive = active === cat.slug;

        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            className={isActive ? 'badge badge-active' : 'badge'}
            style={{
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ marginLeft: 4 }}>{getIcon(cat.slug)}</span>
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
