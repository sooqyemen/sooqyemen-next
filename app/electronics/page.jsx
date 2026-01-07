import { fetchPublicListings } from '@/lib/firestoreRest';
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const revalidate = 60;

export const metadata = {
  title: 'إلكترونيات للبيع في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الإلكترونيات في اليمن - حواسيب، لابتوب، شاشات وأجهزة إلكترونية.',
  alternates: {
    canonical: '/electronics',
  },
};

export default async function ElectronicsPage() {
  const initialListings = await fetchPublicListings({ limit: 24, category: 'electronics' });

  return (
    <CategoryPageShell
      title="الإلكترونيات"
      description="حواسيب، لابتوب، شاشات وأجهزة إلكترونية للبيع والشراء في اليمن"
    >
      <CategoryListings category="electronics" initialListings={initialListings} />
    </CategoryPageShell>
  );
}
