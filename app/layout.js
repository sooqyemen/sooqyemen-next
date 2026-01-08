// app/layout.js
import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sooqyemen.com'),
  title: {
    default: 'سوق اليمن - أكبر منصة للإعلانات والمزادات في اليمن',
    template: '%s | سوق اليمن',
  },
  description: 'أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات وأكثر',
  keywords: ['سوق اليمن', 'إعلانات اليمن', 'بيع وشراء', 'مزادات', 'سيارات', 'عقارات', 'جوالات'],
  authors: [{ name: 'سوق اليمن' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_YE',
    url: '/',
    siteName: 'سوق اليمن',
    title: 'سوق اليمن - أكبر منصة للإعلانات والمزادات في اليمن',
    description: 'أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات وأكثر',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'سوق اليمن',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سوق اليمن - أكبر منصة للإعلانات والمزادات في اليمن',
    description: 'أكبر منصة للإعلانات والمزادات في اليمن',
    images: ['/logo.png'],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" />
      </head>

      <body>
        <Header />
        <main>{children}</main>
        <div className="safe-area-bottom" />
      </body>
    </html>
  );
}
