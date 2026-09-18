'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useIsStaff } from '@/lib/useIsStaff'
import {
  Calendar, GraduationCap, RefreshCw, ArrowLeft, CheckCircle2, Clock,
  Users, Search,
} from 'lucide-react'

type ClassRow = {
  id: string
  name: string
  level_id: string | null
  level_name: string | null
  slots_count: number
}

type TeacherRow = {
  id: string
  full_name: string
  weekly_hours_target: number
  assigned_hours: number
}

export default function TimetableListPage() {
  const establishmentId = useEstablishmentId()
  const { isStaff, role, loading: roleLoading } = useIsStaff()
  const isDirector = isStaff
  const canManage = role === 'directeur' || role === 'secretaire'
  const [tab, setTab] = useState<'classes' | 'teachers'>('classes')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!establishmentId || !role) return
    loadAll()
  }, [establishmentId, role])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Current year
    const { data: years } = await supabase
      .from('academic_years')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)
      .maybeSingle()
    const yearId = years?.id

    // Classes + levels
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('establishment_id', establishmentId)
      .order('name')

    const rows: ClassRow[] = []
    for (const c of classesData || []) {
      let q = supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('class_id', c.id)
      if (yearId) q = q.eq('academic_year_id', yearId)
      const { count } = await q
      rows.push({
        id: c.id,
        name: c.name,
        level_id: c.level_id,
        level_name: (c.levels as any)?.name || null,
        slots_count: count || 0,
      })
    }
    setClasses(rows)

    // Teachers with stats
    const { data: teachersData } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('establishment_id', establishmentId)
      .eq('type', 'teacher')
      .order('full_name')

    const { data: ts } = await supabase
      .from('teacher_subjects')
      .select('teacher_id, weekly_hours')
      .eq('establishment_id', establishmentId)

    let ttData: any[] = []
    if (yearId) {
      const { data } = await supabase
        .from('timetables')
        .select('teacher_id, start_time, end_time')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', yearId)
      ttData = data || []
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    const tRows: TeacherRow[] = (teachersData || []).map(t => {
      const target = (ts || [])
        .filter(x => x.teacher_id === t.id)
        .reduce((s, x) => s + (Number(x.weekly_hours) || 0), 0)
      const assigned = (ttData || [])
        .filter(x => x.teacher_id === t.id)
        .reduce((s, x) => s + (toMin(x.end_time.slice(0, 5)) - toMin(x.start_time.slice(0, 5))) / 60, 0)
      return {
        id: t.id,
        full_name: t.full_name,
        weekly_hours_target: target,
        assigned_hours: assigned,
      }
    })
    setTeachers(tRows)

    setLoading(false)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!canManage) return <div className="p-6">ليس لديك صلاحية</div>

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            جداول الحصص
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            اختر القسم أو الأستاذ لعرض جدوله
          </p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => { setTab('classes'); setSearch('') }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'classes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          الأقسام ({classes.length})
        </button>
        <button
          onClick={() => { setTab('teachers'); setSearch('') }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'teachers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          الأساتذة ({teachers.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'classes' ? 'بحث عن قسم...' : 'بحث عن أستاذ...'}
          className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Classes tab */}
      {tab === 'classes' && (
        filteredClasses.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">لا توجد أقسام</p>
            <Link href="/dashboard/classes" className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:underline font-medium">
              <ArrowLeft className="h-4 w-4" /> أضف أقسام أولاً
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map(c => (
              <Link
                key={c.id}
                href={`/dashboard/timetable/${c.id}`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {c.name.charAt(0)}
                  </div>
                  {c.slots_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {c.slots_count} حصة
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-lg truncate">{c.name}</h3>
                {c.level_name && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {c.level_name}
                  </p>
                )}
                <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-indigo-600 font-medium group-hover:gap-3 transition-all">
                  <Clock className="h-4 w-4" />
                  <span>{c.slots_count > 0 ? 'عرض الجدول' : 'إنشاء الجدول'}</span>
                  <ArrowLeft className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Teachers tab */}
      {tab === 'teachers' && (
        filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">لا يوجد أساتذة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map(t => {
              const hasTarget = t.weekly_hours_target > 0
              const pct = hasTarget ? Math.min(100, (t.assigned_hours / t.weekly_hours_target) * 100) : 0
              const over = hasTarget && t.assigned_hours > t.weekly_hours_target
              const done = hasTarget && t.assigned_hours === t.weekly_hours_target
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/timetable/teacher/${t.id}`}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {t.full_name.charAt(0)}
                    </div>
                    {done && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg truncate">{t.full_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {hasTarget ? (
                      <>
                        <strong className="text-slate-700">{t.assigned_hours}س</strong>
                        {' / '}
                        {t.weekly_hours_target}س هدف
                        {' · '}
                        <span className={over ? 'text-red-600' : done ? 'text-emerald-600' : 'text-amber-600'}>
                          {over ? `${t.assigned_hours - t.weekly_hours_target}س زايد` : done ? 'مكتمل' : `${t.weekly_hours_target - t.assigned_hours}س باقية`}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">لا يوجد هدف محدد</span>
                    )}
                  </p>
                  {hasTarget && (
                    <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${over ? 'bg-red-500' : done ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-emerald-600 font-medium group-hover:gap-3 transition-all">
                    <Clock className="h-4 w-4" />
                    <span>عرض الجدول</span>
                    <ArrowLeft className="h-4 w-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}