// app/clothes/page.jsx
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'ملابس للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الملابس في اليمن — بيع وشراء بسهولة على سوق اليمن.',
};

export default function ClothesPage() {
  return (
    <CategoryPageShell title="الملابس" description="تصفح أحدث إعلانات الملابس في اليمن">
      <CategoryListings category="clothes" />
    </CategoryPageShell>
  );
}
