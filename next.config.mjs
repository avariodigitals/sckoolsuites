/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev/build artifacts isolated when both commands are run in parallel.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Prevent webpack from bundling server-side packages that use native/Node APIs
  serverExternalPackages: ["pdf-parse"],

  // Images configuration for external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
