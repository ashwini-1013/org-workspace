//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
const path = require('path');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {
    svgr: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@org-workspace/ai-service': path.resolve(
        __dirname,
        '../../libs/ai-service/src'
      ),
      '@org-workspace/vector-service': path.resolve(
        __dirname,
        '../../libs/vector-service/src'
      ),
      '@org-workspace/database': path.resolve(
        __dirname,
        '../../libs/database/src'
      ),
    };

    return config;
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
