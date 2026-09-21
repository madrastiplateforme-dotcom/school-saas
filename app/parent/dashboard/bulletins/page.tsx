'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  Award, RefreshCw, Users, FileText, Download, ExternalLink,
  ChevronLeft, GraduationCap, BookOpen,
} from 'lucide-react'

type Bulletin = {
  id: string
  term: number
  average: number
  rank: number | null
  class_size: number | null
  is_published: boolean
}

type ChildData = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  class_name: string | null
  level_name: string | null
  grade_max: number
  bulletins: Bulletin[]
}

export default function ParentBulletinsPage() {
  const router = useRouter()
  const { yearId, year } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<ChildData[]>([])

  useEffect(() => {
    if (!yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

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

      // ✅ Enrollments dyal l'année active
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id, classes(name, levels(name, grade_max))')
        .in('student_id', childIds)
        .eq('academic_year_id', yearId)

      // ✅ Bulletins dyal l'année active
      const { data: bulletinsData } = await supabase
        .from('bulletins')
        .select('id, student_id, term, average, rank, class_size, is_published')
        .in('student_id', childIds)
        .eq('academic_year_id', yearId)
        .eq('is_published', true)
        .order('term', { ascending: true })

      const result: ChildData[] = students.map((st) => {
        const enr = (enrollmentsData || []).find((e: any) => e.student_id === st.id)
        const cls = (enr as any)?.classes
        const lvl = cls?.levels
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          massar_code: st.massar_code,
          class_name: cls?.name || null,
          level_name: lvl?.name || null,
          grade_max: Number(lvl?.grade_max) || 20,
          bulletins: (bulletinsData || []).filter((b: any) => b.student_id === st.id),
        }
      })

      setChildren(result)
    } catch (e: any) {
      console.error('[parent-bulletins]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
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
            الكشوف المدرسية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {year?.name && `${year.name} — `}
            {children.length} تلميذ
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

      {children.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون</p>
        </div>
      )}

      {children.map((child) => (
        <div
          key={child.id}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-lg flex-shrink-0">
                {child.first_name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">
                  {child.first_name} {child.last_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  {child.class_name && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {child.class_name}
                    </span>
                  )}
                  {child.level_name && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {child.level_name}
                    </span>
                  )}
                  {child.massar_code && (
                    <code className="font-mono text-[10px] text-slate-400" dir="ltr">
                      {child.massar_code}
                    </code>
                  )}
                </div>
              </div>
            </div>
          </div>

          {child.bulletins.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                لا توجد كشوف منشورة
              </p>
              <p className="text-xs text-slate-400 mt-1">
                غادي تبان هنا ملي تنشرها الإدارة
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {child.bulletins.map((b) => {
                const passThreshold = child.grade_max / 2
                const passed = b.average >= passThreshold
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition flex-wrap"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                        د{b.term}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          الدورة {b.term}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span
                            className={`text-sm font-bold ${
                              passed ? 'text-emerald-600' : 'text-orange-600'
                            }`}
                            dir="ltr"
                          >
                            {Number(b.average).toFixed(2)} / {child.grade_max}
                          </span>
                          {b.rank && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              الرتبة {b.rank}
                              {b.class_size && ` / ${b.class_size}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/api/pdf/bulletin?bulletinId=${b.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm flex-shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      تحميل PDF
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}