// app/layout.js
import './globals.css';
import Header from '@/components/Header';
import { AuthProvider } from '@/lib/useAuth';

export const metadata = {
  title: 'سوق اليمن',
  description: 'منصتك الأولى للبيع والشراء في اليمن',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
