import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 🔧 إعدادات أساسية مضمونة
  swcMinify: true,
  poweredByHeader: false,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  productionBrowserSourceMaps: false,
  compress: true,
  
  // ✅ إعدادات آمنة
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-leaflet', 'leaflet'],
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // 🖼️ إعدادات الصور المحسنة
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
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
        hostname: 'sooqyemen.com',
      },
      {
        protocol: 'https',
        hostname: 'www.sooqyemen.com',
      },
    ],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false, // ⚠️ تعطيل SVG مؤقتاً للأمان
  },
  
  // 📦 تحسين Webpack للموبايل
  webpack: (config, { isServer, dev }) => {
    // تحسين chunking للموبايل
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        cacheGroups: {
          default: false,
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|react-server-dom-webpack)[\\/]/,
            priority: 40,
            enforce: true,
          },
          leaflet: {
            name: 'leaflet',
            test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
            priority: 30,
          },
          firebase: {
            name: 'firebase',
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            priority: 20,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },
  
  // 🛡️ إعدادات الأمان والتخزين المؤقت
  async headers() {
    return [
      {
        source: '/:path*.(jpg|jpeg|png|gif|ico|webp)',
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
        source: '/:path*',
        headers: [
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
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
