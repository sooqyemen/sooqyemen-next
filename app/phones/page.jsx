import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'جوالات للبيع | سوق اليمن',
  description: 'أحدث إعلانات الجوالات والهواتف في اليمن.',
};

export default function PhonesPage() {
  return (
    <CategoryPageShell title="الجوالات" description="هواتف جديدة ومستعملة بأسعار مختلفة">
      <CategoryListings category="phones" />
    </CategoryPageShell>
  );
}
