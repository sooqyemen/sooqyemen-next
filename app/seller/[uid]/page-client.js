'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Price from '@/components/Price';
import { loadFirebaseClient } from '@/lib/firebaseLoader';
import { normalizeCategoryKey } from '@/lib/categories';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

function pickOwnerUid(listing) {
  return (
    listing?.userId ||
    listing?.uid ||
    listing?.ownerId ||
    listing?.userUID ||
    listing?.userUid ||
    listing?.createdBy ||
    null
  );
}

function pickOwnerName(listing) {
  return (
    safeText(listing?.sellerName) ||
    safeText(listing?.userName) ||
    safeText(listing?.displayName) ||
    safeText(listing?.contactName) ||
    safeText(listing?.name) ||
    'البائع'
  );
}

function ListingCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || null;
  const title = safeText(listing.title) || 'بدون عنوان';
  const city = safeText(listing.city) || safeText(listing.locationLabel) || 'غير محدد';
  const cat = normalizeCategoryKey(listing.category);

  return (
    <Link href={`/listing/${listing.id}`} className="cardLink">
      <div className="card">
        <div className="imgWrap">
          {img ? (
            <Image
              src={img}
              alt={title}
              width={520}
              height={360}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          ) : (
            <div className="imgFallback">🖼️</div>
          )}
        </div>

        <div className="body">
          <div className="row">
            <div className="title" title={title}>
              {title}
            </div>
            <div className="pill">{cat || '—'}</div>
          </div>

          <div className="meta">📍 {city}</div>

          <div className="price">
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
              originalPrice={listing.originalPrice}
              originalCurrency={listing.originalCurrency}
              showCurrency={true}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .cardLink {
          text-decoration: none;
          color: inherit;
        }
        .card {
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          transition: transform 0.08s ease;
        }
        .card:active {
          transform: scale(0.99);
        }
        .imgWrap {
          height: 160px;
          background: #f1f5f9;
          position: relative;
        }
        .imgFallback {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          opacity: 0.7;
        }
        .body {
          padding: 10px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .title {
          font-weight: 850;
          font-size: 0.95rem;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pill {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.05);
          font-weight: 800;
        }
        .meta {
          margin-top: 6px;
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .price {
          margin-top: 8px;
        }
      `}</style>
    </Link>
  );
}

export default function SellerListingsClient({ uid }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listings, setListings] = useState([]);

  const titleName = useMemo(() => {
    const first = listings[0];
    return first ? pickOwnerName(first) : 'البائع';
  }, [listings]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');

      try {
        const { db } = await loadFirebaseClient();
        if (cancelled) return;

        // نحاول userId أولاً (الأفضل)، وإذا فشل/لا يوجد نحاول uid
        const tryQuery = async (field) => {
          // قد يفشل orderBy بسبب index — نعالجها بخطة بديلة
          try {
            const snap = await db
              .collection('listings')
              .where(field, '==', uid)
              .orderBy('createdAt', 'desc')
              .limit(60)
              .get();

            return snap;
          } catch {
            const snap = await db.collection('listings').where(field, '==', uid).limit(60).get();
            return snap;
          }
        };

        let snap = await tryQuery('userId');
        if (!snap?.docs?.length) snap = await tryQuery('uid');

        const data = (snap?.docs || [])
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.isActive !== false && l.hidden !== true);

        // ترتيب محلي (حتى لو الاستعلام بدون orderBy)
        data.sort((a, b) => {
          const ta = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a?.createdAt || 0).getTime();
          const tb = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b?.createdAt || 0).getTime();
          return tb - ta;
        });

        if (cancelled) return;
        setListings(data);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'حدث خطأ في جلب الإعلانات');
        setLoading(false);
      }
    };

    if (uid) run();
    else {
      setLoading(false);
      setListings([]);
    }

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div className="wrap" dir="rtl">
      <div className="top">
        <div>
          <h1 className="h1">إعلانات: {titleName}</h1>
          <div className="sub">{loading ? '...' : `${listings.length} إعلان`}</div>
        </div>
        <Link className="back" href="/">
          ⬅️ الرئيسية
        </Link>
      </div>

      {loading ? (
        <div className="muted">جاري التحميل...</div>
      ) : error ? (
        <div className="error">⚠️ {error}</div>
      ) : listings.length === 0 ? (
        <div className="muted">لا توجد إعلانات لهذا البائع حالياً.</div>
      ) : (
        <div className="grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <style jsx>{`
        .wrap {
          padding: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .h1 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 900;
        }
        .sub {
          opacity: 0.7;
          margin-top: 4px;
        }
        .back {
          text-decoration: none;
          background: #0f172a;
          color: #fff;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 800;
        }
        .muted {
          opacity: 0.75;
          padding: 12px 0;
        }
        .error {
          color: #b91c1c;
          padding: 12px 0;
          font-weight: 800;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
