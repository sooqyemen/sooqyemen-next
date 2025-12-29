// app/admin/page.js
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading } = useAuth();

  // 👈 مؤقتاً: أي مستخدم مسجّل دخول يعتبر أدمن
  const isAdmin = !!user?.uid;

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  // جلب الإعلانات
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(80)
      .onSnapshot(
        (snap) => {
          setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error('listings error:', err);
        }
      );
    return () => unsub();
  }, [isAdmin]);

  // جلب الأقسام
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db
      .collection('categories')
      .orderBy('order', 'asc')
      .onSnapshot(
        (snap) => {
          setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error('categories error:', err);
        }
      );
    return () => unsub();
  }, [isAdmin]);

  // حذف إعلان
  const delListing = async (id) => {
    if (!confirm('حذف الإعلان؟')) return;
    await db.collection('listings').doc(id).delete();
  };

  // حظر مستخدم
  const blockUser = async (uid) => {
    if (!uid) return;
    if (!confirm('حظر هذا المستخدم؟')) return;
    await db
      .collection('blocked_users')
      .doc(uid)
      .set(
        {
          uid,
          blockedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    alert('تم حظر المستخدم');
  };

  // إخفاء / إظهار إعلان
  const toggleListingHidden = async (listing) => {
    if (!listing?.id) return;
    const newState = !listing.hidden;
    await db.collection('listings').doc(listing.id).update({
      hidden: newState,
    });
    alert(newState ? 'تم إخفاء الإعلان' : 'تم إظهار الإعلان');
  };

  // إضافة قسم
  const addCategory = async () => {
    const name = newCatName.trim();
    const slug = newCatSlug.trim();
    if (!name || !slug) return alert('اكتب الاسم والـ slug');
    await db.collection('categories').add({
      name,
      slug,
      active: true,
      order: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setNewCatName('');
    setNewCatSlug('');
  };

  // تفعيل / إخفاء قسم
  const toggleCategory = async (c) => {
    await db
      .collection('categories')
      .doc(c.id)
      .update({ active: !(c.active !== false) });
  };

  // حذف قسم
  const delCategory = async (c) => {
    if (!confirm('حذف القسم؟')) return;
    await db.collection('categories').doc(c.id).delete();
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">لوحة الإدارة</span>
        </div>

        {loading ? (
          <div className="card muted" style={{ marginTop: 12 }}>
            جاري التحميل...
          </div>
        ) : null}

        {!loading && !isAdmin ? (
          <div className="card" style={{ marginTop: 12 }}>
            هذه الصفحة للأعضاء المسجلين فقط، يرجى تسجيل الدخول أولاً.
          </div>
        ) : null}

        {isAdmin ? (
          <div
            className="grid"
            style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12, gap: 12 }}
          >
            {/* إدارة الأقسام */}
            <div className="card">
              <div style={{ fontWeight: 900 }}>الأقسام</div>
              <div
                className="row"
                style={{ marginTop: 10, gap: 6, flexWrap: 'wrap' }}
              >
                <input
                  className="input"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="اسم القسم"
                />
                <input
                  className="input"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="slug مثال: solar"
                />
                <button className="btn btnPrimary" onClick={addCategory}>
                  إضافة
                </button>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {categories.length === 0 ? (
                  <div className="muted">لا توجد أقسام بعد</div>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.id}
                      className="row"
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {c.name}{' '}
                          <span className="muted">({c.slug})</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {c.active !== false ? 'نشط' : 'مخفي'}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className="btn"
                          onClick={() => toggleCategory(c)}
                        >
                          {c.active !== false ? 'إخفاء' : 'تفعيل'}
                        </button>
                        <button
                          className="btn"
                          onClick={() => delCategory(c)}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* إدارة الإعلانات */}
            <div className="card">
              <div style={{ fontWeight: 900 }}>آخر الإعلانات</div>
              <div
                className="muted"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                حذف / إخفاء / حظر مستخدم
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {listings.length === 0 ? (
                  <div className="muted">لا توجد إعلانات</div>
                ) : (
                  listings.map((l) => (
                    <div
                      key={l.id}
                      className="card"
                      style={{ padding: 10 }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {l.title || 'بدون عنوان'}
                        {l.hidden ? (
                          <span
                            className="badge"
                            style={{
                              marginRight: 8,
                              background: '#fca5a5',
                              color: '#7f1d1d',
                            }}
                          >
                            مخفي
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: 12 }}
                      >
                        المستخدم: {l.userEmail || l.userId || 'غير معروف'}
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
                          فتح
                        </Link>
                        {/* لو حبيت تضيف صفحة تعديل لاحقاً */}
                        {/* <Link className="btn" href={`/admin/edit-listing/${l.id}`}>تعديل</Link> */}
                        <button
                          className="btn"
                          onClick={() => delListing(l.id)}
                        >
                          حذف
                        </button>
                        <button
                          className="btn"
                          onClick={() => blockUser(l.userId)}
                        >
                          حظر المستخدم
                        </button>
                        <button
                          className="btn"
                          onClick={() => toggleListingHidden(l)}
                        >
                          {l.hidden ? 'إظهار' : 'إخفاء'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
