// app/teacher/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData } from '@/lib/useTeacherData'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  LayoutDashboard, Calendar, BookOpen, Users, Clock, GraduationCap,
  ChevronLeft, RefreshCw, ClipboardList, UserCheck, Sparkles,
  ShieldAlert, BookMarked, FileText, BarChart3, MessageSquare,
  Settings, User, Bell,
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

// ═══════════════════════════════════════════════════
// Quick Actions
// ═══════════════════════════════════════════════════
const QUICK_ACTIONS = [
  { href: '/teacher/grades',        label: 'تسجيل النقط',     desc: 'سجل نقط التلاميذ',    icon: ClipboardList, gradient: 'from-sky-500 to-sky-700' },
  { href: '/teacher/attendance',    label: 'تسجيل الحضور',    desc: 'الحضور والغياب',       icon: UserCheck,     gradient: 'from-emerald-500 to-emerald-700' },
  { href: '/teacher/cahier',        label: 'دفتر النصوص',     desc: 'الدروس اليومية',       icon: BookMarked,    gradient: 'from-indigo-500 to-indigo-700' },
  { href: '/teacher/devoirs',       label: 'الفروض',          desc: 'فرض للتلاميذ',        icon: FileText,      gradient: 'from-violet-500 to-violet-700' },
  { href: '/teacher/evaluations',   label: 'التقييمات',       desc: 'شوف التقييمات',       icon: GraduationCap, gradient: 'from-amber-500 to-amber-700' },
  { href: '/teacher/discipline',    label: 'الانضباط',        desc: 'تسجيل المخالفات',      icon: ShieldAlert,   gradient: 'from-rose-500 to-rose-700' },
  { href: '/teacher/classes',       label: 'أقسامي',          desc: 'كل أقسامك',           icon: BookOpen,      gradient: 'from-cyan-500 to-cyan-700' },
  { href: '/teacher/timetable',     label: 'جدول الحصص',      desc: 'الجدول الأسبوعي',      icon: Calendar,      gradient: 'from-teal-500 to-teal-700' },
  { href: '/teacher/stats',         label: 'إحصائياتي',       desc: 'معدلات وأرقام',        icon: BarChart3,     gradient: 'from-fuchsia-500 to-fuchsia-700' },
  { href: '/teacher/messages',      label: 'الرسائل',         desc: 'تواصل مع الإدارة',     icon: MessageSquare, gradient: 'from-blue-500 to-blue-700' },
  { href: '/teacher/notifications', label: 'الإشعارات',       desc: 'كل الإشعارات',         icon: Bell,          gradient: 'from-orange-500 to-orange-700' },
  { href: '/teacher/settings',      label: 'الإعدادات',       desc: 'تخصيص الإشعارات',      icon: Settings,      gradient: 'from-slate-500 to-slate-700' },
]

export default function TeacherDashboardPage() {
  const { yearId } = useAcademicYear()

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('غير مصرح')
        setLoading(false)
        return
      }

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

      const { staffId, classes, totalStudents } = await fetchTeacherData(
  supabase,
  user.id,
  yearId,   // ← ZID HADI
)

      if (!staffId) {
        setLoading(false)
        return
      }

      const subjectsSet = new Set<string>()
      classes.forEach((c) => c.subjects.forEach((s) => subjectsSet.add(s.id)))

      const todayDow = new Date().getDay()
      const { data: slots } = await supabase
        .from('timetables')
        .select('id, start_time, end_time, room, subjects(name), classes(name)')
        .eq('teacher_id', staffId)
        .eq('day_of_week', todayDow)
        .eq('academic_year_id', yearId)
        .order('start_time')

      const formattedSlots: TodaySlot[] = (slots || []).map((s: any) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || null,
        subject_name: s.subjects?.name || '—',
        class_name: s.classes?.name || '—',
      }))

      setStats({
        classesCount: classes.length,
        studentsCount: totalStudents,
        subjectsCount: subjectsSet.size,
        todayHours: formattedSlots.length,
      })
      setTodaySlots(formattedSlots)
    } catch (e: any) {
      console.error('[teacher-dashboard]', e?.message || e)
      setError(e?.message || 'خطأ')
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
      {/* ═══════ HEADER ═══════ */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-sky-600" />
            مرحباً {fullName || 'أستاذ(ة)'} 👋
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

      {/* ═══════ STATS ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'أقسامي', value: stats.classesCount, icon: BookOpen, color: 'bg-sky-100 text-sky-700' },
          { label: 'تلاميذي', value: stats.studentsCount, icon: Users, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'موادي', value: stats.subjectsCount, icon: GraduationCap, color: 'bg-amber-100 text-amber-700' },
          { label: 'حصص اليوم', value: stats.todayHours, icon: Clock, color: 'bg-indigo-100 text-indigo-700' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {s.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ═══════ QUICK ACTIONS ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-sky-600" />
          <h2 className="font-bold text-slate-800 text-lg">الوصول السريع</h2>
        </div>

        {/* Grid: 2 cols mobile, 3 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-200 overflow-hidden`}
              >
                {/* Deco circles */}
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/10 group-hover:bg-white/20 transition" />
                <div className="absolute -bottom-10 -left-6 w-16 h-16 rounded-full bg-white/5" />

                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Title: big bold white */}
                  <p className="font-extrabold text-base leading-tight text-white drop-shadow-sm">
                    {action.label}
                  </p>

                  {/* Desc: larger + brighter */}
                  <p className="text-xs font-medium text-white/95 mt-1 leading-tight">
                    {action.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ═══════ TODAY'S SCHEDULE ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            حصص اليوم ({todayLabel})
            {todaySlots.length > 0 && (
              <span className="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md">
                {todaySlots.length}
              </span>
            )}
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
            <p className="text-slate-500 font-medium">ما عندكش حصص اليوم</p>
            <p className="text-xs text-slate-400 mt-1">
              يمكن مازال الإدارة ما دخلتكش فالجدول
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
                      ? 'bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md'
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
                  <p className="text-sm font-bold text-slate-700" dir="ltr">
                    {slot.start_time?.slice(0, 5)} —{' '}
                    {slot.end_time?.slice(0, 5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ INFO FOOTER ═══════ */}
      <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-900">
          <p className="font-bold mb-1">💡 نصيحة</p>
          <p className="text-sky-800">
            استعمل <strong>الوصول السريع</strong> فوق باش تدخل مباشرة لأي خدمة.
            كل زر عندو لون خاص باش تلقاه بسرعة.
          </p>
        </div>
      </div>
    </div>
  )
}