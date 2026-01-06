// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), { ssr: false });

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * ✅ توحيد أسماء الأقسام
 * عشان لو عندك إعلانات قديمة محفوظة باسم مختلف
 */
function getCategoryAliases(cat) {
  const c = norm(cat);
  if (!c || c === 'all') return ['all'];

  const map = {
    realestate: ['realestate', 'real_estate', 'realestate ', 'real_estate '],
    real_estate: ['realestate', 'real_estate'],
    mobiles: ['mobiles', 'phones'],
    phones: ['phones', 'mobiles'],
  };

  return map[c] ? map[c] : [c];
}

export default function CategoryListings({ category }) {
  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const aliases = getCategoryAliases(category);

    setLoading(true);
    setErr('');

    // ✅ نجلب آخر 500 إعلان (خفيف ومضمون) ثم نفلتر
    const ref = db.collection('listings').orderBy('createdAt', 'desc').limit(500);

    const unsub = ref.onSnapshot(
      (snap) => {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.isActive !== false && l.hidden !== true);

        // ✅ فلترة القسم
        const filteredByCat =
          aliases.includes('all')
            ? all
            : all.filter((l) => aliases.includes(norm(l.category)));

        setItems(filteredByCat);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e?.message || 'فشل تحميل إعلانات القسم');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [category]);

  const filtered = useMemo(() => {
    const s = norm(q);
    if (!s) return items;

    return items.filter((l) => {
      const title = norm(l.title);
      const city = norm(l.city);
      const desc = norm(l.description);
      const loc = norm(l.locationLabel);
      return title.includes(s) || city.includes(s) || desc.includes(s) || loc.includes(s);
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
      {/* شريط أدوات: شبكة/قائمة/خريطة + بحث */}
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className={`btn ${view === 'grid' ? 'btnPrimary' : ''}`} onClick={() => setView('grid')}>
              ◼️ شبكة
            </button>
            <button type="button" className={`btn ${view === 'list' ? 'btnPrimary' : ''}`} onClick={() => setView('list')}>
              ☰ قائمة
            </button>
            <button type="button" className={`btn ${view === 'map' ? 'btnPrimary' : ''}`} onClick={() => setView('map')}>
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
