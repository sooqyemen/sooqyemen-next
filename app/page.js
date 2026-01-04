// app/page.jsx (متوافق مع مشروعك الحالي بدون أي تعديلات على Firestore)
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Price from '@/components/Price';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
  loading: () => (
    <div className="card muted" style={{ textAlign: 'center' }}>
      جاري تحميل الخريطة...
    </div>
  ),
});

// ✅ نفس مفاتيح الأقسام المستخدمة عندك (لا تغيّرها إلا إذا كنت متأكد)
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋' },

  { key: 'cars', label: 'سيارات', icon: '🚗' },
  { key: 'real_estate', label: 'عقارات', icon: '🏡' },

  // مهم: في مشروعك صفحة الإضافة تستخدم mobiles
  { key: 'mobiles', label: 'جوالات', icon: '📱' },

  { key: 'electronics', label: 'إلكترونيات', icon: '💻' },
  { key: 'motorcycles', label: 'دراجات نارية', icon: '🏍️' },
  { key: 'heavy_equipment', label: 'معدات ثقيلة', icon: '🚜' },
  { key: 'solar', label: 'طاقة شمسية', icon: '☀️' },
  { key: 'networks', label: 'نت و شبكات', icon: '📡' },
  { key: 'maintenance', label: 'صيانة', icon: '🛠️' },

  { key: 'furniture', label: 'أثاث', icon: '🛋️' },
  { key: 'animals', label: 'حيوانات و طيور', icon: '🐑' },
  { key: 'jobs', label: 'وظائف', icon: '💼' },
  { key: 'services', label: 'خدمات', icon: '🧰' },
];

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

function formatRelative(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return 'قبل قليل';
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins <= 1) return 'قبل قليل';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    if (hrs < 24) return `قبل ${hrs} ساعة`;
    if (days < 7) return `قبل ${days} يوم`;
    return d.toLocaleDateString('ar');
  } catch {
    return 'قبل قليل';
  }
}

function HomeListingCard({ listing }) {
  const img =
    (Array.isArray(listing.images) && listing.images[0]) ||
    listing.image ||
    null;

  const catKey = String(listing.category || '').toLowerCase();
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);

  const desc = safeText(listing.description).trim();
  const shortDesc =
    desc.length > 90 ? `${desc.slice(0, 90)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link">
      <div className="card listing-card">
        {img ? (
          <img
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            className="listing-img"
            loading="lazy"
          />
        ) : (
          <div className="img-fallback">🖼️</div>
        )}

        <div className="card-body">
          <div className="top-row">
            <div className="title" title={listing.title || ''}>
              {listing.title || 'بدون عنوان'}
            </div>
            {catObj ? (
              <div className="cat-pill">
                <span className="cat-ic">{catObj.icon}</span>
                <span>{catObj.label}</span>
              </div>
            ) : null}
          </div>

          <div className="muted loc">
            <span>📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <div className="desc muted">{shortDesc}</div>

          <div className="price">
            <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
          </div>

          <div className="meta muted">
            <span>👁️ {Number(listing.views || 0)}</span>
            <span className="dot">•</span>
            <span>⏱️ {formatRelative(listing.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SearchBar({ search, setSearch, suggestions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="search-wrap" ref={ref}>
      <div className="search-bar">
        <input
          className="search-input"
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            setOpen(!!v.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setOpen(false);
          }}
          placeholder="ابحث باسم المنتج أو المدينة أو القسم..."
        />
        <button className="search-btn" type="button" onClick={() => setOpen(false)}>
          بحث
        </button>
      </div>

      {open && suggestions.length > 0 ? (
        <div className="suggest">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggest-item"
              type="button"
              onClick={() => {
                setSearch(s);
                setOpen(false);
              }}
            >
              🔎 {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // list | map

  // ✅ جلب الإعلانات: متوافق مع مشروعك الحالي (لا status ولا featured ولا indexes إضافية)
  useEffect(() => {
    setLoading(true);
    setErr('');

    try {
      const unsub = db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(80)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setListings(data);
            setLoading(false);
          },
          (e) => {
            console.error('Firestore home error:', e);
            setErr(e?.message || 'حدث خطأ في جلب الإعلانات');
            setLoading(false);
          }
        );

      return () => unsub();
    } catch (e) {
      console.error('Firestore home fatal:', e);
      setErr('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);

  // ✅ اقتراحات بحث (من العناوين والمدن والأقسام)
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const set = new Set();
    for (const l of listings) {
      const title = safeText(l.title);
      const city = safeText(l.city);
      const cat = safeText(l.category);

      if (title.toLowerCase().includes(q)) set.add(title);
      if (city.toLowerCase().includes(q)) set.add(city);
      if (cat.toLowerCase().includes(q)) set.add(cat);
      if (set.size >= 6) break;
    }
    return Array.from(set).slice(0, 6);
  }, [search, listings]);

  // ✅ فلترة: نعتمد على isActive/hidden إن وجدت بدون ما نطلب index
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catSelected = String(selectedCategory || 'all').toLowerCase();

    return (listings || [])
      .filter((l) => {
        // لو فيه isActive وخاطئة نخفيه
        if (typeof l.isActive === 'boolean' && l.isActive === false) return false;

        // لو فيه hidden true نخفيه عن العامة
        if (l.hidden === true) return false;

        const cat = String(l.category || '').toLowerCase();
        if (catSelected !== 'all' && cat !== catSelected) return false;

        if (!q) return true;

        const title = safeText(l.title).toLowerCase();
        const city = safeText(l.city).toLowerCase();
        const loc = safeText(l.locationLabel).toLowerCase();
        const desc = safeText(l.description).toLowerCase();

        return (
          title.includes(q) ||
          city.includes(q) ||
          loc.includes(q) ||
          desc.includes(q) ||
          cat.includes(q)
        );
      });
  }, [listings, search, selectedCategory]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">سوق اليمن</h1>
          <p className="hero-sub">
            بيع وشراء كل شيء في اليمن — سيارات، عقارات، جوالات، طاقة شمسية، وظائف وأكثر.
          </p>

          <SearchBar search={search} setSearch={setSearch} suggestions={suggestions} />
        </div>
      </section>

      <div className="container" style={{ padding: '14px 0 40px' }}>
        {/* Categories */}
        <div className="cats">
          {CATEGORY_CONFIG.map((c) => {
            const active = selectedCategory === c.key;
            return (
              <button
                key={c.key}
                type="button"
                className={'cat ' + (active ? 'active' : '')}
                onClick={() => setSelectedCategory(c.key)}
              >
                <span className="cat-emoji">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="toolbar">
          <div className="toggle">
            <button
              type="button"
              className={'tbtn ' + (viewMode === 'list' ? 'on' : '')}
              onClick={() => setViewMode('list')}
            >
              📋 قائمة
            </button>
            <button
              type="button"
              className={'tbtn ' + (viewMode === 'map' ? 'on' : '')}
              onClick={() => setViewMode('map')}
            >
              🗺️ خريطة
            </button>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            النتائج: {filtered.length}
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center' }}>
            جاري تحميل الإعلانات...
          </div>
        ) : err ? (
          <div className="card" style={{ color: '#b91c1c', direction: 'ltr' }}>
            {err}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card muted" style={{ textAlign: 'center' }}>
            لا توجد إعلانات مطابقة حالياً.
          </div>
        ) : viewMode === 'map' ? (
          <HomeMapView listings={filtered} />
        ) : (
          <div className="grid">
            {filtered.map((l) => (
              <HomeListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .hero {
          padding: 26px 0 22px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-align: center;
        }
        .hero-title {
          font-size: 28px;
          font-weight: 900;
          margin: 0 0 8px;
        }
        .hero-sub {
          margin: 0 auto 14px;
          max-width: 720px;
          opacity: 0.92;
          line-height: 1.6;
          font-size: 14px;
        }

        .search-wrap {
          max-width: 720px;
          margin: 0 auto;
          position: relative;
        }
        .search-bar {
          background: #fff;
          border-radius: 999px;
          padding: 4px;
          display: flex;
          gap: 8px;
          align-items: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        }
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 10px 14px;
          border-radius: 999px;
          font-size: 14px;
        }
        .search-btn {
          border: none;
          border-radius: 999px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .suggest {
          position: absolute;
          inset-inline: 0;
          top: calc(100% + 8px);
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
          z-index: 20;
        }
        .suggest-item {
          width: 100%;
          text-align: start;
          background: #fff;
          border: none;
          padding: 10px 12px;
          cursor: pointer;
        }
        .suggest-item:hover {
          background: #f8fafc;
        }

        .cats {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 2px 10px;
          scroll-behavior: smooth;
        }
        .cats::-webkit-scrollbar {
          display: none;
        }
        .cat {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 999px;
          padding: 7px 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
          color: #334155;
        }
        .cat.active {
          border-color: rgba(79, 70, 229, 0.45);
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          font-weight: 700;
        }
        .cat-emoji {
          font-size: 15px;
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 8px 0 12px;
        }
        .toggle {
          display: flex;
          gap: 8px;
        }
        .tbtn {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
        }
        .tbtn.on {
          background: rgba(79, 70, 229, 0.1);
          border-color: rgba(79, 70, 229, 0.45);
          color: #4f46e5;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
        }

        .card-link {
          text-decoration: none;
          color: inherit;
        }

        .listing-card {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #eef2f7;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .listing-img {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }
        .img-fallback {
          width: 100%;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-size: 34px;
        }

        .card-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .title {
          font-weight: 900;
          font-size: 15px;
          color: #0f172a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .cat-pill {
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #334155;
          flex-shrink: 0;
        }

        .loc {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .desc {
          font-size: 12px;
          line-height: 1.6;
        }
        .price {
          margin-top: 4px;
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          margin-top: 4px;
        }
        .dot {
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .listing-img,
          .img-fallback {
            height: 170px;
          }
          .hero-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
