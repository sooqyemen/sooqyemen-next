// components/ListingCard.jsx
'use client';

import Link from 'next/link';
import Price from '@/components/Price';

export default function ListingCard({ listing }) {
  const img =
    (listing.images && listing.images[0]) ||
    listing.image ||
    null;

  const city = listing.city || listing.region || '';

  const rawDesc = String(listing.description || '');
  const shortDesc =
    rawDesc.length > 80 ? rawDesc.slice(0, 80) + '…' : rawDesc;

  const priceYER =
    listing.priceYER ??
    listing.currentBidYER ??
    listing.price ??
    0;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="card"
      style={{ display: 'block' }}
    >
      {/* الصورة */}
      {img ? (
        <div style={{ overflow: 'hidden', borderRadius: 12 }}>
          <img
            src={img}
            alt={listing.title || 'إعلان'}
            style={{
              height: 170,
              width: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        {/* العنوان */}
        <div
          style={{
            fontWeight: 800,
            marginBottom: 4,
            lineHeight: 1.4,
            fontSize: 15,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {listing.title || 'بدون عنوان'}
        </div>

        {/* المدينة + عدد المشاهدات */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <span className="muted" style={{ fontSize: 12 }}>
            {city ? `📍 ${city}` : ''}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            👁️ {Number(listing.views || 0)}
          </span>
        </div>

        {/* القسم + السعر */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="badge">
            {listing.categoryName ||
              listing.category ||
              'قسم'}
          </span>

          <div style={{ fontWeight: 700 }}>
            <Price priceYER={priceYER} />
          </div>
        </div>

        {/* وصف مختصر */}
        {shortDesc ? (
          <p
            className="muted"
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {shortDesc}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
