import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'ملابس للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الملابس في اليمن — بيع وشراء بسهولة على سوق اليمن.',
  alternates: {
    canonical: '/clothes',
  },
};

export default async function ClothesPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'clothes' });
  } catch (error) {
    console.error('[ClothesPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الملابس" description="تصفح أحدث إعلانات الملابس في اليمن">
      <CategoryListings category="clothes" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
