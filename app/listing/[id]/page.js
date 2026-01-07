// app/listing/[id]/page.js - Server Component with generateMetadata
import { fetchListingById } from '@/lib/firestoreRest';
import ListingDetailsClient from './page-client';

export const revalidate = 300; // 5 دقائق

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const { id } = params;
  const listing = await fetchListingById(id);

  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر',
    };
  }

  const title = `${listing.title || 'إعلان'} | سوق اليمن`;
  const price = listing.priceYER || listing.currentBidYER || 0;
  const city = listing.city || listing.locationLabel || 'اليمن';
  const description = listing.description 
    ? `${listing.description.slice(0, 150)}... | السعر: ${price.toLocaleString('ar-YE')} ريال | ${city}`
    : `${listing.title} - ${price.toLocaleString('ar-YE')} ريال في ${city}`;

  const images = listing.images && listing.images.length > 0 
    ? listing.images.slice(0, 4)
    : [];

  const url = `/listing/${id}`;

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
      images: images.map((img) => ({
        url: img,
        alt: listing.title || 'صورة الإعلان',
      })),
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
  
  // Fetch initial listing data on server
  const initialListing = await fetchListingById(id);

  return <ListingDetailsClient params={params} initialListing={initialListing} />;
}
