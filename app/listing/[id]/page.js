// app/listing/[id]/page.js
import { fetchListingById } from '@/lib/firestoreRest';
import ListingDetailsClient from './page-client';

// تحديث الصفحة من السيرفر كل 5 دقائق (ISR)
export const revalidate = 300;

// رابط الموقع الأساسي (مهم للـ SEO)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sooqyemen.com';

function toAbsoluteUrl(src) {
  const s = String(src || '').trim();
  if (!s) return `${BASE_URL}/icon-512.png`;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s}`;
}

function safeText(v, fallback = '') {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function pickImages(listing) {
  const list = Array.isArray(listing?.images)
    ? listing.images
    : listing?.image
    ? [listing.image]
    : [];
  const raw = list.length ? list.slice(0, 4) : ['/icon-512.png'];
  return raw.map(toAbsoluteUrl);
}

function getPriceText(listing) {
  const raw =
    listing?.priceYER ??
    listing?.price ??
    listing?.currentBidYER ??
    listing?.currentBid ??
    0;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 'على السوم';

  // نحاول نعرض العملة إذا موجودة، وإلا افتراضي ريال يمني
  const cur = safeText(listing?.currency || listing?.currencyCode || 'YER', 'YER');
  const formatted = n.toLocaleString('ar-YE');

  if (cur === 'YER') return `${formatted} ريال يمني`;
  if (cur === 'SAR') return `${formatted} ريال سعودي`;
  if (cur === 'USD') return `${formatted} دولار`;
  return `${formatted} ${cur}`;
}

// 1) توليد البيانات الوصفية (Metadata) لمحركات البحث
export async function generateMetadata({ params }) {
  const id = params?.id;

  let listing = null;
  try {
    if (id) listing = await fetchListingById(id);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[generateMetadata] Failed to fetch listing:', error);
    }
  }

  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.',
      robots: { index: false, follow: false },
    };
  }

  const titleText = safeText(listing.title, 'إعلان');
  const title = `${titleText} | سوق اليمن`;

  const city = safeText(listing.city || listing.locationLabel, 'اليمن');
  const priceString = getPriceText(listing);

  const description = listing.description
    ? `${safeText(listing.description).slice(0, 160)}... | السعر: ${priceString} | الموقع: ${city}`
    : `${titleText} - ${priceString} في ${city} - سوق اليمن`;

  const imagesAbs = pickImages(listing);
  const url = `${BASE_URL}/listing/${id}`;

  const keywords = [
    'سوق اليمن',
    'إعلانات',
    titleText,
    city,
    safeText(listing.category, ''),
    safeText(listing.brand, ''),
    safeText(listing.model, ''),
  ]
    .filter(Boolean)
    .join(', ');

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ar_YE',
      siteName: 'سوق اليمن',
      images: imagesAbs.map((img) => ({ url: img, alt: titleText })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imagesAbs[0]],
    },
    robots: { index: true, follow: true },
    keywords,
  };
}

// 2) صفحة التفاصيل (Server Component)
export default async function ListingDetailsPage({ params }) {
  const { id } = params || {};
  let initialListing = null;

  try {
    if (id) initialListing = await fetchListingById(id);
  } catch (error) {
    console.error('[ListingDetailsPage] Error fetching initial data:', error);
  }

  // JSON-LD مبسط (مفيد للـ SEO) — بدون ما يكسر لو البيانات ناقصة
  const images = initialListing ? pickImages(initialListing) : [];
  const priceText = initialListing ? getPriceText(initialListing) : '';
  const canonical = `${BASE_URL}/listing/${id || ''}`;

  const jsonLd =
    initialListing && id
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: safeText(initialListing.title, 'إعلان'),
          description: safeText(initialListing.description, '').slice(0, 220),
          image: images[0] || `${BASE_URL}/icon-512.png`,
          offers: {
            '@type': 'Offer',
            price: Number(
              initialListing.priceYER ??
                initialListing.price ??
                initialListing.currentBidYER ??
                initialListing.currentBid ??
                0
            ),
            priceCurrency: safeText(initialListing.currency || initialListing.currencyCode || 'YER', 'YER'),
            url: canonical,
            availability:
              safeText(initialListing.status, 'active') === 'active'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
        }
      : null;

  return (
    <>
      <ListingDetailsClient
        params={params}
        initialListing={initialListing}
        // تلميح للكلينت: افتح الخريطة تلقائيًا
        autoOpenMap={true}
      />

      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
    </>
  );
}
