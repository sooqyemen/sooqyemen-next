'use client';

// app/my-listings/page.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { db, firebase } from '@/lib/firebaseClient';

const FILTERS = [
  { key: 'all', label: 'الكل', icon: '📦' },
  { key: 'active', label: 'نشطة', icon: '✅' },
  { key: 'sold', label: 'تم البيع', icon: '💰' },
  { key: 'hidden', label: 'مخفية', icon: '🙈' },
];

export default function MyListingsPage() {
  const { user, loading } = useAuth();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  // لتجميد أزرار إعلان واحد وقت التنفيذ
  const [busyMap, setBusyMap] = useState({}); // { [id]: true }
  const setBusy = (id, val) => setBusyMap((p) => ({ ...p, [id]: !!val }));

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

          // ترتيب: الأحدث أولاً (createdAt ثم updatedAt)
          data.sort((a, b) => {
            const ta =
              (a.updatedAt?.toMillis?.() ?? 0) || (a.createdAt?.toMillis?.() ?? 0);
            const tb =
              (b.updatedAt?.toMillis?.() ?? 0) || (b.createdAt?.toMillis?.() ?? 0);
            return tb - ta;
          });

          setItems(data);
          setFetching(false);
          setError('');
        },
        (err) => {
          console.error('my-listings error:', err);
          setError('حدث خطأ أثناء تحميل إعلاناتك، حاول لاحقاً.');
          setFetching(false);
        }
      );

    return () => unsub();
  }, [user, loading]);

  const computed = useMemo(() => {
    const normalize = (s) => String(s || '').toLowerCase();

    const withFlags = items.map((x) => {
      const status = normalize(x.status);
      const isSold = status === 'sold';
      const isHidden = x.hidden === true;
      const isInactive = x.isActive === false;
      const isActive = !isSold && !isHidden && !isInactive;
      return { ...x, _isSold: isSold, _isHidden: isHidden, _isInactive: isInactive, _isActive: isActive };
    });

    const stats = {
      total: withFlags.length,
      active: withFlags.filter((x) => x._isActive).length,
      sold: withFlags.filter((x) => x._isSold).length,
      hidden: withFlags.filter((x) => x._isInactive || x._isHidden).length,
      views: withFlags.reduce((acc, x) => acc + Number(x.views || 0), 0),
    };

    const text = q.trim().toLowerCase();

    let filtered = withFlags;

    if (filter === 'active') filtered = filtered.filter((x) => x._isActive);
    if (filter === 'sold') filtered = filtered.filter((x) => x._isSold);
    if (filter === 'hidden') filtered = filtered.filter((x) => x._isInactive || x._isHidden);

    if (text) {
      filtered = filtered.filter((x) => {
        const hay = [
          x.title,
          x.description,
          x.city,
          x.category,
          x.locationLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(text);
      });
    }

    return { stats, list: filtered };
  }, [items, filter, q]);

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
        await db.collection('listings').doc(item.id).update({
          status: 'active',
          soldAt: firebase.firestore.FieldValue.delete(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
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

  // ✅ حذف حقيقي لتقليل المساحة في Firestore
  const deleteListing = async (item) => {
    if (!user) return;
    if (!confirm('هل تريد حذف هذا الإعلان نهائياً؟ لا يمكن التراجع.')) return;

    setBusy(item.id, true);
    try {
      await db.collection('listings').doc(item.id).delete();
    } catch (e) {
      console.error(e);
      alert('تعذر حذف الإعلان. تأكد من الصلاحيات أو حاول لاحقاً.');
    } finally {
      setBusy(item.id, false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="wrap">
        <div className="center">
          <div className="spinner" />
          <div className="muted">جاري تحميل إعلاناتك...</div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="iconBig">🔒</div>
          <h1>لا يمكنك عرض إعلاناتك</h1>
          <p>سجل الدخول لعرض إعلاناتك وتعديلها أو حذفها.</p>
          <div className="row">
            <Link className="btn primary" href="/login">تسجيل الدخول</Link>
            <Link className="btn" href="/register">إنشاء حساب</Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="wrap">
      {/* Hero */}
      <div className="hero">
        <div className="heroLeft">
          <h1>إعلاناتي</h1>
          <p>إدارة الإعلانات: تعديل، إخفاء، تم البيع، وحذف نهائي.</p>

          <div className="heroActions">
            <Link href="/add" className="btn primary">➕ أضف إعلاناً</Link>
            <Link href="/profile" className="btn">👤 الملف الشخصي</Link>
          </div>
        </div>

        <div className="heroRight">
          <div className="statsGrid">
            <Stat icon="📦" label="الكل" value={computed.stats.total} />
            <Stat icon="✅" label="نشطة" value={computed.stats.active} />
            <Stat icon="💰" label="تم البيع" value={computed.stats.sold} />
            <Stat icon="👁️" label="المشاهدات" value={computed.stats.views} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert">
          <span className="alertIcon">⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <span className="chipIcon">{f.icon}</span>
              <span className="chipLabel">{f.label}</span>
              {f.key === 'all' && <span className="count">{computed.stats.total}</span>}
              {f.key === 'active' && <span className="count">{computed.stats.active}</span>}
              {f.key === 'sold' && <span className="count">{computed.stats.sold}</span>}
              {f.key === 'hidden' && <span className="count">{computed.stats.hidden}</span>}
            </button>
          ))}
        </div>

        <div className="search">
          <span className="sIcon">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في إعلاناتك..."
          />
          {q ? (
            <button type="button" className="clear" onClick={() => setQ('')} aria-label="مسح البحث">
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Empty state */}
      {computed.list.length === 0 ? (
        <div className="empty">
          <div className="iconBig">📭</div>
          <h3>لا توجد نتائج</h3>
          <p>جرّب تغيير الفلتر أو تعديل كلمة البحث.</p>
          <Link href="/add" className="btn primary">➕ أضف إعلاناً الآن</Link>
        </div>
      ) : null}

      {/* Cards */}
      <div className="grid">
        {computed.list.map((item) => {
          const isBusy = !!busyMap[item.id];
          const isSold = String(item.status || '').toLowerCase() === 'sold';
          const isInactive = item.isActive === false;
          const isHidden = item.hidden === true;

          const badge = isSold
            ? { text: 'تم البيع', cls: 'sold' }
            : isHidden
            ? { text: 'محذوف', cls: 'hidden' }
            : isInactive
            ? { text: 'مخفي', cls: 'inactive' }
            : { text: 'نشط', cls: 'active' };

          return (
            <div key={item.id} className="card">
              <div className="cardTop">
                <div className="titleRow">
                  <div className="title">{item.title || 'إعلان بدون عنوان'}</div>
                  <span className={`badge ${badge.cls}`}>{badge.text}</span>
                </div>

                <div className="meta">
                  <span>📌 {item.city || 'بدون مدينة'}</span>
                  <span className="dot">•</span>
                  <span>🏷️ {item.category || 'قسم غير محدد'}</span>
                  <span className="dot">•</span>
                  <span>👁️ {item.views || 0}</span>
                </div>
              </div>

              {item.description ? (
                <div className="desc">
                  {String(item.description).length > 100
                    ? `${String(item.description).slice(0, 100)}...`
                    : String(item.description)}
                </div>
              ) : (
                <div className="desc muted">لا يوجد وصف</div>
              )}

              <div className="priceRow">
                <div className="price">
                  {item.priceYER
                    ? `${Number(item.priceYER).toLocaleString()} ريال يمني`
                    : 'بدون سعر'}
                </div>
                {item.locationLabel ? <div className="loc">📍 {item.locationLabel}</div> : null}
              </div>

              <div className="actions">
                <Link href={`/listing/${item.id}`} className="btnSm view">
                  👁️ عرض
                </Link>

                <Link href={`/edit-listing/${item.id}`} className="btnSm ghost">
                  ✏️ تعديل
                </Link>

                <button
                  type="button"
                  className={`btnSm ${isSold ? 'warn' : 'ok'}`}
                  onClick={() => toggleSold(item)}
                  disabled={isBusy}
                >
                  {isBusy ? '...' : isSold ? '↩️ إلغاء' : '✅ بيع'}
                </button>

                <button
                  type="button"
                  className="btnSm ghost hide"
                  onClick={() => toggleActive(item)}
                  disabled={isBusy}
                >
                  {isBusy ? '...' : isInactive ? '👁️ إظهار' : '🙈 إخفاء'}
                </button>

                <button
                  type="button"
                  className="btnSm danger"
                  onClick={() => deleteListing(item)}
                  disabled={isBusy}
                >
                  {isBusy ? '...' : '🗑️ حذف'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="sTop">
        <div className="sIcon">{icon}</div>
        <div className="sMeta">
          <div className="sLabel">{label}</div>
          <div className="sValue">{value ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}

const styles = `
.wrap{
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}
.muted{color:#64748b}
.center{
  min-height: 60vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:12px;
}
.spinner{
  width:42px;height:42px;
  border:3px solid rgba(0,0,0,.10);
  border-top-color: rgba(59,130,246,1);
  border-radius:50%;
  animation: spin 1s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* Hero Section */
.hero{
  display:flex;
  flex-direction: column;
  gap: 16px;
  border-radius:16px;
  border:1px solid rgba(0,0,0,.08);
  padding:16px;
  background: linear-gradient(135deg, rgba(15,52,96,.08), rgba(59,130,246,.08));
  margin-bottom: 16px;
}

.heroLeft h1{
  margin:0 0 6px;
  font-size: 1.6rem;
  font-weight: 900;
  color:#0f172a;
}
.heroLeft p{
  margin:0 0 12px;
  color:#475569;
  line-height:1.6;
  font-size: 0.95rem;
}
.heroActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:12px 16px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  color:#0f172a;
  font-weight:700;
  font-size: 0.95rem;
  text-decoration:none;
  flex: 1;
  min-width: 140px;
}
.btn.primary{
  background:#3b82f6;
  color:#fff;
  border-color: #3b82f6;
}
.btn:hover{transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.06);}
.btn.primary:hover{box-shadow:0 10px 22px rgba(59,130,246,.25);}

.heroRight{
  width: 100%;
}
.statsGrid{
  width: 100%;
  display:grid;
  grid-template-columns: repeat(2, 1fr);
  gap:10px;
}
.stat{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:14px;
  padding:12px;
  box-shadow: 0 4px 12px rgba(0,0,0,.04);
}
.sTop{display:flex; gap:10px; align-items:center;}
.sIcon{
  width:42px;height:42px;
  border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  background: rgba(59,130,246,.12);
  border:1px solid rgba(59,130,246,.18);
  font-size: 1.2rem;
}
.sLabel{font-weight:700; color:#64748b; font-size:.8rem;}
.sValue{font-weight:900; color:#0f172a; font-size:1.2rem; line-height:1.2;}

/* Alert */
.alert{
  margin: 16px 0;
  padding:12px 14px;
  border-radius:12px;
  border:1px solid rgba(220,38,38,.25);
  background: rgba(220,38,38,.08);
  color:#991b1b;
  display:flex;
  gap:10px;
  align-items:flex-start;
}
.alertIcon{font-size:1.1rem; margin-top:2px;}

/* Toolbar */
.toolbar{
  margin: 16px 0;
  display:flex;
  flex-direction: column;
  gap: 12px;
}
.filters{
  display:grid;
  grid-template-columns: repeat(2, 1fr);
  gap:8px;
}
.chip{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
  color:#0f172a;
  font-weight:700;
  cursor:pointer;
  font-size: 0.9rem;
  text-align: center;
}
.chipLabel {
  flex: 1;
  text-align: center;
}
.chipIcon{opacity:.9; font-size: 1rem;}
.chip .count{
  padding:2px 8px;
  border-radius:999px;
  background: rgba(15,52,96,.08);
  border:1px solid rgba(0,0,0,.06);
  font-size:.75rem;
  font-weight:900;
}
.chip.active{
  background:#3b82f6;
  color:#fff;
  border-color: transparent;
}
.chip.active .count{
  background: rgba(255,255,255,.18);
  border-color: rgba(255,255,255,.20);
}

.search{
  width: 100%;
  display:flex;
  align-items:center;
  gap:8px;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(0,0,0,.10);
  background:#fff;
}
.search input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  font-size:0.95rem;
}
.search .clear{
  border:none;
  background: rgba(0,0,0,.06);
  width:28px;height:28px;
  border-radius:10px;
  cursor:pointer;
}

/* Empty State */
.empty{
  margin: 24px 0;
  padding:20px;
  border-radius:16px;
  border:1px solid rgba(0,0,0,.08);
  background:#fff;
  text-align:center;
  box-shadow: 0 10px 26px rgba(0,0,0,.05);
}
.iconBig{font-size:2.4rem; margin-bottom:10px;}
.empty h3{margin:0 0 6px; font-weight:900; color:#0f172a; font-size: 1.3rem;}
.empty p{margin:0 0 16px; color:#64748b; font-size: 0.95rem;}

/* Cards Grid */
.grid{
  display:flex;
  flex-direction: column;
  gap:12px;
}
.card{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:16px;
  box-shadow: 0 4px 12px rgba(0,0,0,.05);
}

.titleRow{
  display:flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.title{
  font-weight:900;
  color:#0f172a;
  font-size:1.1rem;
  line-height:1.4;
  word-break: break-word;
}
.badge{
  align-self: flex-start;
  padding:6px 12px;
  border-radius:999px;
  font-weight:900;
  font-size:.8rem;
  border:1px solid rgba(0,0,0,.08);
}
.badge.active{background:#dcfce7;color:#166534;border-color:#bbf7d0;}
.badge.inactive{background:#dbeafe;color:#1e40af;border-color:#bfdbfe;}
.badge.hidden{background:#e5e7eb;color:#374151;border-color:#d1d5db;}
.badge.sold{background:#fef3c7;color:#92400e;border-color:#fde68a;}

.meta{
  color:#64748b;
  font-weight:600;
  font-size:.85rem;
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  align-items:center;
  margin-bottom: 12px;
}
.dot{opacity:.5}

.desc{
  color:#334155;
  font-size:.9rem;
  line-height:1.6;
  background: rgba(15,52,96,.04);
  border:1px solid rgba(0,0,0,.06);
  border-radius:12px;
  padding:12px;
  margin-bottom: 12px;
  min-height: 60px;
}
.priceRow{
  display:flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.price{
  font-weight:900;
  color:#0f172a;
  font-size:1rem;
}
.loc{
  color:#64748b;
  font-weight:700;
  font-size:.85rem;
}

/* Actions */
.actions{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:8px;
}
.btnSm{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  padding:10px 8px;
  border-radius:10px;
  border:1px solid rgba(0,0,0,.10);
  background:#3b82f6;
  color:#fff;
  font-weight:700;
  font-size: 0.85rem;
  cursor:pointer;
  text-decoration:none;
  transition: all .2s ease;
  min-height: 44px;
}
.btnSm:hover{transform: translateY(-1px); box-shadow: 0 6px 12px rgba(0,0,0,.08);}
.btnSm.ghost{
  background:#fff;
  color:#0f172a;
}
.btnSm.view{background:#3b82f6;}
.btnSm.ok{background:#10b981;border-color:#10b981;}
.btnSm.warn{background:#f59e0b;border-color:#f59e0b;}
.btnSm.danger{background:#dc2626;border-color:#dc2626;}
.btnSm.hide{background:#6b7280;border-color:#6b7280;color:#fff;}

/* Panel */
.panel{
  margin: 40px auto;
  max-width: 400px;
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:24px;
  text-align:center;
  box-shadow: 0 10px 26px rgba(0,0,0,.06);
}
.panel h1{margin:0 0 8px; font-weight:900; color:#0f172a; font-size: 1.4rem;}
.panel p{margin:0 0 16px; color:#64748b; font-size: 0.95rem;}
.row{display:flex; gap:10px; justify-content:center; flex-wrap:wrap;}

/* ========== RESPONSIVE DESIGN ========== */

/* Tablets and larger phones */
@media (min-width: 640px) {
  .wrap{
    padding: 20px 16px 60px;
  }
  
  .hero{
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px;
  }
  
  .heroLeft{
    flex: 1;
  }
  
  .heroRight{
    width: auto;
    flex: 1;
    max-width: 400px;
  }
  
  .statsGrid{
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters{
    grid-template-columns: repeat(4, 1fr);
  }
  
  .grid{
    display:grid;
    grid-template-columns: repeat(2, 1fr);
    gap:16px;
  }
  
  .titleRow{
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
  
  .priceRow{
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .actions{
    grid-template-columns: repeat(5, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .heroLeft h1{
    font-size: 1.8rem;
  }
  
  .statsGrid{
    grid-template-columns: repeat(4, 1fr);
  }
  
  .toolbar{
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .filters{
    display:flex;
    gap:10px;
  }
  
  .chip{
    padding: 8px 16px;
  }
  
  .search{
    max-width: 400px;
  }
  
  .grid{
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large Desktop */
@media (min-width: 1200px) {
  .grid{
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  
  .card{
    padding: 20px;
  }
}

/* Small phones */
@media (max-width: 380px) {
  .heroActions{
    flex-direction: column;
  }
  
  .btn{
    min-width: 100%;
  }
  
  .filters{
    grid-template-columns: 1fr;
  }
  
  .statsGrid{
    grid-template-columns: 1fr;
  }
  
  .actions{
    grid-template-columns: repeat(2, 1fr);
  }
  
  .btnSm{
    font-size: 0.8rem;
    padding: 10px 6px;
  }
}

/* Fix for very small screens */
@media (max-width: 320px) {
  .actions{
    grid-template-columns: 1fr;
  }
  
  .chip{
    padding: 10px 8px;
    font-size: 0.85rem;
  }
}
`;
