// app/sitemap.xml/route.js
// مولِّد خريطة الموقع (Sitemap) لمشروع Next.js (App Router)
// يدعم:
// 1) روابط ثابتة (الصفحة الرئيسية + الأقسام الأساسية)
// 2) روابط ديناميكية للإعلانات عن طريق استدعاء API جاهز مثلاً /api/ads

import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sooqyemen.com';

// لو عندك Endpoint جاهز يرجّع كل الإعلانات بصيغة JSON
// عدّل هذا الرابط حسب مشروعك (مثلاً /api/ads أو /api/listings)
const ADS_API_ENDPOINT = `${BASE_URL}/api/ads`;

export async function GET() {
  // 1) روابط ثابتة مهمّة لمحركات البحث
  const staticUrls = [
    '/',
    '/ads',
    '/add',
    '/cars',
    '/realestate',
    '/phones',
    '/solar',
    '/electronics',
    '/jobs',
    '/services',
  ];

  // 2) نحاول نجلب الإعلانات من API (اختياري)
  let dynamicUrls = [];
  try {
    const res = await fetch(ADS_API_ENDPOINT, { next: { revalidate: 60 } });

    if (res.ok) {
      const ads = await res.json();

      // نتوقع أن الـ API يرجع مصفوفة إعلانات مثل:
      // [{ id: 'abc123', slug: 'nice-car-for-sale', updatedAt: '2025-01-10T12:00:00Z' }, ...]
      dynamicUrls = ads.map((ad) => {
        const adPath = ad.slug
          ? `/ads/${ad.slug}`
          : `/ads/${ad.id}`;

        const lastMod = ad.updatedAt || ad.createdAt || null;

        return {
          loc: `${BASE_URL}${adPath}`,
          lastmod: lastMod,
        };
      });
    } else {
      console.error('Sitemap: ADS API returned status', res.status);
    }
  } catch (err) {
    console.error('Sitemap: error fetching ads from API:', err);
  }

  // 3) بناء ملف الـ XML
  const urlsXml = [
    // الروابط الثابتة
    ...staticUrls.map((path) => {
      return `
<url>
  <loc>${BASE_URL}${path}</loc>
  <changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq>
  <priority>${path === '/' ? '1.0' : '0.8'}</priority>
</url>`;
    }),
    // الروابط الديناميكية (الإعلانات)
    ...dynamicUrls.map(({ loc, lastmod }) => {
      return `
<url>
  <loc>${loc}</loc>
  ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>`;
    }),
  ].join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}