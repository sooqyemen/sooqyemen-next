'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { logListingView } from '@/lib/analytics';
import { makeChatId } from '@/lib/chatId';
import { ensureChatDoc } from '@/lib/chatService';
import { getCategoryHref, getCategoryIcon, getCategoryLabel, normalizeCategoryKey } from '@/lib/categories';

// ✅ Taxonomy (الفروع الهرمية)
import {
  inferListingTaxonomy,
  carMakeLabel,
  phoneBrandLabel,
  dealTypeLabel,
  propertyTypeLabel,
} from '@/lib/taxonomy';

// Components
import Price from '@/components/Price';
import ImageGallery from '@/components/ImageGallery';
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon';
import ShareIcon from '@/components/Icons/ShareIcon';
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
    return new Intl.DateTimeFormat('ar-YE-u-nu-latn', {
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

function safePhoneDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

// مكون المشاركة
function ShareButtons({ listing, shareUrl }) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `🔍 ${listing.title}\n${listing.description?.substring(0, 100)}...\n\n${shareUrl}`;
  
  const shareOptions = [
    {
      name: 'واتساب',
      icon: '📱',
      color: '#25D366',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'تيليجرام',
      icon: '📨',
      color: '#0088cc',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(listing.title)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'تويتر',
      icon: '🐦',
      color: '#1DA1F2',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'فيسبوك',
      icon: '📘',
      color: '#4267B2',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        setShowShareMenu(false);
      }
    },
    {
      name: 'نسخ الرابط',
      icon: copied ? '✅' : '📋',
      color: '#6B7280',
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowShareMenu(false);
      }
    }
  ];

  return (
    <div className="share-container">
      <button 
        className="share-button-main"
        onClick={() => setShowShareMenu(!showShareMenu)}
        aria-label="مشاركة الإعلان"
      >
        <ShareIcon size={20} />
        <span>مشاركة</span>
      </button>
      
      {showShareMenu && (
        <>
          <div className="share-overlay" onClick={() => setShowShareMenu(false)} />
          <div className="share-menu">
            <div className="share-menu-header">
              <h4>مشاركة الإعلان</h4>
              <button 
                className="close-share-menu"
                onClick={() => setShowShareMenu(false)}
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div className="share-options">
              {shareOptions.map((option, index) => (
                <button
                  key={index}
                  className="share-option"
                  onClick={option.action}
                  style={{ '--option-color': option.color }}
                >
                  <span className="share-option-icon">{option.icon}</span>
                  <span className="share-option-name">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- المكون الرئيسي ---
export default function ListingDetailsClient({ params, initialListing = null }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();

  // ✅ الخريطة: تظهر تلقائياً لكن لا تُحمّل إلا عند ظهورها في الشاشة
  const [mapVisible, setMapVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);

  // تحميل التعليقات والمزاد فقط عند الطلب (تحسين الأداء)
  const [showComments, setShowComments] = useState(false);
  const [showAuction, setShowAuction] = useState(false);

  // Refs for IntersectionObserver
  const commentsRef = useRef(null);
  const auctionRef = useRef(null);

  const [listing, setListing] = useState(initialListing);
  const [loading, setLoading] = useState(!initialListing);
  const [error, setError] = useState(null);

  // رابط المشاركة
  const [shareUrl, setShareUrl] = useState('');

  // لا تعرض/تحمّل المزاد إذا الإعلان ليس مزادًا
  useEffect(() => {
    if (!listing?.auctionEnabled) setShowAuction(false);
  }, [listing?.auctionEnabled]);

  const [startingChat, setStartingChat] = useState(false);
  const [chatErr, setChatErr] = useState('');

  useEffect(() => {
    // تعيين رابط المشاركة
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

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

  // IntersectionObserver لتحميل المكونات عند التمرير
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === commentsRef.current && !showComments) {
            setShowComments(true);
          }
          
          if (entry.target === auctionRef.current && !showAuction && listing?.auctionEnabled) {
            setShowAuction(true);
          }
          
          // ✅ تحميل الخريطة فقط عندما تصبح مرئية
          if (entry.target === mapContainerRef.current && mapVisible && !mapLoaded) {
            setMapLoaded(true);
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (commentsRef.current) observer.observe(commentsRef.current);
    if (listing?.auctionEnabled && auctionRef.current) observer.observe(auctionRef.current);
    
    // ✅ مراقبة حاوية الخريطة فقط إذا كانت مرئية
    if (mapVisible && mapContainerRef.current && !mapLoaded) {
      observer.observe(mapContainerRef.current);
    }

    return () => observer.disconnect();
  }, [showComments, showAuction, mapVisible, mapLoaded, listing?.auctionEnabled]);

  // ✅ تحميل الخريطة يدوياً إذا كان المستخدم يريد رؤيتها ولم تكن محملة بعد
  const loadMapIfNeeded = useCallback(() => {
    if (mapVisible && !mapLoaded) {
      setMapLoaded(true);
    }
  }, [mapVisible, mapLoaded]);

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

  // ✅ توحيد عرض القسم
  const categoryRaw = listing?.categoryName || listing?.categorySlug || listing?.category || '';
  const categoryKey = normalizeCategoryKey(categoryRaw);
  const categoryLabel = getCategoryLabel(categoryRaw);
  const categoryHref = getCategoryHref(categoryRaw);

  // ✅ استنتاج الفروع
  const taxonomy = useMemo(() => {
    try {
      return inferListingTaxonomy(listing || {}, categoryKey);
    } catch {
      return { root: categoryKey };
    }
  }, [listing, categoryKey]);

  // ✅ Chips للفروع
  const taxonomyChips = useMemo(() => {
    const chips = [];
    const catKey = String(categoryKey || '').trim();

    if (catKey === 'cars') {
      const k = String(listing?.carMake || taxonomy?.carMake || '').trim();
      const t = String(listing?.carMakeText || '').trim();
      const label = k === 'other' ? (t || 'أخرى') : (carMakeLabel(k) || t || '');
      if (label) chips.push({ kind: 'make', icon: '🚗', text: label });
    }

    if (catKey === 'phones') {
      const k = String(listing?.phoneBrand || taxonomy?.phoneBrand || '').trim();
      const t = String(listing?.phoneBrandText || '').trim();
      const label = k === 'other' ? (t || 'أخرى') : (phoneBrandLabel(k) || t || '');
      if (label) chips.push({ kind: 'phone', icon: '📱', text: label });
    }

    if (catKey === 'realestate') {
      const deal = String(listing?.dealType || taxonomy?.dealType || '').trim();
      const prop = String(listing?.propertyType || taxonomy?.propertyType || '').trim();
      const propText = String(listing?.propertyTypeText || '').trim();

      const dealLabel = dealTypeLabel(deal) || '';
      const propLabel = prop === 'other' ? (propText || 'أخرى') : (propertyTypeLabel(prop) || propText || '');

      if (dealLabel) chips.push({ kind: 'deal', icon: '🏷️', text: dealLabel });
      if (propLabel) chips.push({ kind: 'prop', icon: '🏡', text: propLabel });
    }

    return chips;
  }, [listing, taxonomy, categoryKey]);

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

  // IMPORTANT: do NOT create a chat id if the viewer is the owner.
  let chatId = null;
  if (user && sellerUid && user.uid !== sellerUid) {
    try {
      chatId = makeChatId(user.uid, sellerUid, listing.id);
    } catch (e) {
      chatId = null;
    }
  }

  const handleStartChat = useCallback(async () => {
    setChatErr('');
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listing/${listing.id}`)}`);
      return;
    }
    if (!sellerUid) return setChatErr('لا يمكن تحديد البائع');
    if (isOwner) return setChatErr('لا يمكنك مراسلة نفسك');

    try {
      setStartingChat(true);

      // Generate deterministic chatId
      const cid = makeChatId(user.uid, sellerUid, listing.id);

      // Ensure chat document exists
      await ensureChatDoc(cid, user.uid, sellerUid, {
        listingId: listing.id,
        listingTitle: String(listing.title || ''),
      });

      router.push(`/chat/${cid}`);
    } catch (e) {
      console.error('handleStartChat error:', e);
      setChatErr('تعذر فتح المحادثة');
    } finally {
      setStartingChat(false);
    }
  }, [user, sellerUid, isOwner, listing.id, listing.title, router]);

  const breadcrumbItems = [
    { name: 'الرئيسية', url: '/' },
    ...(categoryKey ? [{ name: categoryLabel || categoryKey, url: categoryHref }] : []),
    { name: listing.title || 'إعلان', url: `/listing/${listing.id}` },
  ];

  // ✅ توحيد رقم التواصل: يدعم phone/phoneNumber
  const contactPhoneRaw = listing.phone || listing.phoneNumber || listing.contactPhone || '';
  const phoneDigits = safePhoneDigits(contactPhoneRaw);

  // ✅ واتساب: يدعم isWhatsapp أو whatsappNumber لو موجود
  const whatsappRaw = listing.whatsappNumber || listing.whatsapp || contactPhoneRaw || '';
  const whatsappDigits = safePhoneDigits(whatsappRaw);

  return (
    <>
      <ListingJsonLd listing={listing} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="listing-details-page">
        <div className="container">
          <div className="header-bar">
            <div className="header-left">
              <Link href="/" className="back-button">
                ← العودة للرئيسية
              </Link>
            </div>
            <div className="header-right">
              {shareUrl && <ShareButtons listing={listing} shareUrl={shareUrl} />}
              <div className="views-badge">👁️ {Number(listing.views || 0).toLocaleString('en-US')}</div>
            </div>
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

                  {taxonomyChips && taxonomyChips.length > 0 && (
                    <div className="taxo-chips" aria-label="تفاصيل القسم">
                      {taxonomyChips.map((c, idx) => (
                        <span key={idx} className={`taxo-chip ${c.kind || ''}`}>
                          {c.icon} {c.text}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="listing-location">📍 {listing.city || listing.locationLabel || 'غير محدد'}</div>

                  <div className="listing-meta">
                    <span>📅 {formatDate(listing.createdAt)}</span>
                    {categoryKey && (
                      <span>
                        {getCategoryIcon(categoryRaw)} {categoryLabel || categoryKey}
                      </span>
                    )}
                  </div>
                </div>

                <div className="price-section">
                  <div className="price-title">السعر:</div>
                  <div className="price-amount">
                    <Price listing={listing} variant="hero" />
                  </div>
                </div>

                <div className="description-section">
                  <h2 className="section-title">التفاصيل</h2>
                  <div className="listing-description">{listing.description || 'لا يوجد وصف'}</div>
                </div>

                <div className="contact-section">
                  <h2 className="section-title">التواصل</h2>
                  {chatErr && <div className="error-msg">{chatErr}</div>}

                  <div className="contact-buttons">
                    {phoneDigits ? (
                      <a href={`tel:${phoneDigits}`} className="contact-button call">
                        📞 اتصال
                      </a>
                    ) : null}

                    {(listing.isWhatsapp || whatsappDigits) && whatsappDigits ? (
                      <a
                        href={`https://wa.me/${whatsappDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="contact-button whatsapp"
                      >
                        <WhatsAppIcon size={24} /> واتساب
                      </a>
                    ) : null}

                    {isOwner ? (
                      <div className="contact-button login">👤 أنت صاحب الإعلان</div>
                    ) : chatId ? (
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
                    <h3>{listing.userName || listing.userEmail?.split('@')[0] || 'البائع'}</h3>
                    <small>{isOwner ? 'أنت البائع' : 'البائع'}</small>
                  </div>
                </div>
              </div>

              {listing?.auctionEnabled ? (
                <div className="sidebar-card" ref={auctionRef}>
                  <h3>المزاد</h3>
                  {!showAuction ? (
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
              ) : null}

              <div className="sidebar-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>الموقع</h3>

                  {/* ✅ زر اختياري للإخفاء/الإظهار */}
                  <button
                    type="button"
                    onClick={() => setMapVisible((v) => !v)}
                    className="btn"
                    style={{
                      padding: '6px 10px',
                      fontWeight: 900,
                      fontSize: 12,
                      minHeight: 0,
                    }}
                    aria-label={mapVisible ? 'إخفاء الخريطة' : 'إظهار الخريطة'}
                  >
                    {mapVisible ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>

                {/* ✅ الخريطة تُظهر ولكن لا تُحمّل إلا عند ظهورها في الشاشة */}
                {mapVisible ? (
                  <div 
                    ref={mapContainerRef} 
                    className="map-container" 
                    style={{ marginTop: 10 }}
                  >
                    {mapLoaded ? (
                      <ListingMap coords={coords} label={listing.locationLabel || listing.city || 'اليمن'} />
                    ) : (
                      <div className="map-placeholder">
                        <div className="map-icon">🗺️</div>
                        <p>جاري تحميل الخريطة...</p>
                        <button 
                          className="btn btn-small"
                          onClick={loadMapIfNeeded}
                          style={{ marginTop: '8px' }}
                        >
                          ⚡ تحميل الآن
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="map-placeholder" style={{ marginTop: 10 }}>
                    <div className="map-icon">🗺️</div>
                    <p style={{ margin: '6px 0 0' }}>الخريطة مخفية</p>
                  </div>
                )}

                {coords && mapLoaded && (
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .header-left,
        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .share-container {
          position: relative;
        }
        
        .share-button-main {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .share-button-main:hover {
          background: #2563eb;
        }
        
        .share-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          z-index: 100;
        }
        
        .share-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          padding: 15px;
          min-width: 220px;
          z-index: 101;
          margin-top: 8px;
        }
        
        .share-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .share-menu-header h4 {
          margin: 0;
          font-size: 16px;
          color: #1f2937;
        }
        
        .close-share-menu {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #6b7280;
        }
        
        .share-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        
        .share-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--option-color, #f3f4f6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: right;
          transition: transform 0.2s;
        }
        
        .share-option:hover {
          transform: translateY(-2px);
        }
        
        .share-option-icon {
          font-size: 18px;
        }
        
        .share-option-name {
          flex: 1;
          font-weight: 500;
        }
        
        .btn-small {
          padding: 4px 10px;
          font-size: 12px;
          min-height: 28px;
        }
        
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

        /* ====== Taxonomy chips ====== */
        .taxo-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 10px 0 6px;
        }
        
        .taxo-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid rgba(0, 0, 0, 0.08);
          font-weight: 900;
          font-size: 13px;
          line-height: 1;
          color: #0f172a;
          user-select: none;
        }
        
        .taxo-chip.make {
          background: #eff6ff;
          border-color: rgba(59, 130, 246, 0.28);
        }
        
        .taxo-chip.phone {
          background: #faf5ff;
          border-color: rgba(168, 85, 247, 0.25);
        }
        
        .taxo-chip.deal {
          background: #ecfeff;
          border-color: rgba(20, 184, 166, 0.28);
        }
        
        .taxo-chip.prop {
          background: #f0fdf4;
          border-color: rgba(34, 197, 94, 0.25);
        }
        
        @media (max-width: 768px) {
          .header-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .header-left,
          .header-right {
            justify-content: space-between;
          }
          
          .share-menu {
            right: -60px;
            min-width: 280px;
          }
          
          .google-maps-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
