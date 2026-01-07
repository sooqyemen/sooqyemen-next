import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'نت وشبكات | سوق اليمن',
  description: 'أجهزة ومستلزمات النت والشبكات في اليمن — راوترات، مقويات، سويتشات وغيرها.',
  alternates: {
    canonical: '/networks',
  },
};

export default async function NetworksPage() {
  const initialListings = await fetchPublicListings({ limit: 24, category: 'networks' });

  return (
    <CategoryPageShell title="نت وشبكات" description="راوترات، مقويات، سويتشات، كابلات وغيرها">
      <CategoryListings category="networks" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
