// app/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import CategoryBar from '@/components/CategoryBar';
import ListingCard from '@/components/ListingCard';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { registerSiteVisit } from '@/lib/analytics';

const DEFAULT_CATEGORIES = [
  { slug: 'cars', name: 'سيارات' },
  { slug: 'real_estate', name: 'عقارات' },
  { slug: 'phones', name: 'جوالات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'yemeni_products', name: 'منتجات يمنية' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [activeCat, setActiveCat] = useState('all');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    // سجل زيارة الموقع (حتى لو ما في تسجيل دخول)
    registerSiteVisit(user).catch(()=>{});
  }, [user?.uid]);

  useEffect(() => {
    const unsub = db.collection('categories').orderBy('order', 'asc').onSnapshot((snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false);
      if (arr.length) setCategories(arr.map(c => ({ slug: c.slug, name: c.name })));
      else setCategories(DEFAULT_CATEGORIES);
    }, () => setCategories(DEFAULT_CATEGORIES));
    return () => unsub();
  }, []);

  useEffect(() => {
    let ref = db.collection('listings').orderBy('createdAt', 'desc').limit(60);
    const unsub = ref.onSnapshot((snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setListings(arr);
    });
    return () => unsub();
  }, []);

  const catMap = useMemo(() => {
    const m = new Map(categories.map(c => [c.slug, c.name]));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return listings
      .filter(l => l.isActive !== false)
      .filter(l => activeCat === 'all' ? true : (l.category === activeCat))
      .filter(l => !qq ? true : String(l.title || '').toLowerCase().includes(qq) || String(l.description || '').toLowerCase().includes(qq))
      .map(l => ({ ...l, categoryName: catMap.get(l.category) || l.category }));
  }, [listings, activeCat, q, catMap]);

  return (
    <>
      <Header />
      <div className="container">
        <div className="card" style={{ background:'#f8fafc' }}>
          <div style={{ fontWeight:900, fontSize:20 }}>بيع واشتري كل شيء في اليمن</div>
          <div className="muted" style={{ marginTop:4 }}>نسخة Next.js منظمة (خريطة + مزاد + 3 عملات + مشاهدات + دردشة)</div>
          <div className="row" style={{ marginTop:12 }}>
            <input className="input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="ابحث عن إعلان..." />
          </div>
          <div style={{ marginTop:10 }}>
            <CategoryBar categories={categories} active={activeCat} onChange={setActiveCat} />
          </div>
        </div>

        <div style={{ marginTop:14 }} className="grid">
          {filtered.length === 0 ? (
            <div className="card muted">لا توجد إعلانات حالياً</div>
          ) : filtered.map(l => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
    </>
  );
}
