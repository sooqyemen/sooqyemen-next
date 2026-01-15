// 📁 /app/robots.txt/route.js
export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sooqyemen.com').replace(/\/+$/, '');

  const content = `# Sooq Yemen
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml

# Disallow admin and private pages
Disallow: /admin/
Disallow: /add/
Disallow: /edit-listing/
Disallow: /my-listings/
Disallow: /my-chats/
Disallow: /chat/
Disallow: /profile/
Disallow: /payout/
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
