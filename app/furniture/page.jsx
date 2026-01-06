import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'أثاث للبيع | سوق اليمن',
  description: 'أثاث منزلي ومكتبي للبيع والشراء في اليمن.',
};

export default function FurniturePage() {
  return (
    <CategoryPageShell title="الأثاث" description="أثاث منزلي ومكتبي — جديد ومستعمل">
      <CategoryListings category="furniture" />
    </CategoryPageShell>
  );
}
