// components/CategoryBar.jsx
'use client';

import { useMemo } from 'react';

const ICONS = {
  all: '📋',
  map: '🗺️',
  cars: '🚗',
  realestate: '🏠',
  real_estate: '🏠',
  phones: '📱',
  mobiles: '📱',
  electronics: '💻',
  motorcycles: '🏍️',
  heavy_equipment: '🚜',
  solar: '☀️',
  networks: '📡',
  maintenance: '🛠️',
  furniture: '🛋️',
  clothes: '👕',
  animals: '🐑',
  jobs: '💼',
  services: '🧰',
  other: '📌',
};

function getIcon(slug) {
  return ICONS[String(slug || '').toLowerCase()] || '📌';
}

export default function CategoryBar({
  categories = [],
  active = 'all',
  onChange = () => {},
  view = 'grid',            // 'grid' | 'list' | 'map'
  onChangeView = () => {},  // setView
}) {
  const items = useMemo(() => {
    const clean = Array.isArray(categories) ? categories : [];
    // نتأكد من الشكل: {slug,name}
    const normalized = clean
      .map((c) => ({
        slug: String(c?.slug || '').trim(),
        name: String(c?.name || '').trim(),
      }))
      .filter((c) => c.slug && c.name);

    return [{ slug: 'all', name: 'الكل' }, ...normalized];
  }, [categories]);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* صف: الكل + أزرار العرض */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onChange('all')}
            className={'btn ' + (active === 'all' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>{getIcon('all')}</span>
            <span>الكل</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('grid')}
            className={'btn ' + (view === 'grid' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="عرض شبكة"
          >
            <span>◼️</span>
            <span>شبكة</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('list')}
            className={'btn ' + (view === 'list' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="عرض قائمة"
          >
            <span>☰</span>
            <span>قائمة</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('map')}
            className={'btn ' + (view === 'map' ? 'btnPrimary' : '')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="عرض خريطة"
          >
            <span>{getIcon('map')}</span>
            <span>خريطة</span>
          </button>
        </div>
      </div>

      {/* صف الأقسام (سلايدر أفقي للجوال) */}
      <div
        className="row"
        style={{
          overflowX: 'auto',
          paddingBottom: 6,
          flexWrap: 'nowrap',
          gap: 8,
        }}
      >
        {items
          .filter((c) => c.slug !== 'all')
          .map((cat) => {
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
                  gap: 6,
                }}
              >
                <span>{getIcon(cat.slug)}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.btn) {
            padding: 8px 10px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
