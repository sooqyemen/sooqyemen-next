// 📁 /app/sitemap.xml/route.js
import { fetchListingIdsForSitemap } from '../../lib/firestoreRest';

const SITE_URL = 'https://www.sooqyemen.com';

// Category pages
const CATEGORIES = [
  'cars',
  'realestate',
  'phones',
  'electronics',
  'motorcycles',
  'heavy_equipment',
  'solar',
  'networks',
  'maintenance',
  'furniture',
  'home_tools',
  'clothes',
  'animals',
  'animals-birds',
  'jobs',
  'services',
  'other',
];

// Static pages
const STATIC_PAGES = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/listings', priority: 0.9, changefreq: 'daily' },
  { url: '/categories', priority: 0.7, changefreq: 'weekly' },
  { url: '/about', priority: 0.5, changefreq: 'monthly' },
  { url: '/contact', priority: 0.5, changefreq: 'monthly' },
  { url: '/help', priority: 0.5, changefreq: 'monthly' },
  { url: '/terms', priority: 0.3, changefreq: 'yearly' },
  { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
];

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const nowIso = new Date().toISOString();

  try {
    const listingIds = await fetchListingIdsForSitemap(500);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + page.url)}</loc>\n`;
      xml += `    <lastmod>${escapeXml(nowIso)}</lastmod>\n`;
      xml += `    <changefreq>${escapeXml(page.changefreq)}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Category pages
    for (const category of CATEGORIES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/' + category)}</loc>\n`;
      xml += `    <lastmod>${escapeXml(nowIso)}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Listing pages
    for (const listing of listingIds || []) {
      if (!listing?.id) continue;

      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/listing/' + encodeURIComponent(listing.id))}</loc>\n`;

      const lastmod = listing.updatedAt || nowIso; // نتركه ISO كامل
      xml += `    <lastmod>${escapeXml(lastmod)}</lastmod>\n`;

      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>\n';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[sitemap.xml] Error generating sitemap:', error);

    // Basic sitemap on error
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + page.url)}</loc>\n`;
      xml += `    <lastmod>${escapeXml(nowIso)}</lastmod>\n`;
      xml += `    <changefreq>${escapeXml(page.changefreq)}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    for (const category of CATEGORIES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/' + category)}</loc>\n`;
      xml += `    <lastmod>${escapeXml(nowIso)}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>\n';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  }
}
