'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// ✅ إيميلات المدراء
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ar-YE');
  } catch {
    return '—';
  }
}

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString('ar-YE');
}

export default function AdminPage() {
  const { user, loading } = useAuth();

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [tab, setTab] = useState('listings'); // listings | users

  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);

  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  // ✅ جلب الإعلانات
  useEffect(() => {
    if (!isAdmin) return;

    const qy = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListings(data);
      },
      (e) => setError(e?.message || 'فشل تحميل الإعلانات')
    );

    return () => unsub();
  }, [isAdmin]);

  // ✅ جلب المستخدمين
  useEffect(() => {
    if (!isAdmin) return;

    // إذا مجموعتك اسمها users فهذا صحيح. إذا اسمها مختلف قلّي.
    const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(data);
      },
      (e) => setError(e?.message || 'فشل تحميل المستخدمين')
    );

    return () => unsub();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter((x) => x.isActive !== false).length;
    const hidden = listings.filter((x) => x.hidden === true).length;
    const auctions = listings.filter((x) => x.auctionEnabled === true).length;
    return { total, active, hidden, auctions };
  }, [listings]);

  async function toggleHidden(listingId, currentHidden) {
    setBusyId(listingId);
    setError('');
    try {
      await updateDoc(doc(db, 'listings', listingId), { hidden: !currentHidden });
    } catch (e) {
      setError(e?.message || 'فشل تحديث حالة الإخفاء');
    } finally {
      setBusyId('');
    }
  }

  async function toggleActive(listingId, currentActive) {
    setBusyId(listingId);
    setError('');
    try {
      await updateDoc(doc(db, 'listings', listingId), { isActive: !currentActive });
    } catch (e) {
      setError(e?.message || 'فشل تحديث حالة التفعيل');
    } finally {
      setBusyId('');
    }
  }

  async function deleteListing(listingId) {
    const ok = window.confirm('حذف الإعلان نهائياً؟ هذا لا يمكن التراجع عنه.');
    if (!ok) return;

    setBusyId(listingId);
    setError('');
    try {
      await deleteDoc(doc(db, 'listings', listingId));
    } catch (e) {
      setError(e?.message || 'فشل حذف الإعلان');
    } finally {
      setBusyId('');
    }
  }

  async function setUserFlag(userId, key, value) {
    setBusyId(userId);
    setError('');
    try {
      await updateDoc(doc(db, 'users', userId), { [key]: value });
    } catch (e) {
      setError(e?.message || 'فشل تحديث المستخدم');
    } finally {
      setBusyId('');
    }
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="card">جاري التحميل…</div>
        <Style />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap">
        <div className="card">
          <h1 className="title">لوحة الإدارة</h1>
          <p className="muted">يجب تسجيل الدخول أولاً.</p>
          <Link className="btn" href="/login">تسجيل الدخول</Link>
        </div>
        <Style />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="wrap">
        <div className="card">
          <h1 className="title">غير مصرح</h1>
          <p className="muted">حسابك ليس ضمن قائمة المدراء.</p>
          <Link className="btn" href="/">العودة للرئيسية</Link>
        </div>
        <Style />
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1 className="title">لوحة الإدارة</h1>
          <p className="muted">إدارة الإعلانات والمستخدمين</p>
        </div>

        <div className="tabs">
          <button
            className={`tab ${tab === 'listings' ? 'active' : ''}`}
            onClick={() => setTab('listings')}
          >
            الإعلانات
          </button>
          <button
            className={`tab ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            المستخدمون
          </button>
        </div>
      </div>

      {error ? <div className="error">⚠️ {error}</div> : null}

      {tab === 'listings' ? (
        <>
          <div className="stats">
            <div className="stat">
              <div className="statNum">{stats.total}</div>
              <div className="statLbl">الإجمالي</div>
            </div>
            <div className="stat">
              <div className="statNum">{stats.active}</div>
              <div className="statLbl">نشط</div>
            </div>
            <div className="stat">
              <div className="statNum">{stats.hidden}</div>
              <div className="statLbl">مخفي</div>
            </div>
            <div className="stat">
              <div className="statNum">{stats.auctions}</div>
              <div className="statLbl">مزاد</div>
            </div>
          </div>

          <div className="tableCard">
            <div className="tableHead">
              <div>العنوان</div>
              <div>السعر (YER)</div>
              <div>المدينة</div>
              <div>الحالة</div>
              <div>تاريخ</div>
              <div>إجراءات</div>
            </div>

            {listings.map((l) => {
              const active = l.isActive !== false;
              const hidden = l.hidden === true;

              return (
                <div className="row" key={l.id}>
                  <div className="cell titleCell">
                    <div className="t1">{l.title || 'بدون عنوان'}</div>
                    <div className="t2">
                      <Link className="link" href={`/listing/${l.id}`} target="_blank">
                        فتح الإعلان
                      </Link>
                      {l.auctionEnabled ? <span className="badge">⚡ مزاد</span> : null}
                    </div>
                  </div>

                  <div className="cell">{money(l.priceYER || l.currentBidYER || 0)}</div>
                  <div className="cell">{l.city || '—'}</div>

                  <div className="cell">
                    <span className={`pill ${active ? 'ok' : 'off'}`}>
                      {active ? 'نشط' : 'موقوف'}
                    </span>
                    <span className={`pill ${hidden ? 'warn' : 'mut'}`}>
                      {hidden ? 'مخفي' : 'ظاهر'}
                    </span>
                  </div>

                  <div className="cell">{fmtDate(l.createdAt)}</div>

                  <div className="cell actions">
                    <button
                      className="btnSm"
                      disabled={busyId === l.id}
                      onClick={() => toggleHidden(l.id, hidden)}
                      title="إخفاء/إظهار"
                    >
                      {hidden ? '👁️ إظهار' : '🙈 إخفاء'}
                    </button>
                    <button
                      className="btnSm"
                      disabled={busyId === l.id}
                      onClick={() => toggleActive(l.id, active)}
                      title="تفعيل/إيقاف"
                    >
                      {active ? '⛔ إيقاف' : '✅ تفعيل'}
                    </button>
                    <Link className="btnSm" href={`/admin/edit-listing/${l.id}`}>
                      ✏️ تعديل
                    </Link>
                    <button
                      className="btnSm danger"
                      disabled={busyId === l.id}
                      onClick={() => deleteListing(l.id)}
                      title="حذف نهائي"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              );
            })}

            {listings.length === 0 ? (
              <div className="empty">لا توجد إعلانات.</div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="tableCard">
          <div className="tableHead usersHead">
            <div>المستخدم</div>
            <div>البريد</div>
            <div>تاريخ</div>
            <div>حالة</div>
            <div>إجراءات</div>
          </div>

          {users.map((u) => {
            const banned = u.isBanned === true;
            const disabled = u.isDisabled === true;

            return (
              <div className="row usersRow" key={u.id}>
                <div className="cell">
                  <div className="t1">{u.displayName || u.name || '—'}</div>
                  <div className="t2">UID: {u.id}</div>
                </div>

                <div className="cell">{u.email || '—'}</div>
                <div className="cell">{fmtDate(u.createdAt)}</div>

                <div className="cell">
                  <span className={`pill ${banned ? 'off' : 'ok'}`}>
                    {banned ? 'محظور' : 'سليم'}
                  </span>
                  <span className={`pill ${disabled ? 'warn' : 'mut'}`}>
                    {disabled ? 'معطّل' : 'مفعل'}
                  </span>
                </div>

                <div className="cell actions">
                  <button
                    className="btnSm"
                    disabled={busyId === u.id}
                    onClick={() => setUserFlag(u.id, 'isDisabled', !disabled)}
                    title="تعطيل/تفعيل"
                  >
                    {disabled ? '✅ تفعيل' : '⛔ تعطيل'}
                  </button>
                  <button
                    className="btnSm danger"
                    disabled={busyId === u.id}
                    onClick={() => setUserFlag(u.id, 'isBanned', !banned)}
                    title="حظر/إلغاء حظر"
                  >
                    {banned ? '🔓 إلغاء حظر' : '🚫 حظر'}
                  </button>
                </div>
              </div>
            );
          })}

          {users.length === 0 ? <div className="empty">لا توجد بيانات مستخدمين.</div> : null}
        </div>
      )}

      <Style />
    </div>
  );
}

function Style() {
  return (
    <style jsx>{`
      .wrap { padding: 16px; max-width: 1200px; margin: 0 auto; }
      .top { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; margin: 10px 0 14px; }
      .title { margin:0; font-size: 22px; font-weight: 900; }
      .muted { margin: 6px 0 0; opacity: .75; }

      .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
      .btn { display:inline-block; margin-top:10px; background:#2563eb; color:#fff; padding:10px 14px; border-radius:12px; text-decoration:none; font-weight:700; }

      .tabs { display:flex; gap:8px; }
      .tab { padding:10px 12px; border-radius:12px; background:#f3f4f6; border:1px solid #e5e7eb; font-weight:800; }
      .tab.active { background:#111827; color:#fff; border-color:#111827; }

      .error { margin: 10px 0; background:#fff1f2; border:1px solid #fecdd3; color:#9f1239; padding:10px 12px; border-radius:12px; font-weight:700; }

      .stats { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin: 12px 0 14px; }
      .stat { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:12px; }
      .statNum { font-weight: 900; font-size: 18px; }
      .statLbl { opacity: .75; margin-top: 2px; font-weight:700; font-size: 13px; }

      .tableCard { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; }
      .tableHead { display:grid; grid-template-columns: 2fr 1fr 1fr 1.3fr 1.2fr 2fr; gap:10px; padding:12px; background:#f9fafb; font-weight:900; border-bottom:1px solid #e5e7eb; }
      .row { display:grid; grid-template-columns: 2fr 1fr 1fr 1.3fr 1.2fr 2fr; gap:10px; padding:12px; border-bottom:1px solid #f1f5f9; align-items:center; }
      .row:last-child { border-bottom:none; }

      .usersHead, .usersRow { grid-template-columns: 1.6fr 1.4fr 1fr 1.2fr 1.6fr; }
      .usersRow { display:grid; gap:10px; }

      .cell { min-width:0; }
      .titleCell .t1 { font-weight:900; }
      .t2 { margin-top:6px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .link { color:#2563eb; font-weight:800; text-decoration:none; }
      .badge { background:#eef2ff; border:1px solid #c7d2fe; color:#3730a3; padding:2px 8px; border-radius:999px; font-weight:900; font-size:12px; }

      .pill { display:inline-block; padding:4px 10px; border-radius:999px; font-weight:900; font-size:12px; margin-left:6px; border:1px solid transparent; }
      .pill.ok { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      .pill.off { background:#fff1f2; border-color:#fecdd3; color:#9f1239; }
      .pill.warn { background:#fffbeb; border-color:#fde68a; color:#92400e; }
      .pill.mut { background:#f3f4f6; border-color:#e5e7eb; color:#374151; }

      .actions { display:flex; gap:8px; flex-wrap:wrap; }
      .btnSm { background:#f3f4f6; border:1px solid #e5e7eb; padding:8px 10px; border-radius:12px; font-weight:900; cursor:pointer; text-decoration:none; color:#111827; }
      .btnSm:hover { filter: brightness(0.98); }
      .btnSm:disabled { opacity: .6; cursor:not-allowed; }
      .btnSm.danger { background:#fee2e2; border-color:#fecaca; color:#7f1d1d; }

      .empty { padding: 18px; text-align:center; font-weight:900; opacity:.7; }

      @media (max-width: 900px) {
        .stats { grid-template-columns: repeat(2, 1fr); }
        .tableHead { display:none; }
        .row { grid-template-columns: 1fr; gap:8px; }
        .usersRow { grid-template-columns: 1fr; }
        .actions { justify-content:flex-start; }
      }
    `}</style>
  );
}
