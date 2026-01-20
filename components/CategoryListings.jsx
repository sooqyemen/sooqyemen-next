// components/CategoryListings.jsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';

// ✅ Taxonomy (الفروع الهرمية)
import {
  inferListingTaxonomy,
  carMakeLabel,
  phoneBrandLabel,
  dealTypeLabel,
  propertyTypeLabel,
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
  عقارات: 'realestate',
  العقارات: 'realestate',
  سيارات: 'cars',
  السيارات: 'cars',
  جوالات: 'phones',
  الجوالات: 'phones',
  الكترونيات: 'electronics',
  إلكترونيات: 'electronics',
  الإلكترونيات: 'electronics',
  شبكات: 'networks',
  صيانة: 'maintenance',
  خدمات: 'services',
  وظائف: 'jobs',
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
    heavy_equipment: [
      'heavy_equipment',
      'heavy-equipment',
      'heavy equipment',
      'heavyequipment',
      'معدات ثقيلة',
      'معدات_ثقيلة',
    ],
    solar: ['solar', 'طاقة شمسية', 'طاقة_شمسية'],
    networks: ['networks', 'network', 'net', 'شبكات', 'نت وشبكات', 'نت_وشبكات', 'نت_و_شبكات'],
    maintenance: ['maintenance', 'صيانة'],
    furniture: ['furniture', 'أداث', 'اثاث', 'أثاث'],
    home_tools: ['home_tools', 'home tools', 'hometools', 'أدوات منزلية', 'ادوات منزلية', 'أدوات_منزلية', 'ادوات_منزلية'],
    clothes: ['clothes', 'ملابس'],
    animals: ['animals', 'animals_birds', 'animals-birds', 'حيوانات', 'حيوانات وطيور', 'حيوانات_وطيور'],
    jobs: ['jobs', 'وظائف'],
    services: ['services', 'خدمات'],
    other: ['other', 'أخرى', 'اخرى'],
  };

  const list = variantsMap[s] || [s];
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

function safeStr(v) {
  return String(v || '').trim();
}

function pickTaxonomy(listing, categoryKey) {
  const inferred = inferListingTaxonomy(listing || {}, categoryKey) || {};
  const out = { ...inferred, root: categoryKey };

  if (categoryKey === 'cars') {
    if (listing?.carMake) out.carMake = listing.carMake;
    if (listing?.carMakeText) out.carMakeText = listing.carMakeText;
  }
  if (categoryKey === 'phones') {
    if (listing?.phoneBrand) out.phoneBrand = listing.phoneBrand;
    if (listing?.phoneBrandText) out.phoneBrandText = listing.phoneBrandText;
  }
  if (categoryKey === 'realestate') {
    if (listing?.dealType) out.dealType = listing.dealType;
    if (listing?.propertyType) out.propertyType = listing.propertyType;
    if (listing?.propertyTypeText) out.propertyTypeText = listing.propertyTypeText;
  }
  return out;
}

export default function CategoryListings({ category, initialListings = [] }) {
  const PAGE_SIZE = 24;

  const [view, setView] = useState('grid'); // grid | list | map
  const [q, setQ] = useState('');

  const [items, setItems] = useState(() => (Array.isArray(initialListings) ? initialListings : []));
  const [loading, setLoading] = useState(() => (Array.isArray(initialListings) ? initialListings.length === 0 : true));
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef(null);
  const cursorReadyRef = useRef(false);

  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const catsRaw = Array.isArray(category) ? category : [category];
  const cats = catsRaw.map(normalizeSlug).filter(Boolean);
  const single = cats.length === 1 ? cats[0] : '';
  const variants = useMemo(() => categoryVariants(single), [single]);

  // ✅ States للفروع الهرمية
  const [carMake, setCarMake] = useState(''); // '' = الكل
  const [phoneBrand, setPhoneBrand] = useState('');
  const [dealType, setDealType] = useState(''); // '' = الكل
  const [propertyType, setPropertyType] = useState('');

  useEffect(() => {
    setCarMake('');
    setPhoneBrand('');
    setDealType('');
    setPropertyType('');
  }, [single]);

  const normalizeListing = (d) => {
    const l = { id: d?.id || d?._id || d?.docId || d?.uid || d?.listingId, ...(d || {}) };
    if (!l.id) return null;
    if (l.isActive === false || l.hidden === true) return null;
    return l;
  };

  async function fetchFirstPage() {
    setErr('');
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    cursorReadyRef.current = false;

    if (!cats.length) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (!single) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      setErr('إعدادات القسم غير واضحة (أكثر من اسم للقسم).');
      return;
    }

    try {
      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);

      if (!aliveRef.current) return;

      setItems(data);

      const last = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = last;
      cursorReadyRef.current = true;

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

  async function ensureCursorReady() {
    if (cursorReadyRef.current) return;
    if (!single) return;

    try {
      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .limit(PAGE_SIZE);

      const snap = await ref.get();
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      cursorReadyRef.current = true;

      const page1 = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);
      if (!aliveRef.current) return;

      // merge without duplicates
      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...page1.filter((x) => !existing.has(x.id))];
      });

      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMore() {
    if (!hasMore || loadingMore) return;
    if (!single) return;

    setLoadingMore(true);
    setErr('');

    try {
      await ensureCursorReady();

      const lastDoc = lastDocRef.current;
      if (!lastDoc) {
        if (!aliveRef.current) return;
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const ref = db
        .collection('listings')
        .where('category', variants.length > 1 ? 'in' : '==', variants.length > 1 ? variants : single)
        .orderBy('createdAt', 'desc')
        .startAfter(lastDoc)
        .limit(PAGE_SIZE);

      const snap = await ref.get();

      const data = snap.docs.map((d) => normalizeListing({ id: d.id, ...d.data() })).filter(Boolean);

      if (!aliveRef.current) return;

      setItems((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...data.filter((x) => !existing.has(x.id))];
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

  // ✅ initial SSR vs client fetch
  useEffect(() => {
    if (Array.isArray(initialListings) && initialListings.length > 0) {
      setItems(initialListings.map(normalizeListing).filter(Boolean));
      setLoading(false);
      setErr('');
      setHasMore(true);
      lastDocRef.current = null;
      cursorReadyRef.current = false;
      return;
    }
    fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single]);

  // ✅ Infinite scroll (نوقفه في وضع الخريطة)
  useEffect(() => {
    if (view === 'map') return;

    const el = loadMoreRef.current;
    if (!el) return;
    if (!hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { root: null, rootMargin: '800px 0px', threshold: 0 }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hasMore, loading, loadingMore, single]);

  // ✅ Taxonomy enrich
  const itemsWithTax = useMemo(() => {
    const catKey = single || '';
    return items
      .map((l) => {
        const tax = catKey ? pickTaxonomy(l, catKey) : { root: catKey };
        return { ...l, _tax: tax };
      })
      .filter(Boolean);
  }, [items, single]);

  const taxonomyCounts = useMemo(() => {
    const catKey = single || '';
    const out = {
      carMakes: new Map(),
      phoneBrands: new Map(),
      dealTypes: new Map(),
      propertyTypes: new Map(),
    };
    if (!catKey) return out;

    const inc = (m, k) => {
      const kk = safeStr(k);
      if (!kk) return;
      m.set(kk, (m.get(kk) || 0) + 1);
    };

    for (const l of itemsWithTax) {
      const t = l._tax || {};
      if (catKey === 'cars') inc(out.carMakes, t.carMake || 'other');
      if (catKey === 'phones') inc(out.phoneBrands, t.phoneBrand || 'other');
      if (catKey === 'realestate') inc(out.dealTypes, t.dealType || '');
    }

    if (catKey === 'realestate') {
      const dealFilter = safeStr(dealType);
      for (const l of itemsWithTax) {
        const t = l._tax || {};
        if (dealFilter && safeStr(t.dealType) !== dealFilter) continue;
        inc(out.propertyTypes, t.propertyType || 'other');
      }
    }

    return out;
  }, [itemsWithTax, single, dealType]);

  const filtered = useMemo(() => {
    const catKey = single || '';
    const query = safeStr(q).toLowerCase();
    let arr = itemsWithTax;

    if (catKey === 'cars') {
      const sel = safeStr(carMake);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.carMake || 'other') === sel);
    }
    if (catKey === 'phones') {
      const sel = safeStr(phoneBrand);
      if (sel) arr = arr.filter((l) => safeStr(l?._tax?.phoneBrand || 'other') === sel);
    }
    if (catKey === 'realestate') {
      const selDeal = safeStr(dealType);
      const selProp = safeStr(propertyType);
      if (selDeal) arr = arr.filter((l) => safeStr(l?._tax?.dealType) === selDeal);
      if (selProp) arr = arr.filter((l) => safeStr(l?._tax?.propertyType || 'other') === selProp);
    }

    if (!query) return arr;

    return arr.filter((l) => {
      const title = safeStr(l.title).toLowerCase();
      const city = safeStr(l.city || l.region || l.locationLabel).toLowerCase();
      const desc = safeStr(l.description).toLowerCase();
      return title.includes(query) || city.includes(query) || desc.includes(query);
    });
  }, [itemsWithTax, single, q, carMake, phoneBrand, dealType, propertyType]);

  const showCarsTax = single === 'cars' && taxonomyCounts.carMakes.size > 0;
  const showPhonesTax = single === 'phones' && taxonomyCounts.phoneBrands.size > 0;
  const showRealTax = single === 'realestate' && taxonomyCounts.dealTypes.size > 0;

  const carMakeOptions = useMemo(() => {
    return Array.from(taxonomyCounts.carMakes.entries())
      .filter(([k]) => !!safeStr(k))
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 24);
  }, [taxonomyCounts.carMakes]);

  const phoneBrandOptions = useMemo(() => {
    return Array.from(taxonomyCounts.phoneBrands.entries())
      .filter(([k]) => !!safeStr(k))
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 24);
  }, [taxonomyCounts.phoneBrands]);

  const dealTypeOptions = useMemo(() => {
    return Array.from(taxonomyCounts.dealTypes.entries())
      .map(([k, c]) => [safeStr(k), c])
      .filter(([k]) => k === 'sale' || k === 'rent')
      .sort((a, b) => (b[1] || 0) - (a[1] || 0));
  }, [taxonomyCounts.dealTypes]);

  const propertyTypeOptions = useMemo(() => {
    return Array.from(taxonomyCounts.propertyTypes.entries())
      .filter(([k]) => !!safeStr(k))
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 32);
  }, [taxonomyCounts.propertyTypes]);

  // ====== Taxonomy Chips (نفس ستايل شريط الخريطة) ======
  const CAT_COLOR = useMemo(() => {
    if (single === 'cars') return '#2563eb';
    if (single === 'phones') return '#7c3aed';
    if (single === 'realestate') return '#16a34a';
    return '#475569';
  }, [single]);

  const Chip = ({ active, onClick, text, count, dotColor, title }) => (
    <button
      type="button"
      className={`sooq-chip ${active ? 'isActive' : ''}`}
      onClick={onClick}
      title={title || text}
      role="tab"
      aria-selected={active}
    >
      <span className="sooq-chipDot" style={{ background: dotColor || CAT_COLOR }} />
      <span className="sooq-chipText">{text}</span>
      {typeof count === 'number' ? <span className="sooq-chipCount">{count}</span> : null}
    </button>
  );

  const TaxonomyBar = () => {
    if (!single) return null;

    // سيارات
    if (showCarsTax) {
      return (
        <div className="sooq-chipBar" aria-label="فلترة الماركات">
          <div className="sooq-chips" role="tablist" aria-label="ماركات السيارات">
            <Chip active={!carMake} onClick={() => setCarMake('')} text="الكل" count={itemsWithTax.length} />
            {carMakeOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (carMakeLabel(k) || k);
              return <Chip key={k} active={carMake === k} onClick={() => setCarMake(k)} text={label} count={c} />;
            })}
          </div>
        </div>
      );
    }

    // جوالات
    if (showPhonesTax) {
      return (
        <div className="sooq-chipBar" aria-label="فلترة ماركات الجوالات">
          <div className="sooq-chips" role="tablist" aria-label="ماركات الجوالات">
            <Chip active={!phoneBrand} onClick={() => setPhoneBrand('')} text="الكل" count={itemsWithTax.length} />
            {phoneBrandOptions.map(([k, c]) => {
              const label = k === 'other' ? 'أخرى' : (phoneBrandLabel(k) || k);
              return <Chip key={k} active={phoneBrand === k} onClick={() => setPhoneBrand(k)} text={label} count={c} />;
            })}
          </div>
        </div>
      );
    }

    // عقارات
    if (showRealTax) {
      const hasDeal = !!safeStr(dealType);

      // لون مختلف (بيع/إيجار) مثل شريط الخريطة
      const dealDot = (k) => (k === 'sale' ? '#0ea5e9' : k === 'rent' ? '#f59e0b' : CAT_COLOR);
      const dealLabel = (k) => dealTypeLabel(k) || (k === 'sale' ? 'بيع' : k === 'rent' ? 'إيجار' : k);

      // ✅ إذا اخترت بيع نخفي إيجار والعكس (كما طلبت)
      const visibleDealOptions = hasDeal ? dealTypeOptions.filter(([k]) => k === dealType) : dealTypeOptions;

      return (
        <div className="sooq-chipBar" aria-label="فلترة العقارات">
          <div className="sooq-chips" role="tablist" aria-label="فلترة العقارات">
            {!hasDeal ? (
              <>
                <Chip
                  active={!dealType}
                  onClick={() => {
                    setDealType('');
                    setPropertyType('');
                  }}
                  text="الكل"
                  count={itemsWithTax.length}
                />
                {visibleDealOptions.map(([k, c]) => (
                  <Chip
                    key={k}
                    active={dealType === k}
                    onClick={() => {
                      setDealType(k);
                      setPropertyType('');
                    }}
                    text={dealLabel(k)}
                    count={c}
                    dotColor={dealDot(k)}
                  />
                ))}
              </>
            ) : (
              <>
                {/* رجوع لاختيار (بيع/إيجار) */}
                <Chip
                  active={false}
                  onClick={() => {
                    setDealType('');
                    setPropertyType('');
                  }}
                  text="↩ رجوع"
                  dotColor="#64748b"
                />
                <Chip
                  active={true}
                  onClick={() => {}}
                  text={dealLabel(dealType)}
                  dotColor={dealDot(dealType)}
                />

                {propertyTypeOptions.length > 0 ? (
                  <>
                    <Chip active={!propertyType} onClick={() => setPropertyType('')} text="كل الأنواع" />
                    {propertyTypeOptions.map(([k, c]) => {
                      const label = k === 'other' ? 'أخرى' : (propertyTypeLabel(k) || k);
                      return (
                        <Chip
                          key={k}
                          active={propertyType === k}
                          onClick={() => setPropertyType(k)}
                          text={label}
                          count={c}
                        />
                      );
                    })}
                  </>
                ) : null}
              </>
            )}
          </div>
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
      <TaxonomyBar />

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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 900 }}>لا توجد إعلانات مطابقة</div>
          <div className="muted" style={{ marginTop: 6 }}>جرّب تغيير الفلاتر أو البحث.</div>
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
        .tax-wrap {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
        }
        .tax-title {
          font-weight: 900;
          margin-bottom: 8px;
        }
        .tax-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .tax-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fff;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
        }
        .tax-chip.isActive {
          border-color: rgba(0, 0, 0, 0.22);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.1);
        }
        .tax-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          font-size: 12px;
          font-weight: 900;
        }
          .sooq-chips { padding: 6px; }
          .sooq-chip { padding: 8px 9px; font-size: 12px; }
        }

        /* ====== Taxonomy chips (نفس ستايل الخريطة) ====== */
        .sooq-chipBar {
          margin-bottom: 12px;
        }

        .sooq-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.10);
          align-items: center;
        }

        .sooq-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
          font-weight: 800;
        }

        .sooq-chip.isActive {
          border-color: rgba(0, 0, 0, 0.18);
          box-shadow: 0 8px 14px rgba(0, 0, 0, 0.12);
        }

        .sooq-chipDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .sooq-chipText {
          font-weight: 900;
        }

        .sooq-chipCount {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.06);
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 520px) {
          .sooq-chips { padding: 6px; }
          .sooq-chip { padding: 8px 9px; font-size: 12px; }
        }

      `}</style>
    </div>
  );
}
