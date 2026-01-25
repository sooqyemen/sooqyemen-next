// app/listing/[id]/page.js
import { fetchListingById, fetchRelatedListings } from '@/lib/firestoreRest';
import { getCurrentUser } from '@/lib/auth';
import HomeMapView from '@/components/Map/HomeMapView';
import ImageGallery from '@/components/Listing/ImageGallery';
import ContactButtons from '@/components/Listing/ContactButtons';
import ShareButtons from '@/components/Listing/ShareButtons';
import SimilarListings from '@/components/Listing/SimilarListings';
import ListingActions from '@/components/Listing/ListingActions';
import ReportModal from '@/components/Listing/ReportModal';
import Breadcrumb from '@/components/UI/Breadcrumb';
import Badge from '@/components/UI/Badge';
import { 
  getCategoryInfo, 
  formatPrice, 
  formatDate, 
  calculateTimeAgo 
} from '@/lib/utils';

// تحديث الصفحة من السيرفر كل دقيقتين
export const revalidate = 120;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sooqyemen.com';

function toAbsoluteUrl(src) {
  const s = String(src || '').trim();
  if (!s) return `${BASE_URL}/images/default-listing.jpg`;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s}`;
}

// توليد البيانات الوصفية لمحركات البحث
export async function generateMetadata({ params }) {
  const { id } = await params;
  let listing = null;

  try {
    if (id) listing = await fetchListingById(id);
  } catch (error) {
    console.error('[generateMetadata] Failed to fetch listing:', error);
  }

  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.',
      robots: { index: false, follow: false },
    };
  }

  const titleText = listing.title || 'إعلان';
  const title = `${titleText} | سوق اليمن`;

  const priceVal = listing.priceYER || listing.currentBidYER || 0;
  const priceString = priceVal > 0 ? `${formatPrice(priceVal)} ريال` : 'على السوم';
  const city = listing.city || listing.locationLabel || 'اليمن';
  const category = getCategoryInfo(listing.category)?.nameAr || 'عام';

  const description = listing.description
    ? `${String(listing.description).slice(0, 160)}... | السعر: ${priceString} | الموقع: ${city} | القسم: ${category}`
    : `${titleText} - ${priceString} في ${city} - قسم ${category} - سوق اليمن`;

  const imageList = Array.isArray(listing.images)
    ? listing.images
    : listing.image
    ? [listing.image]
    : [];

  const rawImages = imageList.length > 0 ? imageList.slice(0, 4) : ['/images/default-listing.jpg'];
  const imagesAbs = rawImages.map(toAbsoluteUrl);
  const url = `${BASE_URL}/listing/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ar_YE',
      siteName: 'سوق اليمن',
      images: imagesAbs.map((img) => ({
        url: img,
        alt: titleText,
        width: 1200,
        height: 630,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imagesAbs[0]],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    keywords: [
      'سوق اليمن',
      'إعلانات',
      titleText,
      city,
      category,
      'بيع',
      'شراء',
      ...(listing.tags || []),
    ].filter(Boolean).join(', '),
    authors: [{ name: 'سوق اليمن' }],
    publisher: 'سوق اليمن',
  };
}

// توليد المسارات الثابتة
export async function generateStaticParams() {
  try {
    // يمكنك استبدال هذا باستدعاء API للحصول على جميع معرفات الإعلانات
    // هذه مجرد مثال
    const listings = await fetchRecentListings(100); // افترض وجود هذه الدالة
    return listings.map((listing) => ({
      id: listing.id,
    }));
  } catch (error) {
    return [];
  }
}

// صفحة تفاصيل الإعلان الرئيسية
export default async function ListingDetailsPage({ params }) {
  const { id } = await params;
  
  let listing = null;
  let relatedListings = [];
  let currentUser = null;
  let isOwner = false;

  try {
    // جلب البيانات بشكل متوازي لتحسين الأداء
    const [listingData, userData] = await Promise.allSettled([
      fetchListingById(id),
      getCurrentUser()
    ]);

    if (listingData.status === 'fulfilled') {
      listing = listingData.value;
      
      // جلب الإعلانات المشابهة إذا كان الإعلان موجوداً
      if (listing) {
        const related = await fetchRelatedListings(listing);
        if (related.status === 'fulfilled') {
          relatedListings = related.value || [];
        }
      }
    }

    if (userData.status === 'fulfilled') {
      currentUser = userData.value;
      // التحقق إذا كان المستخدم الحالي هو صاحب الإعلان
      if (listing && currentUser && listing.userId === currentUser.id) {
        isOwner = true;
      }
    }
  } catch (error) {
    console.error('[ListingDetailsPage] Error fetching data:', error);
  }

  // إذا لم يتم العثور على الإعلان
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">الإعلان غير موجود</h1>
            <p className="text-gray-600 mb-8">
              الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.
            </p>
            <a 
              href="/" 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة للرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }

  // تحضير بيانات الإعلان
  const categoryInfo = getCategoryInfo(listing.category);
  const price = formatPrice(listing.priceYER || 0);
  const timeAgo = calculateTimeAgo(listing.createdAt);
  const locationText = `${listing.city || ''} ${listing.governorateNameAr || ''}`.trim();
  
  // تحضير صور الإعلان
  const images = Array.isArray(listing.images) && listing.images.length > 0 
    ? listing.images 
    : listing.image 
      ? [listing.image] 
      : [];

  // تحضير بيانات الخريطة
  const mapListings = [listing, ...relatedListings.slice(0, 10)];
  const hasLocation = listing.lat && listing.lng;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <Breadcrumb 
          items={[
            { label: 'الرئيسية', href: '/' },
            { label: categoryInfo?.nameAr || 'الفئة', href: `/category/${listing.category}` },
            { label: listing.title, href: `#` },
          ]}
        />
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* العمود الأيسر - المحتوى الرئيسي */}
          <div className="lg:col-span-2 space-y-8">
            {/* بطاقة المعلومات الرئيسية */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* شريط الحالة والإجراءات */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Badge 
                    type={listing.status === 'active' ? 'success' : 'warning'}
                    label={listing.status === 'active' ? 'نشط' : 'معلق'}
                  />
                  <span className="text-sm text-gray-500">
                    {timeAgo}
                  </span>
                  {listing.isFeatured && (
                    <Badge type="premium" label="مميز" icon="⭐" />
                  )}
                </div>
                
                <ListingActions 
                  listingId={id}
                  isOwner={isOwner}
                  currentUser={currentUser}
                  listing={listing}
                />
              </div>

              {/* معرض الصور */}
              <div className="p-4">
                <ImageGallery 
                  images={images}
                  title={listing.title}
                  featuredImage={listing.featuredImage}
                />
              </div>

              {/* معلومات الإعلان */}
              <div className="px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {listing.title}
                </h1>

                {/* السعر */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {price}
                    </span>
                    <span className="text-gray-500">ريال يمني</span>
                  </div>
                  {listing.isNegotiable && (
                    <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      السعر قابل للتفاوض
                    </span>
                  )}
                </div>

                {/* المعلومات الأساسية */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <InfoItem label="الفئة" value={categoryInfo?.nameAr} icon="📁" />
                  <InfoItem label="الحالة" value={listing.condition} icon="🏷️" />
                  <InfoItem label="الموقع" value={locationText} icon="📍" />
                  <InfoItem label="تاريخ النشر" value={formatDate(listing.createdAt)} icon="📅" />
                  {listing.brand && <InfoItem label="الماركة" value={listing.brand} icon="🏢" />}
                  {listing.model && <InfoItem label="الموديل" value={listing.model} icon="🚗" />}
                  {listing.year && <InfoItem label="السنة" value={listing.year} icon="📅" />}
                </div>

                {/* الوصف */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📝</span> الوصف
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {listing.description || 'لا يوجد وصف متوفر.'}
                    </p>
                  </div>
                </div>

                {/* المواصفات (إن وجدت) */}
                {listing.specifications && Object.keys(listing.specifications).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>⚙️</span> المواصفات
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(listing.specifications).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <span className="text-sm text-gray-600 block mb-1">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* معلومات المعلن */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>👤</span> معلومات المعلن
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {listing.userName || 'معلن'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    عضو منذ {formatDate(listing.userJoinedDate || listing.createdAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {listing.isVerifiedSeller && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ✅ موثق
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {listing.userListingsCount || 0} إعلانات
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الأيمن - المعلومات الجانبية */}
          <div className="space-y-8">
            {/* أزرار التواصل */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <ContactButtons 
                phoneNumber={listing.phoneNumber}
                whatsapp={listing.whatsapp}
                showPhone={!currentUser || currentUser.id !== listing.userId}
                listingTitle={listing.title}
              />
              
              <div className="mt-6">
                <ShareButtons 
                  title={listing.title}
                  url={`${BASE_URL}/listing/${id}`}
                  description={listing.description}
                />
              </div>

              {/* زر التبليغ */}
              <div className="mt-6">
                <ReportModal 
                  listingId={id}
                  listingTitle={listing.title}
                  currentUser={currentUser}
                />
              </div>
            </div>

            {/* الخريطة */}
            {hasLocation && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-6 border-b border-gray-100 flex items-center gap-2">
                  <span>🗺️</span> الموقع على الخريطة
                </h3>
                <div className="p-4">
                  <HomeMapView 
                    listings={mapListings}
                    autoOpen={true}
                    selectedListingId={id}
                    initialCenter={[listing.lat, listing.lng]}
                    initialZoom={14}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الإعلانات المشابهة */}
        {relatedListings.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🔥</span> إعلانات مشابهة
              </h2>
              <a 
                href={`/category/${listing.category}`} 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                عرض المزيد →
              </a>
            </div>
            <SimilarListings listings={relatedListings} currentListingId={id} />
          </div>
        )}

        {/* نصائح الأمان */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <span>⚠️</span> نصائح أمان مهمة
          </h3>
          <ul className="text-yellow-700 space-y-2 text-sm">
            <li>• لا تحول أي مبلغ قبل معاينة السلعة</li>
            <li>• تأكد من هوية البائع عند التواصل</li>
            <li>• قابل البائع في مكان عام وآمن</li>
            <li>• احذر من العروض التي تبدو جيدة جداً</li>
            <li>• قم بفحص السلعة جيداً قبل الشراء</li>
          </ul>
        </div>
      </div>

      {/* ترويسة SEO إضافية */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: listing.title,
            description: listing.description?.substring(0, 200),
            image: images[0] ? toAbsoluteUrl(images[0]) : undefined,
            offers: {
              '@type': 'Offer',
              price: listing.priceYER,
              priceCurrency: 'YER',
              availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            },
            seller: {
              '@type': 'Person',
              name: listing.userName || 'معلن',
            },
            areaServed: {
              '@type': 'City',
              name: listing.city || 'اليمن',
            },
            category: categoryInfo?.nameAr,
          }),
        }}
      />
    </div>
  );
}

// مكون مساعد لعرض عنصر المعلومات
function InfoItem({ label, value, icon }) {
  if (!value) return null;
  
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

// دالة مساعدة لجلب الإعلانات الحديثة (مثال)
async function fetchRecentListings(limit = 100) {
  try {
    // استبدل هذا باستدعاء API فعلي
    return [];
  } catch {
    return [];
  }
}
