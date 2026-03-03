/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['katohms.com', 'app.katohms.com'],
    unoptimized: false,
  },
  async redirects() {
    return [
      {
        source: '/app',
        destination: 'https://app.katohms.com',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
