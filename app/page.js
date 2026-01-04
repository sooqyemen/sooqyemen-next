// 📁 الموقع: /app/page.js
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Price from '@/components/Price';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';
import './home.css'; // ✅ استيراد ملف CSS

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
  loading: () => (
    <div className="loading-card">
      <div className="spinner"></div>
      <p>جاري تحميل الخريطة...</p>
    </div>
  ),
});

// ✅ نفس مفاتيح الأقسام
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

// ✅ بطاقة العرض الشبكي
function GridListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || null;
  const catKey = String(listing.category || '').toLowerCase();
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 60 ? `${desc.slice(0, 60)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link">
      <div className="listing-card grid-card">
        <div className="image-container">
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
          {listing.auctionEnabled && (
            <div className="auction-badge">⚡ مزاد</div>
          )}
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
            <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
          </div>

          <div className="listing-footer">
            <span className="views-count">👁️ {Number(listing.views || 0)}</span>
            <span className="time-ago">⏱️ {formatRelative(listing.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ✅ بطاقة العرض القائمة
function ListListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || null;
  const catKey = String(listing.category || '').toLowerCase();
  const catObj = CATEGORY_CONFIG.find((c) => c.key === catKey);
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 120)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link">
      <div className="listing-card list-card">
        <div className="list-image-container">
          {img ? (
            <img
              src={img}
              alt={listing.title || 'صورة الإعلان'}
              className="list-img"
              loading="lazy"
            />
          ) : (
            <div className="list-img-fallback">🖼️</div>
          )}
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
                  <span>{catObj.label}</span>
                </span>
              )}
            </div>
            
            <div className="list-price-section">
              <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
            </div>
          </div>

          <div className="list-location">
            <span className="location-icon">📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <p className="list-description">{shortDesc}</p>

          <div className="list-footer">
            <span className="list-views">👁️ {Number(listing.views || 0)} مشاهدة</span>
            <span className="list-time">⏱️ {formatRelative(listing.createdAt)}</span>
            {listing.auctionEnabled && (
              <span className="list-auction">⚡ مزاد نشط</span>
            )}
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
    <div className="search-wrapper" ref={ref}>
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
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
            placeholder="ابحث عن سيارات، عقارات، جوالات..."
          />
        </div>
        <button className="search-button" type="button" onClick={() => setOpen(false)}>
          بحث
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-item"
              type="button"
              onClick={() => {
                setSearch(s);
                setOpen(false);
              }}
            >
              <span className="suggestion-icon">🔍</span>
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

  // ✅ جلب الإعلانات
  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      const unsub = db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(100)
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
            setError(e?.message || 'حدث خطأ في جلب الإعلانات');
            setLoading(false);
          }
        );

      return () => unsub();
    } catch (e) {
      console.error('Firestore home fatal:', e);
      setError('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);

  // ✅ اقتراحات بحث
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const results = new Set();
    const allListings = listings.slice(0, 50);

    allListings.forEach(l => {
      const title = safeText(l.title).toLowerCase();
      if (title.includes(q)) results.add(l.title);
    });

    allListings.forEach(l => {
      const city = safeText(l.city).toLowerCase();
      if (city.includes(q)) results.add(l.city);
    });

    CATEGORY_CONFIG.forEach(cat => {
      if (cat.label.toLowerCase().includes(q)) results.add(cat.label);
    });

    return Array.from(results).slice(0, 8);
  }, [search, listings]);

  // ✅ فلترة الإعلانات
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catSelected = String(selectedCategory || 'all').toLowerCase();

    return (listings || [])
      .filter((l) => {
        if (typeof l.isActive === 'boolean' && l.isActive === false) return false;
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
    <div className="home-page">
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">سوق اليمن</h1>
            <p className="hero-subtitle">
              أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء كل شيء
            </p>
            
            <SearchBar 
              search={search} 
              setSearch={setSearch} 
              suggestions={suggestions} 
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Categories Bar */}
          <div className="categories-container">
            <div className="categories-scroll">
              {CATEGORY_CONFIG.map((c) => {
                const active = selectedCategory === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={`category-button ${active ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(c.key)}
                  >
                    <span className="category-button-icon">{c.icon}</span>
                    <span className="category-button-label">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="view-toggle">
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <span className="view-toggle-icon">◼️◼️</span>
                  <span>شبكة</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <span className="view-toggle-icon">☰</span>
                  <span>قائمة</span>
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setViewMode('map')}
                >
                  <span className="view-toggle-icon">🗺️</span>
                  <span>خريطة</span>
                </button>
              </div>
            </div>

            <div className="toolbar-right">
              <span className="results-count">
                {filtered.length} إعلان
              </span>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>جاري تحميل الإعلانات...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h3>حدث خطأ</h3>
              <p>{error}</p>
              <button 
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>لا توجد إعلانات</h3>
              <p>لا توجد إعلانات مطابقة لبحثك حالياً.</p>
              <Link href="/add" className="add-listing-link">
                ➕ أضف أول إعلان
              </Link>
            </div>
          ) : viewMode === 'map' ? (
            <HomeMapView listings={filtered} />
          ) : viewMode === 'grid' ? (
            <div className="grid-view">
              {filtered.map((l) => (
                <GridListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="list-view">
              {filtered.map((l) => (
                <ListListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Add Button */}
      <Link href="/add" className="floating-add-button">
        <span className="floating-add-icon">➕</span>
        <span className="floating-add-text">أضف إعلان</span>
      </Link>
    </div>
  );
}
