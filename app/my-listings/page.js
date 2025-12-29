// app/my-listings/page.js
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setFetching(true);
    const unsub = db
      .collection('listings')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => {
          setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setFetching(false);
        },
        (err) => {
          console.error('my listings error:', err);
          setFetching(false);
        }
      );
    return () => unsub();
  }, [user?.uid]);

  const delListing = async (l) => {
    if (!user?.uid) return;
    if (l.userId !== user.uid) {
      alert('لا يمكنك حذف إعلان لا تملكه');
      return;
    }
    if (!confirm('هل تريد حذف هذا الإعلان نهائياً؟')) return;
    await db.collection('listings').doc(l.id).delete();
  };

  const toggleListingHidden = async (l) => {
    if (!user?.uid) return;
    if (l.userId !== user.uid) {
      alert('لا يمكنك تعديل إعلان لا تملكه');
      return;
    }
    const newState = !l.hidden;
    await db.collection('listings').doc(l.id).update({
      hidden: newState,
    });
    alert(newState ? 'تم إخفاء الإعلان' : 'تم إظهار الإعلان');
  };

  return (
    <>
      <Header />
      <div className="container" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">لوحة إعلاناتي</span>
        </div>

        {loading ? (
          <div className="card muted" style={{ marginTop: 12 }}>
            جاري التحقق من تسجيل الدخول...
          </div>
        ) : null}

        {!loading && !user ? (
          <div className="card" style={{ marginTop: 12 }}>
            يجب تسجيل الدخول لعرض وإدارة إعلاناتك.
          </div>
        ) : null}

        {user ? (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              البريد المسجل: <b>{user.email || 'بدون بريد'}</b>
            </div>

            {fetching ? (
              <div className="card muted">جاري تحميل إعلاناتك...</div>
            ) : listings.length === 0 ? (
              <div className="card">
                لا يوجد لديك إعلانات بعد.
                <div style={{ marginTop: 8 }}>
                  <Link className="btn btnPrimary" href="/add">
                    أضف أول إعلان لك
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {listings.map((l) => (
                  <div key={l.id} className="card" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>
                      {l.title || 'بدون عنوان'}
                      {l.hidden ? (
                        <span
                          className="badge"
                          style={{
                            marginRight: 8,
                            background: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          مخفي
                        </span>
                      ) : null}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      القسم: {l.categoryName || l.categorySlug || 'غير محدد'}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      المدينة: {l.city || 'غير محددة'}
                    </div>

                    <div
                      className="row"
                      style={{
                        marginTop: 8,
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <Link className="btn" href={`/listing/${l.id}`}>
                        عرض الإعلان
                      </Link>

                      {/* تعديل الإعلان (العنوان، الوصف، السعر، الموقع) */}
                      <Link className="btn" href={`/edit-listing/${l.id}`}>
                        تعديل
                      </Link>

                      <button
                        className="btn"
                        onClick={() => toggleListingHidden(l)}
                      >
                        {l.hidden ? 'إظهار الإعلان' : 'إخفاء الإعلان'}
                      </button>

                      <button
                        className="btn"
                        onClick={() => delListing(l)}
                      >
                        حذف الإعلان
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
