// 📁 الموقع: /app/page.jsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Price from '@/components/Price';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import './home.css'; // ✅ الستايل الجديد للصفحة الرئيسية فقط

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

// ✅ إعدادات الأقسام
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋' },
  { key: 'cars', label: 'سيارات', icon: '🚗' },
  { key: 'real_estate', label: 'عقارات', icon: '🏡' },
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

// ✅ دوال مساعدة
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

// ✅ بطاقة الشبكة (تستخدم نفس كلاساتك القديمة لأنها موجودة في home.css الطويل عندك)
function GridListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const catKey = String(listing.category || '').toLowerCase();
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 60 ? `${desc.slice(0, 60)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link focus-ring">
      <div className="listing-card grid-card">
        <div className="image-container">
          {img ? (
            <img
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="listing-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement?.querySelector('.img-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`img-fallback ${img ? 'hidden' : ''}`}>
            {catObj?.icon || '🖼️'}
          </div>

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

// ✅ بطاقة القائمة
function ListListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const catKey = String(listing.category || '').toLowerCase();
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 120)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link focus-ring">
      <div className="listing-card list-card">
        <div className="list-image-container">
          {img ? (
            <img
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="list-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement?.querySelector('.list-img-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`list-img-fallback ${img ? 'hidden' : ''}`}>
            {catObj?.icon || '🖼️'}
          </div>
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

// ✅ شريط البحث (مطابق للستايل الجديد)
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

  const handleSuggestionClick = (s) => {
    setSearch(s);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-wrapper">
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
        <button className="search-button focus-ring" type="button" onClick={handleSearch} aria-label="بحث">
          🔍 بحث
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

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid | list | map

  // ✅ جلب الإعلانات من Firebase
  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(100));

      const unsubscribe = onSnapshot(
        listingsQuery,
        (snapshot) => {
          const data = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.isActive !== false && l.hidden !== true);

          setListings(data);
          setLoading(false);
        },
        (err) => {
          console.error('خطأ في جلب الإعلانات:', err);
          setError(err?.message || 'حدث خطأ في جلب الإعلانات');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error('خطأ فادح في الاتصال:', e);
      setError('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);

  // ✅ اقتراحات البحث
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const results = new Set();
    const sample = listings.slice(0, 50);

    sample.forEach((l) => {
      const title = safeText(l.title).toLowerCase();
      if (title.includes(q)) results.add(l.title);
    });

    sample.forEach((l) => {
      const city = safeText(l.city).toLowerCase();
      if (city.includes(q)) results.add(l.city);
    });

    CATEGORY_CONFIG.forEach((cat) => {
      if (cat.label.toLowerCase().includes(q) || cat.key.includes(q)) results.add(cat.label);
    });

    return Array.from(results).slice(0, 8);
  }, [search, listings]);

  // ✅ فلترة الإعلانات
  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catSelected = String(selectedCategory || 'all').toLowerCase();

    return listings.filter((l) => {
      if (catSelected !== 'all') {
        const cat = String(l.category || '').toLowerCase();
        if (cat !== catSelected) return false;
      }

      if (!q) return true;

      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const locationLabel = safeText(l.locationLabel).toLowerCase();
      const description = safeText(l.description).toLowerCase();
      const category = String(l.category || '').toLowerCase();

      return title.includes(q) || city.includes(q) || locationLabel.includes(q) || description.includes(q) || category.includes(q);
    });
  }, [listings, search, selectedCategory]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') localStorage.setItem('preferredViewMode', mode);
  };

  const handleRetry = () => window.location.reload();

  return (
    <div className="home-page" dir="rtl">
      <Header />

      {/* ✅ Hero الجديد */}
      <section className="home-hero-section" aria-label="القسم الرئيسي">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">سوق اليمن</h1>
            <p className="hero-subtitle">أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء كل شيء</p>

            <SearchBar search={search} setSearch={setSearch} suggestions={suggestions} />
          </div>
        </div>
      </section>

      {/* ✅ شريط الأقسام الجديد */}
      <div className="categories-scroll-container" aria-label="أقسام الإعلانات">
        <div className="categories-wrapper" role="tablist">
          {CATEGORY_CONFIG.map((c) => {
            const isActive = selectedCategory === c.key;
            return (
              <button
                key={c.key}
                type="button"
                className={`category-button focus-ring ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.key)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="category-icon" aria-hidden="true">{c.icon}</span>
                <span className="category-label">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="main-content" role="main">
        <div className="container">
          {/* Header/Toolbar */}
          <div className="content-header">
            <div className="view-toggle" role="group" aria-label="طريقة العرض">
              <button
                type="button"
                className={`view-toggle-button focus-ring ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('grid')}
                aria-pressed={viewMode === 'grid'}
              >
                ◼️◼️ شبكة
              </button>
              <button
                type="button"
                className={`view-toggle-button focus-ring ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                aria-pressed={viewMode === 'list'}
              >
                ☰ قائمة
              </button>
              <button
                type="button"
                className={`view-toggle-button focus-ring ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('map')}
                aria-pressed={viewMode === 'map'}
              >
                🗺️ خريطة
              </button>
            </div>

            <div className="results-count" aria-live="polite">
              {filteredListings.length} إعلان
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-container" aria-live="polite" aria-busy="true">
              <div className="spinner" aria-hidden="true"></div>
              <p>جاري تحميل الإعلانات...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon" aria-hidden="true">⚠️</div>
              <h3>حدث خطأ</h3>
              <p>{error}</p>
              <button className="retry-button focus-ring" onClick={handleRetry}>
                إعادة المحاولة
              </button>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">📭</div>
              <h3>لا توجد إعلانات</h3>
              <p>{search || selectedCategory !== 'all' ? 'لا توجد إعلانات مطابقة لبحثك حالياً.' : 'لا توجد إعلانات منشورة حالياً.'}</p>
              <Link href="/add" className="add-listing-link focus-ring">
                ➕ أضف أول إعلان
              </Link>
            </div>
          ) : viewMode === 'map' ? (
            <div className="map-view">
              <HomeMapView listings={filteredListings} />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid-view" role="list" aria-label="قائمة الإعلانات">
              {filteredListings.map((l) => (
                <GridListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="list-view" role="list" aria-label="قائمة الإعلانات">
              {filteredListings.map((l) => (
                <ListListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* زر إضافة عائم */}
      <Link href="/add" className="floating-add-button focus-ring" aria-label="إضافة إعلان جديد" title="أضف إعلان جديد">
        <span className="floating-add-icon" aria-hidden="true">➕</span>
        <span className="floating-add-text">أضف إعلان</span>
      </Link>

      <style jsx>{`
        .hidden { display: none !important; }
        .map-view { height: 500px; border-radius: 12px; overflow: hidden; margin-bottom: 2.5rem; }
        @media (max-width: 768px) {
          .map-view { height: 400px; }
        }
      `}</style>
    </div>
  );
}
