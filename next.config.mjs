/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config) => {
    // MediaPipe ships dynamic WASM imports that webpack flags as a "critical
    // dependency" warning. The import is intentional and harmless, so silence
    // just that specific warning to keep the dev console readable.
    config.module = config.module || {}
    config.module.exprContextCritical = false
    return config
  },
}

export default nextConfig
