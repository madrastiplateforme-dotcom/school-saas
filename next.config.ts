import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.5',       // IP ديال PC فالشبكة المحلية
    'localhost',
    '127.0.0.1',
    '*.local',
  ],
}

export default nextConfig