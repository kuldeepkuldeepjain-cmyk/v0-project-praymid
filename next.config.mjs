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
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js-only modules from being bundled for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        pg: false,
        'pg-native': false,
      }
    }
    return config
  },
}

export default nextConfig
