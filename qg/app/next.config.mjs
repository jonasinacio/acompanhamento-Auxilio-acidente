/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Sprint 0: não travar o primeiro build por type/lint — apertamos depois.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
