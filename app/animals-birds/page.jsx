import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'حيوانات وطيور | سوق اليمن',
  description: 'إعلانات الحيوانات والطيور في اليمن — مواشي، أغنام، إبل، طيور وغيرها.',
};

export default function AnimalsBirdsPage() {
  return (
    <CategoryPageShell title="حيوانات وطيور" description="مواشي، أغنام، إبل، طيور وغيرها">
      <CategoryListings category="animals_birds" />
    </CategoryPageShell>
  );
}
