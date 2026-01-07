// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
});

// ✅ خرائط توافق (عربي/إنجليزي/اختلافات شائعة)
const ALIASES = {
  real_estate: 'realestate',
  'heavy-equipment': 'heavy_equipment',
  heavyEquipment: 'heavy_equipment',
  net: 'networks',
  network: 'networks',

  // عربي -> سلاج
  'عقارات': 'realestate',
  'العقارات': 'realestate',
  'سيارات': 'cars',
  'السيارات': 'cars',
  'جوالات': 'phones',
  'الجوالات': 'phones',
  'الكترونيات': 'electronics',
  'إلكترونيات': 'electronics',
  'الإلكترونيات': 'electronics',
  'شبكات': 'networks',
  'صيانة': 'maintenance',
  'خدمات': 'services',
  'وظائف': 'jobs',
  'طاقة شمسية': 'solar',
};

function normalizeSlug(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';

  const mapped = ALIASES[raw] || raw;

  return String(mapped)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function listingCategorySlug(listing) {
  const raw =
    listing?.category ??
    listing?.categorySlug ??
    listing?.categoryId ??
    listing?.cat ??
    '';

  return normalizeSlug(raw);
}

export default function CategoryListings({ category, initialListings = [] }) {
  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState(initialListings);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    // إذا كان عندنا بيانات SSR، نخلي الاشتراك اختياري للتوفير
    if (initialListings.length > 0) {
      setLoading(false);
      return;
    }

    // fallback: إذا ما كان في بيانات SSR، نجلب من Firebase
    // ✅ category قد يكون string أو array
    const catsRaw = Array.isArray(category) ? category : [category];
    const cats = catsRaw.map(normalizeSlug).filter(Boolean);
    const catsSet = new Set(cats);

    setLoading(true);
    setErr('');

    let unsub = null;

    if (!cats.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    // ✅ إذا قسم واحد فقط، نحاول Query مباشر (أسرع)
    const single = cats.length === 1 ? cats[0] : '';

    const fallbackFetchAndFilter = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CategoryListings] Using fallback fetch for category: ${single || cats.join(', ')}`);
      }
      const ref2 = db.collection('listings').orderBy('createdAt', 'desc').limit(400);
      unsub = ref2.onSnapshot(
        (snap2) => {
          const all = snap2.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.isActive !== false && l.hidden !== true);

          const filtered = all.filter((l) => catsSet.has(listingCategorySlug(l)));

          if (process.env.NODE_ENV === 'development') {
            console.log(`[CategoryListings] Fallback fetch: ${all.length} total listings, ${filtered.length} match category`);
            if (filtered.length === 0 && all.length > 0 && all.length <= 10) {
              // Only show sample when we have a small dataset to avoid performance issues
              const categories = all.map(l => `${l.id}: ${l.category}`);
              console.log('[CategoryListings] Sample categories from listings:', categories);
              console.log('[CategoryListings] Looking for categories:', Array.from(catsSet));
            } else if (filtered.length === 0 && all.length > 10) {
              console.log('[CategoryListings] No matches found. Try checking category field names in Firebase.');
            }
          }

          setItems(filtered);
          setLoading(false);
        },
        (e2) => {
          console.error(e2);
          setErr(e2?.message || 'فشل تحميل إعلانات القسم');
          setLoading(false);
        }
      );
    };

    try {
      if (!single) {
        // عدة أسماء للقسم -> استخدم fallback مباشرة
        fallbackFetchAndFilter();
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CategoryListings] Attempting direct query for category: "${single}"`);
        }
        const ref = db
          .collection('listings')
          .where('category', '==', single)
          .orderBy('createdAt', 'desc')
          .limit(200);

        unsub = ref.onSnapshot(
          (snap) => {
            const data = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((l) => l.isActive !== false && l.hidden !== true);

            if (process.env.NODE_ENV === 'development') {
              console.log(`[CategoryListings] Direct query success: ${data.length} listings found for "${single}"`);
            }

            setItems(data);
            setLoading(false);
          },
          (e) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[CategoryListings] Direct query failed for "${single}", falling back to filter:`, e.code || e.message);
            } else {
              console.error('Category query failed (maybe needs index):', e);
            }
            fallbackFetchAndFilter();
          }
        );
      }
    } catch (e) {
      console.error(e);
      setErr('فشل الاتصال بقاعدة البيانات');
      setLoading(false);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [category, initialListings.length]);

  const filtered = useMemo(() => {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return items;

    return items.filter((l) => {
      const title = String(l.title || '').toLowerCase();
      const city = String(l.city || l.region || '').toLowerCase();
      const desc = String(l.description || '').toLowerCase();
      return title.includes(s) || city.includes(s) || desc.includes(s);
    });
  }, [items, q]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="muted">جاري تحميل إعلانات القسم...</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="card" style={{ padding: 16, border: '1px solid #fecaca' }}>
        <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️ حدث خطأ</div>
        <div className="muted" style={{ marginTop: 6 }}>{err}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn ${view === 'grid' ? 'btnPrimary' : ''}`} onClick={() => setView('grid')}>
              ◼️ شبكة
            </button>
            <button className={`btn ${view === 'list' ? 'btnPrimary' : ''}`} onClick={() => setView('list')}>
              ☰ قائمة
            </button>
            <button className={`btn ${view === 'map' ? 'btnPrimary' : ''}`} onClick={() => setView('map')}>
              🗺️ خريطة
            </button>
          </div>

          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث داخل القسم..."
          />

          <div className="muted" style={{ fontWeight: 800 }}>
            {filtered.length} إعلان
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات في هذا القسم</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب البحث أو أضف إعلان جديد.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/add">➕ أضف إعلان</Link>
          </div>
        </div>
      ) : view === 'map' ? (
        <HomeMapView listings={filtered} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr',
            gap: 12,
          }}
        >
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
