'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';

export default function AdsPage() {
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setFetching(true);
    setError('');

    const unsub = db
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(60)
      .onSnapshot(
        (snap) => {
          const data = [];
          snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

          // فلترة محلية آمنة
          const filtered = data.filter((x) => {
            if (x.hidden) return false;
            if (x.isActive === false) return false;
            return true;
          });

          setItems(filtered);
          setFetching(false);
        },
        (err) => {
          console.error('ads error:', err);
          setError('حدث خطأ أثناء تحميل الإعلانات.');
          setFetching(false);
        }
      );

    return () => unsub();
  }, []);

  return (
    <>
      <Header />

      <div className="container" style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="page-header" style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0 }}>كل الإعلانات</h1>
          <Link href="/add" className="btn btnPrimary">
            + أضف إعلاناً
          </Link>
        </div>

        {fetching && (
          <div className="card">
            <p style={{ margin: 0 }}>جاري تحميل الإعلانات...</p>
          </div>
        )}

        {error && (
          <div className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2' }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {!fetching && !error && items.length === 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>لا توجد إعلانات حالياً</h3>
            <p className="muted">جرّب لاحقاً أو أضف أول إعلان.</p>
            <Link href="/add" className="btn btnPrimary">+ أضف إعلاناً</Link>
          </div>
        )}

        {!fetching && !error && items.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/listing/${item.id}`}
                className="card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>
                      {item.title || 'إعلان بدون عنوان'}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      📌 {item.city || 'بدون مدينة'} • 🏷️ {item.category || 'بدون قسم'} • 👁️ {item.views || 0}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {item.priceYER ? `${Number(item.priceYER).toLocaleString()} ريال` : 'بدون سعر'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
