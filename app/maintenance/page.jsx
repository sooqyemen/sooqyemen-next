import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'الصيانة في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات خدمات الصيانة في اليمن — كهرباء، سباكة، تكييف وغيرها.',
  alternates: {
    canonical: '/maintenance',
  },
};

export default async function MaintenancePage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'maintenance' });
  } catch (error) {
    console.error('[MaintenancePage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الصيانة" description="خدمات صيانة: كهرباء، سباكة، تكييف وغيرها">
      <CategoryListings category="maintenance" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
