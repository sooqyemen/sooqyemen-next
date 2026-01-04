// 📁 الموقع: /app/layout.js
import './globals.css';
import './home.css'; // 🚨 هذا السطر ضروري - تم إضافته لحل المشكلة
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
        {/* ⚙️ مهم لتحسين تجربة الجوال */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* 📱 دعم iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* 🔗 رابط للأيقونة */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="body-layout">
        <AuthProvider>
          {/* 🎯 الهيدر - سيظهر في جميع الصفحات */}
          <Header />
          
          {/* 📄 المحتوى الرئيسي */}
          <main className="main-content">
            {children}
          </main>
          
          {/* 📱 مساحة آمنة للهواتف ذات الشقوق */}
          <div className="safe-area-bottom" />
        </AuthProvider>
        
        {/* ⚡ تحسينات للأداء */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // منع FOUC (Flash Of Unstyled Content)
              document.documentElement.style.opacity = 0;
              document.addEventListener('DOMContentLoaded', function() {
                document.documentElement.style.opacity = 1;
              });
              
              // تحسين تجربة اللمس على الجوال
              document.addEventListener('touchstart', function(){}, {passive: true});
            `,
          }}
        />
      </body>
    </html>
  );
}
