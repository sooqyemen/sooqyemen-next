import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'دراجات نارية | سوق اليمن',
  description: 'دراجات نارية للبيع والشراء في اليمن — جديد ومستعمل وبأسعار مختلفة.',
};

export default function MotorcyclesPage() {
  return (
    <CategoryPageShell title="دراجات نارية" description="دراجات نارية للبيع والشراء — جديد ومستعمل">
      <CategoryListings category="motorcycles" />
    </CategoryPageShell>
  );
}
