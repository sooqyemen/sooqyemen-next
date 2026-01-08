import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'عقارات للبيع والإيجار | سوق اليمن',
  description: 'عقارات للبيع والإيجار في اليمن — أراضي، شقق، فلل، محلات.',
  alternates: {
    canonical: '/realestate',
  },
};

export default async function RealEstatePage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'realestate' });
  } catch (error) {
    console.error('[RealEstatePage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="العقارات" description="أراضي، شقق، فلل، محلات — في جميع المحافظات">
      <CategoryListings category="realestate" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
