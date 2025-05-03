/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  output: 'standalone',
  
  // 跨域配置 - 只使用字符串
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  
  // 实验性功能
  experimental: {
    // 保留有效的实验性配置
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客户端打包配置
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
}

export default nextConfig
