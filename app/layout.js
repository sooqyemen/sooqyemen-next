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
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
