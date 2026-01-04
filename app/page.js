// app/page.jsx - الإصدار المحسّن
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Price from '@/components/Price';
import { db } from '@/lib/firebaseClient';
import { FiSearch, FiMapPin, FiEye, FiClock, FiPlus, FiGrid, FiMap } from 'react-icons/fi';
import { MdLocalOffer, MdWhatshot, MdVerified } from 'react-icons/md';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), { 
  ssr: false,
  loading: () => <div className="loading-map">جارٍ تحميل الخريطة...</div>
});

// ⚙️ إعداد الأقسام المحسّن
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋', color: '#4f46e5' },
  
  // رئيسية
  { key: 'cars', label: 'سيارات', icon: '🚗', color: '#ef4444' },
  { key: 'real_estate', label: 'عقارات', icon: '🏡', color: '#10b981' },
  { key: 'phones', label: 'جوالات', icon: '📱', color: '#3b82f6' },
  { key: 'electronics', label: 'إلكترونيات', icon: '💻', color: '#8b5cf6' },
  { key: 'motorcycles', label: 'دراجات نارية', icon: '🏍️', color: '#f59e0b' },
  { key: 'heavy_equipment', label: 'معدات ثقيلة', icon: '🚜', color: '#6366f1' },
  { key: 'solar', label: 'طاقة شمسية', icon: '☀️', color: '#f97316' },
  { key: 'networks', label: 'نت وشبكات', icon: '📡', color: '#06b6d4' },
  { key: 'maintenance', label: 'صيانة', icon: '🛠️', color: '#64748b' },
  
  // ثانوية
  { key: 'furniture', label: 'أثاث', icon: '🛋️', color: '#ec4899' },
  { key: 'animals', label: 'حيوانات وطيور', icon: '🐑', color: '#84cc16' },
  { key: 'jobs', label: 'وظائف', icon: '💼', color: '#14b8a6' },
  { key: 'services', label: 'خدمات', icon: '🧰', color: '#8b5cf6' },
];

// 🔹 كرت إعلان محسّن
function HomeListingCard({ listing }) {
  const category = CATEGORY_CONFIG.find(cat => cat.key === listing.category) || CATEGORY_CONFIG[0];
  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || '/placeholder-image.jpg';
  
  const formatTime = (timestamp) => {
    if (!timestamp) return 'قبل قليل';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <Link href={`/listing/${listing.id}`} className="listing-card-link">
      <div className="listing-card">
        <div className="listing-image-container">
          <img
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            className="listing-image"
            loading="lazy"
          />
          <span className="listing-category-tag" style={{ backgroundColor: category.color }}>
            {category.icon} {category.label}
          </span>
          {listing.featured && (
            <div className="featured-badge">
              <MdWhatshot /> مميز
            </div>
          )}
        </div>
        
        <div className="listing-content">
          <h3 className="listing-title">{listing.title || 'بدون عنوان'}</h3>
          
          <div className="listing-location">
            <FiMapPin />
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>
          
          <div className="listing-description">
            {listing.description ? 
              `${listing.description.substring(0, 80)}${listing.description.length > 80 ? '...' : ''}` 
              : 'لا يوجد وصف'}
          </div>
          
          <div className="listing-price">
            <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
          </div>
          
          <div className="listing-meta">
            <span className="listing-views">
              <FiEye /> {Number(listing.views || 0)}
            </span>
            <span className="listing-time">
              <FiClock /> {formatTime(listing.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// 🔹 مكون البحث المحسّن
function SearchBar({ search, setSearch, suggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  
  const handleSearch = () => {
    if (search.trim()) {
      // يمكن إضافة منطق البحث هنا
      setShowSuggestions(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-wrapper">
        <input
          type="text"
          placeholder="ابحث عن سيارات، عقارات، جوالات، وظائف..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button" type="button">
          <FiSearch />
          بحث
        </button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((item, index) => (
            <div
              key={index}
              className="search-suggestion-item"
              onClick={() => handleSuggestionClick(item)}
            >
              <FiSearch size={14} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const router = useRouter();
  
  // توليد اقتراحات البحث
  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    
    const allSuggestions = new Set();
    listings.forEach(listing => {
      if (listing.title && listing.title.toLowerCase().includes(search.toLowerCase())) {
        allSuggestions.add(listing.title);
      }
      if (listing.city) {
        allSuggestions.add(listing.city);
      }
      if (listing.category) {
        allSuggestions.add(listing.category);
      }
    });
    
    return Array.from(allSuggestions).slice(0, 5);
  }, [search, listings]);
  
  // 📡 جلب الإعلانات من Firestore
  useEffect(() => {
    try {
      // جلب الإعلانات العادية
      const unsubscribeListings = db
        .collection('listings')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setListings(data);
            setLoading(false);
          },
          (error) => {
            console.error('Firestore home error:', error);
            setErr('حدث خطأ في جلب الإعلانات');
            setLoading(false);
          }
        );
      
      // جلب الإعلانات المميزة
      const unsubscribeFeatured = db
        .collection('listings')
        .where('featured', '==', true)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(6)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setFeaturedListings(data);
          },
          (error) => {
            console.error('Firestore featured error:', error);
          }
        );
      
      return () => {
        unsubscribeListings();
        unsubscribeFeatured();
      };
    } catch (error) {
      console.error('Firestore home fatal:', error);
      setErr('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);
  
  // 🔍 فلترة (بحث + قسم)
  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    return listings.filter((l) => {
      const cat = (l.category || '').toLowerCase();
      
      if (selectedCategory !== 'all' && cat !== selectedCategory) return false;
      
      if (!q) return true;
      
      const title = (l.title || '').toLowerCase();
      const city = (l.city || '').toLowerCase();
      const loc = (l.locationLabel || '').toLowerCase();
      const desc = (l.description || '').toLowerCase();
      
      return (
        title.includes(q) ||
        city.includes(q) ||
        loc.includes(q) ||
        desc.includes(q) ||
        cat.includes(q)
      );
    });
  }, [search, listings, selectedCategory]);
  
  // تحميل المزيد من الإعلانات
  const loadMoreListings = () => {
    // يمكن تنفيذ pagination هنا
    console.log('تحميل المزيد من الإعلانات...');
  };
  
  return (
    <div className="home-page">
      {/* هيرو محسّن */}
      <section className="home-hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              سوق اليمن
              <span className="hero-highlight"> الإلكتروني</span>
            </h1>
            <p className="hero-subtitle">
              أكبر منصة لبيع وشراء كل شيء في اليمن — سيارات، عقارات، جوالات، طاقة شمسية،
              وظائف، صيانة، معدات ثقيلة وأكثر. ابدأ بيع منتجاتك اليوم!
            </p>
            
            {/* شريط البحث المحسّن */}
            <SearchBar 
              search={search}
              setSearch={setSearch}
              suggestions={searchSuggestions}
            />
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{listings.length}+</span>
                <span className="stat-label">إعلان نشط</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{featuredListings.length}+</span>
                <span className="stat-label">إعلان مميز</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">دعم فني</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* شريط الفئات المحسّن */}
      <div className="categories-scroll-container">
        <div className="container">
          <div className="categories-wrapper">
            {CATEGORY_CONFIG.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`category-button ${active ? 'active' : ''}`}
                  type="button"
                  style={active ? { background: cat.color } : {}}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* محتوى الصفحة الرئيسية */}
      <main className="container">
        {/* قسم الإعلانات المميزة */}
        {featuredListings.length > 0 && (
          <section className="featured-section">
            <div className="section-header">
              <h2 className="section-title">
                <MdWhatshot className="icon" />
                الإعلانات المميزة
              </h2>
              <Link href="/featured" className="view-all-link">
                عرض الكل
                <span className="arrow">→</span>
              </Link>
            </div>
            
            <div className="listings-grid featured-grid">
              {featuredListings.map((listing) => (
                <HomeListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        )}
        
        {/* ترويسة المحتوى */}
        <div className="content-header">
          <div>
            <h2 className="section-title">
              {selectedCategory === 'all' ? 'أحدث الإعلانات' : 
                `${CATEGORY_CONFIG.find(c => c.key === selectedCategory)?.label} - أحدث الإعلانات`}
            </h2>
            <p className="section-subtitle muted">
              عرض {filteredListings.length} من {listings.length} إعلان
            </p>
          </div>
          
          <div className="view-controls">
            <div className="view-toggle">
              <button
                className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                type="button"
              >
                <FiGrid />
                قائمة
              </button>
              <button
                className={`toggle-button ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => setViewMode('map')}
                type="button"
              >
                <FiMap />
                خريطة
              </button>
            </div>
            
            <div className="sort-controls">
              <select className="sort-select">
                <option value="newest">الأحدث أولاً</option>
                <option value="priceLow">السعر من الأقل</option>
                <option value="priceHigh">السعر من الأعلى</option>
                <option value="views">الأكثر مشاهدة</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* حالات التحميل / الأخطاء */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>جاري تحميل الإعلانات...</p>
          </div>
        )}
        
        {err && !loading && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>حدث خطأ</h3>
            <p>{err}</p>
            <button onClick={() => window.location.reload()} className="btn btnPrimary">
              إعادة المحاولة
            </button>
          </div>
        )}
        
        {!loading && !err && filteredListings.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>لا توجد إعلانات</h3>
            <p>لا توجد إعلانات مطابقة لبحثك حالياً.</p>
            <button 
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }} 
              className="btn btnPrimary"
            >
              عرض كل الإعلانات
            </button>
          </div>
        )}
        
        {/* ✅ العرض حسب الوضع */}
        {!loading && !err && filteredListings.length > 0 && (
          <>
            {viewMode === 'map' ? (
              <div className="map-view-container">
                <HomeMapView listings={filteredListings} />
              </div>
            ) : (
              <>
                <div className="listings-grid">
                  {filteredListings.map((listing) => (
                    <HomeListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                
                {/* زر تحميل المزيد */}
                {filteredListings.length >= 20 && (
                  <div className="load-more-container">
                    <button onClick={loadMoreListings} className="btn btnOutline">
                      تحميل المزيد من الإعلانات
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      
      {/* زر إضافة إعلان */}
      <button 
        onClick={() => router.push('/add')}
        className="add-listing-button"
      >
        <FiPlus />
        أضف إعلانك مجاناً
      </button>
      
      {/* ستايل إضافي */}
      <style jsx>{`
        /* تحسينات إضافية */
        .hero-highlight {
          color: #fbbf24;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 2rem;
          flex-wrap: wrap;
        }
        
        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          backdrop-filter: blur(10px);
        }
        
        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
        }
        
        .search-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          margin-top: 0.5rem;
          z-index: 100;
          overflow: hidden;
        }
        
        .search-suggestion-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: background 0.2s ease;
        }
        
        .search-suggestion-item:hover {
          background: #f8fafc;
        }
        
        .featured-grid .listing-card {
          border: 2px solid #fbbf24;
        }
        
        .featured-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: #f59e0b;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .listing-description {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .view-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .sort-select {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: white;
          font-size: 0.875rem;
          color: #374151;
        }
        
        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error-icon, .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        .load-more-container {
          text-align: center;
          margin: 2rem 0;
        }
        
        .listing-card-link {
          text-decoration: none;
          color: inherit;
        }
        
        @media (max-width: 768px) {
          .hero-stats {
            gap: 1rem;
          }
          
          .stat-item {
            padding: 0.75rem 1rem;
          }
          
          .stat-number {
            font-size: 1.25rem;
          }
          
          .view-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .sort-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
