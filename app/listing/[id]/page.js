// app/listing/[id]/page.js
import { fetchListingById } from '@/lib/firestoreRest';
import ListingDetailsClient from './page-client';

// تحديث الصفحة من السيرفر كل 5 دقائق (ISR)
export const revalidate = 300;

// رابط الموقع الأساسي (مهم جداً للـ SEO)
const BASE_URL = 'https://sooqyemen.com';

function toAbsoluteUrl(src) {
  const s = String(src || '').trim();
  if (!s) return `${BASE_URL}/icon-512.png`;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s}`;
}

// 1. توليد البيانات الوصفية (Metadata) لمحركات البحث
export async function generateMetadata({ params }) {
  // في Next.js الحديثة: await params آمن حتى لو params كائن عادي
  const { id } = await params;

  let listing = null;

  try {
    if (id) listing = await fetchListingById(id);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[generateMetadata] Failed to fetch listing:', error);
    }
  }

  // حالة عدم وجود الإعلان
  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.',
      robots: { index: false, follow: false },
    };
  }

  const titleText = listing.title || 'إعلان';
  const title = `${titleText} | سوق اليمن`;

  const priceVal = listing.priceYER || listing.currentBidYER || 0;
  const priceString = priceVal > 0 ? `${priceVal.toLocaleString('ar-YE')} ريال` : 'على السوم';
  const city = listing.city || listing.locationLabel || 'اليمن';

  const description = listing.description
    ? `${String(listing.description).slice(0, 150)}... | السعر: ${priceString} | الموقع: ${city}`
    : `${titleText} - ${priceString} في ${city} - سوق اليمن`;

  const rawImages =
    listing.images && listing.images.length > 0
      ? listing.images.slice(0, 4)
      : ['/icon-512.png'];

  const imagesAbs = rawImages.map(toAbsoluteUrl);

  // رابط الإعلان
  const url = `${BASE_URL}/listing/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ar_YE',
      siteName: 'سوق اليمن',
      images: imagesAbs.map((img) => ({
        url: img,
        alt: titleText,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imagesAbs[0]],
    },
  };
}

// 2. صفحة التفاصيل (Server Component)
export default async function ListingDetailsPage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let initialListing = null;

  try {
    if (id) initialListing = await fetchListingById(id);
  } catch (error) {
    console.error('[ListingDetailsPage] Error fetching initial data:', error);
  }

  return <ListingDetailsClient params={resolvedParams} initialListing={initialListing} />;
}
