// app/listing/[id]/page.js
'use client';

import CommentsBox from '@/components/CommentsBox';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Price from '@/components/Price';
import AuctionBox from '@/components/AuctionBox';
import { db, firebase } from '@/lib/firebaseClient'; // ✅ أضفنا firebase
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';
import Link from 'next/link';

const ListingMap = dynamic(() => import('@/components/Map/ListingMap'), { ssr: false });

// نفس بريد الأدمن المستخدم في لوحة التحكم
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mansouralbarout@gmail.com').toLowerCase();

// ✅ LocalStorage key لمنع تكرار العداد لنفس الجهاز
const VIEW_KEY = 'sooq_viewed_listing_v1';
const VIEW_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة

function makeChatId(uid1, uid2, listingId) {
  const a = String(uid1 || '');
  const b = String(uid2 || '');
  const sorted = [a, b].sort().join('_');
  return `${sorted}__${listingId}`;
}

function readViewCache() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeViewCache(obj) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(obj));
  } catch {}
}

// ✅ يزيد المشاهدة مرة واحدة لكل جهاز خلال 12 ساعة
async function bumpViewOnce(listingId) {
  if (!listingId) return;

  const now = Date.now();
  const cache = readViewCache();
  const last = Number(cache[listingId] || 0);

  if (last && now - last < VIEW_TTL_MS) {
    return; // تم احتسابها مؤخرًا
  }

  // خزّن قبل الطلب لتقليل التكرار لو المستخدم عمل Refresh سريع
  cache[listingId] = now;
  writeViewCache(cache);

  // زد views في Firestore
  await db.collection('listings').doc(listingId).update({
    views: firebase.firestore.FieldValue.increment(1),
    lastViewedAt: firebase.firestore.FieldValue.serverTimestamp(), // اختياري مفيد
  });
}

export default function ListingDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = db
      .collection('listings')
      .doc(id)
      .onSnapshot(
        (doc) => {
          setListing(doc.exists ? { id: doc.id, ...doc.data() } : null);
          setLoading(false);
        },
        () => setLoading(false)
      );
    return () => unsub();
  }, [id]);

  // ✅ الحل الأساسي: زيادة المشاهدات مباشرة
  useEffect(() => {
    if (!id) return;
    bumpViewOnce(id).catch((e) => {
      // لو فشل بسبب Rules مثلًا، ما نخرب الصفحة
      console.warn('bumpViewOnce failed:', e?.code || e?.message || e);
    });
  }, [id]);

  // (اختياري) نتركه موجود لو عندك تسجيلات تحليلية أخرى
  useEffect(() => {
    if (!id) return;
    logListingView(id, user).catch(() => {});
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
        <div className="container">
          <div className="card muted">جاري التحميل...</div>
        </div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="card">الإعلان غير موجود</div>
        </div>
      </>
    );
  }

  const img = (listing.images && listing.images[0]) || listing.image || null;
  const sellerUid = listing.userId;

  const isAdmin = !!user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL;
  const isOwner = !!user?.uid && !!sellerUid && user.uid === sellerUid;

  const chatId = user && sellerUid ? makeChatId(user.uid, sellerUid, listing.id) : null;

  // 🚫 إخفاء الإعلان عن الزوار إذا كان مخفي ولم يكن المشاهد أدمن أو صاحب الإعلان
  if (listing.hidden && !isAdmin && !isOwner) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Link className="btn" href="/">
              ← رجوع
            </Link>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            هذا الإعلان غير متاح حالياً
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">👁️ {Number(listing.views || 0)}</span>
        </div>

        {/* تنبيه للأدمن/صاحب الإعلان إذا كان الإعلان مخفي */}
        {listing.hidden && (isAdmin || isOwner) ? (
          <div
            className="card"
            style={{
              marginTop: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#7f1d1d',
              fontSize: 14,
            }}
          >
            هذا الإعلان <b>مخفي</b> حالياً عن الزوار، ولا يظهر في القوائم العامة.
          </div>
        ) : null}

        <div className="listingLayout" style={{ marginTop: 12 }}>
          {/* التفاصيل */}
          <div className="card">
            {img ? (
              <img
                src={img}
                alt={listing.title || 'img'}
                style={{
                  height: 320,
                  width: '100%',
                  objectFit: 'cover',
                  borderRadius: 14,
                }}
              />
            ) : null}

            <div
              style={{
                marginTop: 10,
                fontWeight: 900,
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {listing.title || 'بدون عنوان'}
              {listing.hidden && (isAdmin || isOwner) ? (
                <span
                  className="badge"
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: 11,
                  }}
                >
                  مخفي
                </span>
              ) : null}
            </div>

            <div className="muted" style={{ marginTop: 4 }}>
              {listing.city || ''}
            </div>

            <div style={{ marginTop: 10 }}>
              <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
            </div>

            <hr />

            <div style={{ fontWeight: 800, marginBottom: 6 }}>الوصف</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {listing.description || '—'}
            </div>

            <hr />

            <div className="row">
              {listing.phone ? (
                <a className="btn btnPrimary" href={`tel:${listing.phone}`}>
                  اتصال
                </a>
              ) : null}

              {listing.phone && listing.isWhatsapp ? (
                <a
                  className="btn"
                  href={`https://wa.me/${String(listing.phone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  واتساب
                </a>
              ) : null}

              {chatId ? (
                <Link
                  className="btn"
                  href={`/chat/${encodeURIComponent(chatId)}?listingId=${encodeURIComponent(
                    listing.id
                  )}&other=${encodeURIComponent(listing.userEmail || '')}`}
                >
                  بدء محادثة
                </Link>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>
                  سجل دخول لبدء محادثة
                </span>
              )}
            </div>
          </div>

          {/* العمود الجانبي: مزاد + خريطة */}
          <div className="sideCol" style={{ display: 'grid', gap: 12 }}>
            <AuctionBox listingId={listing.id} listing={listing} />
            <ListingMap coords={coords} label={listing.locationLabel || listing.city || ''} />
          </div>
        </div>

        <style jsx>{`
          .listingLayout {
            display: grid;
            gap: 12px;
            grid-template-columns: 1.4fr 1fr;
            align-items: start;
          }

          @media (max-width: 768px) {
            .listingLayout {
              grid-template-columns: 1fr;
            }
            .sideCol {
              order: 2;
            }
          }
        `}</style>
      </div>
    </>
  );
}
