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

  // UI
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
        (snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('listings error:', err)
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
        (snap) => setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error('categories error:', err)
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
    if (!uid) return alert('لا يوجد UID لهذا الإعلان');
    if (!confirm('حظر هذا المستخدم؟')) return;

    await db
      .collection('blocked_users')
      .doc(uid)
      .set(
        { uid, blockedAt: firebase.firestore.FieldValue.serverTimestamp() },
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

      <div className="adminPage">
        <div className="adminShell">
          {/* Topbar */}
          <div className="adminTopbar">
            <div className="adminTopLeft">
              <Link href="/" className="aBtn aBtnGhost">
                ← رجوع
              </Link>
              <div className="adminTitle">
                لوحة الإدارة <span className="adminPath">/admin</span>
              </div>
            </div>

            <div className="adminTopRight">
              <div className="adminUserBox">
                <span className="muted">الحساب:</span>{' '}
                <b>{user?.email || 'غير مسجل دخول'}</b>
              </div>
            </div>
          </div>

          {loading ? <div className="aCard">جاري التحميل...</div> : null}

          {!loading && !isAdmin ? (
            <div className="aCard">
              <div className="aH2">هذه الصفحة خاصة بمدير الموقع فقط.</div>
              <div className="aP">
                أنت مسجل كبريد: <b>{user?.email || 'غير مسجل دخول'}</b>
              </div>

              <div className="aP muted" style={{ marginTop: 8 }}>
                يجب أن يكون البريد من ضمن قائمة المدراء التالية:
              </div>

              <ul className="aList">
                {ADMIN_EMAILS.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {isAdmin ? (
            <>
              {/* Tabs */}
              <div className="aCard aCardCompact">
                <div className="adminTabs">
                  <button
                    className={`aTab ${tab === 'listings' ? 'aTabActive' : ''}`}
                    onClick={() => setTab('listings')}
                  >
                    الإعلانات <span className="aChip">{listings.length}</span>
                  </button>

                  <button
                    className={`aTab ${tab === 'categories' ? 'aTabActive' : ''}`}
                    onClick={() => setTab('categories')}
                  >
                    الأقسام <span className="aChip">{categories.length}</span>
                  </button>

                  {tab === 'listings' ? (
                    <div className="adminFilters">
                      <input
                        className="aInput"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ابحث بالعنوان أو البريد أو UID..."
                      />
                      <label className="aCheck">
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
              </div>

              {/* Content */}
              {tab === 'categories' ? (
                <div className="aCard">
                  <div className="aHeaderRow">
                    <div>
                      <div className="aH2">إدارة الأقسام</div>
                      <div className="aP muted">إضافة / إخفاء / تفعيل / حذف</div>
                    </div>

                    <div className="adminCatForm">
                      <input
                        className="aInput"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="اسم القسم"
                      />
                      <input
                        className="aInput"
                        value={newCatSlug}
                        onChange={(e) => setNewCatSlug(e.target.value)}
                        placeholder="slug مثال: solar"
                      />
                      <button className="aBtn aBtnPrimary" onClick={addCategory}>
                        إضافة
                      </button>
                    </div>
                  </div>

                  <div className="adminList">
                    {categories.length === 0 ? (
                      <div className="muted">لا توجد أقسام بعد</div>
                    ) : (
                      categories.map((c) => (
                        <div key={c.id} className="aItem">
                          <div className="aItemMain">
                            <div className="aItemTitle">
                              {c.name} <span className="muted">({c.slug})</span>
                            </div>
                            <div className="aBadges">
                              {c.active !== false ? (
                                <span className="aBadge aBadgeOk">نشط</span>
                              ) : (
                                <span className="aBadge">مخفي</span>
                              )}
                            </div>
                          </div>

                          <div className="aItemActions">
                            <button
                              className={`aBtn ${c.active !== false ? 'aBtnSoft' : 'aBtnOk'}`}
                              onClick={() => toggleCategory(c)}
                            >
                              {c.active !== false ? 'إخفاء' : 'تفعيل'}
                            </button>
                            <button className="aBtn aBtnDanger" onClick={() => delCategory(c)}>
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
                <div className="aCard">
                  <div className="aHeaderRow">
                    <div>
                      <div className="aH2">آخر الإعلانات</div>
                      <div className="aP muted">عرض / تعديل / حذف / إخفاء أو حظر مستخدم</div>
                    </div>
                    <div className="muted">
                      المعروض الآن: <b>{filteredListings.length}</b>
                    </div>
                  </div>

                  <div className="adminList">
                    {filteredListings.length === 0 ? (
                      <div className="muted">لا توجد إعلانات</div>
                    ) : (
                      filteredListings.map((l) => (
                        <div key={l.id} className="aItem aItemTall">
                          <div className="aItemMain">
                            <div className="aItemTitleRow">
                              <div className="aItemTitle">{l.title || 'بدون عنوان'}</div>
                              {l.hidden ? (
                                <span className="aBadge aBadgeDanger">مخفي</span>
                              ) : (
                                <span className="aBadge aBadgeOk">ظاهر</span>
                              )}
                            </div>

                            <div className="aMeta">
                              <div>
                                <span className="muted">المستخدم:</span>{' '}
                                <b>{l.userEmail || l.userId || 'غير معروف'}</b>
                              </div>
                              {l.createdAt ? (
                                <div className="muted">التاريخ: {fmtDate(l.createdAt)}</div>
                              ) : null}
                              <div className="muted">ID: <span className="mono">{l.id}</span></div>
                              <div className="muted">UID: <span className="mono">{l.userId || '-'}</span></div>
                              <div className="muted">
                                القسم: <b>{l.category || l.categorySlug || '-'}</b>
                              </div>
                            </div>
                          </div>

                          <div className="aItemActions">
                            <Link className="aBtn aBtnSoft" href={`/listing/${l.id}`}>
                              عرض
                            </Link>
                            <Link className="aBtn aBtnInfo" href={`/edit-listing/${l.id}`}>
                              تعديل
                            </Link>
                            <button className="aBtn aBtnDark" onClick={() => toggleListingHidden(l)}>
                              {l.hidden ? 'إظهار' : 'إخفاء'}
                            </button>
                            <button className="aBtn aBtnWarn" onClick={() => blockUser(l.userId)}>
                              حظر المستخدم
                            </button>
                            <button className="aBtn aBtnDanger" onClick={() => delListing(l.id)}>
                              حذف
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        .adminPage {
          background: #f6f7fb;
          min-height: calc(100vh - 70px);
          padding: 14px 0 40px;
        }
        .adminShell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 12px;
        }

        .adminTopbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .adminTopLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .adminTitle {
          background: #111827;
          color: #fff;
          padding: 10px 12px;
          border-radius: 14px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .adminPath {
          background: rgba(255, 255, 255, 0.12);
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
        }
        .adminUserBox {
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 13px;
        }

        .aCard {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 6px 20px rgba(17, 24, 39, 0.04);
          margin-top: 12px;
        }
        .aCardCompact {
          padding: 10px;
        }

        .aHeaderRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .aH2 {
          font-weight: 950;
          font-size: 16px;
        }
        .aP {
          font-size: 13px;
          margin-top: 4px;
        }
        .muted {
          color: #6b7280;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
        }
        .aList {
          margin-top: 8px;
          padding-right: 18px;
          color: #4b5563;
          font-size: 12px;
        }

        .adminTabs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .adminFilters {
          margin-right: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 240px;
          flex-wrap: wrap;
        }

        .aTab {
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          padding: 10px 12px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 900;
          font-size: 13px;
        }
        .aTabActive {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }
        .aChip {
          background: rgba(255, 255, 255, 0.14);
          color: inherit;
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 900;
          margin-right: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .aTab:not(.aTabActive) .aChip {
          background: #fff;
          border: 1px solid #e5e7eb;
          color: #111827;
        }

        .aInput {
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 10px 12px;
          border-radius: 14px;
          outline: none;
          font-size: 13px;
          min-width: 220px;
        }
        .aInput:focus {
          border-color: #9ca3af;
        }

        .aCheck {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
        }

        .adminCatForm {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: center;
          min-width: min(760px, 100%);
        }

        .adminList {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }

        .aItem {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          background: #fff;
        }
        .aItemTall {
          align-items: flex-start;
        }
        .aItemMain {
          min-width: 260px;
          flex: 1;
        }
        .aItemTitle {
          font-weight: 950;
          font-size: 14px;
        }
        .aItemTitleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .aMeta {
          margin-top: 8px;
          display: grid;
          gap: 6px;
          font-size: 12px;
        }
        .aBadges {
          margin-top: 6px;
        }
        .aBadge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          color: #111827;
        }
        .aBadgeOk {
          background: #dcfce7;
          border-color: #86efac;
          color: #166534;
        }
        .aBadgeDanger {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #7f1d1d;
        }

        .aItemActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        .aBtn {
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 9px 12px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 900;
          font-size: 13px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: transform 0.05s ease, background 0.15s ease, border-color 0.15s ease;
          user-select: none;
        }
        .aBtn:hover {
          transform: translateY(-1px);
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .aBtnGhost {
          background: #fff;
        }
        .aBtnPrimary {
          background: #111827;
          border-color: #111827;
          color: #fff;
        }
        .aBtnPrimary:hover {
          background: #000;
          border-color: #000;
        }
        .aBtnSoft {
          background: #f3f4f6;
        }
        .aBtnInfo {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }
        .aBtnInfo:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }
        .aBtnDark {
          background: #111827;
          border-color: #111827;
          color: #fff;
        }
        .aBtnDark:hover {
          background: #000;
          border-color: #000;
        }
        .aBtnWarn {
          background: #f97316;
          border-color: #f97316;
          color: #fff;
        }
        .aBtnWarn:hover {
          background: #ea580c;
          border-color: #ea580c;
        }
        .aBtnDanger {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }
        .aBtnDanger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        .aBtnOk {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
        }
        .aBtnOk:hover {
          background: #15803d;
          border-color: #15803d;
        }

        @media (max-width: 900px) {
          .adminCatForm {
            grid-template-columns: 1fr;
          }
          .aInput {
            min-width: 100%;
          }
          .adminFilters {
            min-width: 100%;
          }
        }
      `}</style>
    </>
  );
}
