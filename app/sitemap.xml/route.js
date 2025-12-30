// app/sitemap.xml/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

const BASE_URL = 'https://sooqyemen.com';

export async function GET() {
  // روابط ثابتة (الصفحة الرئيسية والأقسام الرئيسية)
  const staticUrls = [
    {
      loc: `${BASE_URL}/`,
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      loc: `${BASE_URL}/ads`,
      changefreq: 'weekly',
      priority: 0.9,
    },
    {
      loc: `${BASE_URL}/add`,
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      loc: `${BASE_URL}/cars`,
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      loc: `${BASE_URL}/realestate`,
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      loc: `${BASE_URL}/phones`,
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      loc: `${BASE_URL}/solar`,
      changefreq: 'weekly',
      priority: 0.8,
    },
  ];

  const urls = [...staticUrls];

  // 🔥 إضافة روابط جميع الإعلانات من Firebase
  try {
    // لو اسم التجميعة غير "ads" غيّرها هنا
    const adsSnapshot = await db.collection('ads').get();

    adsSnapshot.forEach((doc) => {
      urls.push({
        loc: `${BASE_URL}/ad/${doc.id}`,
        changefreq: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Error generating dynamic sitemap from Firestore:', error);
    // لو صار خطأ، نرجع فقط الروابط الثابتة ولا نوقف الخريطة
  }

  // 🧱 إنشاء XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
