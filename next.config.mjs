/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Prefer AVIF, then WebP, for the optimized image pipeline.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
