'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Price from '@/components/Price';
import { db } from '@/lib/firebaseClient';

// إعداد الأقسام (مثل حراج)
const CATEGORY_CONFIG = [
  { key: 'all', label: 'الكل', icon: '📋' },
  { key: 'cars', label: 'سيارات', icon: '🚗' },
  { key: 'real_estate', label: 'عقارات', icon: '🏡' },
  { key: 'phones', label: 'جوالات', icon: '📱' },
  { key: 'electronics', label: 'أجهزة', icon: '💻' },
  { key: 'solar', label: 'طاقة شمسية', icon: '☀️' },
  { key: 'furniture', label: 'أثاث', icon: '🛋️' },
  { key: 'animals', label: 'حيوانات وطيور', icon: '🐑' },
  { key: 'jobs', label: 'وظائف', icon: '💼' },
  { key: 'services', label: 'خدمات', icon: '🛠️' },
];

// كرت إعلان في الصفحة الرئيسية
function HomeListingCard({ listing }) {
  const img =
    (Array.isArray(listing.images) && listing.images[0]) ||
    listing.image ||
    null;

  return (
    <Link href={`/listing/${listing.id}`}>
      <div
        className="card"
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer',
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

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            <span>
              {listing.city || listing.locationLabel || 'غير محدد'}
            </span>
          </div>

          <div style={{ marginTop: 6 }}>
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
            />
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

  // ✅ جلب الإعلانات من Firestore
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

  // 🔍 فلترة حسب البحث + القسم
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings.filter((l) => {
      const cat = (l.category || '').toLowerCase();

      // فلترة القسم
      if (selectedCategory !== 'all' && cat !== selectedCategory) {
        return false;
      }

      // فلترة البحث
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

      {/* الهيرو مع البحث */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px 0 50px',
        }}
      >
        <div className="container">
          <div
            style={{
              maxWidth: 800,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 32,
                fontWeight: 900,
                marginBottom: 12,
              }}
            >
              سوق اليمن
            </h1>
            <p
              style={{
                fontSize: 16,
                opacity: 0.9,
                marginBottom: 20,
              }}
            >
              بيع وشراء كل شيء في اليمن — سيارات، عقارات، جوالات، طاقة شمسية،
              وظائف وأكثر.
            </p>

            <div
              style={{
                background: 'white',
                borderRadius: 999,
                padding: 4,
                maxWidth: 700,
                margin: '0 auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="ابحث باسم المنتج أو المدينة أو القسم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '10px 16px',
                    fontSize: 14,
                  }}
                />
                <button
                  style={{
                    borderRadius: 999,
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  بحث
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: '24px 0 40px' }}>
        {/* 🔷 شريط الأقسام مثل حراج */}
        <div
          className="row"
          style={{
            gap: 8,
            marginBottom: 16,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {CATEGORY_CONFIG.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  borderRadius: 999,
                  border: active
                    ? '1px solid rgba(79,70,229,0.5)'
                    : '1px solid #e5e7eb',
                  background: active ? 'rgba(79,70,229,0.08)' : 'white',
                  color: active ? '#4f46e5' : '#4b5563',
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* حالة التحميل / الأخطاء */}
        {loading && (
          <div className="card" style={{ textAlign: 'center' }}>
            جاري تحميل الإعلانات...
          </div>
        )}

        {err && !loading && (
          <div
            className="card"
            style={{ textAlign: 'center', color: '#b91c1c' }}
          >
            {err}
          </div>
        )}

        {!loading && !err && filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            لا توجد إعلانات مطابقة لبحثك حالياً.
          </div>
        )}

        {/* شبكة الإعلانات */}
        {!loading && !err && filtered.length > 0 && (
          <>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                أحدث الإعلانات
              </h2>
              <span className="muted" style={{ fontSize: 12 }}>
                عدد الإعلانات: {filtered.length}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {filtered.map((listing) => (
                <HomeListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
