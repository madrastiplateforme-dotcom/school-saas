'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X, Check } from 'lucide-react'

const STORAGE_KEY = 'madrasti_cookie_consent_v1'

export default function CookieBanner() {
  const [show, setShow] = useState(false)
  const [lang, setLang] = useState<'ar' | 'fr'>('ar')

  useEffect(() => {
    // Language
    const l = document.documentElement.lang === 'fr' ? 'fr' : 'ar'
    setLang(l)

    // Check consent
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setTimeout(() => setShow(true), 1200)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, date: new Date().toISOString(), version: '1.0' })
    )
    setShow(false)
  }

  const handleReject = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: false, date: new Date().toISOString(), version: '1.0' })
    )
    setShow(false)
  }

  if (!show) return null

  const t =
    lang === 'ar'
      ? {
          title: 'نستخدم ملفات الكوكيز',
          text: 'نستخدم كوكيز ضرورية لعمل المنصة (المصادقة)، وكوكيز تحليلية اختيارية لتحسين تجربتك.',
          accept: 'أوافق',
          reject: 'أرفض',
          more: 'اعرف المزيد',
        }
      : {
          title: 'Nous utilisons des cookies',
          text: 'Nous utilisons des cookies essentiels (authentification) et analytiques optionnels pour améliorer votre expérience.',
          accept: 'Accepter',
          reject: 'Refuser',
          more: 'En savoir plus',
        }

  const isRtl = lang === 'ar'

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl animate-in slide-in-from-bottom"
    >
      <div className="rounded-2xl bg-slate-900 text-white shadow-2xl shadow-black/30 border border-slate-700 p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-amber-950 shrink-0">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base">{t.title}</h3>
            <p className="text-sm text-slate-300 mt-1 leading-6">{t.text}</p>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/legal/privacy"
                className="text-xs underline text-emerald-300 hover:text-emerald-200 font-medium"
              >
                {t.more}
              </Link>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="text-slate-400 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={handleReject}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10 transition"
          >
            {t.reject}
          </button>
          <button
            onClick={handleAccept}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition"
          >
            <Check className="h-4 w-4" />
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  )
}