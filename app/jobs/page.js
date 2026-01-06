import CategoryPageShell from '@/components/CategoryPageShell';
import CategoryListings from '@/components/CategoryListings';

export const metadata = {
  title: 'وظائف في اليمن | سوق اليمن',
  description: 'تصفح أحدث إعلانات الوظائف في اليمن — فرص عمل ووظائف شاغرة على سوق اليمن.',
};

export default function JobsPage() {
  return (
    <CategoryPageShell title="الوظائف" description="تصفح أحدث فرص العمل والوظائف في اليمن">
      <CategoryListings category="jobs" />
    </CategoryPageShell>
  );
}
