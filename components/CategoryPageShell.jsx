'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';
import Price from '@/components/Price';

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

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

function ListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const title = listing.title || 'بدون عنوان';
  const city = listing.city || listing.locationLabel || 'غير محدد';
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 90 ? `${desc.slice(0, 90)}...` : desc || '—';

  return (
    <Link href={`/listing/${listing.id}`} className="card-link">
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <div
            style={{
              width: 110,
              height: 90,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              '🖼️'
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              📍 {city}
            </div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              {shortDesc}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <Price
                  priceYER={listing.currentBidYER || listing.priceYER || 0}
                  originalPrice={listing.originalPrice}
                  originalCurrency={listing.originalCurrency}
                  showCurrency={true}
                />
              </div>

              <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                ⏱️ {formatRelative(listing.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPageShell({
  title = 'قسم',
  description = '',
  slug = '',
  categoryKeys = [], // مثال: ['electronics'] أو ['mobiles','phones']
}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    try {
      // ✅ نفس فكرة الهوم: نجلب آخر 300 إعلان ثم نفلتر محلياً (بدون where/index)
      const ref = db.collection('listings').orderBy('createdAt', 'desc').limit(300);

      const unsub = ref.onSnapshot(
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((x) => x.isActive !== false && x.hidden !== true);

          setListings(data);
          setLoading(false);
        },
        (err) => {
          console.error('Category fetch error:', err);
          setError(err?.message || 'حدث خطأ في جلب الإعلانات');
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.error('Fatal category fetch error:', e);
      setError('تعذّر الاتصال بقاعدة البيانات');
      setLoading(false);
    }
  }, []);

  const keys = useMemo(() => {
    const arr = Array.isArray(categoryKeys) ? categoryKeys : [categoryKeys];
    return arr.map(norm).filter(Boolean);
  }, [categoryKeys]);

  const filtered = useMemo(() => {
    if (!keys.length) return listings;
    return listings.filter((l) => keys.includes(norm(l.category)));
  }, [listings, keys]);

  return (
    <div className="container" style={{ padding: '18px 12px' }} dir="rtl">
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          <Link href="/" className="muted">الرئيسية</Link>
          <span> / </span>
          <span>{slug || title}</span>
        </div>

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{title}</h1>
        {description ? <p className="muted" style={{ margin: '8px 0 0' }}>{description}</p> : null}

        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          العدد: <b>{filtered.length}</b> إعلان
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 16 }}>جاري تحميل الإعلانات…</div>
      ) : error ? (
        <div className="card" style={{ padding: 16, border: '1px solid #fca5a5' }}>
          ⚠️ {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          لا توجد إعلانات في هذا القسم حالياً.
          <div style={{ marginTop: 10 }}>
            <Link href="/add" className="btn btnPrimary">➕ أضف إعلان</Link>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            ملاحظة: إذا عندك إعلانات بالقسم لكن ما ظهرت، فغالباً قيمة <b>category</b> داخل قاعدة البيانات مختلفة عن اسم الرابط.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
