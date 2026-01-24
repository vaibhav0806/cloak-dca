import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack for WASM support
  webpack: (config, { isServer }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Mark privacycash and its dependencies as external for server-side only
    if (isServer) {
      config.externals = config.externals || [];
      // These packages should only run on the server
      config.externals.push('privacycash', '@lightprotocol/hasher.rs', 'node-localstorage');
    }

    return config;
  },

  // Opt out of Turbopack for WASM support (use webpack instead)
  // Remove this once Turbopack has full WASM support
  experimental: {
    // Disable turbopack for now due to WASM limitations
  },

  // Server components external packages
  serverExternalPackages: ['privacycash', '@lightprotocol/hasher.rs', 'node-localstorage'],

  // Include WASM files in serverless functions
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/privacycash/**/*.wasm'],
  },
};

export default nextConfig;
