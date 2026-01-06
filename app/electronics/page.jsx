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

// ✅ توحيد أي اختلافات في السلاج (نفس فكرة CategoryBar)
function normalizeSlug(v) {
  const s = String(v || '').trim();

  if (!s) return '';

  // اختلافات شائعة
  if (s === 'real_estate') return 'realestate';
  if (s === 'heavy-equipment') return 'heavy_equipment';
  if (s === 'heavyEquipment') return 'heavy_equipment';
  if (s === 'net') return 'networks';
  if (s === 'network') return 'networks';

  // توحيد الشرطات/المسافات
  return s.replace(/\s+/g, '_').replace(/-+/g, '_');
}

function listingCategorySlug(listing) {
  // بعض المشاريع تسميها بطرق مختلفة
  const raw =
    listing?.category ??
    listing?.categorySlug ??
    listing?.categoryId ??
    listing?.cat ??
    '';

  return normalizeSlug(raw);
}

export default function CategoryListings({ category }) {
  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const cat = normalizeSlug(category);
    setLoading(true);
    setErr('');

    let unsub = null;

    // ✅ إذا ما جاء category أصلاً
    if (!cat) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      // ✅ محاولة فلترة مباشرة من Firestore
      // (قد تحتاج index مع orderBy(createdAt))
      const ref = db
        .collection('listings')
        .where('category', '==', cat)
        .orderBy('createdAt', 'desc')
        .limit(200);

      unsub = ref.onSnapshot(
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.isActive !== false && l.hidden !== true);

          setItems(data);
          setLoading(false);
        },
        (e) => {
          console.error('Category query failed (maybe needs index):', e);

          // ✅ fallback: نجلب آخر 400 ونفلتر بالمتصفح (أقوى ويمسك اختلافات الحقول)
          const ref2 = db.collection('listings').orderBy('createdAt', 'desc').limit(400);

          unsub = ref2.onSnapshot(
            (snap2) => {
              const all = snap2.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((l) => l.isActive !== false && l.hidden !== true);

              const filtered = all.filter((l) => listingCategorySlug(l) === cat);

              setItems(filtered);
              setLoading(false);
            },
            (e2) => {
              console.error(e2);
              setErr(e2?.message || 'فشل تحميل إعلانات القسم');
              setLoading(false);
            }
          );
        }
      );
    } catch (e) {
      console.error(e);
      setErr('فشل الاتصال بقاعدة البيانات');
      setLoading(false);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [category]);

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
        <div className="muted" style={{ marginTop: 6 }}>
          {err}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* شريط أدوات (شبكة/قائمة/خريطة + بحث) */}
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

      {/* المحتوى */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات في هذا القسم</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب البحث أو أضف إعلان جديد.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/add">
              ➕ أضف إعلان
            </Link>
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
            <ListingCard key={l.id} listing={l} variant={view === 'list' ? 'list' : 'grid'} />
          ))}
        </div>
      )}
    </div>
  );
}
