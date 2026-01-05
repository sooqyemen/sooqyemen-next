// app/my-listings/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // لتجميد زر واحد وقت التنفيذ
  const [busyMap, setBusyMap] = useState({}); // { [id]: true }

  const setBusy = (id, val) => {
    setBusyMap((p) => ({ ...p, [id]: !!val }));
  };

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
          snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

          // ترتيب بسيط: الأحدث أولاً لو فيه createdAt
          data.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
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

  const stats = useMemo(() => {
    const total = items.length;

    const sold = items.filter((x) => String(x.status || '').toLowerCase() === 'sold').length;

    const hidden = items.filter((x) => x.hidden === true || x.isActive === false).length;

    const active = items.filter((x) => {
      const isSold = String(x.status || '').toLowerCase() === 'sold';
      const isHidden = x.hidden === true;
      const isInactive = x.isActive === false;
      return !isSold && !isHidden && !isInactive;
    }).length;

    return { total, active, sold, hidden };
  }, [items]);

  const toggleActive = async (item) => {
    if (!user) return;
    setBusy(item.id, true);
    try {
      const next = item.isActive === false ? true : false;
      await db.collection('listings').doc(item.id).update({
        isActive: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert('تعذر تغيير حالة الإعلان.');
    } finally {
      setBusy(item.id, false);
    }
  };

  const toggleSold = async (item) => {
    if (!user) return;
    setBusy(item.id, true);

    try {
      const isSold = String(item.status || '').toLowerCase() === 'sold';

      if (isSold) {
        // إلغاء البيع
        await db.collection('listings').doc(item.id).update({
          status: 'active', // أو احذف الحقل لو تحب: firebase.firestore.FieldValue.delete()
          soldAt: firebase.firestore.FieldValue.delete(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // تم البيع
        await db.collection('listings').doc(item.id).update({
          status: 'sold',
          soldAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
      alert('تعذر تحديث حالة البيع.');
    } finally {
      setBusy(item.id, false);
    }
  };

  const deleteListing = async (item) => {
    if (!user) return;

    if (!confirm('هل تريد حذف هذا الإعلان نهائياً؟')) return;

    setBusy(item.id, true);
    try {
      // حذف فعلي (قواعدك تسمح للمالك/الأدمن)
      await db.collection('listings').doc(item.id).delete();
    } catch (e) {
      console.error(e);
      alert('تعذر حذف الإعلان. تأكد من الصلاحيات أو حاول لاحقاً.');
    } finally {
      setBusy(item.id, false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <h1>إعلاناتي</h1>
        <Link href="/add" className="btn btnPrimary">
          + أضف إعلاناً جديداً
        </Link>
      </div>

      {(loading || fetching) && (
        <div className="card loading-container">
          <div className="spinner"></div>
          <p>جاري تحميل إعلاناتك...</p>
        </div>
      )}

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

      {error && (
        <div
          className="card"
          style={{
            border: '1px solid #fecaca',
            background: '#fef2f2',
            marginTop: '12px',
          }}
        >
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

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

      {user && !fetching && !error && items.length > 0 && (
        <div className="my-listings-container">
          <div className="listings-stats">
            <div className="stat-item">
              <span className="stat-label">عدد الإعلانات:</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">نشطة:</span>
              <span className="stat-value">{stats.active}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">تم البيع:</span>
              <span className="stat-value">{stats.sold}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">مخفية/محذوفة:</span>
              <span className="stat-value">{stats.hidden}</span>
            </div>
          </div>

          <div className="listings-grid">
            {items.map((item) => {
              const isSold = String(item.status || '').toLowerCase() === 'sold';
              const isHidden = item.hidden === true;
              const isInactive = item.isActive === false;
              const isBusy = !!busyMap[item.id];

              return (
                <div key={item.id} className="listing-card">
                  <div className="listing-header">
                    <div className="listing-info">
                      <h3 className="listing-title">
                        {item.title || 'إعلان بدون عنوان'}

                        {isSold && (
                          <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                            تم البيع
                          </span>
                        )}

                        {isHidden && (
                          <span className="status-badge status-hidden">محذوف</span>
                        )}

                        {!isHidden && isInactive && (
                          <span className="status-badge status-inactive">مخفي</span>
                        )}

                        {!isSold && !isHidden && !isInactive && (
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
                      onClick={() => toggleSold(item)}
                      disabled={isBusy}
                      style={{
                        background: isSold ? '#fef3c7' : '#dcfce7',
                        color: isSold ? '#92400e' : '#166534',
                        borderColor: isSold ? '#fde68a' : '#bbf7d0',
                      }}
                    >
                      {isBusy ? '...' : isSold ? '↩️ إلغاء البيع' : '✅ تم البيع'}
                    </button>

                    <button
                      className="btn"
                      onClick={() => toggleActive(item)}
                      disabled={isBusy}
                      style={{
                        background: isInactive ? '#dbeafe' : '#f1f5f9',
                        color: '#1e293b',
                        borderColor: '#e2e8f0',
                      }}
                    >
                      {isBusy ? '...' : isInactive ? '👁️ إظهار' : '🙈 إخفاء'}
                    </button>

                    <button
                      className="btn"
                      disabled={isBusy}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        borderColor: '#fecaca',
                      }}
                      onClick={() => deleteListing(item)}
                    >
                      {isBusy ? '...' : '🗑️ حذف'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
