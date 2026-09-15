'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  FileText, RefreshCw, Users, Download, GraduationCap, BookOpen,
  Award,
} from 'lucide-react'

type Child = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  class_name: string | null
  level_name: string | null
}

const CERT_TYPES = [
  'شهادة مدرسية',
  'شهادة التسجيل',
  'شهادة المغادرة',
  'شهادة النجاح',
]

export default function ParentCertificatesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedType, setSelectedType] = useState(CERT_TYPES[0])
  const [purpose, setPurpose] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const estabId = profile?.establishment_id
      if (!estabId) {
        setError('لم يتم العثور على المؤسسة')
        setLoading(false)
        return
      }

      const { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!family) {
        setError('لم يتم العثور على ملف العائلة')
        setLoading(false)
        return
      }

      const { data: year } = await supabase
        .from('academic_years')
        .select('id')
        .eq('establishment_id', estabId)
        .eq('is_current', true)
        .maybeSingle()

      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .eq('family_id', family.id)
        .order('first_name')

      if (!students || students.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      const childIds = students.map((s) => s.id)

      let enrollmentsData: any[] = []
      if (year?.id) {
        const { data } = await supabase
          .from('enrollments')
          .select('student_id, classes(name, levels(name))')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)
        enrollmentsData = data || []
      }

      const result: Child[] = students.map((st) => {
        const enr = enrollmentsData.find((e) => e.student_id === st.id)
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          massar_code: st.massar_code,
          class_name: enr?.classes?.name || null,
          level_name: enr?.classes?.levels?.name || null,
        }
      })

      setChildren(result)
      if (result.length > 0) setSelectedChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-certificates]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!selectedChild) return
    const params = new URLSearchParams({
      studentId: selectedChild,
      type: selectedType,
    })
    if (purpose) params.set('purpose', purpose)
    window.open(`/api/pdf/certificate?${params.toString()}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-600" />
            الشهادات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            طلب شهادة مدرسية لأبنائك
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون</p>
        </div>
      ) : (
        <>
          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              اختر التفاصيل
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  التلميذ
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.class_name ? ` — ${c.class_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  نوع الشهادة
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CERT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  الغرض (اختياري)
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="مثال: للتسجيل في مؤسسة أخرى، لطلب منحة..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                <Download className="h-4 w-4" />
                تحميل الشهادة PDF
              </button>
            </div>
          </div>

          {/* Selected child info */}
          {(() => {
            const c = children.find((x) => x.id === selectedChild)
            if (!c) return null
            return (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-lg flex-shrink-0">
                  {c.first_name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">
                    {c.first_name} {c.last_name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-indigo-700 mt-0.5 flex-wrap">
                    {c.class_name && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {c.class_name}
                      </span>
                    )}
                    {c.level_name && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {c.level_name}
                      </span>
                    )}
                    {c.massar_code && (
                      <code className="font-mono text-[10px] text-indigo-600" dir="ltr">
                        {c.massar_code}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}