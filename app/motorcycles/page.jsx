import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'دراجات نارية | سوق اليمن',
  description: 'دراجات نارية للبيع والشراء في اليمن — جديد ومستعمل وبأسعار مختلفة.',
  alternates: {
    canonical: '/motorcycles',
  },
};

export default async function MotorcyclesPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'motorcycles' });
  } catch (error) {
    console.error('[MotorcyclesPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="دراجات نارية" description="دراجات نارية للبيع والشراء — جديد ومستعمل">
      <CategoryListings category="motorcycles" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
