import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'معدات ثقيلة | سوق اليمن',
  description: 'معدات وآليات ثقيلة للبيع والشراء في اليمن — حفارات، شيولات، رافعات وغيرها.',
};

export default function HeavyEquipmentPage() {
  return (
    <CategoryPageShell title="معدات ثقيلة" description="حفارات، شيولات، رافعات، آليات ومعدات ثقيلة">
      <CategoryListings category="heavy_equipment" />
    </CategoryPageShell>
  );
}
