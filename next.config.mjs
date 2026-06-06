/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev/build artifacts isolated when both commands are run in parallel.
  distDir: process.env.NEXT_DIST_DIR || ".next",

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
