// /app/categories/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';

// ✅ القائمة المعتمدة (تطابق صفحات الأقسام عندك)
const DEFAULT_CATEGORIES = [
  { slug: 'cars', name: 'سيارات', icon: '🚗' },
  { slug: 'realestate', name: 'عقارات', icon: '🏠' },
  { slug: 'phones', name: 'جوالات', icon: '📱' },
  { slug: 'electronics', name: 'إلكترونيات', icon: '💻' },
  { slug: 'furniture', name: 'أثاث منزل', icon: '🛋️' },
  { slug: 'household_tools', name: 'أدوات منزلية', icon: '🧹' }, // ✅ جديد
  { slug: 'jobs', name: 'وظائف', icon: '💼' },
  { slug: 'services', name: 'خدمات', icon: '🧰' },
  { slug: 'maintenance', name: 'صيانة', icon: '🛠️' },
  { slug: 'networks', name: 'شبكات', icon: '📡' },
  { slug: 'solar', name: 'طاقة شمسية', icon: '🔋' },
  { slug: 'heavy_equipment', name: 'معدات ثقيلة', icon: '🚜' },
  { slug: 'motorcycles', name: 'دراجات نارية', icon: '🏍️' },
  { slug: 'clothes', name: 'ملابس', icon: '👕' },
  { slug: 'animals', name: 'حيوانات', icon: '🐦' },
  { slug: 'other', name: 'أخرى', icon: '📦' },
];

export default function CategoriesPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      setLoading(true);
      try {
        // ✅ بدل 15 استعلام لكل قسم (وتعقيدات indexes)
        // نجلب آخر عدد من الإعلانات ونعدّها محلياً
        const snap = await db.collection('listings').orderBy('createdAt', 'desc').limit(800).get();

        const map = {};
        for (const doc of snap.docs) {
          const d = doc.data() || {};
          if (d.isActive === false) continue;
          if (d.hidden === true) continue;

          const cat = String(d.category || '').trim();
          if (!cat) continue;

          map[cat] = (map[cat] || 0) + 1;
        }

        if (!cancelled) setCounts(map);
      } catch (e) {
        console.error('Error fetching counts:', e);
        if (!cancelled) setCounts({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => DEFAULT_CATEGORIES, []);

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 40 }}>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>تصفح حسب القسم</div>
              <div className="muted" style={{ marginTop: 6 }}>اختر القسم الذي تريد استعراض إعلاناته</div>
            </div>

            <Link href="/listings" className="btn">
              عرض جميع الإعلانات
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div className="muted">جاري تحميل الأقسام…</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {items.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="card"
                style={{
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    background: '#f8fafc',
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{c.name}</div>
                  <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                    {(counts[c.slug] || 0).toLocaleString('ar-YE')} إعلان
                  </div>
                </div>

                <div className="muted" style={{ fontSize: 18, fontWeight: 900 }}>
                  ←
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
