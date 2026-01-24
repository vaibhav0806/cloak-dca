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

    // Keep heavy packages external on server to avoid bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('privacycash', '@lightprotocol/hasher.rs', 'node-localstorage');
    }

    return config;
  },

  // Server components external packages
  serverExternalPackages: ['privacycash', '@lightprotocol/hasher.rs', 'node-localstorage'],
};

export default nextConfig;
