import SellerListingsClient from './page-client';

export const metadata = {
  title: 'إعلانات البائع - سوق اليمن',
  description: 'عرض جميع إعلانات البائع في سوق اليمن',
};

export default function SellerListingsPage({ params }) {
  const uid = params?.uid ? decodeURIComponent(params.uid) : '';
  return <SellerListingsClient uid={uid} />;
}
