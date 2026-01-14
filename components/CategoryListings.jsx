// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

const HomeMapView = dynamic(() => import('@/components/Map/HomeMapView'), {
  ssr: false,
});

// ✅ خرائط توافق (عربي/إنجليزي/اختلافات شائعة)
const ALIASES = {
  real_estate: 'realestate',
  'heavy-equipment': 'heavy_equipment',
  heavyEquipment: 'heavy_equipment',
  net: 'networks',
  network: 'networks',

  // عربي -> سلاج
  'عقارات': 'realestate',
  'العقارات': 'realestate',
  'سيارات': 'cars',
  'السيارات': 'cars',
  'جوالات': 'phones',
  'الجوالات': 'phones',
  'الكترونيات': 'electronics',
  'إلكترونيات': 'electronics',
  'الإلكترونيات': 'electronics',
  'شبكات': 'networks',
  'صيانة': 'maintenance',
  'خدمات': 'services',
  'وظائف': 'jobs',
  'طاقة شمسية': 'solar',
};

function normalizeSlug(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const mapped = ALIASES[raw] || raw;

  return String(mapped)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

export default function CategoryListings({ category }) {
  const PAGE_SIZE = 20;

  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // cursor: آخر DocumentSnapshot تم جلبه
  const lastDocRef = useRef(null);

  // لتجنب setState بعد unmount
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ✅ category قد يكون string أو array
  const catsRaw = Array.isArray(category) ? category : [category];
  const cats = catsRaw.map(normalizeSlug).filter(Boolean);
  const single = cats.length === 1 ? cats[0] : '';

  const filtered = useMemo(() => {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return items;

    return items.filter((l) => {
      const title = String(l.title || '').toLowerCase();
      const city = String(l.city || l.region || '').toLowerCase();
      const desc = String(l.description || '').toLowerCase();
      return title.includes(s) || city.includes(s) || desc.includes(s);
    });
  }, [items, q]);

  async function fetchFirstPage() {
    setErr('');
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;

    if (!cats.length) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    // ⚠️ هذا الحل يعتمد أن قيمة category في الداتا = single (مثل cars/phones...)
    // إذا عندك داخل الداتا عربي/إنجليزي مختلط، الأفضل إضافة حقل categorySlug موحّد (أشرح لك تحت).
    if (!single) {
      // إذا عندك عدة أسماء/أكثر من قسم، الأفضل تبني Query مختلف (IN) أو تعتمد حقل موحّد.
      // الآن سنعرض رسالة واضحة بدل ما نسحب 400 ونفلتر.
      setItems([]);
      setLoading(false);
      setHasMore(false);
      setErr('إعدادات القسم غير واضحة (أكثر من اسم للقسم). يفضّل توحيد حقل categorySlug في الإعلانات.');
      return;
    }

    try {
      const ref = db
        .collection('listings')
        .where('category', '==', single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      setItems(data);

      // حفظ المؤشر
      const last = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = last;

      // إذا رجع أقل من PAGE_SIZE غالبًا ما فيه المزيد
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      setErr(e?.message || 'فشل تحميل إعلانات القسم');
      setLoading(false);
      setHasMore(false);
    }
  }

  async function fetchMore() {
    if (!hasMore || loadingMore) return;
    if (!single) return;

    const lastDoc = lastDocRef.current;
    if (!lastDoc) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setErr('');

    try {
      const ref = db
        .collection('listings')
        .where('category', '==', single)
        .orderBy('createdAt', 'desc')
        .startAfter(lastDoc)
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      setItems((prev) => [...prev, ...data]);

      const newLast = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = newLast;

      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error(e);
      if (!aliveRef.current) return;
      setErr(e?.message || 'فشل تحميل المزيد');
      setLoadingMore(false);
    }
  }

  // عند تغيير القسم: نعيد التحميل من البداية
  useEffect(() => {
    fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, cats.join('|')]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div className="muted">جاري تحميل إعلانات القسم...</div>
      </div>
    );
  }

  if (err && items.length === 0) {
    return (
      <div className="card" style={{ padding: 16, border: '1px solid #fecaca' }}>
        <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️ حدث خطأ</div>
        <div className="muted" style={{ marginTop: 6 }}>{err}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn ${view === 'grid' ? 'btnPrimary' : ''}`} onClick={() => setView('grid')}>
              ◼️ شبكة
            </button>
            <button className={`btn ${view === 'list' ? 'btnPrimary' : ''}`} onClick={() => setView('list')}>
              ☰ قائمة
            </button>
            <button className={`btn ${view === 'map' ? 'btnPrimary' : ''}`} onClick={() => setView('map')}>
              🗺️ خريطة
            </button>
          </div>

          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث داخل القسم..."
          />

          <div className="muted" style={{ fontWeight: 800 }}>
            {filtered.length} إعلان
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات في هذا القسم</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب البحث أو أضف إعلان جديد.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/add">➕ أضف إعلان</Link>
          </div>
        </div>
      ) : view === 'map' ? (
        <HomeMapView listings={filtered} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr',
              gap: 12,
            }}
          >
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>

          {/* تحميل المزيد */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {hasMore ? (
              <button className={`btn ${loadingMore ? '' : 'btnPrimary'}`} onClick={fetchMore} disabled={loadingMore}>
                {loadingMore ? '...جاري تحميل المزيد' : 'تحميل المزيد'}
              </button>
            ) : (
              <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
            )}
          </div>

          {/* خطأ أثناء تحميل المزيد */}
          {err && items.length > 0 ? (
            <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️</div>
              <div className="muted" style={{ marginTop: 6 }}>{err}</div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
