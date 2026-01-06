export const runtime = 'nodejs';
export const revalidate = 3600; // تحديث الخريطة كل ساعة

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sooqyemen.com';

  // 1) صفحات ثابتة + أقسام
  const staticDefs = [
    { path: '/', priority: 1.0, freq: 'daily' },

    { path: '/login', priority: 0.8, freq: 'monthly' },
    { path: '/register', priority: 0.8, freq: 'monthly' },
    { path: '/add', priority: 0.8, freq: 'monthly' },

    // أقسام (عدّلها حسب مسارات مشروعك الفعلية)
    { path: '/cars', priority: 0.8, freq: 'weekly' },
    { path: '/realestate', priority: 0.8, freq: 'weekly' }, // ✅ بدل real_estate
    { path: '/phones', priority: 0.8, freq: 'weekly' },
    { path: '/electronics', priority: 0.8, freq: 'weekly' },
    { path: '/solar', priority: 0.8, freq: 'weekly' },
    { path: '/furniture', priority: 0.8, freq: 'weekly' },
    { path: '/services', priority: 0.8, freq: 'weekly' },
  ];

  const now = new Date();

  const staticRoutes = staticDefs.map((r) => ({
    url: `${baseUrl}${r.path === '/' ? '' : r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // 2) روابط الإعلانات من Firestore
  let listingRoutes = [];
  try {
    // ✅ Dynamic import (أفضل للبناء على Vercel)
    const { db } = await import('@/lib/firebaseClient');

    const snapshot = await db
      .collection('listings') // تأكد أن اسم المجموعة listings
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    listingRoutes = snapshot.docs.map((doc) => {
      const data = doc.data?.() || {};

      const lastModified =
        (data.updatedAt?.toDate && data.updatedAt.toDate()) ||
        (data.createdAt?.toDate && data.createdAt.toDate()) ||
        now;

      return {
        url: `${baseUrl}/listing/${doc.id}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      };
    });
  } catch (error) {
    console.error('Sitemap Generation Error:', error);
  }

  return [...staticRoutes, ...listingRoutes];
}
