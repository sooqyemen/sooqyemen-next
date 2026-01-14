// /app/listings/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import Price from '@/components/Price';
import ListingCard from '@/components/ListingCard';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: '#f8f9fa',
        borderRadius: '12px',
        border: '2px dashed #dee2e6',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        جاري تحميل الخريطة...
      </div>
      <div style={{ fontSize: '14px', color: '#6c757d' }}>يرجى الانتظار</div>
    </div>
  ),
});

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

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
    if (mins <= 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    if (hrs < 24) return `قبل ${hrs} ساعة`;
    if (days < 7) return `قبل ${days} يوم`;
    if (days < 30) return `قبل ${Math.floor(days / 7)} أسبوع`;
    return d.toLocaleDateString('ar-YE');
  } catch {
    return 'قبل قليل';
  }
}

function ListingRow({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || null;
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 120)}...` : desc || '—';

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="card"
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#f1f5f9',
          flexShrink: 0,
        }}
      >
        {img ? (
          <Image
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            width={150}
            height={150}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="150px"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              opacity: 0.6,
            }}
          >
            🖼️
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.35,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {listing.title || 'بدون عنوان'}
          </div>

          <div style={{ flexShrink: 0, fontWeight: 900 }}>
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
              originalPrice={listing.originalPrice}
              originalCurrency={listing.originalCurrency}
              showCurrency={true}
            />
          </div>
        </div>

        <div className="row muted" style={{ flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
          <span>📍 {listing.city || listing.locationLabel || 'غير محدد'}</span>
          <span>⏱️ {formatRelative(listing.createdAt)}</span>
          <span>👁️ {Number(listing.views || 0).toLocaleString('ar-YE')}</span>
          {listing.auctionEnabled ? <span className="badge">⚡ مزاد</span> : null}
        </div>

        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{shortDesc}</div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          a.card {
            flex-direction: column;
          }
          a.card > div:first-child {
            width: 100% !important;
            height: 180px !important;
          }
        }
      `}</style>
    </Link>
  );
}

export default function ListingsPageClient({ initialListings = [] }) {
  const PAGE_SIZE = 24; // نفس رقم SSR

  const [view, setView] = useState('grid'); // grid | list | map
  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(initialListings.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ تحميل أول صفحة من Firestore فقط لو SSR فاضي
  useEffect(() => {
    // إذا عندنا SSR، ما نعمل سحب كبير ولا realtime.
    if (initialListings && initialListings.length > 0) {
      setListings(initialListings);
      setLoading(false);

      // نعتبر أن فيه "ممكن المزيد" طالما استلمنا PAGE_SIZE كاملة
      setHasMore(initialListings.length === PAGE_SIZE);

      // ملاحظة: للـ pagination نحتاج lastDoc من Firestore، لكن SSR جاي كـ plain objects.
      // لذلك سنجلب صفحة صغيرة (PAGE_SIZE) فقط عند أول ضغط "تحميل المزيد" لتحديد المؤشر بشكل صحيح.
      // هذا أفضل من سحب 500.
      lastDocRef.current = null;
      return;
    }

    // لو SSR فاضي -> نجلب أول PAGE_SIZE
    let cancelled = false;

    const fetchFirst = async () => {
      setLoading(true);
      setErr('');

      try {
        const { db } = await import('@/lib/firebaseClient');
        if (cancelled) return;

        const snap = await db
          .collection('listings')
          .orderBy('createdAt', 'desc')
          .limit(PAGE_SIZE)
          .get();

        const items = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((l) => l.isActive !== false && l.hidden !== true);

        if (!aliveRef.current || cancelled) return;

        setListings(items);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      } catch (e) {
        console.error('[ListingsPageClient] fetchFirst error:', e);
        if (!aliveRef.current || cancelled) return;
        setErr('تعذر تحميل الإعلانات. يرجى المحاولة لاحقاً.');
        setLoading(false);
        setHasMore(false);
      }
    };

    fetchFirst();

    return () => {
      cancelled = true;
    };
  }, [initialListings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter((l) => {
      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const desc = safeText(l.description).toLowerCase();
      const loc = safeText(l.locationLabel).toLowerCase();
      return title.includes(q) || city.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [listings, search]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setErr('');

    try {
      const { db } = await import('@/lib/firebaseClient');

      // ✅ إذا كانت lastDocRef null (غالبًا لأننا بدأنا بـ SSR)
      // نجلب الصفحة الأولى من Firestore مرة واحدة فقط لتحديد cursor الصحيح
      if (!lastDocRef.current) {
        const snap0 = await db
          .collection('listings')
          .orderBy('createdAt', 'desc')
          .limit(PAGE_SIZE)
          .get();

        lastDocRef.current = snap0.docs[snap0.docs.length - 1] || null;

        // إذا مافي cursor، مافي المزيد
        if (!lastDocRef.current) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
      }

      const snap = await db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .startAfter(lastDocRef.current)
        .limit(PAGE_SIZE)
        .get();

      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      // دمج بدون تكرار (احتياط)
      const existing = new Set(listings.map((x) => x.id));
      const merged = [...listings, ...items.filter((x) => !existing.has(x.id))];

      setListings(merged);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error('[ListingsPageClient] loadMore error:', e);
      if (!aliveRef.current) return;
      setErr('تعذر تحميل المزيد. حاول مرة أخرى.');
      setLoadingMore(false);
    }
  };

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 24 }}>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>جميع الإعلانات</div>
          <div className="muted" style={{ marginTop: 6 }}>
            تصفّح كل الإعلانات مع بحث وعرض شبكة/قائمة/خريطة
          </div>
        </div>

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الإعلانات…"
            />

            <Link className="btn btnPrimary" href="/add">
              ➕ أضف إعلان
            </Link>

            <div className="muted" style={{ fontWeight: 900 }}>
              {filtered.length} إعلان
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 16 }}>
            <div className="muted">جاري التحميل…</div>
          </div>
        ) : err ? (
          <div className="card" style={{ padding: 16, border: '1px solid rgba(220,38,38,.25)' }}>
            <div style={{ fontWeight: 900, color: '#991b1b' }}>⚠️ {err}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 900 }}>لا توجد نتائج مطابقة</div>
            <div className="muted" style={{ marginTop: 6 }}>
              جرّب كلمة بحث أخرى أو أضف إعلان جديد.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/add">
                ➕ أضف إعلان
              </Link>
            </div>
          </div>
        ) : view === 'map' ? (
          <HomeMapView listings={filtered} />
        ) : view === 'list' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((l) => (
                <ListingRow key={l.id} listing={l} />
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
              {hasMore ? (
                <button className={`btn ${loadingMore ? '' : 'btnPrimary'}`} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? '...جاري تحميل المزيد' : 'تحميل المزيد'}
                </button>
              ) : (
                <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
              {hasMore ? (
                <button className={`btn ${loadingMore ? '' : 'btnPrimary'}`} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? '...جاري تحميل المزيد' : 'تحميل المزيد'}
                </button>
              ) : (
                <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
