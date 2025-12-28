// app/listing/[id]/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Price from '@/components/Price';
import AuctionBox from '@/components/AuctionBox';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';
import Link from 'next/link';

const ListingMap = dynamic(() => import('@/components/Map/ListingMap'), { ssr: false });

function makeChatId(uid1, uid2, listingId) {
  const a = String(uid1 || '');
  const b = String(uid2 || '');
  const sorted = [a, b].sort().join('_');
  return `${sorted}__${listingId}`;
}

export default function ListingDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = db.collection('listings').doc(id).onSnapshot((doc) => {
      setListing(doc.exists ? ({ id: doc.id, ...doc.data() }) : null);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // سجل مشاهدة الإعلان
    logListingView(id, user).catch(()=>{});
  }, [id, user?.uid]);

  const coords = useMemo(() => {
    if (!listing) return null;
    if (Array.isArray(listing.coords) && listing.coords.length === 2) return listing.coords;
    if (listing?.coords?.lat && listing?.coords?.lng) return [listing.coords.lat, listing.coords.lng];
    return null;
  }, [listing]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="container"><div className="card muted">جاري التحميل...</div></div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Header />
        <div className="container"><div className="card">الإعلان غير موجود</div></div>
      </>
    );
  }

  const img = (listing.images && listing.images[0]) || listing.image || null;
  const sellerUid = listing.userId;
  const chatId = (user && sellerUid) ? makeChatId(user.uid, sellerUid, listing.id) : null;

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <Link className="btn" href="/">← رجوع</Link>
          <span className="badge">👁️ {Number(listing.views || 0)}</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'1.4fr 1fr', marginTop:12 }}>
          <div className="card">
            {img ? <img src={img} alt={listing.title || 'img'} style={{ height: 320, width:'100%', objectFit:'cover' }} /> : null}
            <div style={{ marginTop:10, fontWeight:900, fontSize:22 }}>{listing.title || 'بدون عنوان'}</div>
            <div className="muted" style={{ marginTop:4 }}>{listing.city || ''}</div>
            <div style={{ marginTop:10 }}>
              <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
            </div>

            <hr />
            <div style={{ fontWeight:800, marginBottom:6 }}>الوصف</div>
            <div style={{ whiteSpace:'pre-wrap', lineHeight:1.7 }}>{listing.description || '—'}</div>

            <hr />
            <div className="row">
              {listing.phone ? (
                <a className="btn btnPrimary" href={`tel:${listing.phone}`}>اتصال</a>
              ) : null}
              {listing.phone && listing.isWhatsapp ? (
                <a className="btn" href={`https://wa.me/${String(listing.phone).replace(/\D/g,'')}`} target="_blank">واتساب</a>
              ) : null}

              {chatId ? (
                <Link className="btn" href={`/chat/${encodeURIComponent(chatId)}?listingId=${encodeURIComponent(listing.id)}&other=${encodeURIComponent(listing.userEmail || '')}`}>
                  بدء محادثة
                </Link>
              ) : (
                <span className="muted" style={{ fontSize:12 }}>سجل دخول لبدء محادثة</span>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gap:12 }}>
            <AuctionBox listingId={listing.id} listing={listing} />
            <ListingMap coords={coords} label={listing.locationLabel || listing.city || ''} />
          </div>
        </div>
      </div>
    </>
  );
}
