import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'خدمات | سوق اليمن',
  description: 'خدمات متنوعة في اليمن — صيانة، نقل، أعمال حرة وغيرها.',
};

export default function ServicesPage() {
  return (
    <CategoryPageShell title="الخدمات" description="صيانة، نقل، أعمال حرة وغيرها">
      <CategoryListings category="services" />
    </CategoryPageShell>
  );
}
