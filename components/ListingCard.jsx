// components/ListingCard.jsx
'use client';

import Link from 'next/link';
import Price from '@/components/Price';

export default function ListingCard({ listing }) {
  const img = (listing.images && listing.images[0]) || listing.image || null;
  return (
    <Link href={`/listing/${listing.id}`} className="card" style={{ display:'block' }}>
      {img ? <img src={img} alt={listing.title || 'listing'} style={{ height:170, width:'100%', objectFit:'cover' }} /> : null}
      <div style={{ marginTop:10 }}>
        <div style={{ fontWeight:800, marginBottom:4, lineHeight:1.3 }}>{listing.title || 'بدون عنوان'}</div>
        <div className="row" style={{ justifyContent:'space-between' }}>
          <span className="badge">{listing.categoryName || listing.category || 'قسم'}</span>
          <span className="muted" style={{ fontSize:12 }}>👁️ {Number(listing.views || 0)}</span>
        </div>
        <div style={{ marginTop:8 }}>
          <Price priceYER={listing.priceYER || 0} />
        </div>
      </div>
    </Link>
  );
}
