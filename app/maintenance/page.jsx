import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'الصيانة في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات خدمات الصيانة في اليمن — كهرباء، سباكة، تكييف وغيرها.',
};

export default function MaintenancePage() {
  return (
    <CategoryPageShell title="الصيانة" description="خدمات صيانة: كهرباء، سباكة، تكييف وغيرها">
      <CategoryListings category="maintenance" />
    </CategoryPageShell>
  );
}
