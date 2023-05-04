/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["images.pokemontcg.io", "product-images.tcgplayer.com"],
  },
}

module.exports = nextConfig
