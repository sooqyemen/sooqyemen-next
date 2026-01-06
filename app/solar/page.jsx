import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'الطاقة الشمسية | سوق اليمن',
  description: 'ألواح، بطاريات، انفرترات، معدات الطاقة الشمسية في اليمن.',
};

export default function SolarPage() {
  return (
    <CategoryPageShell title="الطاقة الشمسية" description="ألواح، بطاريات، انفرترات ومستلزماتها">
      <CategoryListings category="solar" />
    </CategoryPageShell>
  );
}
