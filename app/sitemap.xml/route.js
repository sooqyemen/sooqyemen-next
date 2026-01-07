// app/sitemap.xml/route.js
import { fetchListingIdsForSitemap } from '@/lib/firestoreRest';

const SITE_URL = 'https://sooqyemen.com';

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
  'jobs',
  'services',
  'other',
];

// Static pages
const STATIC_PAGES = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/listings', priority: 0.9, changefreq: 'daily' },
  { url: '/about', priority: 0.5, changefreq: 'monthly' },
  { url: '/contact', priority: 0.5, changefreq: 'monthly' },
  { url: '/help', priority: 0.5, changefreq: 'monthly' },
  { url: '/terms', priority: 0.3, changefreq: 'yearly' },
  { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    // Fetch recent listings
    const listingIds = await fetchListingIdsForSitemap(500);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + page.url)}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Add category pages
    for (const category of CATEGORIES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/' + category)}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Add listing pages
    for (const listing of listingIds) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/listing/' + listing.id)}</loc>\n`;
      if (listing.updatedAt) {
        xml += `    <lastmod>${escapeXml(listing.updatedAt.split('T')[0])}</lastmod>\n`;
      }
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[sitemap.xml] Error generating sitemap:', error);

    // Return basic sitemap on error
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of STATIC_PAGES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + page.url)}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    for (const category of CATEGORIES) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + '/' + category)}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    });
  }
}
