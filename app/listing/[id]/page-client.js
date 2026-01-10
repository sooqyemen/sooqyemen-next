// app/listing/[id]/page-client.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';

// Components
import Price from '@/components/Price';
import AuctionBox from '@/components/AuctionBox';
import CommentsBox from '@/components/CommentsBox';
import ImageGallery from '@/components/ImageGallery';
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon';
import ListingJsonLd from '@/components/StructuredData/ListingJsonLd';
import BreadcrumbJsonLd from '@/components/StructuredData/BreadcrumbJsonLd';
import './listing.css';

// تحميل الخريطة بشكل ديناميكي (Client Side Only)
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

// --- دوال مساعدة ---

// إنشاء معرف محادثة فريد بين طرفين لإعلان محدد
function makeChatId(uid1, uid2, listingId) {
  const a = String(uid1 || '');
  const b = String(uid2 || '');
  const sorted = [a, b].sort().join('_');
  return `${sorted}__${listingId}`;
}

// إدارة ذاكرة التخزين المؤقت للمشاهدات
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

  // ✅ تحميل الخريطة فقط عند الطلب (لتقليل حجم الباندل ورفع سرعة التحميل)
  const [showMap, setShowMap] = useState(false);

  // ✅ 1. استخدام البيانات الأولية فوراً (حل مشكلة SEO)
  const [listing, setListing] = useState(initialListing);

  // ✅ 2. التحميل يكون false إذا كانت البيانات موجودة مسبقاً
  const [loading, setLoading] = useState(!initialListing);
  const [error, setError] = useState(null);

  // حالات المحادثة
  const [startingChat, setStartingChat] = useState(false);
  const [chatErr, setChatErr] = useState('');

  // جلب البيانات (أو التحديث المباشر)
  useEffect(() => {
    if (!id) return;

    // اشتراك في التحديثات (Real-time)
    // حتى لو عندنا initialListing، نشترك عشان لو السعر تغير (مزاد) يتحدث فوراً
    const unsub = db
      .collection('listings')
      .doc(id)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            // دمج البيانات الجديدة مع الـ ID
            setListing({ id: doc.id, ...doc.data() });
            setError(null);
          } else {
            if (!initialListing) {
              setListing(null);
            }
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

  // زيادة المشاهدات
  useEffect(() => {
    if (id) bumpViewOnce(id).catch(() => {});
  }, [id]);

  // تسجيل التحليلات
  useEffect(() => {
    if (id && user?.uid) logListingView(id, user).catch(() => {});
  }, [id, user?.uid]);

  // استخراج الإحداثيات
  const coords = useMemo(() => {
    if (!listing) return null;
    if (Array.isArray(listing.coords) && listing.coords.length === 2) return listing.coords;
    if (listing?.coords?.lat && listing?.coords?.lng) return [listing.coords.lat, listing.coords.lng];
    return null;
  }, [listing]);

  // أيقونة التصنيف
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

  const images = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images : listing.image ? [listing.image] : [];

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

  const handleStartChat = async () => {
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
  };

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

                <div className="comments-section">
                  <CommentsBox listingId={listing.id} />
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

              <div className="sidebar-card">
                <h3>المزاد</h3>
                <AuctionBox listingId={listing.id} listing={listing} />
              </div>

              <div className="sidebar-card">
                <h3>الموقع</h3>
                {coords ? (
                  <>
                    {/* ✅ لا نحمل مكتبة الخريطة إلا عند الضغط */}
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
                  <p>لا يوجد موقع محدد</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
