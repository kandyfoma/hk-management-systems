const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n.ts')

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
        destination: 'https://app.katms.org',
        permanent: true,
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)
