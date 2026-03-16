/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules', '/data/**', '/storage/**'],
    };
    config.cache = false;
    return config;
  },
};

export default nextConfig;
