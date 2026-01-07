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
  const initialListings = await fetchPublicListings({ limit: 24, category: 'maintenance' });

  return (
    <CategoryPageShell title="الصيانة" description="خدمات صيانة: كهرباء، سباكة، تكييف وغيرها">
      <CategoryListings category="maintenance" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
