import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'إلكترونيات للبيع | سوق اليمن',
  description: 'أجهزة وإلكترونيات للبيع والشراء في اليمن.',
};

export default function ElectronicsPage() {
  return (
    <CategoryPageShell title="الإلكترونيات" description="أجهزة، كمبيوتر، لابتوب، ملحقات…">
      <CategoryListings category="electronics" />
    </CategoryPageShell>
  );
}
