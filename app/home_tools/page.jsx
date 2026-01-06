// app/home_tools/page.jsx
import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'أدوات منزلية للبيع | سوق اليمن',
  description: 'تصفح أحدث إعلانات الأدوات المنزلية في اليمن — بيع وشراء بسهولة على سوق اليمن.',
};

export default function HomeToolsPage() {
  return (
    <CategoryPageShell
      title="أدوات منزلية"
      description="أدوات منزلية ومستلزمات البيت للبيع والشراء في اليمن"
    >
      <CategoryListings category="home_tools" />
    </CategoryPageShell>
  );
}
