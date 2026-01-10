// app/listing/[id]/page.js
import { getListingById } from '@/lib/getListings.server';
import ListingDetailsClient from './page-client';

// تحديث الصفحة من السيرفر كل 5 دقائق (ISR)
export const revalidate = 300; 

// رابط الموقع الأساسي (مهم جداً للـ SEO)
const BASE_URL = 'https://sooqyemen.com';

// 1. توليد البيانات الوصفية (Metadata) لمحركات البحث
export async function generateMetadata({ params }) {
  // ⚠️ في نسخ Next.js الحديثة، يجب انتظار params
  const { id } = await params;
  
  let listing = null;
  
  try {
    if (id) {
        listing = await getListingById(id);
    }
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
      robots: { index: false, follow: false }, // أمر بعدم الأرشفة لصفحات الخطأ
    };
  }

  // تجهيز البيانات
  const title = `${listing.title || 'إعلان'} | سوق اليمن`;
  const priceVal = listing.priceYER || listing.currentBidYER || 0;
  const priceString = priceVal > 0 ? `${priceVal.toLocaleString('ar-YE')} ريال` : 'على السوم';
  const city = listing.city || listing.locationLabel || 'اليمن';
  
  // تحسين الوصف للظهور في جوجل
  const description = listing.description 
    ? `${listing.description.slice(0, 150)}... | السعر: ${priceString} | الموقع: ${city}`
    : `${listing.title} - ${priceString} في ${city} - سوق اليمن`;

  const images = listing.images && listing.images.length > 0 
    ? listing.images.slice(0, 4)
    : ['/icon-512.png']; // صورة احتياطية في حال عدم وجود صور

  // ✅ التعديل المهم: استخدام الرابط الكامل (Absolute URL)
  const url = `${BASE_URL}/listing/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url, // ✅ إصلاح Canonical
    },
    openGraph: {
      title,
      description,
      url, // ✅ إصلاح OG URL
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

// 2. صفحة التفاصيل (Server Component)
export default async function ListingDetailsPage({ params }) {
  // فك البارامترات (ضروري لـ Next.js 15)
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  // جلب البيانات الأولية على السيرفر (Server-Side Fetching with firebaseAdmin)
  let initialListing = null;
  
  try {
    if (id) {
        initialListing = await getListingById(id);
    }
  } catch (error) {
    console.error('[ListingDetailsPage] Error fetching initial data:', error);
    // نستمر حتى لو فشل الجلب، وسيقوم الـ Client بالمحاولة مرة أخرى
  }

  // تمرير البيانات إلى مكون العميل (Client Component)
  return (
    <ListingDetailsClient 
      params={resolvedParams} 
      initialListing={initialListing} 
    />
  );
}
