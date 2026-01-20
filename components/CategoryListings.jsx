// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

// ✅ Taxonomy (هرمية الأقسام)
import {
  inferListingTaxonomy,
  CAR_MAKES,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
} from '@/lib/taxonomy';

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

// ✅ لتفادي ظهور أقسام "فاضية" بسبب اختلافات حفظ قيمة category في الإعلانات القديمة
// نجلب نفس القسم بعدة قيم محتملة (حتى 10 قيم - حد Firestore لــ in)
function categoryVariants(single) {
  const s = normalizeSlug(single);
  if (!s) return [];

  const variantsMap = {
    realestate: ['realestate', 'real_estate', 'real-estate', 'real estate', 'عقارات', 'العقارات'],
    cars: ['cars', 'car', 'سيارات', 'السيارات'],
    phones: ['phones', 'phone', 'mobiles', 'mobile', 'جوالات', 'الجوالات', 'موبايلات'],
    electronics: ['electronics', 'electronic', 'إلكترونيات', 'الكترونيات', 'الإلكترونيات'],
    motorcycles: ['motorcycles', 'motorcycle', 'دراجات', 'دراجات نارية', 'دراجات_نارية'],
    heavy_equipment: ['heavy_equipment', 'heavy-equipment', 'heavy equipment', 'heavyequipment', 'معدات ثقيلة', 'معدات_ثقيلة'],
    solar: ['solar', 'طاقة شمسية', 'طاقة_شمسية'],
    networks: ['networks', 'network', 'net', 'شبكات', 'نت وشبكات', 'نت_وشبكات', 'نت_و_شبكات'],
    maintenance: ['maintenance', 'صيانة'],
    furniture: ['furniture', 'أثاث', 'اثاث'],
    home_tools: ['home_tools', 'home tools', 'hometools', 'أدوات منزلية', 'ادوات منزلية', 'أدوات_منزلية', 'ادوات_منزلية'],
    clothes: ['clothes', 'ملابس'],
    animals: ['animals', 'animals_birds', 'animals-birds', 'حيوانات', 'حيوانات وطيور', 'حيوانات_وطيور'],
    jobs: ['jobs', 'وظائف'],
    services: ['services', 'خدمات'],
    other: ['other', 'أخرى', 'اخرى'],
  };

  const list = variantsMap[s] || [s];
  // Normalize + remove duplicates + keep max 10
  const uniq = [];
  const seen = new Set();
  for (const v of list) {
    const nv = normalizeSlug(v);
    if (!nv) continue;
    if (seen.has(nv)) continue;
    seen.add(nv);
    uniq.push(nv);
    if (uniq.length >= 10) break;
  }
  return uniq.length ? uniq : [s];
}

function labelFromList(list, key) {
  const it = (list || []).find((x) => x && x.key === key);
  return it ? it.label : key;
}

export default function CategoryListings({ category, initialListings = [] }) {
  const PAGE_SIZE = 20;

  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');
  const [items, setItems] = useState(() => (Array.isArray(initialListings) ? initialListings : []));
  const [loading, setLoading] = useState(() => !(Array.isArray(initialListings) && initialListings.length));
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  // ✅ فلاتر هرمية (حسب القسم الحالي)
  const [carMake, setCarMake] = useState(''); // toyota...
  const [phoneBrand, setPhoneBrand] = useState(''); // apple...
  const [dealType, setDealType] = useState(''); // sale/rent
  const [propertyType, setPropertyType] = useState(''); // land/house...

  // cursor: آخر DocumentSnapshot تم جلبه
  const lastDocRef = useRef(null);

  // ✅ Infinite Scroll sentinel
  const loadMoreRef = useRef(null);

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
  const variants = useMemo(() => categoryVariants(single), [single]);

  const resetHierFilters = () => {
    setCarMake('');
    setPhoneBrand('');
    setDealType('');
    setPropertyType('');
  };

  const itemsWithTax = useMemo(() => {
    return (items || []).map((l) => {
      const rootKey = normalizeSlug(l?.category || single) || single || normalizeSlug(l?.section) || normalizeSlug(l?.cat) || '';
      const _tax = inferListingTaxonomy(l, rootKey);
      return { ...l, _catKey: rootKey, _tax };
    });
  }, [items, single]);

  // ✅ Counts للفروع (حسب القسم الحالي) - مبني على البيانات المحمّلة
  const carsMakeCounts = useMemo(() => {
    const m = new Map();
    if (single !== 'cars') return m;
    for (const p of itemsWithTax) {
      const mk = p?._tax?.carMake || '';
      if (!mk) continue;
      m.set(mk, (m.get(mk) || 0) + 1);
    }
    return m;
  }, [itemsWithTax, single]);

  const phonesBrandCounts = useMemo(() => {
    const m = new Map();
    if (single !== 'phones') return m;
    for (const p of itemsWithTax) {
      const bk = p?._tax?.phoneBrand || '';
      if (!bk) continue;
      m.set(bk, (m.get(bk) || 0) + 1);
    }
    return m;
  }, [itemsWithTax, single]);

  const realestateDealCounts = useMemo(() => {
    const m = new Map();
    if (single !== 'realestate') return m;
    for (const p of itemsWithTax) {
      const dk = p?._tax?.dealType || '';
      if (!dk) continue;
      m.set(dk, (m.get(dk) || 0) + 1);
    }
    return m;
  }, [itemsWithTax, single]);

  const realestatePropCounts = useMemo(() => {
    const m = new Map();
    if (single !== 'realestate') return m;
    for (const p of itemsWithTax) {
      if (dealType && (p?._tax?.dealType || '') !== dealType) continue;
      const pk = p?._tax?.propertyType || '';
      if (!pk) continue;
      m.set(pk, (m.get(pk) || 0) + 1);
    }
    return m;
  }, [itemsWithTax, single, dealType]);

  // ✅ فلترة (هرمية) ثم البحث
  const filtered = useMemo(() => {
    let arr = itemsWithTax;

    if (single === 'cars' && carMake) {
      arr = arr.filter((l) => (l?._tax?.carMake || '') === carMake);
    }

    if (single === 'phones' && phoneBrand) {
      arr = arr.filter((l) => (l?._tax?.phoneBrand || '') === phoneBrand);
    }

    if (single === 'realestate') {
      if (dealType) arr = arr.filter((l) => (l?._tax?.dealType || '') === dealType);
      if (propertyType) arr = arr.filter((l) => (l?._tax?.propertyType || '') === propertyType);
    }

    const s = String(q || '').trim().toLowerCase();
    if (!s) return arr;

    return arr.filter((l) => {
      const title = String(l.title || '').toLowerCase();
      const city = String(l.city || l.region || '').toLowerCase();
      const desc = String(l.description || '').toLowerCase();
      return title.includes(s) || city.includes(s) || desc.includes(s);
    });
  }, [itemsWithTax, q, single, carMake, phoneBrand, dealType, propertyType]);

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
    if (!single) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      setErr('إعدادات القسم غير واضحة (أكثر من اسم للقسم). يفضّل توحيد حقل categorySlug في الإعلانات.');
      return;
    }

    try {
      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      setItems(data);

      const last = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = last;

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
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .startAfter(lastDoc)
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      // دمج بدون تكرار (احتياط)
      setItems((prev) => {
        const existing = new Set((prev || []).map((x) => x.id));
        return [...(prev || []), ...data.filter((x) => !existing.has(x.id))];
      });

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

  // عند تغيير القسم: نعيد التحميل من البداية + تصفير فلاتر الهرمية
  useEffect(() => {
    resetHierFilters();
    setView('grid');
    fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, cats.join('|')]);

  // ✅ تحميل تلقائي عند النزول للأسفل (Infinite Scroll)
  useEffect(() => {
    // لا نحمل تلقائي أثناء عرض الخريطة
    if (view === 'map') return;

    const el = loadMoreRef.current;
    if (!el) return;

    if (!hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingMore || !hasMore) return;
        fetchMore();
      },
      {
        root: null,
        rootMargin: '800px 0px',
        threshold: 0,
      }
    );

    obs.observe(el);

    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hasMore, loading, loadingMore, single]);

  const SubFilters = () => {
    // نعرض فلاتر هرمية فقط للأقسام اللي دعمناها الآن
    if (!single || (single !== 'cars' && single !== 'phones' && single !== 'realestate')) return null;

    const wrapStyle = {
      display: 'flex',
      gap: 8,
      flexWrap: 'nowrap',
      overflowX: 'auto',
      padding: '8px 2px',
      WebkitOverflowScrolling: 'touch',
    };

    const chipStyle = (active) => ({
      border: '1px solid rgba(0,0,0,0.10)',
      borderRadius: 999,
      padding: '8px 10px',
      background: active ? 'rgba(0,0,0,0.04)' : '#fff',
      fontWeight: 900,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    });

    const countStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 22,
      height: 18,
      padding: '0 6px',
      borderRadius: 999,
      background: 'rgba(0,0,0,0.06)',
      fontSize: 12,
      fontWeight: 900,
      marginInlineStart: 8,
    };

    // 🚗 سيارات
    if (single === 'cars') {
      const total = itemsWithTax.length;
      const visible = CAR_MAKES.filter((x) => (carsMakeCounts.get(x.key) || 0) > 0);

      return (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={wrapStyle} aria-label="فلترة ماركات السيارات">
            <button type="button" style={chipStyle(carMake === '')} onClick={() => setCarMake('')}>
              الكل <span style={countStyle}>{total}</span>
            </button>

            {visible.map((x) => (
              <button key={x.key} type="button" style={chipStyle(carMake === x.key)} onClick={() => setCarMake(x.key)}>
                {x.label} <span style={countStyle}>{carsMakeCounts.get(x.key) || 0}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 📱 جوالات
    if (single === 'phones') {
      const total = itemsWithTax.length;
      const visible = PHONE_BRANDS.filter((x) => (phonesBrandCounts.get(x.key) || 0) > 0);

      return (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={wrapStyle} aria-label="فلترة ماركات الجوالات">
            <button type="button" style={chipStyle(phoneBrand === '')} onClick={() => setPhoneBrand('')}>
              الكل <span style={countStyle}>{total}</span>
            </button>

            {visible.map((x) => (
              <button
                key={x.key}
                type="button"
                style={chipStyle(phoneBrand === x.key)}
                onClick={() => setPhoneBrand(x.key)}
              >
                {x.label} <span style={countStyle}>{phonesBrandCounts.get(x.key) || 0}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 🏠 عقارات (بيع/إيجار -> نوع)
    if (single === 'realestate') {
      const dealVisible = DEAL_TYPES.filter((x) => (realestateDealCounts.get(x.key) || 0) > 0);

      const propVisible = PROPERTY_TYPES.filter((x) => (realestatePropCounts.get(x.key) || 0) > 0);

      const totalForDeal = dealType
        ? itemsWithTax.filter((p) => (p?._tax?.dealType || '') === dealType).length
        : itemsWithTax.length;

      return (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          {/* خطوة 1: بيع/إيجار */}
          {!dealType ? (
            <div style={wrapStyle} aria-label="فلترة بيع/إيجار">
              {dealVisible.length ? (
                dealVisible.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    style={chipStyle(false)}
                    onClick={() => {
                      setDealType(x.key);
                      setPropertyType('');
                    }}
                  >
                    {x.label} <span style={countStyle}>{realestateDealCounts.get(x.key) || 0}</span>
                  </button>
                ))
              ) : (
                <div className="muted" style={{ padding: 6 }}>
                  لا يوجد “بيع/إيجار” واضح في الإعلانات الحالية.
                </div>
              )}
            </div>
          ) : (
            <>
              {/* خطوة 2: نوع العقار */}
              <div style={wrapStyle} aria-label="فلترة نوع العقار">
                <button
                  type="button"
                  style={chipStyle(false)}
                  onClick={() => {
                    setDealType('');
                    setPropertyType('');
                  }}
                  title="رجوع لبيع/إيجار"
                >
                  ⬅︎ بيع/إيجار
                </button>

                <button type="button" style={chipStyle(propertyType === '')} onClick={() => setPropertyType('')}>
                  الكل <span style={countStyle}>{totalForDeal}</span>
                </button>

                {propVisible.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    style={chipStyle(propertyType === x.key)}
                    onClick={() => setPropertyType(x.key)}
                  >
                    {x.label} <span style={countStyle}>{realestatePropCounts.get(x.key) || 0}</span>
                  </button>
                ))}
              </div>

              {/* شريط صغير يوضح الحالة */}
              <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                {dealType ? `✅ ${labelFromList(DEAL_TYPES, dealType)}` : ''}
                {propertyType ? ` • ${labelFromList(PROPERTY_TYPES, propertyType)}` : ''}
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

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

          {/* زر تصفير الفلاتر الهرمية */}
          {(carMake || phoneBrand || dealType || propertyType) ? (
            <button className="btn" onClick={resetHierFilters} title="إلغاء الفلاتر الفرعية">
              ✕ تصفير
            </button>
          ) : null}
        </div>
      </div>

      {/* ✅ فلاتر هرمية للقسم الحالي */}
      {view !== 'map' ? <SubFilters /> : null}

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات مطابقة</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب البحث أو غيّر الفلاتر أو أضف إعلان جديد.</div>
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

          {/* ✅ نقطة التحميل التلقائي */}
          <div ref={loadMoreRef} style={{ height: 1 }} />

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {loadingMore ? (
              <div className="muted" style={{ padding: 10 }}>...جاري تحميل المزيد</div>
            ) : hasMore ? (
              <div className="muted" style={{ padding: 10 }}>انزل لأسفل لتحميل المزيد</div>
            ) : (
              <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
            )}
          </div>

          {err && items.length > 0 ? (
            <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 900, color: '#b91c1c' }}>⚠️</div>
              <div className="muted" style={{ marginTop: 6 }}>{err}</div>
            </div>
          ) : null}
        </>
      )}

      <style jsx>{`
        /* ====== Taxonomy filter (chips) ====== */
        .sooq-taxWrap{
          margin-bottom:12px;
          padding:10px 12px;
          border-radius:14px;
          border:1px solid #e2e8f0;
          background:rgba(255,255,255,0.92);
        }
        .sooq-taxTitle{
          font-weight:900;
          margin-bottom:8px;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .sooq-taxSub{
          font-weight:800;
          font-size:13px;
          margin:10px 0 6px;
          color:#334155;
        }

        .sooq-chips{
          display:flex;
          gap:8px;
          overflow-x:auto;
          padding:8px;
          border-radius:14px;
          background:rgba(255,255,255,0.86);
          backdrop-filter:blur(8px);
          box-shadow:0 10px 18px rgba(0,0,0,0.10);
          align-items:center;
        }
        .sooq-chips::-webkit-scrollbar{ height:6px; }
        .sooq-chips::-webkit-scrollbar-thumb{ background:rgba(0,0,0,0.15); border-radius:999px; }

        .sooq-chip{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 10px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,0.10);
          background:#fff;
          font-size:13px;
          line-height:1;
          cursor:pointer;
          white-space:nowrap;
          user-select:none;
          font-weight:900;
        }
        .sooq-chip.isActive{
          border-color:rgba(0,0,0,0.18);
          box-shadow:0 8px 14px rgba(0,0,0,0.12);
        }
        .sooq-chipDot{
          width:10px;
          height:10px;
          border-radius:50%;
          flex:0 0 auto;
        }
        .sooq-chipText{
          font-weight:900;
        }
        .sooq-chipCount{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:22px;
          height:18px;
          padding:0 6px;
          border-radius:999px;
          background:rgba(0,0,0,0.06);
          font-size:12px;
          font-weight:900;
        }

        @media (max-width:520px){
          .sooq-taxWrap{ padding:10px; }
          .sooq-chips{ padding:8px; }
          .sooq-chip{ padding:8px 9px; font-size:12.5px; }
        }
      `}</style>

    </div>
  );
}
