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
    if (loading) return;

    if (!user) {
      setFetching(false);
      return;
    }

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

      <div className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="page-header">
          <h1>إعلاناتي</h1>
          <Link href="/add" className="btn btnPrimary">
            + أضف إعلاناً جديداً
          </Link>
        </div>

        {/* حالة: جاري التحميل */}
        {(loading || fetching) && (
          <div className="card loading-container">
            <div className="spinner"></div>
            <p>جاري تحميل إعلاناتك...</p>
          </div>
        )}

        {/* حالة: المستخدم غير مسجل دخول */}
        {!loading && !user && !fetching && (
          <div className="card">
            <p style={{ marginBottom: '12px' }}>
              يجب تسجيل الدخول حتى تشاهد إعلاناتك وتقوم بتعديلها أو حذفها.
            </p>
            <Link href="/login" className="btn btnPrimary">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {/* حالة خطأ */}
        {error && (
          <div className="card" style={{ 
            border: '1px solid #fecaca', 
            background: '#fef2f2', 
            marginTop: '12px' 
          }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* حالة: لا يوجد إعلانات */}
        {user && !fetching && !error && items.length === 0 && (
          <div className="card empty-state">
            <div className="empty-icon">📭</div>
            <h3>لا توجد إعلانات</h3>
            <p>لم تقم بإضافة أي إعلانات بعد</p>
            <Link href="/add" className="btn btnPrimary">
              + أضف أول إعلان لك
            </Link>
          </div>
        )}

        {/* قائمة الإعلانات */}
        {user && !fetching && !error && items.length > 0 && (
          <div className="my-listings-container">
            <div className="listings-stats">
              <div className="stat-item">
                <span className="stat-label">عدد الإعلانات:</span>
                <span className="stat-value">{items.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">الإعلانات النشطة:</span>
                <span className="stat-value">
                  {items.filter(item => item.isActive !== false).length}
                </span>
              </div>
            </div>

            <div className="listings-grid">
              {items.map((item) => (
                <div key={item.id} className="listing-card">
                  <div className="listing-header">
                    <div className="listing-info">
                      <h3 className="listing-title">
                        {item.title || 'إعلان بدون عنوان'}
                        {item.isActive === false && (
                          <span className="status-badge status-inactive">مخفي</span>
                        )}
                        {item.hidden && (
                          <span className="status-badge status-hidden">محذوف</span>
                        )}
                        {item.isActive !== false && !item.hidden && (
                          <span className="status-badge status-active">نشط</span>
                        )}
                      </h3>
                      <div className="listing-meta">
                        <span>📌 {item.city || 'بدون مدينة'}</span>
                        <span>•</span>
                        <span>🏷️ {item.category || 'قسم غير محدد'}</span>
                        <span>•</span>
                        <span>👁️ {item.views || 0} مشاهدة</span>
                      </div>
                    </div>
                    <div className="listing-price">
                      {item.priceYER
                        ? `${Number(item.priceYER).toLocaleString()} ريال يمني`
                        : 'بدون سعر'}
                    </div>
                  </div>

                  {item.description && (
                    <p className="listing-description">
                      {item.description.length > 120
                        ? `${item.description.substring(0, 120)}...`
                        : item.description}
                    </p>
                  )}

                  <div className="listing-actions">
                    <Link href={`/listing/${item.id}`} className="btn">
                      👁️ عرض الإعلان
                    </Link>
                    <Link 
                      href={`/edit-listing/${item.id}`} 
                      className="btn"
                      style={{ background: '#f1f5f9' }}
                    >
                      ✏️ تعديل
                    </Link>
                    <button 
                      className="btn"
                      style={{ 
                        background: '#fef2f2', 
                        color: '#dc2626',
                        borderColor: '#fecaca'
                      }}
                      onClick={() => {
                        if (confirm('هل تريد حذف هذا الإعلان؟')) {
                          // TODO: إضافة دالة الحذف
                          alert('سيتم إضافة وظيفة الحذف قريباً');
                        }
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
