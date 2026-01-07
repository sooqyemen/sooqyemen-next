import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60; // إعادة التحقق كل 60 ثانية

export const metadata = {
  title: 'سيارات للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات السيارات في اليمن — بيع وشراء بسهولة على سوق اليمن.',
  alternates: {
    canonical: '/cars',
  },
};

export default async function CarsPage() {
  // جلب الإعلانات من السيرفر
  const initialListings = await fetchPublicListings({ limit: 24, category: 'cars' });

  return (
    <CategoryPageShell title="السيارات" description="تصفح أحدث إعلانات السيارات في اليمن">
      <CategoryListings category="cars" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
