// app/layout.js
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Header from '@/components/Header';
import ClientProviders from '@/components/ClientProviders';
import { WebVitals } from './web-vitals';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sooqyemen.com'),
  title: {
    default: 'سوق اليمن - أكبر منصة للإعلانات والمزادات في اليمن',
    template: '%s | سوق اليمن',
  },
  description: 'أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات وأكثر',
  keywords: ['سوق اليمن', 'إعلانات اليمن', 'بيع وشراء', 'مزادات', 'سيارات', 'عقارات', 'جوالات'],
  authors: [{ name: 'سوق اليمن' }],
  creator: 'سوق اليمن',
  publisher: 'سوق اليمن',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
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
        url: '/icon-512.png',
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
    images: ['/icon-512.png'],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Performance hints */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        {/* Preload critical CSS */}
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
      </head>

      <body>
        <WebVitals />
        <a href="#main-content" className="skip-to-content">
          الانتقال إلى المحتوى الرئيسي
        </a>
        <ClientProviders>
          <Header />
          <main id="main-content" role="main">{children}</main>
          <div className="safe-area-bottom" />
        </ClientProviders>
      </body>
    </html>
  );
}
