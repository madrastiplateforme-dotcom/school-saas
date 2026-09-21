'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  BookOpen, RefreshCw, Users, Calendar, GraduationCap, FileText,
  Home as HomeIcon,
} from 'lucide-react'

type Entry = {
  id: string
  entry_date: string
  title: string
  content: string | null
  homework: string | null
  subject_name: string | null
  teacher_name: string | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  class_name: string | null
  level_name: string | null
  entries: Entry[]
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

export default function ParentCahierPage() {
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

      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
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
        .select('student_id, class_id, classes(name, levels(name))')
        .in('student_id', childIds)
        .eq('academic_year_id', yearId)

      const classIds = (enrollmentsData || [])
        .map((e) => e.class_id)
        .filter(Boolean) as string[]

      // ✅ Cahier entries filtrés par année active + classes
      let entriesData: any[] = []
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('cahier_entries')
          .select(
            'id, class_id, entry_date, title, content, homework, academic_year_id, subjects(name), staff(full_name)',
          )
          .in('class_id', classIds)
          .eq('academic_year_id', yearId)
          .order('entry_date', { ascending: false })
          .limit(200)
        entriesData = data || []
      }

      const result: Child[] = students.map((st) => {
        const enr = (enrollmentsData || []).find((e) => e.student_id === st.id)
        const cls = enr?.classes as any
        const childEntries: Entry[] = entriesData
          .filter((e) => e.class_id === enr?.class_id)
          .map((e: any) => ({
            id: e.id,
            entry_date: e.entry_date,
            title: e.title,
            content: e.content,
            homework: e.homework,
            subject_name: e.subjects?.name || null,
            teacher_name: e.staff?.full_name || null,
          }))
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: cls?.name || null,
          level_name: cls?.levels?.name || null,
          entries: childEntries,
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-cahier]', e?.message || e)
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
            <BookOpen className="h-6 w-6 text-indigo-600" />
            دفتر النصوص
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {year?.name && `${year.name} — `}
            متابعة الدروس اليومية لأبنائك
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
              {c.entries.length > 0 && (
                <span className={`text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ${
                  activeChild === c.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {c.entries.length}
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
                <FileText className="h-3 w-3" />
                {current.entries.length} درس
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {current && current.entries.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا توجد دروس مسجلة</p>
          <p className="text-xs text-slate-400 mt-1">
            غادي تبان هنا ملي يسجلها الأساتذة
          </p>
        </div>
      )}

      {current && current.entries.length > 0 && (
        <div className="space-y-3">
          {current.entries.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {/* Header */}
              <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {e.subject_name && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">
                      <BookOpen className="h-3 w-3" />
                      {e.subject_name}
                    </span>
                  )}
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dayName(e.entry_date)} {formatDate(e.entry_date)}
                  </span>
                </div>
                {e.teacher_name && (
                  <span className="text-xs text-slate-500">
                    أ. {e.teacher_name}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    {e.title}
                  </p>
                </div>

                {e.content && (
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {e.content}
                  </div>
                )}

                {e.homework && (
                  <div className="bg-amber-50 border border-amber-200 border-r-4 border-r-amber-500 rounded-lg p-3 flex items-start gap-2">
                    <HomeIcon className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900 mb-1">
                        العمل المنزلي
                      </p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">
                        {e.homework}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}