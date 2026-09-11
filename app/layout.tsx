import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { SettingsProvider } from '@/lib/SettingsContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <SettingsProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}