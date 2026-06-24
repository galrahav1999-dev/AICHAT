/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // react-globe.gl / three ship ESM that Next can transpile cleanly.
  transpilePackages: ["react-globe.gl", "three"],
};

module.exports = nextConfig;
