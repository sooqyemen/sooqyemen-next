'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import ListingCard from '@/components/ListingCard';
import { normalizeCategoryKey, getCategoryLabel } from '@/lib/categories';

function pickFacet(listing, categoryKey) {
  const c = normalizeCategoryKey(categoryKey || listing?.category);

  // Cars: prefer make then model
  if (c === 'cars') {
    return [
      { field: 'carMake', value: listing?.carMake || null },
      { field: 'carModel', value: listing?.carModel || null },
    ];
  }

  // Realestate: dealType then propertyType
  if (c === 'realestate') {
    return [
      { field: 'dealType', value: listing?.dealType || null },
      { field: 'propertyType', value: listing?.propertyType || null },
    ];
  }

  // Single-facet categories
  const map = {
    phones: 'phoneBrand',
    electronics: 'electronicsType',
    motorcycles: 'motorcycleBrand',
    heavy_equipment: 'heavyEquipmentType',
    solar: 'solarType',
    networks: 'networkType',
    maintenance: 'maintenanceType',
    furniture: 'furnitureType',
    home_tools: 'homeToolsType',
    clothes: 'clothesType',
    animals: 'animalType',
    jobs: 'jobType',
    services: 'serviceType',
  };

  const field = map[c];
  if (!field) return [];
  return [{ field, value: listing?.[field] || null }];
}

export default function RelatedListings({ listing, limit = 8 }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const categoryKey = useMemo(() => normalizeCategoryKey(listing?.category), [listing?.category]);
  const title = useMemo(() => `إعلانات مشابهة في قسم ${getCategoryLabel(categoryKey)}`, [categoryKey]);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setErr('');
        if (!listing?.id || !categoryKey) {
          setRows([]);
          return;
        }

        // ✅ Query latest in same category (fast + غالبًا موجود عندك index)
        const snap = await db
          .collection('listings')
          .where('category', '==', categoryKey)
          .orderBy('createdAt', 'desc')
          .limit(40)
          .get();

        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((x) => x && x.id && x.isActive !== false && !x.hidden);

        // Exclude current
        const candidates = all.filter((x) => x.id !== listing.id);

        // Prefer same facet values
        const facets = pickFacet(listing, categoryKey).filter((f) => f.value);
        let preferred = candidates;

        for (const f of facets) {
          const same = preferred.filter((x) => x?.[f.field] === f.value);
          if (same.length >= 4) {
            preferred = same;
            break;
          }
        }

        const out = (preferred.length ? preferred : candidates).slice(0, Math.max(0, Number(limit) || 8));
        if (!alive) return;
        setRows(out);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message || 'تعذر تحميل الإعلانات المشابهة');
        setRows([]);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [listing?.id, categoryKey, limit]);

  if (!listing?.id) return null;
  if (!rows.length && !err) return null;

  return (
    <div className="relBox">
      <div className="relHead">
        <h2 className="relTitle">{title}</h2>
        <div className="relSub muted">اختيارات مقترحة بناءً على نفس القسم ومواصفات قريبة</div>
      </div>

      {err ? <div className="muted" style={{ marginTop: 10 }}>{err}</div> : null}

      <div className="relGrid" style={{ marginTop: 12 }}>
        {rows.map((l) => (
          <ListingCard key={l.id} listing={l} variant="grid" />
        ))}
      </div>

      <style jsx>{`
        .relBox{
          margin-top: 18px;
          padding: 14px;
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 16px;
        }
        .relTitle{
          margin: 0;
          font-weight: 900;
          font-size: 16px;
        }
        .relSub{
          margin-top: 4px;
          font-size: 12px;
        }
        .relGrid{
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        @media (max-width: 768px){
          .relGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
