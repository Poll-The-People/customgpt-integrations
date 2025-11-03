import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for serverless deployment
  output: 'standalone',

  // Turbopack configuration (empty to silence warning)
  turbopack: {},

  // External packages for server components (not bundled)
  serverExternalPackages: ['ffmpeg-static'],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'models.readyplayer.me',
        pathname: '/**',
      },
    ],
  },

  // Webpack configuration for ONNX Runtime and WASM files
  webpack: (config, { isServer }) => {
    // Handle .node files for native modules
    config.resolve.extensions.push('.node');

    // Don't parse onnxruntime-web - it has dynamic imports
    config.module.noParse = [
      /onnxruntime-web/,
      /onnxruntime-common/,
    ];

    // External ONNX runtime modules for server-side
    if (isServer) {
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'onnxruntime-web': 'commonjs onnxruntime-web',
      });
    }

    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  // Headers for security, CORS, and COOP/COEP for SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
      {
        // Strict COEP for SharedArrayBuffer (required for ONNX Runtime WASM with threads)
        // This enables VAD to work properly
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Allow cross-origin resources (WASM files, external images)
        source: '/(.*).(wasm|onnx|png|jpg|jpeg|gif|svg|webp)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
