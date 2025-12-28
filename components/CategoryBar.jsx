// components/CategoryBar.jsx
'use client';

export default function CategoryBar({ categories, active, onChange }) {
  return (
    <div className="row" style={{ overflowX:'auto', paddingBottom:6 }}>
      <button className={"btn " + (active === 'all' ? 'btnPrimary' : '')} onClick={() => onChange('all')}>الكل</button>
      {categories.map(c => (
        <button
          key={c.slug}
          className={"btn " + (active === c.slug ? 'btnPrimary' : '')}
          onClick={() => onChange(c.slug)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
