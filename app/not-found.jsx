// app/not-found.jsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div dir="rtl" className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>404</div>
        <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>
          الصفحة غير موجودة
        </div>
        <div className="muted" style={{ marginBottom: 16 }}>
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </div>
        <Link href="/" className="btn btnPrimary">
          🏠 العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
