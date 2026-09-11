'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Phone, Mail } from 'lucide-react'

export default function SuspendedPage() {
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone'])
      .then(({ data }) => {
        if (data) {
          data.forEach((s) => {
            if (s.key === 'contact_email') setContactEmail(s.value)
            if (s.key === 'contact_phone') setContactPhone(s.value)
          })
        }
      })
  }, [])

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow text-center max-w-md w-full">
        <h1 className="text-xl font-bold text-red-600 mb-2">تم إيقاف المؤسسة</h1>
        <p className="text-gray-600 mb-6">
          مؤسستك موقوفة حالياً بسبب عدم تسديد الاشتراك. يرجى التواصل مع مالك البرنامج لإعادة التفعيل.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-right">
          <p className="font-semibold text-gray-700">معلومات التواصل:</p>
          {contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-indigo-600" />
              <span dir="ltr">{contactPhone}</span>
            </div>
          )}
          {contactEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              <span>{contactEmail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}