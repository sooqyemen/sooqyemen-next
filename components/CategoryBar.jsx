// components/CategoryBar.jsx
'use client';

import React from 'react';

const ICONS = {
  all: '🌓',
  cars: '🚗',
  real_estate: '🏠',
  phones: '📱',
  jobs: '💼',
  solar: '☀️',
  furniture: '🛋️',
  animals: '🐄',
  electronics: '💻',
  bikes: '🏍️',
  yemeni_goods: '🧺',
  services: '🛠️',
};

function getIcon(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoryBar({ categories = [], active, onChange }) {
  // نضيف "الكل" في البداية
  const items = [{ slug: 'all', name: 'الكل' }, ...categories];

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((cat) => {
        const isActive = active === cat.slug;

        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            style={{
              flexShrink: 0,
              borderRadius: 999,
              border: 'none',
              padding: '6px 12px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              backgroundColor: isActive ? '#2563eb' : '#f3f4f6',
              color: isActive ? '#ffffff' : '#111827',
              boxShadow: isActive
                ? '0 4px 10px rgba(37, 99, 235, 0.35)'
                : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 15 }}>{getIcon(cat.slug)}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
