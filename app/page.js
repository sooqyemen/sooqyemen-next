'use client';

import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <div className="container">
        <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
          <h1>سوق اليمن</h1>
          <p>الموقع يعمل، وجاري ضبط الصفحة الرئيسية 🌿</p>
        </div>
      </div>
    </div>
  );
}
