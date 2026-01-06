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

// ✅ توحيد أسماء الأقسام (لو عندك صفحات تستخدم اسم مختلف)
function normalizeCategory(cat) {
  const c = String(cat || '').trim();
  if (!c) return '';

  // وحّد real_estate → realestate (حسب اللي عندك في Firestore)
  if (c === 'real_estate' || c === 'real_estate ') return 'realestate';
  if (c === 'real_estate' || c === 'real_estate') return 'realestate';

  return c;
}

function toMillis(ts) {
  // Firestore Timestamp
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  // Date
  if (ts instanceof Date) return ts.getTime();
  // number
  if (typeof ts === 'number') return ts;
  return 0;
}

export default function CategoryListings({ category }) {
  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const cat = normalizeCategory(category);

    // ✅ لو القسم فاضي لا تحمل شيء (هذا يمنع عرض كل الإعلانات بالغلط)
    if (!cat) {
      setItems([]);
      setLoading(false);
      setErr('القسم غير محدد أو الرابط غير صحيح.');
      return;
    }

    setLoading(true);
    setErr('');

    // ✅ Query بسيط لا يحتاج index غالبًا
    const ref = db
      .collection('listings')
      .where('category', '==', cat)
      .limit(300);

    const unsub = ref.onSnapshot(
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.isActive !== false && l.hidden !== true);

        // ✅ ترتيب محلي (بدون orderBy في Firestore)
        data.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

        setItems(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e?.message || 'فشل تحميل إعلانات القسم');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
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
        <div style={{ marginTop: 12 }}>
          <Link className="btn btnPrimary" href="/">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ شريط أدوات مثل الرئيسية */}
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row toolsRow">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث داخل القسم..."
          />

          <div className="muted" style={{ fontWeight: 900, whiteSpace: 'nowrap' }}>
            {filtered.length} إعلان
          </div>
        </div>
      </div>

      {/* ✅ المحتوى */}
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
        <div className={`gridWrap ${view === 'list' ? 'listMode' : ''}`}>
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} variant={view === 'list' ? 'list' : 'grid'} />
          ))}
        </div>
      )}

      {/* ✅ تحسين للجوال + نفس إحساس الرئيسية */}
      <style jsx>{`
        .toolsRow{
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        :global(.input){
          flex: 1;
          min-width: 180px;
        }

        .gridWrap{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .gridWrap.listMode{
          grid-template-columns: 1fr;
        }

        @media (max-width: 768px) {
          :global(.btn) {
            padding: 8px 10px;
            font-size: 13px;
          }
          .gridWrap{
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .gridWrap.listMode{
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          .gridWrap{
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
