import type { NextConfig } from "next";
import path from "path";
import CopyPlugin from "copy-webpack-plugin";

const nextConfig: NextConfig = {
  // Configure webpack for WASM support
  webpack: (config, { isServer }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Preserve __dirname and __filename in bundled code
    config.node = {
      ...config.node,
      __dirname: false,
      __filename: false,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Copy WASM files to output directory for server builds
    if (isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(process.cwd(), 'node_modules/privacycash/circuit2'),
              to: path.join(config.output.path, 'circuit2'),
              noErrorOnMissing: true,
            },
          ],
        })
      );
    }

    // Mark dependencies as external for server-side
    // privacycash must be external because bundling breaks its internal paths
    if (isServer) {
      config.externals = config.externals || [];
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

  // Include all privacycash files in serverless functions
  outputFileTracingIncludes: {
    '/api/*': [
      './node_modules/privacycash/**/*',
      './node_modules/@lightprotocol/**/*',
    ],
  },
};

export default nextConfig;
