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

function normalizeSlug(slug) {
  const s = String(slug || '').trim();
  if (s === 'real_estate') return 'realestate';
  if (s === 'heavy-equipment') return 'heavy_equipment';
  if (s === 'heavyEquipment') return 'heavy_equipment';
  if (s === 'net') return 'networks';
  if (s === 'network') return 'networks';
  return s;
}

function tsToMillis(v) {
  // Firestore Timestamp
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  // {seconds, nanoseconds}
  if (v && typeof v.seconds === 'number') return v.seconds * 1000;
  // JS Date
  if (v instanceof Date) return v.getTime();
  return 0;
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

    const base = db.collection('listings');

    // ✅ نتجنب orderBy مع where لتفادي مشكلة الـ index
    const ref =
      cat && cat !== 'all'
        ? base.where('category', '==', cat).limit(300)
        : base.orderBy('createdAt', 'desc').limit(300);

    const unsub = ref.onSnapshot(
      (snap) => {
        let data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.isActive !== false && l.hidden !== true);

        // ✅ فلترة محلية “دائمًا” كحزام أمان
        if (cat && cat !== 'all') {
          data = data.filter((l) => normalizeSlug(l.category) === cat);
        }

        // ✅ ترتيب محلي بالوقت
        data.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));

        setItems(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e?.message || 'فشل تحميل الإعلانات');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [category]);

  const filtered = useMemo(() => {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return items;

    return items.filter((l) => {
      const title = String(l.title || '').toLowerCase();
      const city = String(l.city || '').toLowerCase();
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
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className={'btn ' + (view === 'grid' ? 'btnPrimary' : '')} onClick={() => setView('grid')}>
              ◼️ شبكة
            </button>
            <button className={'btn ' + (view === 'list' ? 'btnPrimary' : '')} onClick={() => setView('list')}>
              ☰ قائمة
            </button>
            <button className={'btn ' + (view === 'map' ? 'btnPrimary' : '')} onClick={() => setView('map')}>
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
