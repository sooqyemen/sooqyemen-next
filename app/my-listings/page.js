// app/my-listings/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // لو لسه useAuth يحمل، لا نعمل شي
    if (loading) return;

    // لو مافيه مستخدم -> نعرض رسالة بسيطة
    if (!user) {
      setFetching(false);
      return;
    }

    // جلب إعلانات المستخدم من Firestore
    const unsub = db
      .collection('listings')
      .where('userId', '==', user.uid)
      .onSnapshot(
        (snap) => {
          const data = [];
          snap.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
          });
          setItems(data);
          setFetching(false);
        },
        (err) => {
          console.error('my-listings error:', err);
          setError('حدث خطأ أثناء تحميل إعلاناتك، حاول لاحقاً.');
          setFetching(false);
        }
      );

    return () => unsub();
  }, [user, loading]);

  return (
    <>
      <Header />

      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>إعلاناتي</h1>

          <Link href="/add" className="btn btnPrimary">
            + أضف إعلاناً جديداً
          </Link>
        </div>

        {/* حالة: جاري التحميل */}
        {loading || fetching ? (
          <div className="card muted">جاري تحميل إعلاناتك...</div>
        ) : null}

        {/* حالة: المستخدم غير مسجل دخول */}
        {!loading && !user && !fetching && (
          <div className="card">
            <p style={{ marginBottom: 12 }}>
              يجب تسجيل الدخول حتى تشاهد إعلاناتك وتقوم بتعديلها أو حذفها.
            </p>
            <Link href="/login" className="btn btnPrimary">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {/* حالة خطأ */}
        {error && (
          <div className="card" style={{ border: '1px solid #fecaca', background: '#fef2f2', marginTop: 12 }}>
            {error}
          </div>
        )}

        {/* حالة: لا يوجد إعلانات */}
        {user && !fetching && !error && items.length === 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ marginBottom: 8 }}>لا يوجد لديك أي إعلانات حالياً.</p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              قم بإضافة أول إعلان لك الآن، وسيظهر هنا لتستطيع تعديله أو إخفاءه لاحقاً.
            </p>
            <Link href="/add" className="btn btnPrimary">
              + أضف أول إعلان لك
            </Link>
          </div>
        )}

        {/* قائمة الإعلانات */}
        {user && !fetching && !error && items.length > 0 && (
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {items.map((item) => (
              <div key={item.id} className="card" style={{ display: 'grid', gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {item.title || 'إعلان بدون عنوان'}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {item.city || 'بدون مدينة'} · {item.category || 'قسم غير محدد'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontWeight: 700 }}>
                    {item.priceYER
                      ? `${Number(item.priceYER).toLocaleString()} ريال يمني`
                      : 'بدون سعر'}
                  </div>
                </div>

                <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <Link href={`/listing/${item.id}`} className="btn">
                    عرض الإعلان
                  </Link>

                  {/* لاحقاً نضيف هنا روابط التعديل والإخفاء والحذف لما نجهز صفحاتها */}
                  {/* مثال: */}
                  {/* <Link href={`/edit-listing/${item.id}`} className="btn">تعديل</Link> */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
