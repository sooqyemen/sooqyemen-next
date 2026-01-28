[file name]: page-client.js
[file content begin]
'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import Price from '@/components/Price';
import WebsiteJsonLd from '@/components/StructuredData/WebsiteJsonLd';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import './home.css';
import { loadFirebaseClient, scheduleIdleCallback } from '@/lib/firebaseLoader';
import { normalizeCategoryKey } from '@/lib/categories';

// تحميل ديناميكي للخريطة (تجنب SSR لمشاكل Leaflet)
const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
  loading: () => (
    <div className="loading-card">
      <div className="spinner"></div>
      <p>جاري تحميل الخريطة...</p>
    </div>
  ),
});

// ==============================
// ✅ Referral (Tracking)
// ==============================
const STORAGE_CODE = 'sooq_ref_code';
const STORAGE_SEEN_AT = 'sooq_ref_seenAt';

function normalizeRefCode(v) {
  return String(v || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
}

// ✅ مفاتيح الأقسام الموحّدة
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋', href: '/' },
  { key: 'cars', label: 'سيارات', icon: '🚗', href: '/cars' },
  { key: 'realestate', label: 'عقارات', icon: '🏡', href: '/realestate' },
  { key: 'phones', label: 'جوالات', icon: '📱', href: '/phones' },
  { key: 'electronics', label: 'إلكترونيات', icon: '💻', href: '/electronics' },
  { key: 'motorcycles', label: 'دراجات نارية', icon: '🏍️', href: '/motorcycles' },
  { key: 'heavy_equipment', label: 'معدات ثقيلة', icon: '🚜', href: '/heavy_equipment' },
  { key: 'solar', label: 'طاقة شمسية', icon: '☀️', href: '/solar' },
  { key: 'networks', label: 'نت وشبكات', icon: '📡', href: '/networks' },
  { key: 'maintenance', label: 'صيانة', icon: '🛠️', href: '/maintenance' },
  { key: 'furniture', label: 'أثاث', icon: '🛋️', href: '/furniture' },
  { key: 'home_tools', label: 'أدوات منزلية', icon: '🧹', href: '/home_tools' },
  { key: 'clothes', label: 'ملابس', icon: '👕', href: '/clothes' },
  { key: 'animals', label: 'حيوانات وطيور', icon: '🐑', href: '/animals' },
  { key: 'jobs', label: 'وظائف', icon: '💼', href: '/jobs' },
  { key: 'services', label: 'خدمات', icon: '🧰', href: '/services' },
  { key: 'other', label: 'أخرى', icon: '📦', href: '/other' },
];

// ✅ ألوان الأقسام (تذييل الصفحة)
const CATEGORY_STYLES = {
  cars: { color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  realestate: { color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  phones: { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  electronics: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  motorcycles: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  heavy_equipment: { color: '#92400e', bg: 'rgba(146,64,14,0.12)' },
  solar: { color: '#eab308', bg: 'rgba(234,179,8,0.14)' },
  networks: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  maintenance: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  furniture: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  home_tools: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  clothes: { color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  animals: { color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
  jobs: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  services: { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  other: { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  all: { color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
};

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

// ✅ بطاقة شبكة (تم تحسين الصور)
function GridListingCard({ listing, priority = false }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const catKey = normalizeCategoryKey(listing.category);
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 60 ? `${desc.slice(0, 60)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link focus-ring">
      <div className="listing-card grid-card compact-card">
        <div className="image-container compact-img">
          {img ? (
            <Image
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="listing-img"
              width={420}
              height={280}
              priority={priority}
              fetchPriority={priority ? 'high' : 'auto'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={(e) => {
                e.target.style.display = 'none';
                const container = e.currentTarget.closest('.image-container');
                const fb = container?.querySelector('.img-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}

          <div className={`img-fallback ${img ? 'hidden' : ''}`}>{catObj?.icon || '🖼️'}</div>
          {listing.auctionEnabled && <div className="auction-badge compact-badge">⚡ مزاد</div>}
        </div>

        <div className="card-content compact-content">
          <div className="card-header compact-header">
            <h3 className="listing-title compact-title" title={listing.title || ''}>
              {listing.title || 'بدون عنوان'}
            </h3>
            {catObj && (
              <span className="category-badge compact-cat">
                <span className="category-icon">{catObj.icon}</span>
              </span>
            )}
          </div>

          <div className="listing-location compact-loc">
            <span className="location-icon">📍</span>
            <span className="loc-text">{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <p className="listing-description compact-desc">{shortDesc}</p>

          <div className="price-section compact-price">
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
              originalPrice={listing.originalPrice}
              originalCurrency={listing.originalCurrency}
              showCurrency={true}
            />
          </div>

          <div className="listing-footer compact-footer">
            <span className="views-count">👁️ {Number(listing.views || 0).toLocaleString('ar-YE')}</span>
            <span className="time-ago">⏱️ {formatRelative(listing.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ✅ بطاقة قائمة (تم تحسين الصور)
function ListListingCard({ listing, priority = false }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const catKey = normalizeCategoryKey(listing.category);
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 120)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link focus-ring">
      <div className="listing-card list-card compact-list">
        <div className="list-image-container compact-list-img">
          {img ? (
            <Image
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="list-img"
              width={140}
              height={140}
              priority={priority}
              fetchPriority={priority ? 'high' : 'auto'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 120px, 140px"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={(e) => {
                e.target.style.display = 'none';
                const fb = e.target.parentElement?.querySelector('.list-img-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}

          <div className={`list-img-fallback ${img ? 'hidden' : ''}`}>{catObj?.icon || '🖼️'}</div>
        </div>

        <div className="list-content compact-list-content">
          <div className="list-header compact-list-header">
            <div className="list-title-section">
              <h3 className="list-title compact-title" title={listing.title || ''}>
                {listing.title || 'بدون عنوان'}
              </h3>
              {catObj && (
                <span className="list-category compact-list-cat">
                  <span className="list-category-icon">{catObj.icon}</span>
                  <span className="list-category-label">{catObj.label}</span>
                </span>
              )}
            </div>

            <div className="list-price-section compact-price">
              <Price
                priceYER={listing.currentBidYER || listing.priceYER || 0}
                originalPrice={listing.originalPrice}
                originalCurrency={listing.originalCurrency}
                showCurrency={true}
              />
            </div>
          </div>

          <div className="list-location compact-loc">
            <span className="location-icon">📍</span>
            <span className="loc-text">{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <p className="list-description compact-desc">{shortDesc}</p>

          <div className="list-footer compact-footer">
            <span className="list-views">👁️ {Number(listing.views || 0).toLocaleString('ar-YE')} مشاهدة</span>
            <span className="list-time">⏱️ {formatRelative(listing.createdAt)}</span>
            {listing.auctionEnabled && <span className="list-auction">⚡ مزاد نشط</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ✅ شريط البحث
function SearchBar({ search, setSearch, suggestions }) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (search.trim()) setOpen(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="search-wrapper" ref={searchRef}>
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            className="search-input focus-ring"
            type="search"
            value={search}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              setOpen(!!v.trim());
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(!!search.trim())}
            placeholder="ابحث عن سيارات، عقارات، جوالات..."
            aria-label="بحث في الإعلانات"
          />
        </div>
        <button className="search-button focus-ring" type="button" onClick={handleSearch} aria-label="بحث">
          بحث
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="suggestions-dropdown" role="listbox">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-item focus-ring"
              type="button"
              onClick={() => handleSuggestionClick(s)}
              role="option"
              aria-selected={search === s}
            >
              <span className="suggestion-icon" aria-hidden="true">
                🔍
              </span>
              <span className="suggestion-text">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePageClient({ initialListings = [] }) {
  const router = useRouter();

  // ✅ Pagination
  const PAGE_SIZE = 12; // ✅ عدل من 24 إلى 12 لجعل التحميل الأولي يتوافق مع SSR
  const lastDocRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const aliveRef = useRef(true);

  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(initialListings.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // ✅ الافتراضي: شبكة بدل الخريطة (تم التعديل هنا)
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let fromUrl = '';
    try {
      const params = new URLSearchParams(window.location.search);
      fromUrl = normalizeRefCode(params.get('ref'));
    } catch {
      fromUrl = '';
    }

    let stored = '';
    try {
      stored = window.localStorage.getItem(STORAGE_CODE) || '';
    } catch {}

    const code = fromUrl || normalizeRefCode(stored);
    if (code) {
      try {
        window.localStorage.setItem(STORAGE_CODE, code);
        if (fromUrl) window.localStorage.setItem(STORAGE_SEEN_AT, String(Date.now()));
      } catch {}
    }
    if (fromUrl) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('ref');
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      } catch {}
    }
  }, []);

  // ✅ قراءة التفضيل: لو ما في شيء محفوظ، نخليه شبكة ونحفظها (أول زيارة) - تم التعديل هنا
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('preferredViewMode');
      if (saved === 'grid' || saved === 'list' || saved === 'map') {
        setViewMode(saved);
      } else {
        window.localStorage.setItem('preferredViewMode', 'grid');
        setViewMode('grid');
      }
    } catch {}
  }, []);

  // ✅ جلب أول صفحة (مرة واحدة) بدل onSnapshot + limit(100)
  useEffect(() => {
    let cancelled = false;

    const fetchFirstPage = async () => {
      if (initialListings.length > 0) {
        setLoading(false);
        setError('');
        setHasMore(true);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const { db } = await loadFirebaseClient();
        if (cancelled) return;

        const q = db.collection('listings').orderBy('createdAt', 'desc').limit(PAGE_SIZE);
        const snap = await q.get();

        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((listing) => listing.isActive !== false && listing.hidden !== true);

        if (!aliveRef.current || cancelled) return;

        setListings(data);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMore(snap.docs.length === PAGE_SIZE);
        setLoading(false);
      } catch (e) {
        if (!aliveRef.current || cancelled) return;
        setError(e?.message || 'حدث خطأ في جلب الإعلانات');
        setLoading(false);
        setHasMore(false);
      }
    };

    const cancelIdle = scheduleIdleCallback(fetchFirstPage);

    return () => {
      cancelled = true;
      cancelIdle?.();
    };
  }, [initialListings.length, PAGE_SIZE]);

  // ✅ تحميل المزيد (Pagination)
  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError('');

    try {
      const { db } = await loadFirebaseClient();

      if (!lastDocRef.current) {
        const firstSnap = await db.collection('listings').orderBy('createdAt', 'desc').limit(PAGE_SIZE).get();
        lastDocRef.current = firstSnap.docs[firstSnap.docs.length - 1] || null;

        if (!lastDocRef.current) {
          if (!aliveRef.current) return;
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
      }

      const lastDoc = lastDocRef.current;
      const snap = await db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .startAfter(lastDoc)
        .limit(PAGE_SIZE)
        .get();

      const data = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((listing) => listing.isActive !== false && listing.hidden !== true);

      if (!aliveRef.current) return;

      setListings((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        const merged = [...prev, ...data.filter((x) => !existing.has(x.id))];
        return merged;
      });

      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e?.message || 'فشل تحميل المزيد');
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, hasMore, loadingMore]);

  // ✅ تحميل تلقائي عند النزول (نوقفه في وضع الخريطة حتى لا تثقل markers)
  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    if (!hasMore || loading || loadingMore) return;
    if (viewMode === 'map') return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { root: null, rootMargin: '900px 0px', threshold: 0 }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
  }, [fetchMore, hasMore, loading, loadingMore, viewMode]);

  const handleCategoryClick = (category) => {
    if (!category) return;
    if (category.key === 'all') {
      setSelectedCategory('all');
      return;
    }
    if (category.href) {
      router.push(category.href);
      return;
    }
    router.push(`/${category.key}`);
  };

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const results = new Set();
    const allListings = listings.slice(0, 50);
    allListings.forEach((l) => {
      const title = safeText(l.title).toLowerCase();
      if (title.includes(q)) results.add(l.title);
    });
    allListings.forEach((l) => {
      const city = safeText(l.city).toLowerCase();
      if (city.includes(q)) results.add(l.city);
    });
    CATEGORY_CONFIG.forEach((cat) => {
      if (cat.label.toLowerCase().includes(q) || cat.key.includes(q)) results.add(cat.label);
    });
    return Array.from(results).slice(0, 8);
  }, [search, listings]);

  // ✅ عدّاد الأقسام (يعتمد على الإعلانات المحمّلة في الصفحة الرئيسية)
  const categoryCounts = useMemo(() => {
    const out = {};
    for (const l of listings) {
      const k = normalizeCategoryKey(l.category) || 'other';
      out[k] = (out[k] || 0) + 1;
    }
    out.all = listings.length;
    return out;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catSelected = normalizeCategoryKey(selectedCategory || 'all');

    return listings.filter((listing) => {
      const listingCat = normalizeCategoryKey(listing.category);
      if (catSelected !== 'all' && listingCat !== catSelected) return false;
      if (!q) return true;
      const title = safeText(listing.title).toLowerCase();
      const city = safeText(listing.city).toLowerCase();
      const locationLabel = safeText(listing.locationLabel).toLowerCase();
      const description = safeText(listing.description).toLowerCase();
      return (
        title.includes(q) ||
        city.includes(q) ||
        locationLabel.includes(q) ||
        description.includes(q) ||
        listingCat.includes(q)
      );
    });
  }, [listings, search, selectedCategory]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') localStorage.setItem('preferredViewMode', mode);
  };

  const handleRetry = () => window.location.reload();

  return (
    <>
      <WebsiteJsonLd />
      <div className="home-page" dir="rtl">
        <section className="hero-section" aria-label="القسم الرئيسي">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">سوق اليمن</h1>
              <p className="hero-subtitle">أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء كل شيء</p>
              <SearchBar search={search} setSearch={setSearch} suggestions={suggestions} />
            </div>
          </div>
        </section>

        <main className="main-content" role="main">
          <div className="container">
            <div className="categories-container" aria-label="أقسام الإعلانات">
              <div className="categories-scroll" role="tablist">
                {CATEGORY_CONFIG.map((category) => {
                  const isActive = selectedCategory === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      className={`category-button focus-ring ${isActive ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(category)}
                      role="tab"
                      aria-selected={isActive}
                    >
                      <span className="category-button-icon" aria-hidden="true">
                        {category.icon}
                      </span>
                      <span className="category-button-label">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="toolbar">
              <div className="toolbar-left">
                <div className="view-toggle" role="group" aria-label="طريقة العرض">
                  <button
                    type="button"
                    className={`view-toggle-button focus-ring ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('grid')}
                    aria-pressed={viewMode === 'grid'}
                    title="عرض شبكي"
                  >
                    <span className="view-toggle-icon" aria-hidden="true">
                      ◼️◼️
                    </span>
                    <span className="view-toggle-label">شبكة</span>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-button focus-ring ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('list')}
                    aria-pressed={viewMode === 'list'}
                    title="عرض قائمة"
                  >
                    <span className="view-toggle-icon" aria-hidden="true">
                      ☰
                    </span>
                    <span className="view-toggle-label">قائمة</span>
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-button focus-ring ${viewMode === 'map' ? 'active' : ''}`}
                    onClick={() => handleViewModeChange('map')}
                    aria-pressed={viewMode === 'map'}
                    title="عرض خريطة"
                  >
                    <span className="view-toggle-icon" aria-hidden="true">
                      🗺️
                    </span>
                    <span className="view-toggle-label">خريطة</span>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <SkeletonLoader count={viewMode === 'list' ? 4 : 6} type={viewMode === 'grid' ? 'grid' : 'list'} />
            ) : error ? (
              <div className="error-retry-wrapper">
                <EmptyState type="error" icon="⚠️" title="حدث خطأ" message={error} showAction={false} />
                <button className="error-retry-button focus-ring" onClick={handleRetry} aria-label="إعادة المحاولة">
                  🔄 إعادة المحاولة
                </button>
              </div>
            ) : filteredListings.length === 0 ? (
              <EmptyState
                icon="📭"
                title="لا توجد إعلانات"
                message={
                  search || selectedCategory !== 'all'
                    ? 'لا توجد إعلانات مطابقة لبحثك حالياً.'
                    : 'لا توجد إعلانات منشورة حالياً.'
                }
                actionText="➕ أضف أول إعلان"
                actionUrl="/add"
              />
            ) : viewMode === 'map' ? (
              <div className="map-view">
                <HomeMapView listings={filteredListings} />
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid-view compact-grid" role="list" aria-label="قائمة الإعلانات">
                  {filteredListings.map((listing, index) => (
                    <GridListingCard key={listing.id} listing={listing} priority={index === 0} />
                  ))}
                </div>

                <div ref={loadMoreSentinelRef} style={{ height: 1 }} />

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                  {loadingMore ? (
                    <div className="muted" style={{ padding: 10 }}>
                      ...جاري تحميل المزيد
                    </div>
                  ) : hasMore ? (
                    <div className="muted" style={{ padding: 10 }}>
                      انزل لأسفل لتحميل المزيد
                    </div>
                  ) : (
                    <div className="muted" style={{ padding: 10 }}>
                      لا يوجد المزيد
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="list-view compact-list-view" role="list" aria-label="قائمة الإعلانات">
                  {filteredListings.map((listing, index) => (
                    <ListListingCard key={listing.id} listing={listing} priority={index === 0} />
                  ))}
                </div>

                <div ref={loadMoreSentinelRef} style={{ height: 1 }} />

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                  {loadingMore ? (
                    <div className="muted" style={{ padding: 10 }}>
                      ...جاري تحميل المزيد
                    </div>
                  ) : hasMore ? (
                    <div className="muted" style={{ padding: 10 }}>
                      انزل لأسفل لتحميل المزيد
                    </div>
                  ) : (
                    <div className="muted" style={{ padding: 10 }}>
                      لا يوجد المزيد
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ✅ تذييل الأقسام */}
            {!loading && !error && (
              <footer className="homeCatsFooter" aria-label="تذييل الأقسام">
                <div className="homeCatsFooterHead">
                  <div className="homeCatsFooterTitle">تصفّح الأقسام</div>
                  <div className="homeCatsFooterHint">اضغط على أي قسم للانتقال له</div>
                </div>

                <div className="homeCatsFooterGrid">
                  {CATEGORY_CONFIG.filter((c) => c.key !== 'all').map((cat) => {
                    const st = CATEGORY_STYLES[cat.key] || CATEGORY_STYLES.other;
                    const count = Number(categoryCounts[cat.key] || 0);

                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className="homeCatsChip focus-ring"
                        onClick={() => handleCategoryClick(cat)}
                        style={{ borderColor: st.color, background: st.bg }}
                        title={cat.label}
                      >
                        <span className="homeCatsIcon" style={{ background: st.color }} aria-hidden="true">
                          {cat.icon}
                        </span>
                        <span className="homeCatsLabel">{cat.label}</span>
                        <span className="homeCatsCount">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </footer>
            )}
          </div>
        </main>

        <style jsx>{`
          .hidden {
            display: none !important;
          }

          /* ===== Map view ===== */
          .map-view {
            height: 500px;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 2.5rem;
          }
          .list-category-label {
            margin-right: 4px;
          }
          .view-toggle-label {
            font-size: 0.875rem;
          }

          /* ===== Compact Grid/List ===== */
          .compact-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          @media (min-width: 768px) {
            .compact-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
          }
          @media (min-width: 1100px) {
            .compact-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }

          .compact-card {
            border-radius: 12px;
            overflow: hidden;
          }
          .compact-img {
            height: 132px;
          }
          @media (min-width: 768px) {
            .compact-img {
              height: 150px;
            }
          }

          .compact-content {
            padding: 10px 10px 8px !important;
          }
          .compact-header {
            margin-bottom: 6px;
          }
          .compact-title {
            font-size: 13px !important;
            line-height: 1.25 !important;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .compact-cat {
            padding: 4px 6px !important;
            border-radius: 10px;
          }
          .compact-loc {
            font-size: 12px !important;
            opacity: 0.9;
            margin-bottom: 6px;
            display: flex;
            gap: 6px;
            align-items: center;
          }
          .loc-text {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .compact-desc {
            font-size: 12px !important;
            line-height: 1.45 !important;
            margin: 0 0 8px 0 !important;
            opacity: 0.9;
          }
          .compact-price :global(*) {
            font-size: 13px !important;
          }
          .compact-footer {
            font-size: 11px !important;
            opacity: 0.9;
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }
          .compact-badge {
            font-size: 11px !important;
            padding: 5px 8px !important;
            border-radius: 999px;
          }

          .compact-list-view {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .compact-list {
            padding: 10px !important;
            border-radius: 12px;
            overflow: hidden;
          }
          .compact-list-img {
            width: 110px;
            min-width: 110px;
            height: 110px;
            border-radius: 10px;
            overflow: hidden;
          }
          .compact-list-content {
            padding: 0 !important;
          }
          .compact-list-header {
            gap: 10px;
            align-items: flex-start;
          }
          .compact-list-cat {
            font-size: 12px;
          }

          /* ===== Footer Categories ===== */
          .homeCatsFooter {
            margin-top: 18px;
            padding: 14px 0 6px;
            border-top: 1px solid rgba(0, 0, 0, 0.06);
          }
          .homeCatsFooterHead {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
          }
          .homeCatsFooterTitle {
            font-size: 1rem;
            font-weight: 800;
          }
          .homeCatsFooterHint {
            font-size: 0.85rem;
            opacity: 0.7;
          }
          .homeCatsFooterGrid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px;
          }
          .homeCatsChip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            border-radius: 14px;
            border: 1px solid transparent;
            cursor: pointer;
            text-align: right;
          }
          .homeCatsIcon {
            width: 26px;
            height: 26px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 14px;
            flex: 0 0 auto;
          }
          .homeCatsLabel {
            font-size: 0.9rem;
            font-weight: 750;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1 1 auto;
          }
          .homeCatsCount {
            font-size: 0.85rem;
            font-weight: 850;
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(0, 0, 0, 0.05);
            flex: 0 0 auto;
          }

          @media (max-width: 1024px) {
            .homeCatsFooterGrid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
          @media (max-width: 768px) {
            .map-view {
              height: 400px;
            }
            .view-toggle-label {
              display: none;
            }
            .view-toggle-button {
              padding: 0.5rem;
            }
            .homeCatsFooterGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .homeCatsFooterHint {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
}
[file content end]
