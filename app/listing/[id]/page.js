import { notFound } from 'next/navigation';
import ListingDetailsClient from './page-client';
import { getListingById } from '@/lib/getListing.server';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 دقائق

export async function generateMetadata({ params }) {
  const { id } = params;
  const listing = await getListingById(id);

  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر',
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sooqyemen.com';
  const canonical = new URL(`/listing/${id}`, base);

  const title = `${listing.title || 'إعلان'} | سوق اليمن`;
  const price = listing.priceYER || listing.currentBidYER || 0;
  const city = listing.city || listing.locationLabel || 'اليمن';

  const description = listing.description
    ? `${String(listing.description).slice(0, 150)}... | السعر: ${Number(price).toLocaleString('ar-YE')} ريال | ${city}`
    : `${listing.title || 'إعلان'} - ${Number(price).toLocaleString('ar-YE')} ريال في ${city}`;

  const images = Array.isArray(listing.images) ? listing.images.slice(0, 4) : [];

  return {
    title,
    description,
    alternates: { canonical: canonical.href },
    openGraph: {
      title,
      description,
      url: canonical.href,
      type: 'website',
      locale: 'ar_YE',
      siteName: 'سوق اليمن',
      images: images.map((url) => ({ url, alt: listing.title || 'صورة الإعلان' })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.slice(0, 1),
    },
  };
}

export default async function ListingDetailsPage({ params }) {
  const { id } = params;

  const listing = await getListingById(id);
  if (!listing) notFound();

  // الآن الكلاينت يستلم بيانات جاهزة -> ما عاد يعلق على التحميل
  return <ListingDetailsClient params={params} initialListing={listing} />;
}
