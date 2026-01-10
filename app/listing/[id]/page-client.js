// app/listing/[id]/page-client.js
'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';

// Components
import Price from '@/components/Price';
import ImageGallery from '@/components/ImageGallery';
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon';
import ListingJsonLd from '@/components/StructuredData/ListingJsonLd';
import BreadcrumbJsonLd from '@/components/StructuredData/BreadcrumbJsonLd';
import './listing.css';

// تحميل المكونات الثقيلة بشكل ديناميكي (Client Side Only)
const AuctionBox = dynamic(() => import('@/components/AuctionBox'), {
  loading: () => <div className="loading-box">جاري تحميل المزاد...</div>,
});

const CommentsBox = dynamic(() => import('@/components/CommentsBox'), {
  loading: () => <div className="loading-box">جاري تحميل التعليقات...</div>,
});

const ListingMap = dynamic(() => import('@/components/Map/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="map-placeholder">
      <div className="map-icon">🗺️</div>
      <p>جاري تحميل الخريطة...</p>
    </div>
  ),
});

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mansouralbarout@gmail.com').toLowerCase();
const VIEW_KEY = 'sooq_viewed_listing_v1';
const VIEW_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة

// --- تصحيح الإحداثيات (يمن + عالمي) ---
// بعض الإعلانات تُحفظ الإحداثيات بصيغة [lng, lat] بالغلط، فتطلع "في البحر".
const inRange = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

function normalizeLatLng(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;

  const a = Number(input[0]);
  const b = Number(input[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  // حدود اليمن تقريبية
  const yLat = (v) => inRange(v, 12.0, 19.5);
  const yLng = (v) => inRange(v, 41.0, 54.7);

  // [lat,lng] صحيح داخل اليمن
  if (yLat(a) && yLng(b)) return [a, b];

  // [lng,lat] مقلوب داخل اليمن
  if (yLat(b) && yLng(a)) return [b, a];

  // fallback عالمي: [lat,lng]
  if (inRange(a, -90, 90) && inRange(b, -180, 180)) return [a, b];

  // fallback عالمي: مقلوب
  if (inRange(b, -90, 90) && inRange(a, -180, 180)) return [b, a];

  return null;
}

// --- دوال مساعدة ---

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

async function bumpViewOnce(listingId) {
  if (!listingId) return;
  const now = Date.now();
  const cache = readViewCache();
  const last = Number(cache[listingId] || 0);

  if (last && now - last < VIEW_TTL_MS) return;

  cache[listingId] = now;
  writeViewCache(cache);

  await db.collection('listings').doc(listingId).update({
    views: firebase.firestore.FieldValue.increment(1),
    lastViewedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function formatDate(date) {
  if (!date) return 'غير معروف';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return 'غير معروف';
  }
}

function getInitials(email) {
  if (!email) return '؟';
  return email.split('@')[0].charAt(0).toUpperCase();
}

// --- المكون الرئيسي ---

export default function ListingDetailsClient({ params, initialListing = null }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();

  // تحميل الخريطة فقط عند الطلب (لتقليل حجم الباندل ورفع سرعة التحميل)
  const [showMap, setShowMap] = useState(false);
  
  // تحميل التعليقات والمزاد فقط عند الطلب (تحسين الأداء)
  const [showComments, setShowComments] = useState(false);
  const [showAuction, setShowAuction] = useState(false);

  // Refs for IntersectionObserver
  const commentsRef = useRef(null);
  const auctionRef = useRef(null);

  const [listing, setListing] = useState(initialListing);
  const [loading, setLoading] = useState(!initialListing);
  const [error, setError] = useState(null);

  const [startingChat, setStartingChat] = useState(false);
  const [chatErr, setChatErr] = useState('');

  useEffect(() => {
    if (!id) return;

    const unsub = db
      .collection('listings')
      .doc(id)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setListing({ id: doc.id, ...doc.data() });
            setError(null);
          } else {
            if (!initialListing) setListing(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error:', err);
          if (!initialListing) {
            setError('حدث خطأ في تحميل الإعلان');
            setLoading(false);
          }
        }
      );

    return () => unsub();
  }, [id, initialListing]);

  useEffect(() => {
    if (id) bumpViewOnce(id).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (id && user?.uid) logListingView(id, user).catch(() => {});
  }, [id, user?.uid]);

  // IntersectionObserver to auto-load comments and auction when scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === commentsRef.current && !showComments) {
              setShowComments(true);
            }
            if (entry.target === auctionRef.current && !showAuction && listing?.auctionEnabled) {
              setShowAuction(true);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Load when element is 100px away from viewport
        threshold: 0.1,
      }
    );

    if (commentsRef.current) observer.observe(commentsRef.current);
    if (auctionRef.current) observer.observe(auctionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [showComments, showAuction, listing?.auctionEnabled]);

  // استخراج الإحداثيات + تصحيحها
  const coords = useMemo(() => {
    if (!listing) return null;

    // 1) coords: [a,b]
    if (Array.isArray(listing.coords) && listing.coords.length === 2) {
      return normalizeLatLng(listing.coords);
    }

    // 2) coords: {lat,lng}
    if (listing?.coords?.lat != null && listing?.coords?.lng != null) {
      return normalizeLatLng([listing.coords.lat, listing.coords.lng]);
    }

    // 3) lat/lng مباشرة
    if (listing?.lat != null && listing?.lng != null) {
      return normalizeLatLng([listing.lat, listing.lng]);
    }

    // 4) location: {lat,lng}
    if (listing?.location?.lat != null && listing?.location?.lng != null) {
      return normalizeLatLng([listing.location.lat, listing.location.lng]);
    }

    return null;
  }, [listing]);

  const categoryIcon = (category) => {
    const icons = {
      cars: '🚗',
      real_estate: '🏡',
      mobiles: '📱',
      electronics: '💻',
      motorcycles: '🏍️',
      heavy_equipment: '🚜',
      solar: '☀️',
      networks: '📡',
      maintenance: '🛠️',
      furniture: '🛋️',
      animals: '🐑',
      jobs: '💼',
      services: '🧰',
    };
    return icons[category] || '📋';
  };

  if (loading) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري تحميل الإعلان...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="error-state">
            <h2>حدث خطأ</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="listing-details-page">
        <div className="container">
          <div className="not-found-state">
            <h2>الإعلان غير موجود</h2>
            <Link href="/" className="retry-button">
              عودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : listing.image
      ? [listing.image]
      : [];

  const sellerUid = listing.userId;
  const isAdmin = !!user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL;
  const isOwner = !!user?.uid && !!sellerUid && user.uid === sellerUid;

  if (listing.hidden && !isAdmin && !isOwner) {
    return (
      <div className="container" style={{ padding: 40, textAlign: 'center' }}>
        <h2>🔒 الإعلان مغلق</h2>
        <p>هذا الإعلان غير متاح حالياً.</p>
        <Link href="/">العودة للرئيسية</Link>
      </div>
    );
  }

  const chatId = user && sellerUid ? makeChatId(user.uid, sellerUid, listing.id) : null;

  const handleStartChat = useCallback(async () => {
    setChatErr('');
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listing/${listing.id}`)}`);
      return;
    }
    if (!sellerUid) return setChatErr('لا يمكن تحديد البائع');
    if (isOwner) return setChatErr('لا يمكنك مراسلة نفسك');

    const cid = makeChatId(user.uid, sellerUid, listing.id);

    try {
      setStartingChat(true);
      await db
        .collection('chats')
        .doc(cid)
        .set(
          {
            participants: [user.uid, sellerUid],
            listingId: listing.id,
            listingTitle: String(listing.title || ''),
            sellerUid,
            buyerUid: user.uid,
            sellerEmail: String(listing.userEmail || ''),
            buyerEmail: String(user.email || ''),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      router.push(`/chat/${encodeURIComponent(cid)}`);
    } catch (e) {
      console.error(e);
      setChatErr('تعذر فتح المحادثة');
    } finally {
      setStartingChat(false);
    }
  }, [user, sellerUid, isOwner, listing.id, listing.title, listing.userEmail, router]);

  const breadcrumbItems = [
    { name: 'الرئيسية', url: '/' },
    ...(listing.category ? [{ name: listing.category, url: `/${listing.category}` }] : []),
    { name: listing.title || 'إعلان', url: `/listing/${listing.id}` },
  ];

  return (
    <>
      <ListingJsonLd listing={listing} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="listing-details-page">
        <div className="container">
          <div className="header-bar">
            <Link href="/" className="back-button">
              ← العودة للرئيسية
            </Link>
            <div className="views-badge">👁️ {Number(listing.views || 0).toLocaleString('ar')}</div>
          </div>

          {listing.hidden && (isAdmin || isOwner) && <div className="hidden-alert">⚠️ هذا الإعلان مخفي عن الجمهور</div>}

          <div className="listing-layout">
            <div className="main-card">
              <ImageGallery images={images} alt={listing.title} />

              <div className="listing-content">
                <div className="listing-header">
                  <div className="listing-title-row">
                    <h1 className="listing-title">{listing.title}</h1>
                    {listing.auctionEnabled && <span className="listing-badge">⚡ مزاد</span>}
                  </div>

                  <div className="listing-location">📍 {listing.city || listing.locationLabel || 'غير محدد'}</div>

                  <div className="listing-meta">
                    <span>📅 {formatDate(listing.createdAt)}</span>
                    {listing.category && (
                      <span>
                        {categoryIcon(listing.category)} {listing.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="price-section">
                  <div className="price-title">السعر:</div>
                  <div className="price-amount">
                    <Price priceYER={listing.currentBidYER || listing.priceYER || 0} />
                  </div>
                </div>

                <div className="description-section">
                  <h2 className="section-title">التفاصيل</h2>
                  <div className="listing-description">{listing.description}</div>
                </div>

                <div className="contact-section">
                  <h2 className="section-title">التواصل</h2>
                  {chatErr && <div className="error-msg">{chatErr}</div>}

                  <div className="contact-buttons">
                    {listing.phone && (
                      <a href={`tel:${listing.phone}`} className="contact-button call">
                        📞 اتصال
                      </a>
                    )}

                    {listing.phone && listing.isWhatsapp && (
                      <a
                        href={`https://wa.me/${String(listing.phone).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-button whatsapp"
                      >
                        <WhatsAppIcon size={24} /> واتساب
                      </a>
                    )}

                    {chatId ? (
                      <button onClick={handleStartChat} disabled={startingChat} className="contact-button chat">
                        {startingChat ? '⏳' : '💬'} محادثة
                      </button>
                    ) : (
                      <div className="contact-button login">🔒 سجل دخول للمحادثة</div>
                    )}
                  </div>
                </div>

                <div className="comments-section" ref={commentsRef}>
                  {!showComments ? (
                    <div className="lazy-load-box">
                      <button 
                        type="button"
                        className="btn btnPrimary"
                        onClick={() => setShowComments(true)}
                        style={{ width: '100%' }}
                      >
                        💬 عرض التعليقات
                      </button>
                    </div>
                  ) : (
                    <CommentsBox listingId={listing.id} />
                  )}
                </div>
              </div>
            </div>

            <div className="sidebar">
              <div className="sidebar-card">
                <div className="seller-header">
                  <div className="seller-avatar">{getInitials(listing.userEmail)}</div>
                  <div>
                    <h3>{listing.userEmail?.split('@')[0]}</h3>
                    <small>{isOwner ? 'أنت البائع' : 'البائع'}</small>
                  </div>
                </div>
              </div>

              <div className="sidebar-card" ref={auctionRef}>
                <h3>المزاد</h3>
                {!showAuction && listing?.auctionEnabled ? (
                  <div className="lazy-load-box">
                    <button 
                      type="button"
                      className="btn btnPrimary"
                      onClick={() => setShowAuction(true)}
                      style={{ width: '100%' }}
                    >
                      ⚡ عرض المزاد
                    </button>
                  </div>
                ) : (
                  <AuctionBox listingId={listing.id} listing={listing} />
                )}
              </div>

              <div className="sidebar-card">
                <h3>الموقع</h3>

                {coords ? (
                  <>
                    {!showMap ? (
                      <div className="map-placeholder" style={{ marginBottom: 10 }}>
                        <div className="map-icon">🗺️</div>
                        <p style={{ margin: '6px 0 10px' }}>اضغط لعرض الخريطة</p>
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => setShowMap(true)}
                          style={{ width: '100%' }}
                        >
                          عرض الخريطة
                        </button>
                      </div>
                    ) : (
                      <div className="map-container">
                        <ListingMap coords={coords} label={listing.locationLabel} />
                      </div>
                    )}

                    <div className="google-maps-buttons">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-button"
                      >
                        🗺️ الخريطة
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}&k=k`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-button satellite"
                      >
                        🛰️ قمر صناعي
                      </a>
                    </div>
                  </>
                ) : (
                  // إذا ما فيه إحداثيات: خلّ الخريطة تفتح على اليمن/صنعاء عند الضغط (في ملف ListingMap)
                  <>
                    {!showMap ? (
                      <div className="map-placeholder" style={{ marginBottom: 10 }}>
                        <div className="map-icon">🗺️</div>
                        <p style={{ margin: '6px 0 10px' }}>عرض خريطة اليمن</p>
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={() => setShowMap(true)}
                          style={{ width: '100%' }}
                        >
                          عرض الخريطة
                        </button>
                      </div>
                    ) : (
                      <div className="map-container">
                        <ListingMap coords={null} label="اليمن" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lazy-load-box {
          padding: 20px;
          text-align: center;
          background: #f8fafc;
          border-radius: 8px;
          margin: 10px 0;
        }
        .google-maps-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .google-maps-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          font-weight: bold;
          text-decoration: none;
          color: white;
          background: #4285f4;
          transition: transform 0.2s;
        }
        .google-maps-button:hover {
          transform: translateY(-2px);
        }
        .satellite {
          background: #10b981;
        }
        .error-msg {
          background: #fee2e2;
          color: #991b1b;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
      `}</style>
    </>
  );
}
