import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
<<<<<<< copilot/add-bundle-analyzer-configuration
  // ✅ Mobile performance optimizations
=======
  // 🔧 إعدادات أساسية مضمونة
  swcMinify: true,
>>>>>>> main
  poweredByHeader: false,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // ✅ React 19 optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  
<<<<<<< copilot/add-bundle-analyzer-configuration
  // ✅ Disable source maps in production for mobile
=======
>>>>>>> main
  productionBrowserSourceMaps: false,
  compress: true,
  
<<<<<<< copilot/add-bundle-analyzer-configuration
  // ✅ Acknowledge webpack config for Next.js 16 (Turbopack is default, but webpack config is intentional)
  turbopack: {},
  
  // ✅ Webpack optimizations for mobile
  webpack: (config, { isServer, dev }) => {
    // Optimize chunking for mobile
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 70000, // ✅ Smaller for mobile
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|react-server-dom-webpack|scheduler)[\\/]/,
            priority: 40,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              return match ? `npm.${match[1].replace('@', '')}` : null;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
    }
    
    return config;
  },
  
  // Optimize chunking strategy
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-leaflet', 'leaflet', 'firebase'],
    
    // ✅ Additional optimizations
    optimizeCss: true,
    scrollRestoration: true,
    
    // ✅ Modern optimizations for mobile
    webpackBuildWorker: true,
    optimizeServerReact: true, // For React 19
  },
  
  // ✅ Optimize images for mobile
  images: {
    formats: ['image/webp', 'image/avif'],
    
    // ✅ Mobile-optimized device sizes (smaller)
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    
=======
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
>>>>>>> main
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
<<<<<<< copilot/add-bundle-analyzer-configuration
    
    // ✅ Mobile caching optimizations
    minimumCacheTTL: 3600, // Increased from 60 to 3600
    
    // ✅ Security improvements
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // ✅ Performance settings
    disableStaticImages: false,
    unoptimized: false,
  },
  
  // ✅ ISR optimizations for mobile
  env: {
    // ISR revalidation settings
    ISR_REVALIDATE: process.env.NODE_ENV === 'production' ? '3600' : '60',
    ISR_STALE_WHILE_REVALIDATE: '600',
  },
  
  // ✅ Mobile cache header optimizations
=======
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
>>>>>>> main
  async headers() {
    const cacheHeaders = [
      {
<<<<<<< copilot/add-bundle-analyzer-configuration
        source: '/:path*.(svg|jpg|jpeg|png|gif|ico|webp|avif)',
=======
        source: '/:path*.(jpg|jpeg|png|gif|ico|webp)',
>>>>>>> main
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
          },
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
        ],
      },
      {
<<<<<<< copilot/add-bundle-analyzer-configuration
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // ✅ HTML caching optimizations
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: `public, max-age=${process.env.NODE_ENV === 'production' ? '3600' : '0'}, s-maxage=3600, stale-while-revalidate=600`,
          },
        ],
      },
      {
        source: '/(products|categories|about|contact)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Security headers for all pages
=======
>>>>>>> main
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
<<<<<<< copilot/add-bundle-analyzer-configuration
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          // ✅ Mobile performance optimizations
          {
            key: 'Accept-CH',
            value: 'Device-Memory, Downlink, ECT, RTT, Viewport-Width, Width',
          },
          {
            key: 'Critical-CH',
            value: 'Device-Memory, Downlink, ECT, RTT, Viewport-Width, Width',
          },
=======
>>>>>>> main
        ],
      },
    ];

    return cacheHeaders;
  },
  
  // ✅ Additional mobile performance optimizations
  modularizeImports: {
    'react-icons/?(((\\w*)?/?)*)': {
      transform: 'react-icons/{{matches.[1]}}/{{member}}',
      skipDefaultConversion: true,
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
};

export default withBundleAnalyzer(nextConfig);
