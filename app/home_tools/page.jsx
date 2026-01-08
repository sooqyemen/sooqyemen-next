import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'أدوات منزلية للبيع | سوق اليمن',
  description: 'تصفح أحدث إعلانات الأدوات المنزلية في اليمن — بيع وشراء بسهولة على سوق اليمن.',
  alternates: {
    canonical: '/home_tools',
  },
};

export default async function HomeToolsPage() {
  let initialListings = [];
  
  try {
    initialListings = await fetchPublicListings({ limit: 24, category: 'home_tools' });
  } catch (error) {
    console.error('[HomeToolsPage] Failed to fetch listings:', error);
    // سيتم جلب البيانات من الكلاينت في حالة الفشل
  }

  return (
    <CategoryPageShell
      title="أدوات منزلية"
      description="أدوات منزلية ومستلزمات البيت للبيع والشراء في اليمن"
    >
      <CategoryListings category="home_tools" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
