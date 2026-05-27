/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15+: moved out of experimental
  serverExternalPackages: ['face-api.js'],

  // Next.js 16 uses Turbopack by default.
  // Empty config tells Next we're aware and accept all Turbopack defaults.
  turbopack: {},

  // Webpack config kept for `next build --webpack` or local Webpack fallback.
  // face-api.js needs `fs` polyfilled as false in browser bundles, and
  // canvas marked as an external (not bundled) to avoid node-canvas issues.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
    };
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
