// app/robots.txt/route.js
export async function GET() {
  const robotsTxt = `# سوق اليمن - Sooq Yemen
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://sooqyemen.com/sitemap.xml
Sitemap: https://www.sooqyemen.com/sitemap.xml

# Disallow admin and private pages
Disallow: /admin
Disallow: /add
Disallow: /edit-listing
Disallow: /my-listings
Disallow: /my-chats
Disallow: /chat
Disallow: /profile
Disallow: /payout

# Crawl-delay
Crawl-delay: 1
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
