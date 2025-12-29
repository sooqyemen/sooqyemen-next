// app/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import CategoryBar from '@/components/CategoryBar';
import ListingCard from '@/components/ListingCard';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { registerSiteVisit } from '@/lib/analytics';

// الأقسام الافتراضية (في حال ما رجعت من Firestore)
const DEFAULT_CATEGORIES = [
  { slug: 'cars',          name: 'سيارات' },
  { slug: 'real_estate',   name: 'عقارات' },
  { slug: 'phones',        name: 'جوالات' },
  { slug: 'jobs',          name: 'وظائف' },
  { slug: 'solar',         name: 'طاقة شمسية' },
  { slug: 'furniture',     name: 'أثاث' },
  { slug: 'animals',       name: 'مواشي وحيوانات' },
  { slug: 'electronics',   name: 'إلكترونيات' },
  { slug: 'bikes',         name: 'دراجات' },
  { slug: 'yemeni_goods',  name: 'منتجات يمنية' },
  { slug: 'services',      name: 'خدمات' },
];

export default function HomePage() {
  const { user } = useAuth();

  const [activeCat, setActiveCat] = useState('all');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState('');

  // تسجيل زيارة للموقع
  useEffect(() => {
    registerSiteVisit(user).catch(() => {});
  }, [user?.uid]);

  // جلب الأقسام من Firestore (مع fallback للأقسام الافتراضية)
  useEffect(() => {
    const unsubscribe = db
      .collection('categories')
      .orderBy('order', 'asc')
      .onSnapshot(
        (snap) => {
          const arr = snap
            .docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => c.active !== false);

          if (arr.length) {
            setCategories(arr.map((c) => ({ slug: c.slug, name: c.name })));
          } else {
            setCategories(DEFAULT_CATEGORIES);
          }
        },
        () => {
          setCategories(DEFAULT_CATEGORIES);
        },
      );

    return () => unsubscribe();
  }, []);

  // جلب الإعلانات الأحدث
  useEffect(() => {
    const unsubscribe = db
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(60)
      .onSnapshot((snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListings(arr);
      });

    return () => unsubscribe();
  }, []);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.name])),
    [categories],
  );

  // فلترة الإعلانات حسب القسم والبحث
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return listings
      .filter((l) => l.isActive !== false)
      .filter((l) => (activeCat === 'all' ? true : l.category === activeCat))
      .filter((l) => {
        if (!qq) return true;

        const title = String(l.title || '').toLowerCase();
        const description = String(l.description || '').toLowerCase();
        const city = String(l.city || '').toLowerCase();

        return (
          title.includes(qq) ||
          description.includes(qq) ||
          city.includes(qq)
        );
      })
      .map((l) => ({
        ...l,
        categoryName: catMap.get(l.category) || l.category,
      }));
  }, [listings, activeCat, q, catMap]);

  return (
    <>
      <Header />

      <main className="container">
        {/* قسم البطل (Hero) */}
        <section className="card" style={{ background: '#f8fafc' }}>
          <h1 style={{ fontWeight: 900, fontSize: 20, margin: 0 }}>
            سوق اليمن – بيع وشراء كل شيء في اليمن
          </h1>

          <p
            className="muted"
            style={{ marginTop: 4, marginBottom: 0, fontSize: 14 }}
          >
            منصة إعلانات مبوبة لبيع وشراء العقارات، السيارات، الجوالات،
            الطاقة الشمسية، الوظائف، الأثاث والمزيد في جميع محافظات اليمن.
          </p>

          {/* مربع البحث */}
          <div className="row" style={{ marginTop: 12 }}>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المنتج، المدينة، القسم..."
            />
          </div>

          {/* شريط الأقسام مع الأيقونات */}
          <div style={{ marginTop: 10 }}>
            <CategoryBar
              categories={categories}
              active={activeCat}
              onChange={setActiveCat}
            />
          </div>
        </section>

        {/* قائمة الإعلانات */}
        <section style={{ marginTop: 14 }} aria-label="قائمة الإعلانات">
          {filtered.length === 0 ? (
            <div className="card muted">لا توجد إعلانات حالياً</div>
          ) : (
            <div className="grid">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
