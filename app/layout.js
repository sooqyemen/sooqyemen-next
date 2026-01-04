// 📁 /app/layout.js
import './globals.css';
import './home.css';
import { AuthProvider } from '@/lib/useAuth';
import Header from '@/components/Header';

export const metadata = {
  title: 'سوق اليمن',
  description: 'منصتك الأولى للبيع والشراء في اليمن',
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
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <div className="safe-area-bottom" />
        </AuthProvider>
      </body>
    </html>
  );
}
