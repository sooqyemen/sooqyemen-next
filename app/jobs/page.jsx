import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'وظائف في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الوظائف في اليمن — فرص عمل ووظائف شاغرة على سوق اليمن.',
  alternates: {
    canonical: '/jobs',
  },
};

export default async function JobsPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'jobs' });
  } catch (error) {
    console.error('[JobsPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell title="الوظائف" description="تصفح أحدث فرص العمل والوظائف في اليمن">
      <CategoryListings category="jobs" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
