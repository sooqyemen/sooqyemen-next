import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'إلكترونيات للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الإلكترونيات في اليمن - حواسيب، لابتوب، شاشات وأجهزة إلكترونية.',
};

export default function ElectronicsPage() {
  return (
    <CategoryPageShell
      title="الإلكترونيات"
      description="حواسيب، لابتوب، شاشات وأجهزة إلكترونية للبيع والشراء في اليمن"
    >
      <CategoryListings category="electronics" />
    </CategoryPageShell>
  );
}
