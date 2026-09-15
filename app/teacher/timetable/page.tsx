// app/teacher/timetable/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Calendar, RefreshCw, Clock, MapPin, BookOpen, Users, Download,
} from 'lucide-react'

type Slot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string | null
  subject_name: string
  class_name: string
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAY_ORDER = [1, 2, 3, 4, 5, 6] // Lundi → Samedi

export default function TeacherTimetablePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [schoolName, setSchoolName] = useState('')

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
      if (!user) {
        setError('غير مصرح')
        setLoading(false)
        return
      }

      // profile + school
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()

      const est = (profile as any)?.establishments
      if (est?.name) setSchoolName(est.name)

      // staff row
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!staffRow?.id) {
        setLoading(false)
        return
      }

      // timetable
      const { data, error: err } = await supabase
        .from('timetables')
        .select(
          'id, day_of_week, start_time, end_time, room, subjects(name), classes(name)',
        )
        .eq('teacher_id', staffRow.id)
        .order('day_of_week')
        .order('start_time')

      if (err) throw err

      const formatted: Slot[] = (data || []).map((s: any) => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || null,
        subject_name: s.subjects?.name || '—',
        class_name: s.classes?.name || '—',
      }))

      setSlots(formatted)
    } catch (e: any) {
      console.error('[teacher-timetable]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  // Group by day
  const slotsByDay: Record<number, Slot[]> = {}
  slots.forEach((s) => {
    if (!slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = []
    slotsByDay[s.day_of_week].push(s)
  })

  const totalHours = slots.length
  const totalClasses = new Set(slots.map((s) => s.class_name)).size
  const totalSubjects = new Set(slots.map((s) => s.subject_name)).size

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-sky-600" />
            جدولي الأسبوعي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {totalHours} حصة أسبوعياً
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">مجموع الحصص</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalHours}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">الأقسام</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalClasses}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المواد</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalSubjects}</div>
        </div>
      </div>

      {/* Empty */}
      {slots.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش حصص مسجلة فالجدول</p>
          <p className="text-xs text-slate-400 mt-1">
            تواصل مع الإدارة باش يضيفوك للجدول
          </p>
        </div>
      )}

      {/* Weekly grid */}
      {slots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAY_ORDER.map((day) => {
            const daySlots = slotsByDay[day] || []
            if (daySlots.length === 0) return null
            return (
              <div
                key={day}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">{AR_DAYS[day]}</h2>
                  <span className="text-xs text-slate-500">
                    {daySlots.length} حصة
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md" dir="ltr">
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
                      <p className="text-xs text-slate-500 mt-0.5">
                        {slot.class_name}
                      </p>
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