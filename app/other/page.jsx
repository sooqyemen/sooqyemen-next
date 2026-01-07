import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'منتجات متنوعة | سوق اليمن',
  description: 'تصفح إعلانات المنتجات والخدمات المتنوعة في اليمن - كل ما تحتاجه في مكان واحد.',
};

export default function OtherPage() {
  return (
    <CategoryPageShell
      title="منتجات وخدمات متنوعة"
      description="تصفح إعلانات المنتجات والخدمات المتنوعة غير المصنفة في الأقسام الأخرى"
    >
      <CategoryListings category="other" />
    </CategoryPageShell>
  );
}
