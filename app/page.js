// app/page.jsx - النسخة المحسنة
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
    <div className="loading-card">
      <div className="spinner"></div>
      <p>جاري تحميل الخريطة...</p>
    </div>
  ),
});

// ✅ نفس مفاتيح الأقسام المستخدمة عندك
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

// ✅ بطاقة العرض الشبكي (Grid Card) - صور صغيرة
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

// ✅ بطاقة العرض القائمة (List Card) - صور متوسطة
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

  // ✅ جلب الإعلانات - نفس الكود الحالي
  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      const unsub = db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(100) // زدنا الحد ليعرض أكثر
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

  // ✅ اقتراحات بحث محسنة
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const results = new Set();
    const allListings = listings.slice(0, 50); // للبحث فقط في 50 إعلان أول

    // إضافة نتائج من العناوين
    allListings.forEach(l => {
      const title = safeText(l.title).toLowerCase();
      if (title.includes(q)) results.add(l.title);
    });

    // إضافة نتائج من المدن
    allListings.forEach(l => {
      const city = safeText(l.city).toLowerCase();
      if (city.includes(q)) results.add(l.city);
    });

    // إضافة نتائج من الأقسام
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
        // فلترة حسب الحالة
        if (typeof l.isActive === 'boolean' && l.isActive === false) return false;
        if (l.hidden === true) return false;

        // فلترة حسب القسم
        const cat = String(l.category || '').toLowerCase();
        if (catSelected !== 'all' && cat !== catSelected) return false;

        // فلترة حسب البحث
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

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%);
          color: white;
          padding: 2.5rem 0 3rem;
          position: relative;
          overflow: hidden;
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .hero-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .hero-subtitle {
          font-size: 1.125rem;
          opacity: 0.95;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        /* Search Bar */
        .search-wrapper {
          max-width: 700px;
          margin: 0 auto;
          position: relative;
        }

        .search-container {
          background: white;
          border-radius: 50px;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .search-container:focus-within {
          border-color: #FF6B35;
          box-shadow: 0 10px 25px rgba(255, 107, 53, 0.2);
        }

        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 0 1rem;
        }

        .search-icon {
          margin-left: 0.5rem;
          color: #6c757d;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 0.75rem;
          font-size: 1rem;
          background: transparent;
        }

        .search-input::placeholder {
          color: #6c757d;
        }

        .search-button {
          background: #1A1A2E;
          color: white;
          border: none;
          border-radius: 40px;
          padding: 0.75rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .search-button:hover {
          background: #0F3460;
        }

        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-radius: 15px;
          margin-top: 0.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1000;
        }

        .suggestion-item {
          width: 100%;
          text-align: right;
          background: white;
          border: none;
          padding: 0.75rem 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: background 0.2s ease;
        }

        .suggestion-item:hover {
          background: #f8f9fa;
        }

        .suggestion-icon {
          color: #FF6B35;
        }

        .suggestion-text {
          flex: 1;
          text-align: right;
        }

        /* Categories */
        .categories-container {
          background: white;
          border-bottom: 1px solid #e9ecef;
          padding: 1rem 0;
          position: sticky;
          top: 60px;
          z-index: 40;
          box-shadow: 0 2px 10px rgba(26, 26, 46, 0.05);
        }

        .categories-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding: 0.5rem 0;
          scroll-behavior: smooth;
        }

        .categories-scroll::-webkit-scrollbar {
          height: 4px;
        }

        .categories-scroll::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 10px;
        }

        .categories-scroll::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 10px;
        }

        .category-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 50px;
          border: 1px solid #e9ecef;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex-shrink: 0;
          color: #495057;
        }

        .category-button:hover {
          border-color: #FF6B35;
          transform: translateY(-1px);
        }

        .category-button.active {
          background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
        }

        .category-button-icon {
          font-size: 1.25rem;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1.5rem 0;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-left, .toolbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .view-toggle {
          display: flex;
          gap: 0.5rem;
          background: #f8f9fa;
          padding: 0.25rem;
          border-radius: 10px;
          border: 1px solid #e9ecef;
        }

        .view-toggle-button {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #495057;
          transition: all 0.2s ease;
        }

        .view-toggle-button:hover {
          color: #FF6B35;
        }

        .view-toggle-button.active {
          background: white;
          color: #FF6B35;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-weight: 600;
        }

        .results-count {
          font-size: 0.875rem;
          color: #495057;
          font-weight: 600;
        }

        /* Grid View */
        .grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        /* Grid Card */
        .grid-card {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          border: 1px solid #e9ecef;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .grid-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 25px rgba(26, 26, 46, 0.1);
          border-color: #FF6B35;
        }

        .card-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .card-link:hover {
          text-decoration: none;
        }

        .image-container {
          position: relative;
          width: 100%;
          height: 140px; /* صورة أصغر */
          overflow: hidden;
          background: #f8f9fa;
        }

        .listing-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .grid-card:hover .listing-img {
          transform: scale(1.05);
        }

        .img-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          font-size: 2rem;
          color: #adb5bd;
        }

        .auction-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(255, 107, 53, 0.9);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 2;
        }

        .card-content {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .listing-title {
          font-weight: 700;
          font-size: 1rem;
          color: #1A1A2E;
          margin: 0;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }

        .category-badge {
          background: #f8f9fa;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .category-icon {
          font-size: 1rem;
        }

        .listing-location {
          color: #495057;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .location-icon {
          color: #6c757d;
        }

        .listing-description {
          color: #6c757d;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price-section {
          margin-top: auto;
        }

        .listing-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e9ecef;
          font-size: 0.75rem;
          color: #6c757d;
        }

        .views-count, .time-ago {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        /* List View */
        .list-view {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        /* List Card */
        .list-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 15px;
          overflow: hidden;
          transition: all 0.2s ease;
          display: flex;
        }

        .list-card:hover {
          border-color: #FF6B35;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.1);
        }

        .list-image-container {
          width: 160px;
          flex-shrink: 0;
          background: #f8f9fa;
        }

        .list-img {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }

        .list-img-fallback {
          width: 100%;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          font-size: 2rem;
          color: #adb5bd;
        }

        .list-content {
          flex: 1;
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .list-title-section {
          flex: 1;
        }

        .list-title {
          font-weight: 700;
          font-size: 1.125rem;
          color: #1A1A2E;
          margin: 0 0 0.5rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .list-category {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8f9fa;
          padding: 0.25rem 0.75rem;
          border-radius: 50px;
          font-size: 0.875rem;
          color: #495057;
        }

        .list-category-icon {
          font-size: 1rem;
        }

        .list-price-section {
          flex-shrink: 0;
        }

        .list-location {
          color: #495057;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .list-description {
          color: #6c757d;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1rem;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .list-footer {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: #6c757d;
        }

        .list-views, .list-time, .list-auction {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .list-auction {
          color: #FF6B35;
          font-weight: 600;
        }

        /* Loading, Error, Empty States */
        .loading-container, .error-container, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .loading-card {
          padding: 2rem;
          text-align: center;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #FF6B35;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-icon, .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .error-icon {
          color: #dc3545;
        }

        .empty-icon {
          color: #6c757d;
        }

        .error-container h3, .empty-state h3 {
          color: #1A1A2E;
          margin-bottom: 0.5rem;
        }

        .error-container p, .empty-state p {
          color: #6c757d;
          margin-bottom: 1.5rem;
          max-width: 400px;
        }

        .retry-button, .add-listing-link {
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s ease;
        }

        .retry-button:hover, .add-listing-link:hover {
          background: #e55a2b;
          text-decoration: none;
          color: white;
        }

        /* Floating Add Button */
        .floating-add-button {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 1rem 2rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(255, 107, 53, 0.3);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .floating-add-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(255, 107, 53, 0.4);
          text-decoration: none;
          color: white;
        }

        .floating-add-icon {
          font-size: 1.25rem;
        }

        /* Responsive */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .grid-view {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .list-card {
            flex-direction: column;
          }
          
          .list-image-container {
            width: 100%;
          }
          
          .list-img, .list-img-fallback {
            height: 160px;
          }
          
          .list-content {
            padding: 1rem;
          }
          
          .floating-add-button {
            bottom: 1.5rem;
            right: 1.5rem;
            padding: 0.875rem 1.5rem;
            font-size: 0.875rem;
          }
          
          .search-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
          }
          
          .image-container, .img-fallback {
            height: 150px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .grid-view {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
