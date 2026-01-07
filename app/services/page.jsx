import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'خدمات | سوق اليمن',
  description: 'خدمات متنوعة في اليمن — صيانة، نقل، أعمال حرة وغيرها.',
  alternates: {
    canonical: '/services',
  },
};

export default async function ServicesPage() {
  const initialListings = await fetchPublicListings({ limit: 24, category: 'services' });

  return (
    <CategoryPageShell title="الخدمات" description="صيانة، نقل، أعمال حرة وغيرها">
      <CategoryListings category="services" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
