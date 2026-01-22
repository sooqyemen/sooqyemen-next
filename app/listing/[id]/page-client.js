// app/listing/[id]/page-client.js
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
  SOLAR_TYPES,
  MAINTENANCE_TYPES,
  FURNITURE_TYPES,
  HOME_TOOLS_TYPES,
  CLOTHES_TYPES,
  ANIMAL_TYPES,
  JOB_TYPES,
  SERVICE_TYPES,
  ELECTRONICS_TYPES,
  NETWORK_TYPES,
  HEAVY_EQUIPMENT_TYPES,
  MOTORCYCLE_BRANDS,
} from '@/lib/taxonomy';

// Components
import Price from '@/components/Price';
import ImageGallery from '@/components/ImageGallery';
import ListingCard from '@/components/ListingCard';
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

function optionLabel(options, key) {
  const k = String(key || '').trim();
  if (!k) return '';
  const arr = Array.isArray(options) ? options : [];
  const hit = arr.find((x) => String(x?.key || '').trim() === k);
  return hit?.label ? String(hit.label) : k;
}

function pickFacetForCategory(categoryKey, listing, taxonomy) {
  const cat = String(categoryKey || '').trim();

  // cars / phones / realestate are already handled via taxonomyChips + label helpers
  if (cat === 'electronics') return { field: 'electronicsType', key: listing?.electronicsType || taxonomy?.electronicsType, label: optionLabel(ELECTRONICS_TYPES, listing?.electronicsType || taxonomy?.electronicsType) };
  if (cat === 'solar') return { field: 'solarType', key: listing?.solarType || taxonomy?.solarType, label: optionLabel(SOLAR_TYPES, listing?.solarType || taxonomy?.solarType) };
  if (cat === 'maintenance') return { field: 'maintenanceType', key: listing?.maintenanceType || taxonomy?.maintenanceType, label: optionLabel(MAINTENANCE_TYPES, listing?.maintenanceType || taxonomy?.maintenanceType) };
  if (cat === 'furniture') return { field: 'furnitureType', key: listing?.furnitureType || taxonomy?.furnitureType, label: optionLabel(FURNITURE_TYPES, listing?.furnitureType || taxonomy?.furnitureType) };
  if (cat === 'home_tools') return { field: 'homeToolsType', key: listing?.homeToolsType || taxonomy?.homeToolsType, label: optionLabel(HOME_TOOLS_TYPES, listing?.homeToolsType || taxonomy?.homeToolsType) };
  if (cat === 'clothes') return { field: 'clothesType', key: listing?.clothesType || taxonomy?.clothesType, label: optionLabel(CLOTHES_TYPES, listing?.clothesType || taxonomy?.clothesType) };
  if (cat === 'animals') return { field: 'animalType', key: listing?.animalType || taxonomy?.animalType, label: optionLabel(ANIMAL_TYPES, listing?.animalType || taxonomy?.animalType) };
  if (cat === 'jobs') return { field: 'jobType', key: listing?.jobType || taxonomy?.jobType, label: optionLabel(JOB_TYPES, listing?.jobType || taxonomy?.jobType) };
  if (cat === 'services') return { field: 'serviceType', key: listing?.serviceType || taxonomy?.serviceType, label: optionLabel(SERVICE_TYPES, listing?.serviceType || taxonomy?.serviceType) };
  if (cat === 'networks') return { field: 'networkType', key: listing?.networkType || taxonomy?.networkType, label: optionLabel(NETWORK_TYPES, listing?.networkType || taxonomy?.networkType) };
  if (cat === 'heavy_equipment') return { field: 'heavyEquipmentType', key: listing?.heavyEquipmentType || taxonomy?.heavyEquipmentType, label: optionLabel(HEAVY_EQUIPMENT_TYPES, listing?.heavyEquipmentType || taxonomy?.heavyEquipmentType) };
  if (cat === 'motorcycles') return { field: 'motorcycleBrand', key: listing?.motorcycleBrand || taxonomy?.motorcycleBrand, label: optionLabel(MOTORCYCLE_BRANDS, listing?.motorcycleBrand || taxonomy?.motorcycleBrand) };

  return { field: '', key: '', label: '' };
}


// --- المكون الرئيسي ---

export default function ListingDetailsClient({ params, initialListing = null }) {
  const { id } = params;
  const router = useRouter();

  // ✅ عند الضغط على الوسم: انتقل إلى صفحة القسم مع البحث (q)
  const onHashtagClick = useCallback(
    (tag) => {
      const raw = String(tag || '').trim();
      const clean = raw.replace(/^#/, '').replace(/_/g, ' ').trim();
      if (!clean) return;
      const href = `${getCategoryHref(categoryKey)}?q=${encodeURIComponent(clean)}`;
      router.push(href);
    },
    [router, categoryKey]
  );

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

  // ✅ إعلانات مشابهة (نفس القسم + تفضيل نفس الفئة)
  const [relatedListings, setRelatedListings] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

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

  // ✅ توحيد عرض القسم (حتى لو تم حفظه كسلاج / عربي / اختلافات)
  const categoryRaw = listing?.categoryName || listing?.categorySlug || listing?.category || '';
  const categoryKey = normalizeCategoryKey(categoryRaw);
  const categoryLabel = getCategoryLabel(categoryRaw);
  const categoryHref = getCategoryHref(categoryRaw);


  // ✅ استنتاج الفروع (للإعلانات القديمة التي لا تحتوي الحقول الجديدة)
  const taxonomy = useMemo(() => {
    try {
      return inferListingTaxonomy(listing || {}, categoryKey);
    } catch {
      return { root: categoryKey };
    }
  }, [listing, categoryKey]);

  // ✅ Chips لعرض الفروع بشكل فخم تحت العنوان
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

  
  // ✅ هاشتاقات داخل الصفحة (تحسين SEO + تجربة مثل حراج)
  const hashtags = useMemo(() => {
    const tags = new Set();

    const add = (v) => {
      const s = String(v || '').trim();
      if (!s) return;
      const t = s.replace(/\s+/g, '_');
      if (t.length >= 2) tags.add('#' + t);
    };

    add('سوق_اليمن');
    add(categoryLabel || categoryKey);

    if (listing?.city) add(listing.city);

    (taxonomyChips || []).forEach((c) => add(c.text));

    const facet = pickFacetForCategory(categoryKey, listing, taxonomy);
    if (facet?.label) add(facet.label);

    const title = String(listing?.title || '').trim();
    title.split(/[|،,\-–—]+/g).slice(0, 2).forEach(add);

    return Array.from(tags).slice(0, 12);
  }, [categoryKey, categoryLabel, listing?.city, listing?.title, taxonomyChips, taxonomy]);

// ✅ تحميل "إعلانات مشابهة" (بدون الاعتماد على إعلانات قديمة)
  useEffect(() => {
    if (!listing?.id) return;
    if (!categoryKey) return;

    let cancelled = false;
    setRelatedLoading(true);

    (async () => {
      try {
        // نجيب عدد مناسب من نفس القسم، ثم نفلتر ونعطي أولوية لنفس الفئة (facet) على جهة العميل لتجنب مشاكل الفهارس.
        const snap = await db.collection('listings').where('category', '==', categoryKey).limit(60).get();
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x && x.id !== listing.id)
          .filter((x) => x.isActive !== false && !x.hidden);

        const facet = pickFacetForCategory(categoryKey, listing, taxonomy);
        const facetKey = String(facet?.key || '').trim();

        const sameFacet = facetKey
          ? all.filter((x) => String(x?.[facet.field] || '').trim() === facetKey)
          : [];

        // ترتيب: الأحدث أولاً (ثم المشاهدات كعامل ثانوي)
        const score = (x) => {
          const created = x?.createdAt?.toMillis ? x.createdAt.toMillis() : Number(x?.createdAt || 0) || 0;
          const views = Number(x?.views || 0) || 0;
          return created * 10 + views;
        };

        const sortDesc = (a, b) => score(b) - score(a);

        sameFacet.sort(sortDesc);
        all.sort(sortDesc);

        const out = [];
        for (const x of sameFacet) {
          if (out.length >= 8) break;
          out.push(x);
        }
        if (out.length < 8) {
          for (const x of all) {
            if (out.length >= 8) break;
            if (out.some((y) => y.id === x.id)) continue;
            out.push(x);
          }
        }

        if (!cancelled) setRelatedListings(out);
      } catch (e) {
        console.error('Failed to load related listings:', e);
        if (!cancelled) setRelatedListings([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listing?.id, categoryKey, taxonomy]);


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
	// makeChatId throws on same-user and that would crash the listing page.
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

      // Navigate to chat
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
            <div className="views-badge">👁️ {Number(listing.views || 0).toLocaleString('en-US')}</div>
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
                        <span key={idx} className={`taxo-chip ${c.kind || ''}`}> {c.icon} {c.text}</span>
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

                

                {/* ✅ وسوم (هاشتاقات) */}
                {hashtags && hashtags.length > 0 && (
                  <div className="hashtags-section">
                    <h2 className="section-title">وسوم</h2>
                    <div className="hashtag-row" aria-label="وسوم الإعلان">
                      {hashtags.map((t) => (
                        <button type="button" key={t} className="hashtag-chip" dir="ltr" onClick={() => onHashtagClick(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="hashtags-note">
                      هذه الوسوم تساعد في الوصول للإعلان بسهولة داخل الموقع ومحركات البحث.
                    </p>
                  </div>
                )}

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


      {/* ✅ إعلانات مشابهة (بعد الخريطة) */}
      <div className="related-section page-related">
        <h2 className="section-title">إعلانات مشابهة</h2>

        {relatedLoading ? (
          <div className="loading-box">جاري تحميل الإعلانات المشابهة...</div>
        ) : relatedListings && relatedListings.length > 0 ? (
          <div className="related-grid">
            {relatedListings.map((x) => (
              <ListingCard key={x.id} listing={x} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="muted" style={{ padding: '8px 0' }}>
            لا توجد إعلانات مشابهة حالياً.
          </div>
        )}
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


        /* ====== Hashtags ====== */
        .hashtags-section {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .hashtag-row{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top: 8px;
        }
        .hashtag-chip{
          display:inline-flex;
          align-items:center;
          padding:6px 10px;
          border-radius:999px;
          background:#fff7ed;
          border:1px solid rgba(251,146,60,0.25);
          color:#9a3412;
          font-weight:900;
          font-size:13px;
          line-height:1;
          border: none;
          cursor: pointer;
          user-select:none;
        }
        .hashtags-note{
          margin: 10px 0 0;
          color:#64748b;
          font-size:13px;
          line-height:1.6;
        }

        /* ====== Related listings ====== */
        .page-related{
          margin-top: 22px;
          padding-top: 14px;
        }

        .related-section{
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .related-grid{
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 14px;
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .related-grid{
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }
        @media (max-width: 420px) {
          .related-grid{
            grid-template-columns: 1fr;
          }
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
      `}</style>
    </>
  );
}
