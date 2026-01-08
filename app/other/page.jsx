import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'منتجات متنوعة | سوق اليمن',
  description: 'تصفح إعلانات المنتجات والخدمات المتنوعة في اليمن - كل ما تحتاجه في مكان واحد.',
  alternates: {
    canonical: '/other',
  },
};

export default async function OtherPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'other' });
  } catch (error) {
    console.error('[OtherPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell
      title="منتجات وخدمات متنوعة"
      description="تصفح إعلانات المنتجات والخدمات المتنوعة غير المصنفة في الأقسام الأخرى"
    >
      <CategoryListings category="other" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
