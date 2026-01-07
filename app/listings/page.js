// app/listings/page.js - Server Component with SSR
import { fetchPublicListings } from '@/lib/firestoreRest';
import ListingsPageClient from './page-client';

export const revalidate = 60; // إعادة التحقق كل 60 ثانية

export const metadata = {
  title: 'جميع الإعلانات | سوق اليمن',
  description: 'تصفّح جميع الإعلانات في سوق اليمن - سيارات، عقارات، جوالات، إلكترونيات وأكثر',
  alternates: {
    canonical: '/listings',
  },
};

export default async function ListingsPage() {
  // جلب أول 24 إعلان من السيرفر (SSR)
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ListingsPage SSR] Failed to fetch initial listings:', error);
    }
    // في حالة الفشل، سيتم جلب البيانات من الكلاينت
  }

  return <ListingsPageClient initialListings={initialListings} />;
}
