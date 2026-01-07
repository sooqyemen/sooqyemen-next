// components/StructuredData/ListingJsonLd.jsx
export default function ListingJsonLd({ listing }) {
  if (!listing) return null;

  const price = listing.priceYER || listing.currentBidYER || 0;
  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const url = `https://sooqyemen.com/listing/${listing.id}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title || 'إعلان',
    description: listing.description || '',
    image: images,
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: listing.currency || 'YER',
      availability: 'https://schema.org/InStock',
      url: url,
      ...(listing.city && {
        availableAtOrFrom: {
          '@type': 'Place',
          name: listing.city,
        },
      }),
    },
    ...(listing.category && {
      category: listing.category,
    }),
  };

  // إذا كان مزاد، نضيف معلومات المزاد
  if (listing.auctionEnabled) {
    structuredData['@type'] = 'Product';
    structuredData.offers = {
      ...structuredData.offers,
      '@type': 'AggregateOffer',
      lowPrice: price,
      priceCurrency: listing.currency || 'YER',
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
