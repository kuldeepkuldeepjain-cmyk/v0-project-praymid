/** @type {import('next').NextConfig} */
// Cache bust: 2025-03-26 - Removed crons from vercel.json to fix Hobby plan deployment
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig
