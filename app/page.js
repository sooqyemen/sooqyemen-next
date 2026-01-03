// app/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/Header';
import Price from '@/components/Price';
import { db } from '@/lib/firebaseClient';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), { ssr: false });

// ⚙️ إعداد الأقسام
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋' },

  // رئيسية
  { key: 'cars', label: 'سيارات', icon: '🚗' },
  { key: 'real_estate', label: 'عقارات', icon: '🏡' },
  { key: 'phones', label: 'جوالات', icon: '📱' },
  { key: 'electronics', label: 'إلكترونيات', icon: '💻' },
  { key: 'motorcycles', label: 'دراجات نارية', icon: '🏍️' },
  { key: 'heavy_equipment', label: 'معدات ثقيلة', icon: '🚜' },
  { key: 'solar', label: 'طاقة شمسية', icon: '☀️' },
  { key: 'networks', label: 'نت و شبكات', icon: '📡' },
  { key: 'maintenance', label: 'صيانة', icon: '🛠️' },

  // ثانوية
  { key: 'furniture', label: 'أثاث', icon: '🛋️' },
  { key: 'animals', label: 'حيوانات و طيور', icon: '🐑' },
  { key: 'jobs', label: 'وظائف', icon: '💼' },
  { key: 'services', label: 'خدمات', icon: '🧰' },
];

// 🔹 كرت إعلان
function HomeListingCard({ listing }) {
  const img =
    (Array.isArray(listing.images) && listing.images[0]) ||
    listing.image ||
    null;

  return (
    <Link href={`/listing/${listing.id}`}>
      <div
        className="card home-card"
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer',
          background: '#ffffff',
        }}
      >
        {img && (
          <img
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
            }}
          />
        )}

        <div
          style={{
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {listing.title || 'بدون عنوان'}
          </div>

          <div
            className="muted"
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>📍</span>
            <span>{listing.city || listing.locationLabel || 'غير محدد'}</span>
          </div>

          <div style={{ marginTop: 6 }}>
            <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
          </div>

          <div
            className="muted"
            style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 8 }}
          >
            <span>👁️ {Number(listing.views || 0)}</span>
            {listing.category && <span>• {listing.category}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // ✅ جديد: وضع العرض
  const [viewMode, setViewMode] = useState('list'); // list | map

  // 📡 جلب الإعلانات من Firestore
  useEffect(() => {
    try {
      const unsubscribe = db
        .collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(60)
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

      return () => unsubscribe();
    } catch (error) {
      console.error('Firestore home fatal:', error);
      setErr('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);

  // 🔍 فلترة (بحث + قسم)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings.filter((l) => {
      const cat = (l.category || '').toLowerCase();

      if (selectedCategory !== 'all' && cat !== selectedCategory) return false;

      if (!q) return true;

      const title = (l.title || '').toLowerCase();
      const city = (l.city || '').toLowerCase();
      const loc = (l.locationLabel || '').toLowerCase();

      return (
        title.includes(q) ||
        city.includes(q) ||
        loc.includes(q) ||
        cat.includes(q)
      );
    });
  }, [search, listings, selectedCategory]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />

      {/* هيرو مناسب للجوال */}
      <section className="home-hero">
        <div className="container">
          <div className="home-hero-inner">
            <h1 className="home-hero-title">سوق اليمن</h1>
            <p className="home-hero-subtitle">
              بيع وشراء كل شيء في اليمن — سيارات، عقارات، جوالات، طاقة شمسية،
              وظائف، صيانة، معدات ثقيلة وأكثر.
            </p>

            {/* شريط البحث */}
            <div className="home-search-wrapper">
              <div className="home-search-bar">
                <input
                  type="text"
                  placeholder="ابحث باسم المنتج أو المدينة أو القسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="home-search-input"
                />
                <button className="home-search-button" type="button">
                  بحث
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* محتوى الصفحة */}
      <div className="container" style={{ padding: '18px 0 40px' }}>
        {/* شريط الأقسام أفقي */}
        <div className="category-strip">
          {CATEGORY_CONFIG.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className="category-pill"
                type="button"
                style={{
                  borderColor: active
                    ? 'rgba(79,70,229,0.5)'
                    : 'rgba(226,232,240,1)',
                  backgroundColor: active
                    ? 'rgba(79,70,229,0.08)'
                    : '#ffffff',
                  color: active ? '#4f46e5' : '#4b5563',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span className="category-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ✅ جديد: زرّين للتبديل (قائمة / خريطة) */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          <div className="row" style={{ gap: 8 }}>
            <button
              className={'btn ' + (viewMode === 'list' ? 'btnPrimary' : '')}
              onClick={() => setViewMode('list')}
              type="button"
            >
              📋 قائمة
            </button>

            <button
              className={'btn ' + (viewMode === 'map' ? 'btnPrimary' : '')}
              onClick={() => setViewMode('map')}
              type="button"
            >
              🗺️ خريطة
            </button>
          </div>

          <span className="muted" style={{ fontSize: 12 }}>
            نتيجة الفلتر: {filtered.length}
          </span>
        </div>

        {/* حالات التحميل / الأخطاء */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', marginTop: 12 }}>
            جاري تحميل الإعلانات...
          </div>
        )}

        {err && !loading && (
          <div
            className="card"
            style={{
              textAlign: 'center',
              color: '#b91c1c',
              marginTop: 12,
            }}
          >
            {err}
          </div>
        )}

        {!loading && !err && filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', marginTop: 12 }}>
            لا توجد إعلانات مطابقة لبحثك حالياً.
          </div>
        )}

        {/* ✅ العرض حسب الوضع */}
        {!loading && !err && filtered.length > 0 && (
          <>
            {viewMode === 'map' ? (
              <HomeMapView listings={filtered} />
            ) : (
              <>
                <div
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    marginTop: 10,
                  }}
                >
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    أحدث الإعلانات
                  </h2>
                  <span className="muted" style={{ fontSize: 12 }}>
                    عدد الإعلانات: {filtered.length}
                  </span>
                </div>

                <div className="home-grid">
                  {filtered.map((listing) => (
                    <HomeListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ستايل إضافي للجوال */}
      <style jsx>{`
        .home-hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 34px 0 44px;
        }
        .home-hero-inner {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        .home-hero-title {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 10px;
        }
        .home-hero-subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 18px;
          line-height: 1.6;
        }
        .home-search-wrapper {
          max-width: 720px;
          margin: 0 auto;
        }
        .home-search-bar {
          background: white;
          border-radius: 999px;
          padding: 4px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .home-search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 10px 16px;
          font-size: 14px;
          border-radius: 999px;
        }
        .home-search-button {
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
        }

        .category-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 6px 2px 10px;
          margin-bottom: 4px;
          scroll-behavior: smooth;
        }
        .category-strip::-webkit-scrollbar {
          display: none;
        }
        .category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border-width: 1px;
          border-style: solid;
          background: #ffffff;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .category-icon {
          font-size: 15px;
        }

        .home-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .home-hero {
            padding: 22px 0 30px;
          }
          .home-hero-title {
            font-size: 26px;
          }
          .home-hero-subtitle {
            font-size: 14px;
            margin-bottom: 14px;
          }
          .home-search-bar {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          }
          .home-search-input {
            font-size: 13px;
            padding: 8px 12px;
          }
          .home-search-button {
            padding: 8px 16px;
            font-size: 13px;
          }
          .home-grid {
            grid-template-columns: 1fr;
          }
          .home-card img {
            height: 170px;
          }
        }
      `}</style>
    </div>
  );
}
