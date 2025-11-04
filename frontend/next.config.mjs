/** @type {import('next').NextConfig} */
const nextConfig = {
  // This helps with Docker development
  output: 'standalone',
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/processed-media/**',
      },
      {
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
        pathname: '/processed-media/**',
      }
    ],
  }
};

export default nextConfig;