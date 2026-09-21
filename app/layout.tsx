import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { SettingsProvider } from '@/lib/SettingsContext'
import { AcademicYearProvider } from '@/lib/AcademicYearContext'
import CookieBanner from '@/components/CookieBanner'
import PWAInit from '@/components/PWAInit'
import Toaster from '@/components/ui/Toaster'

export const metadata = {
  title: 'مدرستي — منصة تسيير المدارس الخاصة',
  description:
    'منصة عصرية لتسيير المدارس الخاصة بالمغرب: التلاميذ، الأقساط، الصندوق، النقط، الحضور، والتواصل مع الأولياء.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Madrasti',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0b2f35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Madrasti" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <SettingsProvider>
          <LanguageProvider>
            <AcademicYearProvider>
              {children}
              <CookieBanner />
              <PWAInit />
              <Toaster />
            </AcademicYearProvider>
          </LanguageProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}