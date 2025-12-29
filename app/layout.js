// app/layout.js
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'سوق اليمن | بيع وشراء كل شيء في اليمن',
  description:
    'سوق اليمن - منصة إعلانات مبوبة في اليمن لبيع وشراء العقارات، السيارات، الجوالات، الطاقة الشمسية، الوظائف، الأثاث والمنتجات اليمنية في جميع المحافظات.',
  metadataBase: new URL('https://sooqyemen.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'سوق اليمن | بيع وشراء كل شيء في اليمن',
    description:
      'أضف إعلانك مجاناً في سوق اليمن وشاهد أفضل العروض في العقارات، السيارات، الجوالات، الطاقة الشمسية والوظائف.',
    url: 'https://sooqyemen.com',
    siteName: 'سوق اليمن',
    locale: 'ar_YE',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
