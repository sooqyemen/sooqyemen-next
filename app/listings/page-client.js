// app/listings/page-client.js
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import Price from '@/components/Price';
import ListingCard from '@/components/ListingCard';

// Dynamically import the map component with SSR disabled
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
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>جاري تحميل الخريطة...</div>
      <div style={{ fontSize: '14px', color: '#6c757d' }}>يرجى الانتظار</div>
    </div>
  ),
});

// ✅ Blur placeholder لتحسين تجربة تحميل الصور
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
      className="card mobile-card"
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        alignItems: 'center',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '10px',
        background: 'white',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* حاوية الصورة */}
      <div
        className="mobile-card-image"
        style={{
          width: 140,
          height: 140,
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#f8fafc',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {img ? (
          <Image
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            fill
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="140px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#94a3b8',
              background: '#f1f5f9',
            }}
          >
            🖼️
          </div>
        )}
      </div>

      {/* محتوى البطاقة */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* العنوان والسعر */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1e293b',
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {listing.title || 'بدون عنوان'}
          </h3>

          <div style={{ flexShrink: 0 }}>
            <Price listing={listing} variant="compact" maxConversions={2} />
          </div>
        </div>

        {/* معلومات */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748b' }}>
            <span>📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748b' }}>
            <span>⏱️</span>
            <span>{formatRelative(listing.createdAt)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748b' }}>
            <span>👁️</span>
            <span>{Number(listing.views || 0).toLocaleString('ar-YE')}</span>
          </div>

          {listing.auctionEnabled && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              ⚡ مزاد نشط
            </span>
          )}
        </div>

        {/* الوصف المختصر */}
        <p
          style={{
            fontSize: '14px',
            color: '#475569',
            lineHeight: 1.5,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {shortDesc}
        </p>

        {/* فئة */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '16px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            {listing.categoryName || listing.category || 'قسم'}
          </span>

          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>اضغط للتفاصيل →</div>
        </div>
      </div>
    </Link>
  );
}

// خيارات الترتيب
const SORT_OPTIONS = [
  { key: 'newest', label: 'الأحدث', icon: '🕒', field: 'createdAt', order: 'desc' },
  { key: 'price_low', label: 'الأقل سعراً', icon: '💰', field: 'priceYER', order: 'asc' },
  { key: 'price_high', label: 'الأعلى سعراً', icon: '💰', field: 'priceYER', order: 'desc' },
  { key: 'most_viewed', label: 'الأكثر مشاهدة', icon: '👁️', field: 'views', order: 'desc' },
  { key: 'featured', label: 'المميز أولاً', icon: '⭐', field: 'featured', order: 'desc' },
];

export default function ListingsPageClient({ initialListings = [] }) {
  const PAGE_SIZE = 24;

  const [view, setView] = useState('grid');
  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(initialListings.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [hasMore, setHasMore] = useState(true);

  // ✅ فلاتر (Desktop panel + Mobile sheet)
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const searchParams = useSearchParams();
  const lastDocRef = useRef(null);
  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ detect mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // ✅ lock body scroll when sheet open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobile && showFilters) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
  }, [isMobile, showFilters]);

  // ✅ view from query
  useEffect(() => {
    const v = String(searchParams?.get('view') || '').toLowerCase();
    if (v === 'map' || v === 'list' || v === 'grid') {
      setView((prev) => (prev === v ? prev : v));
    }
    const s = searchParams?.get('sort');
    if (s && SORT_OPTIONS.some((opt) => opt.key === s)) setSortBy(s);
  }, [searchParams]);

  // ✅ fetch first if SSR empty
  useEffect(() => {
    if (initialListings && initialListings.length > 0) {
      setListings(initialListings);
      setLoading(false);
      setErr('');
      setHasMore(initialListings.length === PAGE_SIZE);
      lastDocRef.current = null;
      return;
    }

    let cancelled = false;

    const fetchFirst = async () => {
      setLoading(true);
      setErr('');

      try {
        const { db } = await import('@/lib/firebaseClient');
        if (cancelled) return;

        const snap = await db.collection('listings').orderBy('createdAt', 'desc').limit(PAGE_SIZE).get();

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
  }, [initialListings, PAGE_SIZE]);

  // ✅ filter + sort
  const filteredAndSorted = useMemo(() => {
    const filtered = search.trim()
      ? listings.filter((l) => {
          const q = search.toLowerCase();
          const title = safeText(l.title).toLowerCase();
          const city = safeText(l.city).toLowerCase();
          const desc = safeText(l.description).toLowerCase();
          const loc = safeText(l.locationLabel).toLowerCase();
          return title.includes(q) || city.includes(q) || desc.includes(q) || loc.includes(q);
        })
      : [...listings];

    const sortOption = SORT_OPTIONS.find((opt) => opt.key === sortBy) || SORT_OPTIONS[0];

    return filtered.sort((a, b) => {
      let valA = a[sortOption.field];
      let valB = b[sortOption.field];

      if (sortOption.field === 'featured') {
        valA = a.featured ? 1 : 0;
        valB = b.featured ? 1 : 0;
      }

      if (sortOption.field === 'priceYER') {
        valA = a.currentBidYER || a.priceYER || 0;
        valB = b.currentBidYER || b.priceYER || 0;
      }

      if (sortOption.order === 'desc') return (valB || 0) - (valA || 0);
      return (valA || 0) - (valB || 0);
    });
  }, [listings, search, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setErr('');

    try {
      const { db } = await import('@/lib/firebaseClient');

      if (!lastDocRef.current) {
        const snap0 = await db.collection('listings').orderBy('createdAt', 'desc').limit(PAGE_SIZE).get();
        lastDocRef.current = snap0.docs[snap0.docs.length - 1] || null;

        if (!lastDocRef.current) {
          if (!aliveRef.current) return;
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

      setListings((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...items.filter((x) => !existing.has(x.id))];
      });

      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error('[ListingsPageClient] loadMore error:', e);
      if (!aliveRef.current) return;
      setErr('تعذر تحميل المزيد. حاول مرة أخرى.');
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, PAGE_SIZE]);

  // ✅ infinite scroll
  useEffect(() => {
    if (view === 'map') return;

    const el = loadMoreRef.current;
    if (!el) return;
    if (!hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingMore || !hasMore) return;
        loadMore();
      },
      { root: null, rootMargin: '800px 0px', threshold: 0 }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
  }, [view, hasMore, loading, loadingMore, loadMore]);

  // ✅ Inject once & DON'T remove (حتى ما يختفي الشكل)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'listings-page-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .listings-page .search-input:focus{outline:none;border-color:#3b82f6 !important;background:#fff !important;box-shadow:0 0 0 3px rgba(59,130,246,.10)}
      .listings-page select:focus{outline:none;border-color:#3b82f6 !important;box-shadow:0 0 0 3px rgba(59,130,246,.10)}
      .listings-page .view-btn:hover:not(.active){background:#f1f5f9 !important}

      /* Mobile card tweaks */
      @media (max-width:768px){
        .listings-page .container{padding-left:12px !important;padding-right:12px !important}
        .listings-page .mobile-card{flex-direction:column !important;align-items:stretch !important;gap:12px !important}
        .listings-page .mobile-card-image{width:100% !important;height:180px !important}
      }
      @media (max-width:640px){
        /* ✅ make view buttons like chips and hide labels */
        .listings-page .view-btn{padding:8px 10px !important;font-size:13px !important;min-width:0 !important}
        .listings-page .view-btn .vLabel{display:none !important}
        .listings-page .view-btn .vIcon{font-size:16px}

        .listings-page .filters-btn{width:100%;justify-content:center}
      }

      /* ✅ Bottom Sheet */
      .mSheetWrap{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center}
      .mSheetBackdrop{position:absolute;inset:0;background:rgba(0,0,0,.35)}
      .mSheet{position:relative;width:100%;max-width:520px;background:#fff;border-top-left-radius:18px;border-top-right-radius:18px;
              box-shadow:0 -10px 30px rgba(0,0,0,.15);padding:14px 14px 18px}
      .mSheetHeader{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
      .mSheetClose{border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:800;color:#334155}
      .mSheetBody{padding-top:12px;display:flex;flex-direction:column;gap:10px}
      .mLabel{font-size:13px;font-weight:800;color:#475569}
      .mSelect{width:100%;padding:12px 12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-size:15px}
      .mActions{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .mBtn{padding:12px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:900;cursor:pointer}
      .mBtnPrimary{padding:12px;border-radius:12px;border:none;background:#3b82f6;color:#fff;font-weight:1000;cursor:pointer}
    `;
    document.head.appendChild(style);
  }, []);

  const resetFilters = () => {
    setSearch('');
    setSortBy('newest');
  };

  return (
    <div dir="rtl" className="listings-page">
      <div className="container" style={{ paddingTop: '20px', paddingBottom: '30px' }}>
        {/* العنوان الرئيسي */}
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            borderRadius: '16px',
            border: 'none',
          }}
        >
          <div style={{ fontWeight: '900', fontSize: '24px', marginBottom: '6px' }}>جميع الإعلانات</div>
          <div style={{ fontSize: '15px', opacity: 0.9 }}>
            تصفّح {listings.length.toLocaleString('ar-YE')} إعلان مع بحث وعرض شبكة/قائمة/خريطة
          </div>
        </div>

        {/* شريط الأدوات */}
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            background: 'white',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ✅ Views row */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '6px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  flex: 1,
                  minWidth: 220,
                }}
              >
                <button
                  className={`view-btn ${view === 'grid' ? 'active' : ''}`}
                  onClick={() => setView('grid')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'grid' ? '#3b82f6' : 'transparent',
                    color: view === 'grid' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">◼️</span>
                  <span className="vLabel">شبكة</span>
                </button>

                <button
                  className={`view-btn ${view === 'list' ? 'active' : ''}`}
                  onClick={() => setView('list')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'list' ? '#3b82f6' : 'transparent',
                    color: view === 'list' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">☰</span>
                  <span className="vLabel">قائمة</span>
                </button>

                <button
                  className={`view-btn ${view === 'map' ? 'active' : ''}`}
                  onClick={() => setView('map')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: view === 'map' ? '#3b82f6' : 'transparent',
                    color: view === 'map' ? 'white' : '#475569',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <span className="vIcon">🗺️</span>
                  <span className="vLabel">خريطة</span>
                </button>
              </div>

              <button
                className="filters-btn"
                onClick={() => setShowFilters(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  minWidth: 140,
                }}
              >
                ⚙️ ترتيب/فلاتر
              </button>
            </div>

            {/* Search */}
            <div style={{ width: '100%', position: 'relative' }}>
              <input
                className="search-input"
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '15px',
                  background: '#f8fafc',
                  transition: 'all 0.2s ease',
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 ابحث في العناوين، الوصف، أو المدينة..."
              />
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  opacity: 0.6,
                }}
              >
                🔍
              </div>
            </div>

            {/* Count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                <span style={{ fontWeight: '900', color: '#3b82f6' }}>
                  {filteredAndSorted.length.toLocaleString('ar-YE')}
                </span>{' '}
                إعلان متاح
              </div>

              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {search && (
                  <span>
                    نتائج البحث عن: "<strong>{search}</strong>"
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Mobile/All Bottom Sheet (sorting only now) */}
        {showFilters && (
          <div className="mSheetWrap" role="dialog" aria-modal="true" aria-label="ترتيب/فلاتر">
            <div className="mSheetBackdrop" onClick={() => setShowFilters(false)} />
            <div className="mSheet">
              <div className="mSheetHeader">
                <div style={{ fontWeight: 1000, fontSize: 16 }}>⚙️ الترتيب والفلاتر</div>
                <button className="mSheetClose" onClick={() => setShowFilters(false)} aria-label="إغلاق">
                  ✕
                </button>
              </div>

              <div className="mSheetBody">
                <div>
                  <div className="mLabel">ترتيب حسب</div>
                  <select className="mSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mActions">
                  <button className="mBtn" onClick={resetFilters}>
                    🗑️ مسح الكل
                  </button>
                  <button className="mBtnPrimary" onClick={() => setShowFilters(false)}>
                    ✅ تطبيق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* المحتوى */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #f1f5f9',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px',
              }}
            />
            <div style={{ fontWeight: '900', fontSize: '16px', marginBottom: '8px', color: '#1e293b' }}>
              جاري تحميل الإعلانات...
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              {initialListings.length > 0 ? 'جاري تحديث القائمة' : 'جاري تحميل الإعلانات'}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : err && listings.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '24px',
              border: '1px solid rgba(220,38,38,0.2)',
              background: '#fef2f2',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontWeight: '900', fontSize: '18px', color: '#991b1b', marginBottom: '8px' }}>حدث خطأ</div>
            <div style={{ fontSize: '15px', color: '#64748b', marginBottom: '16px' }}>{err}</div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🔄 إعادة المحاولة
            </button>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontWeight: '900', fontSize: '18px', marginBottom: '8px' }}>لا توجد نتائج مطابقة</div>
            <div style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px', maxWidth: 400, margin: '0 auto 24px' }}>
              {search ? `لم نعثر على إعلانات تطابق "${search}"` : 'لا توجد إعلانات متاحة حالياً'}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSearch('')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🗑️ مسح البحث
              </button>
              <Link
                href="/add"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                ➕ أضف إعلان جديد
              </Link>
            </div>
          </div>
        ) : view === 'map' ? (
          <HomeMapView listings={filteredAndSorted} />
        ) : view === 'list' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredAndSorted.map((l) => (
                <ListingRow key={l.id} listing={l} />
              ))}
            </div>
            <div ref={loadMoreRef} style={{ height: '1px', margin: '20px 0' }} />
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {filteredAndSorted.map((l) => (
                <ListingCard key={l.id} listing={l} variant="grid" />
              ))}
            </div>
            <div ref={loadMoreRef} style={{ height: '1px', margin: '20px 0' }} />
          </>
        )}
      </div>
    </div>
  );
}
