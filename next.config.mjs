import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations - محسنة
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // تحسينات البناء
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  
  // تحسين تجزئة الحزم (Chunking)
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'react-leaflet', 
      'leaflet',
      '@mui/material',
      '@mui/icons-material',
      '@firebase/*'
    ],
    optimizeCss: true,
    scrollRestoration: true,
    webpackBuildWorker: true,
    // إضافة إعدادات أداء جديدة
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    optimizeServerReact: true,
  },
  
  // تحسينات الصور
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sooqyemen.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.sooqyemen.com',
        pathname: '/**',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24, // 24 ساعة بدلاً من 60 ثانية
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // تحسينات التخزين المؤقت والأمان
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
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
      // إضافة أمان إضافي
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ];

    return [
      {
        // تحسين التخزين المؤقت للصور والأصول
        source: '/:path*(.jpg|.jpeg|.png|.gif|.ico|.webp|.avif|.svg|.css|.js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // أمان لجميع الصفحات
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // تخزين مؤقت خاص لملفات الخطوط
        source: '/:path*(.woff|.woff2|.ttf|.eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // إعدادات Webpack إضافية للأداء
  webpack: (config, { isServer, dev }) => {
    // تقسيم الحزم بشكل أكثر كفاءة
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // تحسينات الترجمة التلقائية
  i18n: process.env.NEXT_PUBLIC_ENABLE_I18N === 'true' ? {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
    localeDetection: false, // تحسين الأداء
  } : undefined,
};

export default withBundleAnalyzer(nextConfig);
