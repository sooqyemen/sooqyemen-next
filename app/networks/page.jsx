import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'نت وشبكات | سوق اليمن',
  description: 'أجهزة ومستلزمات النت والشبكات في اليمن — راوترات، مقويات، سويتشات وغيرها.',
};

export default function NetworksPage() {
  return (
    <CategoryPageShell title="نت وشبكات" description="راوترات، مقويات، سويتشات، كابلات وغيرها">
      <CategoryListings category="networks" />
    </CategoryPageShell>
  );
}
