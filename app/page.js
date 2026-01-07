// app/page.js - Server Component with SSR
import { fetchPublicListings } from '@/lib/firestoreRest';
import HomePageClient from './page-client';

export const revalidate = 60; // إعادة التحقق كل 60 ثانية

export const metadata = {
  title: 'سوق اليمن - أكبر منصة للإعلانات والمزادات في اليمن',
  description: 'أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات وأكثر',
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  // جلب أول 12 إعلان من السيرفر (SSR)
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 12 });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[HomePage SSR] Failed to fetch initial listings:', error);
    }
    // في حالة الفشل، سيتم جلب البيانات من الكلاينت
  }

  return <HomePageClient initialListings={initialListings} />;
}
