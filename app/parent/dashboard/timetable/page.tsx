'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  Calendar, RefreshCw, Clock, MapPin, BookOpen, GraduationCap,
  Users, ChevronDown,
} from 'lucide-react'

type Slot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  subject_name: string
  teacher_name: string | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  class_name: string | null
  level_name: string | null
  slots: Slot[]
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAY_ORDER = [1, 2, 3, 4, 5, 6]

export default function ParentTimetablePage() {
  const { yearId, year } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<string>('')

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

      // ✅ Timetables filtrés par année active + classes
      let slotsData: any[] = []
      if (classIds.length > 0) {
        const { data } = await supabase
          .from('timetables')
          .select(
            'id, day_of_week, start_time, end_time, room, class_id, academic_year_id, subjects(name), staff(full_name)',
          )
          .in('class_id', classIds)
          .eq('academic_year_id', yearId)
          .order('day_of_week')
          .order('start_time')
        slotsData = data || []
      }

      const result: Child[] = students.map((st) => {
        const enr = (enrollmentsData || []).find((e) => e.student_id === st.id)
        const cls = enr?.classes as any
        const lvl = cls?.levels
        const slots: Slot[] = slotsData
          .filter((s) => s.class_id === enr?.class_id)
          .map((s: any) => ({
            id: s.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            room: s.room || null,
            subject_name: s.subjects?.name || '—',
            teacher_name: s.staff?.full_name || null,
          }))
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: cls?.name || null,
          level_name: lvl?.name || null,
          slots,
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-timetable]', e?.message || e)
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

  const slotsByDay: Record<number, Slot[]> = {}
  ;(current?.slots || []).forEach((s) => {
    if (!slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = []
    slotsByDay[s.day_of_week].push(s)
  })

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            جدول الحصص
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {year?.name && `${year.name} — `}
            الجدول الأسبوعي لأبنائك
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
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {c.first_name.charAt(0)}
              </span>
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون في السنة الحالية</p>
        </div>
      )}

      {/* Selected child info */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
            {current.first_name.charAt(0)}
          </span>
          <div>
            <p className="font-bold text-slate-800">
              {current.first_name} {current.last_name}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
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
                <Clock className="h-3 w-3" />
                {current.slots.length} حصة / أسبوع
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {current && current.slots.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            ما كايناش جدول مسجل لهاد القسم
          </p>
          <p className="text-xs text-slate-400 mt-1">
            تواصل مع الإدارة
          </p>
        </div>
      )}

      {/* Weekly grid */}
      {current && current.slots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAY_ORDER.map((day) => {
            const daySlots = slotsByDay[day] || []
            if (daySlots.length === 0) return null
            return (
              <div
                key={day}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <h2 className="font-bold text-indigo-800">{AR_DAYS[day]}</h2>
                  <span className="text-xs text-indigo-600 font-bold">
                    {daySlots.length} حصة
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md"
                          dir="ltr"
                        >
                          {slot.start_time?.slice(0, 5)} — {slot.end_time?.slice(0, 5)}
                        </span>
                        {slot.room && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {slot.room}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {slot.subject_name}
                      </p>
                      {slot.teacher_name && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          أ. {slot.teacher_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}