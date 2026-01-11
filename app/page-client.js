// app/page.jsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
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

// ✅ Blur placeholder لتحسين تجربة تحميل الصور
const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

// ✅ توحيد اسم القسم
function normalizeCategoryKey(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  const norm = lowered.replace(/\s+/g, '_').replace(/-/g, '_').replace(/__+/g, '_');

  const map = {
    real_estate: 'realestate', realestate: 'realestate',
    mobiles: 'phones', mobile: 'phones', phones: 'phones', phone: 'phones',
    animals_birds: 'animals', animalsbirds: 'animals', animals: 'animals',
    heavy_equipment: 'heavy_equipment', heavyequipment: 'heavy_equipment', 'heavy equipment': 'heavy_equipment',
    network: 'networks', networks: 'networks',
    maintenance: 'maintenance',
    home_tools: 'home_tools', hometools: 'home_tools', 'home tools': 'home_tools',
    سيارات: 'cars', عقارات: 'realestate', جوالات: 'phones', إلكترونيات: 'electronics', الكترونيات: 'electronics',
    دراجات_نارية: 'motorcycles', دراجات: 'motorcycles', معدات_ثقيلة: 'heavy_equipment',
    طاقة_شمسية: 'solar', نت_وشبكات: 'networks', نت_و_شبكات: 'networks', صيانة: 'maintenance',
    أثاث: 'furniture', اثاث: 'furniture', ملابس: 'clothes', حيوانات_وطيور: 'animals', حيوانات: 'animals',
    وظائف: 'jobs', خدمات: 'services', اخرى: 'other', أخرى: 'other',
    أدوات_منزلية: 'home_tools', ادوات_منزلية: 'home_tools', 'أدوات منزلية': 'home_tools', 'ادوات منزلية': 'home_tools',
  };
  return map[norm] || map[raw] || norm;
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
      <div className="listing-card grid-card">
        <div className="image-container">
          {img ? (
            <Image
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="listing-img"
              width={300}
              height={200}
              priority={priority}
              fetchPriority={priority ? 'high' : 'auto'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          {listing.auctionEnabled && <div className="auction-badge">⚡ مزاد</div>}
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3 className="listing-title" title={listing.title || ''}>
              {listing.title || 'بدون عنوان'}
            </h3>
            {catObj && (
              <span className="category-badge">
                <span className="category-icon">{catObj.icon}</span>
              </span>
            )}
          </div>

          <div className="listing-location">
            <span className="location-icon">📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <p className="listing-description">{shortDesc}</p>

          <div className="price-section">
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
              originalPrice={listing.originalPrice}
              originalCurrency={listing.originalCurrency}
              showCurrency={true}
            />
          </div>

          <div className="listing-footer">
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
      <div className="listing-card list-card">
        <div className="list-image-container">
          {img ? (
            <Image
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="list-img"
              width={150}
              height={150}
              priority={priority}
              fetchPriority={priority ? 'high' : 'auto'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="150px"
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

        <div className="list-content">
          <div className="list-header">
            <div className="list-title-section">
              <h3 className="list-title" title={listing.title || ''}>
                {listing.title || 'بدون عنوان'}
              </h3>
              {catObj && (
                <span className="list-category">
                  <span className="list-category-icon">{catObj.icon}</span>
                  <span className="list-category-label">{catObj.label}</span>
                </span>
              )}
            </div>

            <div className="list-price-section">
              <Price
                priceYER={listing.currentBidYER || listing.priceYER || 0}
                originalPrice={listing.originalPrice}
                originalCurrency={listing.originalCurrency}
                showCurrency={true}
              />
            </div>
          </div>

          <div className="list-location">
            <span className="location-icon">📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <p className="list-description">{shortDesc}</p>

          <div className="list-footer">
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
          <span className="search-icon" aria-hidden="true">🔍</span>
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
              <span className="suggestion-icon" aria-hidden="true">🔍</span>
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
  const [listings, setListings] = useState(initialListings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let fromUrl = '';
    try {
      const params = new URLSearchParams(window.location.search);
      fromUrl = normalizeRefCode(params.get('ref'));
    } catch { fromUrl = ''; }

    let stored = '';
    try { stored = window.localStorage.getItem(STORAGE_CODE) || ''; } catch {}

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('preferredViewMode');
    if (saved === 'grid' || saved === 'list' || saved === 'map') setViewMode(saved);
  }, []);

  useEffect(() => {
    if (initialListings.length > 0) {
      setLoading(false);
      return;
    }
    let unsub = null;
    let cancelled = false;

    const subscribeWithDb = async () => {
      setLoading(true);
      setError('');
      let triedFallback = false;

      try {
        const { db } = await loadFirebaseClient();
        if (cancelled) return;

        const subscribe = (withOrder) => {
          const base = db.collection('listings');
          const q = withOrder ? base.orderBy('createdAt', 'desc').limit(100) : base.limit(100);

          unsub = q.onSnapshot(
            (snapshot) => {
              const data = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((listing) => listing.isActive !== false && listing.hidden !== true);
              setListings(data);
              setLoading(false);
            },
            (err) => {
              if (withOrder && !triedFallback) {
                triedFallback = true;
                try { if (unsub) unsub(); } catch {}
                subscribe(false);
                return;
              }
              setError(err?.message || 'حدث خطأ في جلب الإعلانات');
              setLoading(false);
            }
          );
        };

        subscribe(true);
      } catch (e) {
        if (cancelled) return;
        setError('تعذّر الاتصال بقاعدة البيانات');
        setLoading(false);
      }
    };

    const cancelIdle = scheduleIdleCallback(subscribeWithDb);

    return () => {
      cancelled = true;
      cancelIdle?.();
      try { if (unsub) unsub(); } catch {}
    };
  }, [initialListings.length]);

  const handleCategoryClick = (category) => {
    if (!category) return;
    if (category.key === 'all') { setSelectedCategory('all'); return; }
    setSelectedCategory(category.key);
    if (category.href) router.push(category.href);
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
        title.includes(q) || city.includes(q) ||
        locationLabel.includes(q) || description.includes(q) || listingCat.includes(q)
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
                    <span className="category-button-icon" aria-hidden="true">{category.icon}</span>
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
                  <span className="view-toggle-icon" aria-hidden="true">◼️◼️</span>
                  <span className="view-toggle-label">شبكة</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button focus-ring ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('list')}
                  aria-pressed={viewMode === 'list'}
                  title="عرض قائمة"
                >
                  <span className="view-toggle-icon" aria-hidden="true">☰</span>
                  <span className="view-toggle-label">قائمة</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button focus-ring ${viewMode === 'map' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('map')}
                  aria-pressed={viewMode === 'map'}
                  title="عرض خريطة"
                >
                  <span className="view-toggle-icon" aria-hidden="true">🗺️</span>
                  <span className="view-toggle-label">خريطة</span>
                </button>
              </div>
            </div>
            <div className="toolbar-right">
              <span className="results-count" aria-live="polite">
                <span className="results-number">{filteredListings.length}</span> إعلان
              </span>
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
              message={search || selectedCategory !== 'all' ? 'لا توجد إعلانات مطابقة لبحثك حالياً.' : 'لا توجد إعلانات منشورة حالياً.'}
              actionText="➕ أضف أول إعلان"
              actionUrl="/add"
            />
          ) : viewMode === 'map' ? (
            <div className="map-view"><HomeMapView listings={filteredListings} /></div>
          ) : viewMode === 'grid' ? (
            <div className="grid-view" role="list" aria-label="قائمة الإعلانات">
              {filteredListings.map((listing, index) => (
                <GridListingCard key={listing.id} listing={listing} priority={index < 4} />
              ))}
            </div>
          ) : (
            <div className="list-view" role="list" aria-label="قائمة الإعلانات">
              {filteredListings.map((listing, index) => (
                <ListListingCard key={listing.id} listing={listing} priority={index < 3} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Link href="/add" className="floating-add-button focus-ring" aria-label="إضافة إعلان جديد" title="أضف إعلان جديد">
        <span className="floating-add-icon" aria-hidden="true">➕</span>
        <span className="floating-add-text">أضف إعلان</span>
      </Link>

      <style jsx>{`
        .hidden { display: none !important; }
        .map-view { height: 500px; border-radius: 12px; overflow: hidden; margin-bottom: 2.5rem; }
        .list-category-label { margin-right: 4px; }
        .results-number { font-weight: 700; color: var(--color-primary-light); }
        .view-toggle-label { font-size: 0.875rem; }
        @media (max-width: 768px) {
          .map-view { height: 400px; }
          .view-toggle-label { display: none; }
          .view-toggle-button { padding: 0.5rem; }
        }
      `}</style>
    </div>
    </>
  );
}
