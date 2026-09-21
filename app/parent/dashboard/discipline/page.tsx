'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  Shield, RefreshCw, Users, Calendar, BookOpen, User as UserIcon,
  AlertCircle, AlertTriangle, Info, GraduationCap,
} from 'lucide-react'

type Discipline = {
  id: string
  student_id: string
  incident_date: string
  category: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  class_name: string | null
  level_name: string | null
  disciplines: Discipline[]
}

const CATEGORIES: Record<string, string> = {
  late: 'تأخير متكرر',
  absence: 'غياب متكرر',
  behavior: 'سلوك سيئ',
  disrespect: 'عدم احترام',
  violence: 'عنف',
  cheating: 'غش',
  other: 'أخرى',
}

const SEVERITIES: Record<string, { labelAr: string; color: string; bg: string; icon: any }> = {
  low: { labelAr: 'منخفض', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Info },
  medium: { labelAr: 'متوسط', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  high: { labelAr: 'عالي', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: AlertCircle },
}

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const dayName = (d: string) => {
  try {
    return AR_DAYS[new Date(d).getDay()]
  } catch {
    return ''
  }
}

export default function ParentDisciplinePage() {
  const { yearId, year } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState('')

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

      // ✅ Enrollments dyal l'année active → childIds
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id, classes(name, levels(name))')
        .eq('establishment_id', estabId)
        .eq('academic_year_id', yearId)
        .eq('status', 'active')

      const enrolledStudentIds = Array.from(
        new Set((enrollmentsData || []).map((e: any) => e.student_id).filter(Boolean))
      ) as string[]

      if (enrolledStudentIds.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      // ✅ Students li 3ndhom enrollment f l'année active + dyal had famille
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('family_id', family.id)
        .in('id', enrolledStudentIds)
        .order('first_name')

      if (!students || students.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      const childIds = students.map((s) => s.id)

      // ✅ Disciplines : filtre par student + plage de dates de l'année active
      //    (disciplines n'a PAS academic_year_id → filtre via incident_date)
      let disciplinesQuery = supabase
        .from('disciplines')
        .select('id, student_id, incident_date, category, severity, title, description')
        .in('student_id', childIds)
        .order('incident_date', { ascending: false })

      if (year?.start_date) {
        disciplinesQuery = disciplinesQuery.gte('incident_date', year.start_date)
      }
      if (year?.end_date) {
        disciplinesQuery = disciplinesQuery.lte('incident_date', year.end_date)
      }

      const { data: disciplinesData } = await disciplinesQuery

      const result: Child[] = students.map((st) => {
        const enr = (enrollmentsData || []).find((e: any) => e.student_id === st.id)
        const cls = enr?.classes as any
        const childDisc: Discipline[] = (disciplinesData || [])
          .filter((d: any) => d.student_id === st.id)
          .map((d: any) => ({
            id: d.id,
            student_id: d.student_id,
            incident_date: d.incident_date,
            category: d.category,
            severity: d.severity,
            title: d.title,
            description: d.description,
          }))
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: cls?.name || null,
          level_name: cls?.levels?.name || null,
          disciplines: childDisc,
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-discipline]', e?.message || e)
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

  const current = children.find((c) => c.id === activeChild)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            الانضباط والسلوك
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {year?.name && `${year.name} — `}
            متابعة سلوك أبنائك في المؤسسة
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
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون في السنة الحالية</p>
        </div>
      )}

      {/* Children tabs */}
      {children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChild(c.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                activeChild === c.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.first_name} {c.last_name}
              {c.disciplines.length > 0 && (
                <span
                  className={`text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ${
                    activeChild === c.id
                      ? 'bg-white/25 text-white'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {c.disciplines.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected child info */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
            {current.first_name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">
              {current.first_name} {current.last_name}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              {current.class_name && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {current.class_name}
                </span>
              )}
              {current.level_name && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {current.level_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {current.disciplines.length} مخالفة
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {current && current.disciplines.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Shield className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-emerald-700 font-bold text-lg">
            ✅ سلوك ممتاز
          </p>
          <p className="text-slate-500 text-sm mt-1">
            ما كايناش أي مخالفة مسجلة
          </p>
        </div>
      )}

      {/* Disciplines list */}
      {current && current.disciplines.length > 0 && (
        <div className="space-y-3">
          {current.disciplines.map((d) => {
            const sev = SEVERITIES[d.severity] || SEVERITIES.low
            const SevIcon = sev.icon
            const catLabel = CATEGORIES[d.category] || d.category

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden ${sev.bg}`}
              >
                <div className="flex items-stretch">
                  {/* Severity bar */}
                  <div
                    className={`w-1.5 flex-shrink-0 ${
                      d.severity === 'high'
                        ? 'bg-rose-500'
                        : d.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />

                  <div className="flex-1 p-5">
                    <div className="flex items-start gap-3 flex-wrap mb-2">
                      <SevIcon className={`h-5 w-5 ${sev.color} flex-shrink-0 mt-0.5`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md bg-white/70 border ${sev.color}`}
                          >
                            {sev.labelAr}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200">
                            {catLabel}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dayName(d.incident_date)} {formatDate(d.incident_date)}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-800 text-base mb-1">
                          {d.title}
                        </h3>

                        {d.description && (
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {d.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}