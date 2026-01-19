'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

import {
  inferListingTaxonomy,
  CAR_MAKES,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
  countBy,
} from '@/lib/taxonomy';

// نفس تطبيع الأقسام الموجود عندكم (مختصر)
function normalizeCategoryKey(v) {
  const raw = String(v || '').trim();
  if (!raw) return 'other';
  const lowered = raw.toLowerCase();
  const norm = lowered.replace(/\s+/g, '_').replace(/-/g, '_').replace(/__+/g, '_');

  const map = {
    real_estate: 'realestate',
    realestate: 'realestate',
    mobiles: 'phones',
    mobile: 'phones',
    phones: 'phones',
    phone: 'phones',
    cars: 'cars',
    electronics: 'electronics',
    motorcycles: 'motorcycles',
    heavy_equipment: 'heavy_equipment',
    solar: 'solar',
    furniture: 'furniture',
    clothes: 'clothes',
    animals: 'animals',
    jobs: 'jobs',
    services: 'services',
    other: 'other',

    // عربي
    سيارات: 'cars',
    عقارات: 'realestate',
    جوالات: 'phones',
    إلكترونيات: 'electronics',
    الكترونيات: 'electronics',
    دراجات_نارية: 'motorcycles',
    دراجات: 'motorcycles',
    معدات_ثقيلة: 'heavy_equipment',
    طاقة_شمسية: 'solar',
    نت_وشبكات: 'networks',
    صيانة: 'maintenance',
    أثاث: 'furniture',
    اثاث: 'furniture',
    ملابس: 'clothes',
    حيوانات: 'animals',
    وظائف: 'jobs',
    خدمات: 'services',
    اخرى: 'other',
    أخرى: 'other',
  };

  return map[norm] || map[raw] || norm || 'other';
}

const CAT_STYLE = {
  cars: { color: '#2563eb', icon: '🚗', label: 'سيارات' },
  realestate: { color: '#16a34a', icon: '🏡', label: 'عقارات' },
  phones: { color: '#7c3aed', icon: '📱', label: 'جوالات' },
  electronics: { color: '#0ea5e9', icon: '💻', label: 'إلكترونيات' },
  motorcycles: { color: '#f97316', icon: '🏍️', label: 'دراجات' },
  heavy_equipment: { color: '#a16207', icon: '🚜', label: 'معدات' },
  solar: { color: '#f59e0b', icon: '☀️', label: 'طاقة شمسية' },
  furniture: { color: '#c2410c', icon: '🛋️', label: 'أثاث' },
  clothes: { color: '#db2777', icon: '👕', label: 'ملابس' },
  animals: { color: '#84cc16', icon: '🐑', label: 'حيوانات' },
  jobs: { color: '#334155', icon: '💼', label: 'وظائف' },
  services: { color: '#0f172a', icon: '🧰', label: 'خدمات' },
  other: { color: '#475569', icon: '📦', label: 'أخرى' },
};

function getCatStyle(k) {
  return CAT_STYLE[k] || CAT_STYLE.other;
}

function pickImage(listing) {
  const imgs = listing?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return first.url || first.src || first.path || null;
  }
  return listing?.image || listing?.cover || listing?.thumbnail || listing?.mainImage || listing?.imageUrl || null;
}

export default function CategoryListings({
  listings = [],
  initialCategory = 'all', // إذا عندك صفحة قسم تقدر تمررها
  title = '📦 الإعلانات',
}) {
  const [activeCat, setActiveCat] = useState(initialCategory || 'all');

  // ✅ فلاتر هرمية
  const [sub1, setSub1] = useState(''); // cars: make | phones: brand | realestate: dealType
  const [sub2, setSub2] = useState(''); // realestate: propertyType

  useEffect(() => {
    // لو تغير initialCategory من الصفحة
    setActiveCat(initialCategory || 'all');
    setSub1('');
    setSub2('');
  }, [initialCategory]);

  // ✅ تجهيز البيانات مع taxonomy
  const items = useMemo(() => {
    return (listings || []).map((l) => {
      const catVal = l?.rootCategory ?? l?.category ?? l?.section ?? l?.cat ?? l?.categoryKey ?? 'other';
      const catKey = normalizeCategoryKey(catVal);

      let tax = null;
      try {
        tax = inferListingTaxonomy(l, catKey);
      } catch {
        tax = null;
      }

      return {
        ...l,
        _catKey: catKey,
        _tax: tax,
      };
    });
  }, [listings]);

  // counts للأقسام
  const catCounts = useMemo(() => {
    return countBy(items, (x) => x._catKey || 'other');
  }, [items]);

  const availableCats = useMemo(() => {
    const keys = Object.keys(CAT_STYLE);
    return keys.filter((k) => (catCounts.get(k) || 0) > 0);
  }, [catCounts]);

  // ✅ فلترة أولية: القسم فقط
  const baseFiltered = useMemo(() => {
    let arr = items;
    if (activeCat !== 'all') arr = arr.filter((x) => x._catKey === activeCat);
    return arr;
  }, [items, activeCat]);

  // ✅ استخراج المتاح للفروع من البيانات الحالية
  const subCounts = useMemo(() => {
    const out = {
      carMake: new Map(),
      phoneBrand: new Map(),
      dealType: new Map(),
      propertyType: new Map(),
    };

    for (const it of baseFiltered) {
      const t = it._tax;
      if (!t) continue;

      if (it._catKey === 'cars' && t.carMake) {
        out.carMake.set(t.carMake, (out.carMake.get(t.carMake) || 0) + 1);
      }
      if (it._catKey === 'phones' && t.phoneBrand) {
        out.phoneBrand.set(t.phoneBrand, (out.phoneBrand.get(t.phoneBrand) || 0) + 1);
      }
      if (it._catKey === 'realestate') {
        if (t.dealType) out.dealType.set(t.dealType, (out.dealType.get(t.dealType) || 0) + 1);
        if (t.propertyType) out.propertyType.set(t.propertyType, (out.propertyType.get(t.propertyType) || 0) + 1);
      }
    }

    return out;
  }, [baseFiltered]);

  // ✅ فلترة نهائية: هرمية
  const filtered = useMemo(() => {
    let arr = baseFiltered;

    if (activeCat === 'cars' && sub1) {
      arr = arr.filter((x) => x._tax?.carMake === sub1);
    }
    if (activeCat === 'phones' && sub1) {
      arr = arr.filter((x) => x._tax?.phoneBrand === sub1);
    }
    if (activeCat === 'realestate') {
      if (sub1) arr = arr.filter((x) => x._tax?.dealType === sub1);
      if (sub2) arr = arr.filter((x) => x._tax?.propertyType === sub2);
    }

    return arr;
  }, [baseFiltered, activeCat, sub1, sub2]);

  // ✅ تصفير الفروع عند تغيير القسم
  useEffect(() => {
    setSub1('');
    setSub2('');
  }, [activeCat]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>

      {/* الشريط الرئيسي للأقسام */}
      <div className="sooq-chips" role="tablist" aria-label="فلترة الأقسام">
        <button
          type="button"
          className={`sooq-chip ${activeCat === 'all' ? 'isActive' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          الكل <span className="sooq-chipCount">{items.length}</span>
        </button>

        {availableCats.map((k) => {
          const s = getCatStyle(k);
          const c = catCounts.get(k) || 0;
          return (
            <button
              key={k}
              type="button"
              className={`sooq-chip ${activeCat === k ? 'isActive' : ''}`}
              onClick={() => setActiveCat(k)}
              title={s.label}
            >
              <span className="sooq-chipDot" style={{ background: s.color }} />
              <span className="sooq-chipText">{s.label}</span>
              <span className="sooq-chipCount">{c}</span>
            </button>
          );
        })}
      </div>

      {/* فلاتر هرمية */}
      {activeCat === 'cars' && subCounts.carMake.size > 0 ? (
        <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة ماركات السيارات">
          {sub1 ? (
            <button type="button" className="sooq-chip" onClick={() => setSub1('')}>
              ↩ رجوع
            </button>
          ) : null}

          {CAR_MAKES.filter((m) => subCounts.carMake.get(m.key)).map((m) => (
            <button
              key={m.key}
              type="button"
              className={`sooq-chip ${sub1 === m.key ? 'isActive' : ''}`}
              onClick={() => setSub1(m.key)}
            >
              <span className="sooq-chipText">{m.label}</span>
              <span className="sooq-chipCount">{subCounts.carMake.get(m.key)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCat === 'phones' && subCounts.phoneBrand.size > 0 ? (
        <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة ماركات الجوالات">
          {sub1 ? (
            <button type="button" className="sooq-chip" onClick={() => setSub1('')}>
              ↩ رجوع
            </button>
          ) : null}

          {PHONE_BRANDS.filter((b) => subCounts.phoneBrand.get(b.key)).map((b) => (
            <button
              key={b.key}
              type="button"
              className={`sooq-chip ${sub1 === b.key ? 'isActive' : ''}`}
              onClick={() => setSub1(b.key)}
            >
              <span className="sooq-chipText">{b.label}</span>
              <span className="sooq-chipCount">{subCounts.phoneBrand.get(b.key)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeCat === 'realestate' && (subCounts.dealType.size > 0 || subCounts.propertyType.size > 0) ? (
        <>
          <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة بيع/إيجار">
            {(sub1 || sub2) ? (
              <button
                type="button"
                className="sooq-chip"
                onClick={() => {
                  setSub1('');
                  setSub2('');
                }}
              >
                ↩ رجوع
              </button>
            ) : null}

            {DEAL_TYPES.filter((d) => subCounts.dealType.get(d.key)).map((d) => (
              <button
                key={d.key}
                type="button"
                className={`sooq-chip ${sub1 === d.key ? 'isActive' : ''}`}
                onClick={() => {
                  setSub1(d.key);
                  setSub2('');
                }}
              >
                <span className="sooq-chipText">{d.label}</span>
                <span className="sooq-chipCount">{subCounts.dealType.get(d.key)}</span>
              </button>
            ))}
          </div>

          {sub1 ? (
            <div className="sooq-chips sooq-chips--sub" role="tablist" aria-label="فلترة نوع العقار">
              {PROPERTY_TYPES.filter((p) => subCounts.propertyType.get(p.key)).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`sooq-chip ${sub2 === p.key ? 'isActive' : ''}`}
                  onClick={() => setSub2(p.key)}
                >
                  <span className="sooq-chipText">{p.label}</span>
                  <span className="sooq-chipCount">{subCounts.propertyType.get(p.key)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {/* النتائج */}
      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        ✅ الظاهر الآن: {filtered.length} إعلان
      </div>

      <div className="sooq-grid" style={{ marginTop: 10 }}>
        {filtered.map((l) => {
          const img = pickImage(l);
          const id = l?.id ?? l?._id ?? l?.docId ?? l?.uid ?? l?.listingId;
          return (
            <Link key={String(id)} href={`/listing/${id}`} className="sooq-card">
              {img ? <img className="sooq-cardImg" src={img} alt={l.title || 'صورة'} loading="lazy" /> : null}
              <div className="sooq-cardBody">
                <div className="sooq-cardTitle">{l.title || 'بدون عنوان'}</div>
                <div className="sooq-cardMeta">{l.price ? `السعر: ${l.price}` : ''}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        .sooq-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
          align-items: center;
        }
        .sooq-chips--sub {
          margin-top: 8px;
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
          font-weight: 800;
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

        .sooq-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 900px) {
          .sooq-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          .sooq-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
        }
        .sooq-card {
          display: grid;
          gap: 8px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 10px 18px rgba(0,0,0,0.06);
        }
        .sooq-cardImg {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 12px;
          display: block;
        }
        .sooq-cardTitle {
          font-weight: 900;
          line-height: 1.2;
        }
        .sooq-cardMeta {
          font-size: 12px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
