'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

// إعداد إيميلات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com',
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function AdminPage() {
  const { user, loading } = useAuth();
  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('listings');
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    hiddenListings: 0,
    totalCategories: 0,
    activeCategories: 0,
  });

  // جلب الإحصائيات
  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        const listingsSnapshot = await db.collection('listings').get();
        const categoriesSnapshot = await db.collection('categories').get();

        const allListings = listingsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allCategories = categoriesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        setStats({
          totalListings: allListings.length,
          activeListings: allListings.filter((l) => !l.hidden && l.isActive !== false).length,
          hiddenListings: allListings.filter((l) => l.hidden).length,
          totalCategories: allCategories.length,
          activeCategories: allCategories.filter((c) => c.active !== false).length,
        });

        setLoadingStats(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  // جلب الإعلانات
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(80)
      .onSnapshot(
        (snap) => {
          const listingsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setListings(listingsData);
          setFilteredListings(listingsData);
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

  // تصفية الإعلانات عند البحث
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredListings(listings);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = listings.filter(
      (listing) =>
        (listing.title && listing.title.toLowerCase().includes(term)) ||
        (listing.userEmail && listing.userEmail.toLowerCase().includes(term)) ||
        (listing.category && String(listing.category).toLowerCase().includes(term)) ||
        (listing.city && String(listing.city).toLowerCase().includes(term))
    );
    setFilteredListings(filtered);
  }, [searchTerm, listings]);

  // حذف إعلان
  const deleteListing = async (id) => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية حذف الإعلانات');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;

    try {
      await db.collection('listings').doc(id).delete();
      alert('تم حذف الإعلان بنجاح');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('حدث خطأ أثناء حذف الإعلان');
    }
  };

  // حظر مستخدم
  const blockUser = async (uid, userEmailForMsg) => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية حظر المستخدمين');
      return;
    }
    if (!uid) return alert('لا يوجد UID لهذا الإعلان');
    if (!confirm(`هل تريد حظر المستخدم ${userEmailForMsg || uid}؟`)) return;

    try {
      await db
        .collection('blocked_users')
        .doc(uid)
        .set(
          {
            uid,
            userEmail: userEmailForMsg || null,
            blockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            blockedBy: user?.email || null,
          },
          { merge: true }
        );
      alert('تم حظر المستخدم بنجاح');
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('حدث خطأ أثناء حظر المستخدم');
    }
  };

  // إخفاء / إظهار إعلان
  const toggleListingHidden = async (listing) => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية تعديل حالة الإعلانات');
      return;
    }
    if (!listing?.id) return;

    const newState = !listing.hidden;
    try {
      await db.collection('listings').doc(listing.id).update({
        hidden: newState,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert(newState ? 'تم إخفاء الإعلان' : 'تم إظهار الإعلان');
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('حدث خطأ أثناء تعديل حالة الإعلان');
    }
  };

  // إضافة قسم
  const addCategory = async () => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية إضافة الأقسام');
      return;
    }

    const name = newCatName.trim();
    const slug = newCatSlug.trim().toLowerCase().replace(/\s+/g, '-');

    if (!name) return alert('يرجى إدخال اسم القسم');
    if (!slug) return alert('يرجى إدخال الرابط (Slug) للقسم');

    // التحقق من عدم التكرار
    const nameL = name.toLowerCase();
    const existingCategory = categories.find((c) => {
      const cSlug = String(c.slug || '').toLowerCase();
      const cName = String(c.name || '').toLowerCase();
      return cSlug === slug || cName === nameL;
    });

    if (existingCategory) {
      alert('هذا القسم موجود بالفعل!');
      return;
    }

    try {
      await db.collection('categories').add({
        name,
        slug,
        active: true,
        order: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setNewCatName('');
      setNewCatSlug('');
      alert('تم إضافة القسم بنجاح');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('حدث خطأ أثناء إضافة القسم');
    }
  };

  // تفعيل / إخفاء قسم ✅ (تصحيح: undefined تعتبر نشط)
  const toggleCategory = async (category) => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية تعديل الأقسام');
      return;
    }

    try {
      const currentActive = category?.active !== false; // undefined = نشط
      const newActive = !currentActive;

      await db
        .collection('categories')
        .doc(category.id)
        .update({
          active: newActive,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      alert(`تم ${newActive ? 'تفعيل' : 'إخفاء'} القسم بنجاح`);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('حدث خطأ أثناء تعديل القسم');
    }
  };

  // حذف قسم
  const deleteCategory = async (category) => {
    if (!isAdmin) {
      alert('ليست لديك صلاحية حذف الأقسام');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;

    try {
      await db.collection('categories').doc(category.id).delete();
      alert('تم حذف القسم بنجاح');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('حدث خطأ أثناء حذف القسم');
    }
  };

  // تحويل التاريخ
  const formatDate = (timestamp) => {
    if (!timestamp) return 'غير معروف';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // إحصائيات
  const StatCard = ({ title, value, icon, color }) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
      </div>
    </div>
  );

  return (
    <>
      <Header />

      <div className="admin-container">
        <div className="admin-header">
          <div className="header-left">
            <Link className="back-button" href="/">
              ← رجوع للرئيسية
            </Link>
            <h1 className="page-title">لوحة إدارة سوق اليمن</h1>
          </div>
          <div className="admin-badge">
            <span className="badge-text">لوحة الإدارة</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : null}

        {/* رسالة لغير الأدمن */}
        {!loading && !isAdmin ? (
          <div className="access-denied">
            <div className="denied-icon">🚫</div>
            <h2>وصول مرفوض</h2>
            <p>هذه الصفحة خاصة بمدير الموقع فقط.</p>
            <div className="user-info">
              <p>
                أنت مسجل كبريد: <strong>{user?.email || 'غير مسجل دخول'}</strong>
              </p>
              <p className="info-note">يجب أن يكون البريد من ضمن قائمة المدراء التالية:</p>
              <ul className="admin-list">
                {ADMIN_EMAILS.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {isAdmin && !loading && (
          <>
            {/* إحصائيات سريعة */}
            <div className="stats-grid">
              <StatCard title="إجمالي الإعلانات" value={loadingStats ? '...' : stats.totalListings} icon="📊" color="#3B82F6" />
              <StatCard title="إعلانات نشطة" value={loadingStats ? '...' : stats.activeListings} icon="✅" color="#10B981" />
              <StatCard title="إعلانات مخفية" value={loadingStats ? '...' : stats.hiddenListings} icon="👁️‍🗨️" color="#F59E0B" />
              <StatCard
                title="الأقسام النشطة"
                value={loadingStats ? '...' : `${stats.activeCategories} / ${stats.totalCategories}`}
                icon="📂"
                color="#8B5CF6"
              />
            </div>

            {/* تبويبات التنقل */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'listings' ? 'active' : ''}`}
                onClick={() => setActiveTab('listings')}
              >
                📋 إدارة الإعلانات
              </button>
              <button
                className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                📂 إدارة الأقسام
              </button>
            </div>

            {/* قسم الإعلانات */}
            {activeTab === 'listings' && (
              <div className="management-section">
                <div className="section-header">
                  <h2>إدارة الإعلانات</h2>
                  <div className="search-box">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="ابحث في الإعلانات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon">🔍</span>
                  </div>
                </div>

                <div className="listings-container">
                  {filteredListings.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📭</div>
                      <p>لا توجد إعلانات {searchTerm && 'مطابقة لبحثك'}</p>
                    </div>
                  ) : (
                    <div className="listings-grid">
                      {filteredListings.map((listing) => (
                        <div key={listing.id} className="listing-card">
                          <div className="listing-header">
                            <h3 className="listing-title">
                              {listing.title || 'بدون عنوان'}
                              {listing.hidden && <span className="hidden-badge">مخفي</span>}
                              {listing.auctionEnabled && <span className="auction-badge">مزاد</span>}
                            </h3>
                            <span className="listing-date">{formatDate(listing.createdAt)}</span>
                          </div>

                          <div className="listing-info">
                            <div className="info-row">
                              <span className="info-label">المستخدم:</span>
                              <span className="info-value">
                                {listing.userEmail || listing.userId || 'غير معروف'}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">القسم:</span>
                              <span className="info-value">{listing.category || 'غير محدد'}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">المدينة:</span>
                              <span className="info-value">{listing.city || 'غير محدد'}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">المشاهدات:</span>
                              <span className="info-value">{listing.views || 0}</span>
                            </div>
                          </div>

                          <div className="listing-actions">
                            <Link className="action-button view-btn" href={`/listing/${listing.id}`} target="_blank">
                              👁️ عرض
                            </Link>

                            <Link className="action-button edit-btn" href={`/edit-listing/${listing.id}`}>
                              ✏️ تعديل
                            </Link>

                            <button className="action-button toggle-btn" onClick={() => toggleListingHidden(listing)}>
                              {listing.hidden ? '👁️ إظهار' : '👁️‍🗨️ إخفاء'}
                            </button>

                            <button className="action-button block-btn" onClick={() => blockUser(listing.userId, listing.userEmail)}>
                              🚫 حظر
                            </button>

                            <button className="action-button delete-btn" onClick={() => deleteListing(listing.id)}>
                              🗑️ حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* قسم الأقسام */}
            {activeTab === 'categories' && (
              <div className="management-section">
                <div className="section-header">
                  <h2>إدارة الأقسام</h2>
                  <p className="section-subtitle">إضافة وتعديل أقسام الموقع</p>
                </div>

                {/* نموذج إضافة قسم جديد */}
                <div className="add-category-form">
                  <div className="form-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="اسم القسم (مثال: سيارات)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="الرابط (Slug) مثال: cars"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                    />
                    <button className="add-button" onClick={addCategory}>
                      ➕ إضافة قسم
                    </button>
                  </div>
                </div>

                {/* قائمة الأقسام */}
                <div className="categories-list">
                  {categories.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📂</div>
                      <p>لا توجد أقسام بعد</p>
                    </div>
                  ) : (
                    categories.map((category) => (
                      <div key={category.id} className="category-card">
                        <div className="category-info">
                          <div className="category-header">
                            <h3 className="category-name">
                              {category.name}
                              <span className="category-status">
                                {category.active !== false ? (
                                  <span className="status-active">✅ نشط</span>
                                ) : (
                                  <span className="status-inactive">👁️‍🗨️ مخفي</span>
                                )}
                              </span>
                            </h3>
                            <span className="category-slug">/{category.slug}</span>
                          </div>
                          <div className="category-meta">
                            <span className="meta-item">تاريخ الإضافة: {formatDate(category.createdAt)}</span>
                          </div>
                        </div>

                        <div className="category-actions">
                          <button className="action-button toggle-btn" onClick={() => toggleCategory(category)}>
                            {category.active !== false ? '👁️‍🗨️ إخفاء' : '✅ تفعيل'}
                          </button>
                          <button className="action-button delete-btn" onClick={() => deleteCategory(category)}>
                            🗑️ حذف
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
