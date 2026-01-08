import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'معدات ثقيلة | سوق اليمن',
  description: 'معدات وآليات ثقيلة للبيع والشراء في اليمن — حفارات، شيولات، رافعات وغيرها.',
  alternates: {
    canonical: '/heavy_equipment',
  },
};

export default async function HeavyEquipmentPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'heavy_equipment' });
  } catch (error) {
    console.error('[HeavyEquipmentPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="معدات ثقيلة" description="حفارات، شيولات، رافعات، آليات ومعدات ثقيلة">
      <CategoryListings category="heavy_equipment" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
