'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted">جاري تحميل الخريطة…</div>
    </div>
  ),
});

export default function CategoryListings({ category, pageSize = 24 }) {
  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState('grid'); // grid | list | map

  // تذكر وضع العرض لكل الأقسام
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('categoryViewMode');
    if (saved === 'grid' || saved === 'list' || saved === 'map') setViewMode(saved);
  }, []);

  const setMode = (m) => {
    setViewMode(m);
    if (typeof window !== 'undefined') window.localStorage.setItem('categoryViewMode', m);
  };

  const titleFromItem = (d) => d?.title || d?.name || 'إعلان';

  const firstImage = (d) => {
    const arr = d?.images || d?.photos || [];
    const v = Array.isArray(arr) && arr.length ? arr[0] : '';
    return typeof v === 'string' ? v : '';
  };

  const formatPrice = (d) => {
    const price = d?.price;
    const currency = d?.currency || d?.priceCurrency || '';
    if (price === undefined || price === null || price === '') return '';
    const num = typeof price === 'number' ? price : Number(String(price).replace(/[^\d.]/g, ''));
    const safe = Number.isFinite(num) ? num.toLocaleString('ar') : String(price);
    return currency ? `${safe} ${currency}` : safe;
  };

  const formatDate = (ts) => {
    try {
      const dt = ts?.toDate ? ts.toDate() : null;
      if (!dt) return '';
      return dt.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // هل الإعلان فيه إحداثيات؟ (حتى نعرضه على الخريطة)
  const hasCoords = (d) => {
    const lat =
      (typeof d?.lat === 'number' && d.lat) ||
      (typeof d?.latitude === 'number' && d.latitude) ||
      (typeof d?.location?.lat === 'number' && d.location.lat) ||
      (typeof d?.coords?.lat === 'number' && d.coords.lat);

    const lng =
      (typeof d?.lng === 'number' && d.lng) ||
      (typeof d?.longitude === 'number' && d.longitude) ||
      (typeof d?.location?.lng === 'number' && d.location.lng) ||
      (typeof d?.coords?.lng === 'number' && d.coords.lng);

    return Number.isFinite(lat) && Number.isFinite(lng);
  };

  const queryBase = useMemo(() => {
    // Firestore compat — يحتاج createdAt موجود + Index (مرة واحدة)
    return db.collection('listings').where('category', '==', category).orderBy('createdAt', 'desc');
  }, [category]);

  const loadFirst = async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await queryBase.limit(pageSize).get();
      const docs = snap.docs || [];
      setItems(docs.map((d) => ({ id: d.id, ...d.data() })));
      setLastDoc(docs.length ? docs[docs.length - 1] : null);
    } catch (e) {
      console.error('CATEGORY_LOAD_ERROR', e);
      setError('تعذر تحميل الإعلانات حالياً');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastDoc) return;
    setMoreLoading(true);
    setError('');
    try {
      const snap = await queryBase.startAfter(lastDoc).limit(pageSize).get();
      const docs = snap.docs || [];
      const next = docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((prev) => [...prev, ...next]);
      setLastDoc(docs.length ? docs[docs.length - 1] : null);
    } catch (e) {
      console.error('CATEGORY_MORE_ERROR', e);
      setError('تعذر تحميل المزيد');
    } finally {
      setMoreLoading(false);
    }
  };

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const mapListings = useMemo(() => items.filter(hasCoords), [items]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="muted">جارٍ تحميل الإعلانات…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ color: '#991b1b', fontWeight: 800 }}>{error}</div>
        <button className="btnPrimary" style={{ marginTop: 12 }} onClick={loadFirst}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ شريط التبديل */}
      <div className="toolbar">
        <div className="toggle">
          <button
            type="button"
            className={`tbtn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setMode('grid')}
          >
            ◼️◼️ شبكة
          </button>
          <button
            type="button"
            className={`tbtn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setMode('list')}
          >
            ☰ قائمة
          </button>
          <button
            type="button"
            className={`tbtn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setMode('map')}
          >
            🗺️ خريطة
          </button>
        </div>

        <div className="muted" style={{ fontWeight: 800 }}>
          {items.length} إعلان
        </div>
      </div>

      {/* ✅ عرض خريطة */}
      {viewMode === 'map' ? (
        <div className="mapWrap">
          {mapListings.length ? (
            <HomeMapView listings={mapListings} />
          ) : (
            <div className="card" style={{ padding: 16 }}>
              <div className="muted">
                لا توجد إعلانات بإحداثيات داخل هذا القسم حالياً.
                <br />
                (لازم كل إعلان يحتوي lat/lng أو location.lat/lng)
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ✅ عرض قائمة/شبكة */}
      {viewMode !== 'map' ? (
        items.length ? (
          <div className={`grid ${viewMode === 'list' ? 'list' : ''}`}>
            {items.map((it) => {
              const img = firstImage(it);
              const price = formatPrice(it);
              const dt = formatDate(it?.createdAt);
              const city = it?.city || it?.location || '';

              return (
                <Link key={it.id} href={`/listing/${it.id}`} className="item">
                  <div className="thumb">
                    {img ? <img src={img} alt={titleFromItem(it)} /> : <div className="ph">🛒</div>}
                  </div>

                  <div className="body">
                    <div className="t">{titleFromItem(it)}</div>
                    {price ? <div className="p">{price}</div> : null}
                    <div className="m">
                      {city ? <span>📍 {city}</span> : <span />}
                      {dt ? <span>{dt}</span> : <span />}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted">لا توجد إعلانات في هذا القسم حالياً.</div>
          </div>
        )
      ) : null}

      {/* تحميل المزيد */}
      {viewMode !== 'map' ? (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          {lastDoc ? (
            <button className="btnPrimary" onClick={loadMore} disabled={moreLoading}>
              {moreLoading ? 'جارٍ التحميل…' : 'تحميل المزيد'}
            </button>
          ) : items.length ? (
            <div className="muted">انتهت النتائج</div>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 14px;
        }
        .muted { color: #64748b; }

        .toolbar{
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .toggle{
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tbtn{
          border:1px solid rgba(0,0,0,.10);
          background:#fff;
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 900;
          cursor: pointer;
        }
        .tbtn.active{
          border-color: rgba(15,52,96,.35);
          background: rgba(15,52,96,.06);
        }

        .btnPrimary{
          border:0;
          border-radius: 12px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #0F3460, #1A1A2E);
          color:#fff;
          font-weight: 900;
          cursor:pointer;
        }
        .btnPrimary:disabled{ opacity:.7; cursor:not-allowed; }

        .mapWrap{
          height: 520px;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 14px;
          border:1px solid rgba(0,0,0,.08);
          background:#fff;
        }

        .grid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .grid.list{
          grid-template-columns: 1fr;
        }

        .item{
          display:block;
          text-decoration:none;
          color: inherit;
          border:1px solid rgba(0,0,0,.08);
          background:#fff;
          border-radius: 14px;
          overflow:hidden;
          box-shadow: 0 10px 20px rgba(0,0,0,.04);
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .item:hover{
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0,0,0,.06);
        }

        .thumb{
          height: 140px;
          background:#f1f5f9;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .grid.list .thumb{
          height: 170px;
        }
        .thumb img{
          width:100%;
          height:100%;
          object-fit: cover;
          display:block;
        }
        .ph{ font-size: 26px; opacity:.8; }

        .body{ padding: 10px 10px 12px; }
        .t{
          font-weight: 900;
          font-size: 14px;
          line-height: 1.5;
          color:#0f172a;
          margin-bottom: 6px;
          overflow:hidden;
          display:-webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .p{
          font-weight: 900;
          color:#0F3460;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .m{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          color:#64748b;
          font-size: 12px;
          font-weight: 700;
        }

        @media (min-width: 768px){
          .grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .grid.list{ grid-template-columns: 1fr; }
          .thumb{ height: 170px; }
          .t{ font-size: 15px; }
        }
        @media (max-width: 768px){
          .mapWrap{ height: 420px; }
        }
      `}</style>
    </div>
  );
}
