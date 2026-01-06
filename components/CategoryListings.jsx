// components/CategoryListings.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Price from '@/components/Price';
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

function GridListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
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
                const el = e.currentTarget;
                el.style.display = 'none';
                const fallback = el.parentElement?.querySelector('.img-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`img-fallback ${img ? 'hidden' : ''}`}>🖼️</div>
          {listing.auctionEnabled && <div className="auction-badge">⚡ مزاد</div>}
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3 className="listing-title" title={listing.title || ''}>
              {listing.title || 'بدون عنوان'}
            </h3>
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

function ListListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
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
                const el = e.currentTarget;
                el.style.display = 'none';
                const fallback = el.parentElement?.querySelector('.list-img-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`list-img-fallback ${img ? 'hidden' : ''}`}>🖼️</div>
        </div>

        <div className="list-content">
          <div className="list-header">
            <div className="list-title-section">
              <h3 className="list-title" title={listing.title || ''}>
                {listing.title || 'بدون عنوان'}
              </h3>
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

export default function CategoryListings({ category }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list | map

  useEffect(() => {
    setLoading(true);
    setError('');

    // ✅ أول محاولة: فلترة من Firestore
    try {
      const ref = db
        .collection('listings')
        .where('category', '==', String(category || '').trim())
        .orderBy('createdAt', 'desc')
        .limit(200);

      const unsub = ref.onSnapshot(
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((l) => l.isActive !== false && l.hidden !== true);

          setListings(data);
          setLoading(false);
        },
        async (err) => {
          // ✅ fallback: لو احتاج index / أو فشل where+orderBy
          console.error('Category query failed, fallback:', err);
          try {
            const ref2 = db.collection('listings').orderBy('createdAt', 'desc').limit(300);
            const unsub2 = ref2.onSnapshot(
              (snap2) => {
                const all = snap2.docs
                  .map((d) => ({ id: d.id, ...d.data() }))
                  .filter((l) => l.isActive !== false && l.hidden !== true);

                const filtered = all.filter(
                  (l) => String(l.category || '').trim() === String(category || '').trim()
                );

                setListings(filtered);
                setLoading(false);
              },
              (err2) => {
                console.error(err2);
                setError(err2?.message || 'حدث خطأ في جلب الإعلانات');
                setLoading(false);
              }
            );

            return () => unsub2();
          } catch (e2) {
            console.error(e2);
            setError('حدث خطأ في جلب الإعلانات');
            setLoading(false);
          }
        }
      );

      return () => unsub();
    } catch (e) {
      console.error(e);
      setError('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, [category]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter((l) => {
      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const locationLabel = safeText(l.locationLabel).toLowerCase();
      const description = safeText(l.description).toLowerCase();
      return (
        title.includes(q) ||
        city.includes(q) ||
        locationLabel.includes(q) ||
        description.includes(q)
      );
    });
  }, [listings, search]);

  const handleViewModeChange = (mode) => setViewMode(mode);

  if (loading) {
    return (
      <div className="loading-container" aria-live="polite" aria-busy="true">
        <div className="spinner" aria-hidden="true"></div>
        <p>جاري تحميل إعلانات القسم...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon" aria-hidden="true">
          ⚠️
        </div>
        <h3>حدث خطأ</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left" style={{ gap: 10, display: 'flex', alignItems: 'center' }}>
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

          <input
            className="input"
            style={{ width: 260, maxWidth: '50vw' }}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث داخل هذا القسم..."
            aria-label="بحث داخل القسم"
          />
        </div>

        <div className="toolbar-right">
          <span className="results-count" aria-live="polite">
            <span className="results-number">{filteredListings.length}</span> إعلان
          </span>
        </div>
      </div>

      {filteredListings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📭</div>
          <h3>لا توجد إعلانات في هذا القسم</h3>
          <p>جرّب تغيير البحث أو أضف إعلان جديد.</p>
          <Link href="/add" className="add-listing-link focus-ring">➕ أضف إعلان</Link>
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

      <style jsx>{`
        .results-number {
          font-weight: 700;
          color: var(--color-primary-light);
        }
        .view-toggle-label {
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .view-toggle-label {
            display: none;
          }
          .view-toggle-button {
            padding: 0.5rem;
          }
          :global(.input) {
            width: 180px !important;
          }
        }
        .map-view {
          margin-bottom: 2rem;
        }
      `}</style>
    </div>
  );
}
