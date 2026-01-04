// app/admin/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';

// إعداد إيميلات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com', // احذف هذا السطر لو ما تريده أدمن
];

const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function fmtDate(ts) {
  try {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ar-SA');
  } catch {
    return '';
  }
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');

  // UI state
  const [tab, setTab] = useState('listings'); // listings | categories
  const [q, setQ] = useState('');
  const [onlyHidden, setOnlyHidden] = useState(false);

  const filteredListings = useMemo(() => {
    const query = q.trim().toLowerCase();
    return listings.filter((l) => {
      if (onlyHidden && !l.hidden) return false;
      if (!query) return true;
      const title = (l.title || '').toLowerCase();
      const email = (l.userEmail || '').toLowerCase();
      const uid = (l.userId || '').toLowerCase();
      return title.includes(query) || email.includes(query) || uid.includes(query);
    });
  }, [listings, q, onlyHidden]);

  // جلب الإعلانات
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(120)
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
    if (!isAdmin) return alert('ليست لديك صلاحية حذف الإعلانات');
    if (!confirm('حذف الإعلان؟')) return;
    await db.collection('listings').doc(id).delete();
  };

  // حظر مستخدم
  const blockUser = async (uid) => {
    if (!isAdmin) return alert('ليست لديك صلاحية حظر المستخدمين');
    if (!uid) return alert('لا يوجد UID للمستخدم في هذا الإعلان');
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
    if (!isAdmin) return alert('ليست لديك صلاحية تعديل حالة الإعلانات');
    if (!listing?.id) return;
    const newState = !listing.hidden;
    await db.collection('listings').doc(listing.id).update({ hidden: newState });
  };

  // إضافة قسم
  const addCategory = async () => {
    if (!isAdmin) return alert('ليست لديك صلاحية إضافة الأقسام');
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
    if (!isAdmin) return alert('ليست لديك صلاحية تعديل الأقسام');
    await db.collection('categories').doc(c.id).update({ active: !(c.active !== false) });
  };

  // حذف قسم
  const delCategory = async (c) => {
    if (!isAdmin) return alert('ليست لديك صلاحية حذف الأقسام');
    if (!confirm('حذف القسم؟')) return;
    await db.collection('categories').doc(c.id).delete();
  };

  return (
    <>
      <Header />

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4">
        {/* Topbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              ← رجوع
            </Link>

            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white">
              لوحة الإدارة
              <span className="rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold">
                /admin
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm">
              <span className="text-gray-500">الحساب:</span>{' '}
              <span className="font-semibold">{user?.email || 'غير مسجل دخول'}</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            جاري التحميل...
          </div>
        ) : null}

        {/* Not admin */}
        {!loading && !isAdmin ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-base font-black">هذه الصفحة خاصة بمدير الموقع فقط.</div>
            <div className="mt-2 text-sm text-gray-600">
              أنت مسجل كبريد: <span className="font-semibold">{user?.email || 'غير مسجل دخول'}</span>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              يجب أن يكون البريد من ضمن قائمة المدراء التالية:
            </div>

            <ul className="mt-2 list-disc pr-5 text-xs text-gray-600">
              {ADMIN_EMAILS.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Admin UI */}
        {isAdmin ? (
          <div className="mt-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2">
              <button
                onClick={() => setTab('listings')}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-bold',
                  tab === 'listings'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                )}
              >
                الإعلانات
                <span className="mr-2 rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold">
                  {listings.length}
                </span>
              </button>

              <button
                onClick={() => setTab('categories')}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-bold',
                  tab === 'categories'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                )}
              >
                الأقسام
                <span className="mr-2 rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold">
                  {categories.length}
                </span>
              </button>

              {tab === 'listings' ? (
                <div className="mr-auto flex flex-1 flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="ابحث بالعنوان أو البريد أو UID..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyHidden}
                      onChange={(e) => setOnlyHidden(e.target.checked)}
                    />
                    المخفي فقط
                  </label>
                </div>
              ) : null}
            </div>

            {/* Panels */}
            {tab === 'categories' ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-base font-black">إدارة الأقسام</div>
                    <div className="mt-1 text-xs text-gray-500">
                      إضافة / إخفاء / تفعيل / حذف
                    </div>
                  </div>

                  <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
                    <input
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="اسم القسم"
                    />
                    <input
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      placeholder="slug مثال: solar"
                    />
                    <button
                      onClick={addCategory}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {categories.length === 0 ? (
                    <div className="text-sm text-gray-500">لا توجد أقسام بعد</div>
                  ) : (
                    categories.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col gap-2 rounded-2xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-sm font-extrabold">
                            {c.name}{' '}
                            <span className="text-xs font-semibold text-gray-500">
                              ({c.slug})
                            </span>
                          </div>

                          <div className="mt-1 text-xs">
                            {c.active !== false ? (
                              <span className="rounded-lg bg-green-100 px-2 py-0.5 font-semibold text-green-800">
                                نشط
                              </span>
                            ) : (
                              <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                                مخفي
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleCategory(c)}
                            className={cn(
                              'rounded-xl px-4 py-2 text-sm font-bold',
                              c.active !== false
                                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            )}
                          >
                            {c.active !== false ? 'إخفاء' : 'تفعيل'}
                          </button>

                          <button
                            onClick={() => delCategory(c)}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'listings' ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-base font-black">آخر الإعلانات</div>
                    <div className="mt-1 text-xs text-gray-500">
                      عرض / تعديل / حذف / إخفاء أو حظر مستخدم
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    المعروض الآن: <span className="font-bold">{filteredListings.length}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {filteredListings.length === 0 ? (
                    <div className="text-sm text-gray-500">لا توجد إعلانات</div>
                  ) : (
                    filteredListings.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-2xl border border-gray-200 p-3 hover:border-gray-300"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-extrabold">
                                {l.title || 'بدون عنوان'}
                              </div>

                              {l.hidden ? (
                                <span className="rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                                  مخفي
                                </span>
                              ) : (
                                <span className="rounded-lg bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
                                  ظاهر
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-gray-600">
                              <span className="text-gray-500">المستخدم:</span>{' '}
                              <span className="font-semibold">
                                {l.userEmail || l.userId || 'غير معروف'}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-gray-500">
                              {l.createdAt ? (
                                <>
                                  <span className="font-semibold">تاريخ:</span> {fmtDate(l.createdAt)}
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Link
                              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-200"
                              href={`/listing/${l.id}`}
                            >
                              عرض
                            </Link>

                            <Link
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                              href={`/edit-listing/${l.id}`}
                            >
                              تعديل
                            </Link>

                            <button
                              className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-bold text-white hover:bg-black"
                              onClick={() => toggleListingHidden(l)}
                            >
                              {l.hidden ? 'إظهار' : 'إخفاء'}
                            </button>

                            <button
                              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
                              onClick={() => blockUser(l.userId)}
                            >
                              حظر المستخدم
                            </button>

                            <button
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                              onClick={() => delListing(l.id)}
                            >
                              حذف
                            </button>
                          </div>
                        </div>

                        {/* معلومات إضافية صغيرة */}
                        <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                          <div className="rounded-xl bg-gray-50 p-2">
                            <span className="text-gray-500">ID:</span>{' '}
                            <span className="font-mono">{l.id}</span>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-2">
                            <span className="text-gray-500">UID:</span>{' '}
                            <span className="font-mono">{l.userId || '-'}</span>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-2">
                            <span className="text-gray-500">القسم:</span>{' '}
                            <span className="font-semibold">{l.category || l.categorySlug || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
