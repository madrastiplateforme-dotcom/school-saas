'use client'

import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { LEGAL, type LegalLang } from '@/lib/legal-content'

export default function TermsPage() {
  const [currentLang, setCurrentLang] = useState<LegalLang>('ar')
  const t = LEGAL[currentLang]

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentLang(document.documentElement.lang === 'fr' ? 'fr' : 'ar')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    setCurrentLang(document.documentElement.lang === 'fr' ? 'fr' : 'ar')
    return () => observer.disconnect()
  }, [])

  return (
    <article className="prose prose-slate max-w-none">
      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold mb-4">
          <FileText className="h-3.5 w-3.5" />
          {t.nav.terms}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t.terms.title}
        </h1>
        <p className="mt-3 text-slate-500 text-lg">{t.terms.subtitle}</p>
      </header>

      <div className="space-y-8">
        {t.terms.sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h2>
            {'body' in s && s.body && (
              <p className="text-slate-600 leading-8 whitespace-pre-line">{s.body}</p>
            )}
            {'bullets' in s && s.bullets && (
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b, k) => (
                  <li key={k} className="flex items-start gap-2 text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="leading-7">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}