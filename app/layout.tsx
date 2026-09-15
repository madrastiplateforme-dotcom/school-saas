import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { SettingsProvider } from '@/lib/SettingsContext'
import CookieBanner from '@/components/CookieBanner'

export const metadata = {
  title: 'مدرستي — منصة تسيير المدارس الخاصة',
  description: 'منصة عصرية لتسيير المدارس الخاصة بالمغرب: التلاميذ، الأقساط، الصندوق، النقط، الحضور، والتواصل مع الأولياء.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <SettingsProvider>
          <LanguageProvider>
            {children}
            <CookieBanner />
          </LanguageProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}