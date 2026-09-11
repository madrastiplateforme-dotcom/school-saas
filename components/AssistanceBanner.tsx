'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AssistanceBanner() {
  const [establishmentName, setEstablishmentName] = useState<string | null>(null)
  const [isAssistance, setIsAssistance] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const assistId = sessionStorage.getItem('assistance_establishment_id')
    if (!assistId) {
      setIsAssistance(false)
      return
    }

    setIsAssistance(true)

    // جلب اسم المؤسسة
    const supabase = createClient()
    supabase
      .from('establishments')
      .select('name')
      .eq('id', assistId)
      .single()
      .then(({ data }) => {
        if (data) setEstablishmentName(data.name)
      })
  }, [])

  const exitAssistance = () => {
    sessionStorage.removeItem('assistance_establishment_id')
    router.push('/admin/dashboard') // wla fin kayn dashboard dyal Super Admin
    router.refresh()
  }

  if (!isAssistance) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-semibold text-sm">
          وضع المساعدة — أنت الآن تتصفح: <strong>{establishmentName || '...'}</strong>
        </span>
      </div>
      <button
        onClick={exitAssistance}
        className="bg-white text-amber-600 hover:bg-amber-50 font-semibold text-sm px-4 py-2 rounded-lg transition flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
          />
        </svg>
        رجوع إلى الإدارة العامة
      </button>
    </div>
  )
}