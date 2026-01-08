import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'أثاث للبيع | سوق اليمن',
  description: 'أثاث منزلي ومكتبي للبيع والشراء في اليمن.',
  alternates: {
    canonical: '/furniture',
  },
};

export default async function FurniturePage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'furniture' });
  } catch (error) {
    console.error('[FurniturePage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الأثاث" description="أثاث منزلي ومكتبي — جديد ومستعمل">
      <CategoryListings category="furniture" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
