import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'حيوانات وطيور للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الحيوانات والطيور في اليمن — بيع وشراء بسهولة على سوق اليمن.',
  alternates: {
    canonical: '/animals',
  },
};

export default async function AnimalsPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'animals' });
  } catch (error) {
    console.error('[AnimalsPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الحيوانات والطيور" description="حيوانات وطيور للبيع والشراء في اليمن">
      <CategoryListings category="animals" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
