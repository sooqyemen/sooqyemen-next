import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // تحسينات البناء
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  
  // تحسين تجزئة الحزم (Chunking) - محسنة
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'react-leaflet', 
      'leaflet',
      // يمكن إضافة المزيد من الحزم الثقيلة هنا
      '@mui/icons-material',
      'date-fns'
    ],
    optimizeCss: true,
    scrollRestoration: true,
    webpackBuildWorker: true,
    // إضافة إعدادات أداء مستقرة
    esmExternals: true, // تحسين التعامل مع الحزم الخارجية
  },
  
  // تحسينات الصور - محسنة
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Firebase Storage
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**', // أكثر تحديداً للأداء
      },
      // Google user photos
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Domain images
      {
        protocol: 'https',
        hostname: 'sooqyemen.com',
      },
      {
        protocol: 'https',
        hostname: 'www.sooqyemen.com',
      },
    ],
    minimumCacheTTL: 86400, // 24 ساعة
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // إضافة تحسينات جديدة
    unoptimized: process.env.NODE_ENV === 'development', // تعطيل التحسين في التطوير للأداء
  },
  
  // تحسينات التخزين المؤقت والأمان - محسنة
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
      },
    ];

    // في بيئة الإنتاج، أضف HSTS
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        // تحسين التخزين المؤقت للصور
        source: '/:path*.(jpg|jpeg|png|gif|ico|webp|avif|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // تحسين التخزين المؤقت للأصول الثابتة
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // تحسين التخزين المؤقت لصور Next.js
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // تحسين التخزين المؤقت للخطوط
        source: '/:path*.(woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // تحسين التخزين المؤقت لملفات CSS وJS
        source: '/:path*.(css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production' 
              ? 'public, max-age=31536000, immutable' 
              : 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // أمان لجميع الصفحات
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // إضافة تحسينات الترحيل (مشروطة)
  ...(process.env.NEXT_PUBLIC_ENABLE_I18N === 'true' && {
    i18n: {
      locales: ['ar', 'en'],
      defaultLocale: 'ar',
      localeDetection: false,
    },
  }),
  
  // تحسينات إضافية للأداء
  poweredByHeader: false,
  generateEtags: true,
  
  // تحسينات لبيئة التطوير
  onDemandEntries: {
    // حافظ على الصفحات في الذاكرة لمدة أطول في التطوير
    maxInactiveAge: 60 * 60 * 1000, // ساعة واحدة
    pagesBufferLength: 10,
  },
};

export default withBundleAnalyzer(nextConfig);
