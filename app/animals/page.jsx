import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'حيوانات وطيور للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الحيوانات والطيور في اليمن — بيع وشراء بسهولة على سوق اليمن.',
};

export default function AnimalsPage() {
  return (
    <CategoryPageShell title="الحيوانات والطيور" description="حيوانات وطيور للبيع والشراء في اليمن">
      <CategoryListings category="animals" />
    </CategoryPageShell>
  );
}
