// app/layout.js
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'سوق اليمن - Next.js',
  description: 'سوق اليمن - بيع وشراء كل شيء في اليمن',
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
