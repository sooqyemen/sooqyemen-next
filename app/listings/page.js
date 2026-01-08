// app/listings/page.js - Server Component with SSR
// ⚠️ تصحيح الاستيراد: لاحظ أننا حذفنا حرف 's' من اسم الملف ليتطابق مع ما أنشأناه سابقاً
import { getLatestListings } from '@/lib/getListing.server'; 
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
  // جلب أول 24 إعلان من السيرفر (SSR/ISR with cached query)
  let initialListings = [];
  
  try {
    initialListings = await getLatestListings(24);
    
    // فحص بسيط للتأكد من وصول البيانات في السيرفر
    console.log(`[SSR] Listings fetched: ${initialListings?.length || 0}`);
    
  } catch (error) {
    console.error('[ListingsPage SSR] Failed to fetch initial listings:', error);
    // في حالة الفشل، المصفوفة ستبقى فارغة وسيتم التعامل معها في الكلاينت
  }

  return <ListingsPageClient initialListings={initialListings} />;
}
