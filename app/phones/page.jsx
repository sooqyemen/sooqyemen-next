import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'جوالات للبيع | سوق اليمن',
  description: 'أحدث إعلانات الجوالات والهواتف في اليمن.',
  alternates: {
    canonical: '/phones',
  },
};

export default async function PhonesPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'phones' });
  } catch (error) {
    console.error('[PhonesPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الجوالات" description="هواتف جديدة ومستعملة بأسعار مختلفة">
      <CategoryListings category="phones" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
