// app/categories/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';

// أيقونات حسب slugs الموجودة عندك
const ICONS = {
  cars: '🚗',
  realestate: '🏠',
  phones: '📱',
  electronics: '💻',
  furniture: '🛋️',
  jobs: '💼',
  services: '🧰',
  animals: '🐦',
  clothes: '👕',
  solar: '🔋',
  networks: '📡',
  maintenance: '🛠️',
  motorcycles: '🏍️',
  heavy_equipment: '🚜',
  home_tools: '🧹',
  other: '📦',
};

const NAMES = {
  cars: 'السيارات',
  realestate: 'العقارات',
  phones: 'الجوالات',
  electronics: 'الإلكترونيات',
  furniture: 'الأثاث',
  jobs: 'الوظائف',
  services: 'الخدمات',
  animals: 'الحيوانات',
  clothes: 'الملابس',
  solar: 'الطاقة الشمسية',
  networks: 'الشبكات',
  maintenance: 'الصيانة',
  motorcycles: 'الدراجات النارية',
  heavy_equipment: 'المعدات الثقيلة',
  home_tools: 'الأدوات المنزلية',
  other: 'أخرى',
};

function humanizeSlug(slug) {
  const s = String(slug || '').trim();
  if (NAMES[s]) return NAMES[s];
  // fallback لطيف لو ظهر slug جديد
  return s.replace(/_/g, ' ');
}

function iconFor(slug) {
  return ICONS[slug] || '📌';
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]); // {slug, name}
  const [counts, setCounts] = useState({}); // { [slug]: number }
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // ✅ جلب الأقسام من Firestore (categories)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingCats(true);
      try {
        const snap = await db.collection('categories').get();

        const list = snap.docs
          .map((d) => {
            const data = d.data() || {};
            const slug = String(d.id || data.slug || '').trim();
            const name = String(data.name || '').trim() || humanizeSlug(slug);
            return { slug, name };
          })
          .filter((x) => x.slug);

        // ترتيب بسيط: نخلي الأقسام المشهورة أولاً ثم الباقي
        const order = [
          'cars',
          'realestate',
          'phones',
          'electronics',
          'furniture',
          'home_tools',
          'jobs',
          'services',
          'solar',
          'networks',
          'maintenance',
          'motorcycles',
          'heavy_equipment',
          'animals',
          'clothes',
          'other',
        ];

        list.sort((a, b) => {
          const ia = order.indexOf(a.slug);
          const ib = order.indexOf(b.slug);
          if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, 'ar');
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });

        if (!cancelled) setCategories(list);
      } catch (e) {
        console.error('Failed to load categories:', e);
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ حساب عدد الإعلانات لكل قسم (مرة واحدة من listings)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingCounts(true);
      try {
        // نجلب آخر 800 إعلان (خفيف + كافي للعداد)
        const snap = await db.collection('listings').orderBy('createdAt', 'desc').limit(800).get();

        const map = {};
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          if (data.isActive === false) return;
          if (data.hidden === true) return;

          const cat = String(data.category || '').trim();
          if (!cat) return;

          map[cat] = (map[cat] || 0) + 1;
        });

        if (!cancelled) setCounts(map);
      } catch (e) {
        console.error('Failed to load listings counts:', e);
        if (!cancelled) setCounts({});
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = loadingCats || loadingCounts;

  const cards = useMemo(() => {
    return (categories || []).map((c) => {
      const slug = c.slug;
      const name = c.name || humanizeSlug(slug);
      return {
        slug,
        name,
        icon: iconFor(slug),
        count: Number(counts?.[slug] || 0),
      };
    });
  }, [categories, counts]);

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 28 }}>
        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 1000, fontSize: 20 }}>تصفح حسب القسم</div>
            <div className="muted" style={{ marginTop: 6 }}>
              اختر القسم الذي تريد استعراض إعلاناته
            </div>
          </div>

          <Link href="/listings" className="btn">
            عرض جميع الإعلانات
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div className="muted">جاري تحميل الأقسام…</div>
          </div>
        ) : cards.length === 0 ? (
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 900 }}>لا توجد أقسام حالياً</div>
            <div className="muted" style={{ marginTop: 6 }}>
              تأكد أن collection (categories) موجودة في Firestore.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 12,
            }}
          >
            {cards.map((c) => (
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--chip-bg, #f1f5f9)',
                    border: '1px solid var(--border, rgba(0,0,0,0.06))',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, lineHeight: 1.3 }}>{c.name}</div>
                  <div className="muted" style={{ marginTop: 4, fontWeight: 900, fontSize: 13 }}>
                    {c.count.toLocaleString('ar-YE')} إعلان
                  </div>
                </div>

                <div className="muted" style={{ fontSize: 18, fontWeight: 900 }}>
                  ‹
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
