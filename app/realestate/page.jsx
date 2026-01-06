import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'عقارات للبيع والإيجار | سوق اليمن',
  description: 'عقارات للبيع والإيجار في اليمن — أراضي، شقق، فلل، محلات.',
};

export default function RealEstatePage() {
  return (
    <CategoryPageShell title="العقارات" description="أراضي، شقق، فلل، محلات — في جميع المحافظات">
      <CategoryListings category="realestate" />
    </CategoryPageShell>
  );
}
