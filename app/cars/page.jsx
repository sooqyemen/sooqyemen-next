import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'سيارات للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات السيارات في اليمن — بيع وشراء بسهولة على سوق اليمن.',
};

export default function CarsPage() {
  return (
    <CategoryPageShell title="السيارات" description="تصفح أحدث إعلانات السيارات في اليمن">
      <CategoryListings category="cars" />
    </CategoryPageShell>
  );
}
