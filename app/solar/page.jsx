import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'الطاقة الشمسية | سوق اليمن',
  description: 'ألواح، بطاريات، انفرترات، معدات الطاقة الشمسية في اليمن.',
  alternates: {
    canonical: '/solar',
  },
};

export default async function SolarPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'solar' });
  } catch (error) {
    console.error('[SolarPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الطاقة الشمسية" description="ألواح، بطاريات، انفرترات ومستلزماتها">
      <CategoryListings category="solar" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
