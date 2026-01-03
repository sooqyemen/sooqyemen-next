import './globals.css';
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
        {/* مهم لتحسين تجربة الجوال */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* دعم iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="body-layout">
        <AuthProvider>
          <Header />
          <main className="main-content">
            {children}
          </main>
          
          {/* مساحة آمنة للهواتف ذات الشقوق */}
          <div className="safe-area-bottom" />
        </AuthProvider>
      </body>
    </html>
  );
}
