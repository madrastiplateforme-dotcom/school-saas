// app/teacher/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Calendar, BookOpen, Users, Clock, GraduationCap,
  ChevronLeft, RefreshCw, ClipboardList, UserCheck, Sparkles,
} from 'lucide-react'

type TeacherStats = {
  classesCount: number
  studentsCount: number
  subjectsCount: number
  todayHours: number
}

type TodaySlot = {
  id: string
  start_time: string
  end_time: string
  room: string | null
  subject_name: string
  class_name: string
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [stats, setStats] = useState<TeacherStats>({
    classesCount: 0,
    studentsCount: 0,
    subjectsCount: 0,
    todayHours: 0,
  })
  const [todaySlots, setTodaySlots] = useState<TodaySlot[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()

    try {
      // 1) Get auth user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('غير مصرح')
        setLoading(false)
        return
      }

      // 2) Get profile + school
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        const est = (profile as any).establishments
        if (est?.name) setSchoolName(est.name)
      }

      // 3) Get staff row
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!staffRow?.id) {
        // Teacher not linked to staff — show empty dashboard
        setLoading(false)
        return
      }

      const teacherId = staffRow.id

      // 4) teacher_subjects — classes + subjects
      const { data: teacherSubjects } = await supabase
        .from('teacher_subjects')
        .select('id, subject_id, class_id, subjects(name), classes(name)')
        .eq('teacher_id', teacherId)

      const tsList = teacherSubjects || []
      const uniqueClasses = new Set<string>()
      const uniqueSubjects = new Set<string>()
      tsList.forEach((ts: any) => {
        if (ts.class_id) uniqueClasses.add(ts.class_id)
        if (ts.subject_id) uniqueSubjects.add(ts.subject_id)
      })

      // 5) Students count (via classes)
      let studentsCount = 0
      if (uniqueClasses.size > 0) {
        const { count } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', Array.from(uniqueClasses))
          .eq('status', 'active')
        studentsCount = count || 0
      }

      // 6) Today's timetable
      const todayDow = new Date().getDay() // 0=Sunday
      const { data: slots } = await supabase
        .from('timetables')
        .select(
          'id, start_time, end_time, room, subjects(name), classes(name)',
        )
        .eq('teacher_id', teacherId)
        .eq('day_of_week', todayDow)
        .order('start_time')

      const formattedSlots: TodaySlot[] = (slots || []).map((s: any) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || null,
        subject_name: s.subjects?.name || '—',
        class_name: s.classes?.name || '—',
      }))

      // 7) Compute stats
      setStats({
        classesCount: uniqueClasses.size,
        studentsCount,
        subjectsCount: uniqueSubjects.size,
        todayHours: formattedSlots.length,
      })

      setTodaySlots(formattedSlots)
    } catch (err: any) {
      console.error('[teacher-dashboard]', err)
      setError(err.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const todayLabel = AR_DAYS[new Date().getDay()]

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-sky-600" />
            مرحباً {fullName || 'أستاذ(ة)'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {todayLabel}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">أقسامي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.classesCount}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">تلاميذي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.studentsCount}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">موادي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.subjectsCount}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">حصص اليوم</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.todayHours}
          </div>
        </div>
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            حصص اليوم ({todayLabel})
          </h2>
          <Link
            href="/teacher/timetable"
            className="text-sm font-medium text-sky-600 hover:text-sky-800 flex items-center gap-1"
          >
            الجدول الكامل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {todaySlots.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              ما عندكش حصص اليوم
            </p>
            <p className="text-xs text-slate-400 mt-1">
              استافد من الوقت للمراجعة ولا التحضير
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todaySlots.map((slot, idx) => (
              <div
                key={slot.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    idx === 0
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">
                    {slot.subject_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {slot.class_name}
                    {slot.room && ` • قاعة ${slot.room}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-sm font-bold text-slate-700"
                    dir="ltr"
                  >
                    {slot.start_time?.slice(0, 5)} — {slot.end_time?.slice(0, 5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href="/teacher/grades"
          className="bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition group"
        >
          <ClipboardList className="h-8 w-8 mb-3 opacity-90" />
          <h3 className="font-bold text-lg">تسجيل النقط</h3>
          <p className="text-xs opacity-90 mt-1">
            سجل نقط التلاميذ في أقسامك
          </p>
        </Link>

        <Link
          href="/teacher/attendance"
          className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition group"
        >
          <UserCheck className="h-8 w-8 mb-3 opacity-90" />
          <h3 className="font-bold text-lg">تسجيل الحضور</h3>
          <p className="text-xs opacity-90 mt-1">
            سجل الحضور والغياب
          </p>
        </Link>

        <Link
          href="/teacher/timetable"
          className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition group"
        >
          <Calendar className="h-8 w-8 mb-3 opacity-90" />
          <h3 className="font-bold text-lg">جدولي الأسبوعي</h3>
          <p className="text-xs opacity-90 mt-1">
            شوف الحصص كاملين
          </p>
        </Link>
      </div>

      {/* Info footer */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-900">
          <p className="font-bold mb-1">💡 قادم قريباً</p>
          <p className="text-sky-800">
            ستتمكن قريباً من تسجيل النقط والحضور مباشرة من هاتفك، دون الحاجة للتواصل مع الإدارة.
          </p>
        </div>
      </div>
    </div>
  )
}