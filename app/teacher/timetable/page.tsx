// app/teacher/timetable/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Calendar, RefreshCw, Clock, MapPin, BookOpen, Users,
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
const DAY_ORDER = [1, 2, 3, 4, 5, 6]

export default function TeacherTimetablePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      // Profile + school
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .maybeSingle()
      const est = (profile as any)?.establishments
      if (est?.name) setSchoolName(est.name)

      // Staff
      const { data: staffRow } = await supabase
        .from('staff').select('id').eq('user_id', user.id).maybeSingle()
      if (!staffRow?.id) { setLoading(false); return }

      // Timetables — SANS JOIN
      const { data: raw, error: ttErr } = await supabase
        .from('timetables')
        .select('id, day_of_week, start_time, end_time, room, subject_id, class_id')
        .eq('teacher_id', staffRow.id)
        .order('day_of_week')
        .order('start_time')

      if (ttErr) throw ttErr

      const list = raw || []
      const subjectIds = Array.from(new Set(list.map((r: any) => r.subject_id).filter(Boolean)))
      const classIds = Array.from(new Set(list.map((r: any) => r.class_id).filter(Boolean)))

      let subjMap = new Map<string, string>()
      let classMap = new Map<string, string>()

      if (subjectIds.length > 0) {
        const { data: subjs } = await supabase
          .from('subjects').select('id, name').in('id', subjectIds)
        ;(subjs || []).forEach((s: any) => subjMap.set(s.id, s.name))
      }
      if (classIds.length > 0) {
        const { data: cls } = await supabase
          .from('classes').select('id, name').in('id', classIds)
        ;(cls || []).forEach((c: any) => classMap.set(c.id, c.name))
      }

      const formatted: Slot[] = list.map((s: any) => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || null,
        subject_name: subjMap.get(s.subject_id) || '—',
        class_name: classMap.get(s.class_id) || '—',
      }))

      setSlots(formatted)
    } catch (e: any) {
      console.error('[teacher-timetable]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally { setLoading(false) }
  }

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
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-sky-600" /> جدولي الأسبوعي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {totalHours} حصة أسبوعياً
          </p>
        </div>
        <button onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'مجموع الحصص', val: totalHours, icon: Clock, color: 'bg-sky-100 text-sky-700' },
          { label: 'الأقسام', val: totalClasses, icon: Users, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'المواد', val: totalSubjects, icon: BookOpen, color: 'bg-amber-100 text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800" dir="ltr">{s.val}</div>
          </div>
        ))}
      </div>

      {slots.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش حصص مسجلة فالجدول</p>
          <p className="text-xs text-slate-400 mt-1">تواصل مع الإدارة باش يضيفوك للجدول</p>
        </div>
      )}

      {slots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAY_ORDER.map((day) => {
            const daySlots = slotsByDay[day] || []
            if (daySlots.length === 0) return null
            return (
              <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">{AR_DAYS[day]}</h2>
                  <span className="text-xs text-slate-500">{daySlots.length} حصة</span>
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
                            <MapPin className="h-3 w-3" /> {slot.room}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 text-sm">{slot.subject_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{slot.class_name}</p>
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