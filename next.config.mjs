import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // تحسينات الأداء: إزالة الكونسول في الإنتاج
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // تحسينات البناء (تم حذف swcMinify لأنه مفعل تلقائياً)
  productionBrowserSourceMaps: false,
  compress: true,
  
  // تحسين استيراد المكتبات وتجزئة الحزم
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'react-leaflet', 
      'leaflet',
      'date-fns',
      '@mui/icons-material'
    ],
    // webpackBuildWorker: true, // فعل هذا الخيار فقط إذا كان لديك ذاكرة كافية في السيرفر
    scrollRestoration: true,
  },
  
  // إعدادات الصور المحسنة
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
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
    // تعطيل التحسين في وضع التطوير لتسريع العمل
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // تخزين مؤقت للملفات الثابتة (Caching Headers)
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        source: '/:path*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // إعدادات إضافية
  poweredByHeader: false,
  generateEtags: true,
};

export default withBundleAnalyzer(nextConfig);
