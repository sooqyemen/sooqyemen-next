// components/StructuredData/WebsiteJsonLd.jsx
export default function WebsiteJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'سوق اليمن',
    alternateName: 'Sooq Yemen',
    url: 'https://sooqyemen.com',
    description: 'أكبر منصة للإعلانات والمزادات في اليمن - بيع وشراء السيارات، العقارات، الجوالات، الإلكترونيات وأكثر',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://sooqyemen.com/?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
