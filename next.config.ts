
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
        "http://localhost:3000", // A common Next.js default port
        "http://localhost:9003", // Current port for this project
        "https://9003-firebase-studio-1748443963338.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev" // From the warning
    ]
  }
};

export default nextConfig;
