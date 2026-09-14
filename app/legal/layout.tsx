'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GraduationCap, ArrowRight, ArrowLeft, Globe, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react'
import { LEGAL, type LegalLang } from '@/lib/legal-content'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [lang, setLang] = useState<LegalLang>('ar')
  const t = LEGAL[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
  }, [lang, t.dir])

  const Back = lang === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div dir={t.dir} className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-black text-slate-800">{t.brand}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              href="/legal/privacy"
              className={`transition hover:text-emerald-600 ${
                pathname === '/legal/privacy' ? 'text-emerald-600 font-bold' : ''
              }`}
            >
              {t.nav.privacy}
            </Link>
            <Link
              href="/legal/terms"
              className={`transition hover:text-emerald-600 ${
                pathname === '/legal/terms' ? 'text-emerald-600 font-bold' : ''
              }`}
            >
              {t.nav.terms}
            </Link>
            <Link
              href="/legal/loi-09-08"
              className={`transition hover:text-emerald-600 ${
                pathname === '/legal/loi-09-08' ? 'text-emerald-600 font-bold' : ''
              }`}
            >
              {t.nav.loi0908}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Globe className="h-3.5 w-3.5" />
              {t.switchLang}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800 transition"
            >
              <Back className="h-3.5 w-3.5" />
              {t.backHome}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-5 lg:px-8 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 lg:px-8 py-10">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="font-bold text-slate-800">{t.contactDpo}</p>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href="mailto:dpo@madrasti.ma" className="hover:text-emerald-600" dir="ltr">
                    dpo@madrasti.ma
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href="tel:+212500000000" className="hover:text-emerald-600" dir="ltr">
                    +212 5 00 00 00 00
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>Casablanca, Maroc</span>
                </div>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-800 mb-3">CNDP</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p>www.cndp.ma</p>
                <p dir="ltr">contact@cndp.ma</p>
                <p dir="ltr">+212 5 37 57 05 05</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {t.brand}</p>
            <p>{t.version}: 1.0 · {t.lastUpdate}: 01/01/2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}