'use client';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'cars', label: 'سيارات' },
  { id: 'realestate', label: 'عقارات' },
  { id: 'phones', label: 'جوالات' },
  { id: 'jobs', label: 'وظائف' },
  { id: 'solar', label: 'طاقة شمسية' },
  { id: 'furniture', label: 'أثاث' },
  { id: 'yemen', label: 'منتجات يمنية' },
  { id: 'services', label: 'خدمات' },
];

export default function CategoryBar({ categories = DEFAULT_CATEGORIES, active, onChange }) {
  return (
    <div className="category-scroll-container hide-scrollbar">
      {categories.map((c) => {
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={
              "whitespace-nowrap px-4 py-2 rounded-full border text-sm font-semibold transition " +
              (isActive
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700")
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
