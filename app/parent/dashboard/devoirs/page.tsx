'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  FileText, RefreshCw, Users, Calendar, GraduationCap, BookOpen,
  AlertCircle, Clock, CheckCircle2, Paperclip,
} from 'lucide-react'

type Devoir = {
  id: string
  title: string
  description: string | null
  due_date: string
  attachment_url: string | null
  subject_name: string | null
  teacher_name: string | null
  is_past: boolean
}

type Child = {
  id: string
  first_name: string
  last_name: string
  class_name: string | null
  level_name: string | null
  devoirs: Devoir[]
}

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const daysUntil = (dateStr: string) => {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ParentDevoirsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState('')
  const [showPast, setShowPast] = useState(false)

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
        .select('id, first_name, last_name')
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
          .select('student_id, class_id, classes(name, levels(name))')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)
        enrollmentsData = data || []
      }

      const classIds = enrollmentsData
        .map((e) => e.class_id)
        .filter(Boolean) as string[]

      let devoirsData: any[] = []
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('devoirs')
          .select(
            'id, class_id, title, description, due_date, attachment_url, subjects(name), staff(full_name)',
          )
          .in('class_id', classIds)
          .order('due_date', { ascending: true })
          .limit(200)
        devoirsData = data || []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const result: Child[] = students.map((st) => {
        const enr = enrollmentsData.find((e) => e.student_id === st.id)
        const cls = enr?.classes
        const childDevoirs: Devoir[] = devoirsData
          .filter((d) => d.class_id === enr?.class_id)
          .map((d: any) => {
            const due = new Date(d.due_date)
            due.setHours(0, 0, 0, 0)
            return {
              id: d.id,
              title: d.title,
              description: d.description,
              due_date: d.due_date,
              attachment_url: d.attachment_url,
              subject_name: d.subjects?.name || null,
              teacher_name: d.staff?.full_name || null,
              is_past: due.getTime() < today.getTime(),
            }
          })
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: cls?.name || null,
          level_name: cls?.levels?.name || null,
          devoirs: childDevoirs,
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-devoirs]', e)
      setError(e.message || 'خطأ')
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

  const filteredDevoirs = current?.devoirs.filter((d) =>
    showPast ? true : !d.is_past,
  ) || []

  const upcomingCount = current?.devoirs.filter((d) => !d.is_past).length || 0
  const pastCount = current?.devoirs.filter((d) => d.is_past).length || 0

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            الفروض المنزلية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تتبع الفروض المنزلية لأبنائك
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
          {children.map((c) => {
            const upcoming = c.devoirs.filter((d) => !d.is_past).length
            return (
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
                {upcoming > 0 && (
                  <span className={`text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ${
                    activeChild === c.id ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {upcoming}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Filter */}
      {current && current.devoirs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowPast(false)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              !showPast
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4 inline-block ml-1" />
            القادمة ({upcomingCount})
          </button>
          <button
            onClick={() => setShowPast(true)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              showPast
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 inline-block ml-1" />
            الكل ({current.devoirs.length})
          </button>
        </div>
      )}

      {/* Devoirs list */}
      {current && filteredDevoirs.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {showPast ? 'لا توجد فروض مسجلة' : 'ما كايناش فروض قادمة'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {showPast ? '' : 'ممتاز! كل شي مسالي'}
          </p>
        </div>
      )}

      {current && filteredDevoirs.length > 0 && (
        <div className="space-y-3">
          {filteredDevoirs.map((d) => {
            const diff = daysUntil(d.due_date)
            const isOverdue = diff < 0
            const isToday = diff === 0
            const isTomorrow = diff === 1
            const isSoon = diff > 0 && diff <= 3

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition ${
                  isOverdue
                    ? 'border-rose-200'
                    : isToday
                    ? 'border-amber-200'
                    : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                  isOverdue
                    ? 'bg-rose-50 border-rose-100'
                    : isToday
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {d.subject_name && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">
                        <BookOpen className="h-3 w-3" />
                        {d.subject_name}
                      </span>
                    )}
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      isOverdue
                        ? 'text-rose-700'
                        : isToday
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}>
                      <Calendar className="h-3.5 w-3.5" />
                      {isOverdue
                        ? `فاتَ: ${formatDate(d.due_date)}`
                        : isToday
                        ? 'اليوم'
                        : isTomorrow
                        ? 'غدا'
                        : isSoon
                        ? `باقي ${diff} أيام`
                        : formatDate(d.due_date)}
                    </span>
                  </div>

                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      انتهى الموعد
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <p className="font-bold text-slate-800 text-base">
                    {d.title}
                  </p>

                  {d.description && (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {d.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {d.teacher_name && <span>أ. {d.teacher_name}</span>}
                    {d.attachment_url && (
                      <a
                        href={d.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        <Paperclip className="h-3 w-3" />
                        تحميل الملف
                      </a>
                    )}
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