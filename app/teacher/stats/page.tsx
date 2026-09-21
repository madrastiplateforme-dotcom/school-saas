// app/teacher/stats/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  BarChart3, RefreshCw, Users, BookOpen, TrendingUp, Award,
  GraduationCap, Info,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'

type ClassStat = {
  class_name: string
  students: number
  average: number | null
  grades_count: number
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

export default function TeacherStatsPage() {
  const { yearId } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classStats, setClassStats] = useState<ClassStat[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalGrades, setTotalGrades] = useState(0)
  const [overallAvg, setOverallAvg] = useState<number | null>(null)

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

      // Profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const estabId = profile?.establishment_id
      if (!estabId) {
        setError('لا توجد مؤسسة')
        setLoading(false)
        return
      }

      // Staff
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!staffRow?.id) {
        setLoading(false)
        return
      }

      const teacherId = staffRow.id

      // teacher_subjects — PAS de class_id, utiliser level_id
      const { data: tsList, error: tsErr } = await supabase
        .from('teacher_subjects')
        .select('subject_id, level_id')
        .eq('teacher_id', teacherId)
        .eq('establishment_id', estabId)

      if (tsErr) throw new Error(tsErr.message)

      const rows = tsList || []
      const levelIds = Array.from(
        new Set(rows.map((r: any) => r.level_id).filter(Boolean)),
      ) as string[]

      if (levelIds.length === 0) {
        setLoading(false)
        return
      }

      // Classes WHERE level_id IN AND academic_year_id = yearId
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, level_id')
        .in('level_id', levelIds)
        .eq('establishment_id', estabId)
        .eq('academic_year_id', yearId)

      const classList = classesData || []
      const classIds = classList.map((c: any) => c.id)
      const classMap = new Map<string, string>()
      classList.forEach((c: any) => classMap.set(c.id, c.name || '—'))

      if (classIds.length === 0) {
        setLoading(false)
        return
      }

      // Students count per class (année active)
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('class_id, student_id')
        .in('class_id', classIds)
        .eq('establishment_id', estabId)
        .eq('academic_year_id', yearId)
        .eq('status', 'active')

      const studentsByClass: Record<string, Set<string>> = {}
      ;(enrolls || []).forEach((e: any) => {
        if (!studentsByClass[e.class_id]) studentsByClass[e.class_id] = new Set()
        studentsByClass[e.class_id].add(e.student_id)
      })

      // Evaluations for these classes (année active)
      const { data: evals } = await supabase
        .from('evaluations')
        .select('id, class_id')
        .in('class_id', classIds)
        .eq('establishment_id', estabId)
        .eq('academic_year_id', yearId)
        .eq('is_active', true)

      const evalIds = (evals || []).map((e: any) => e.id)
      const evalToClass: Record<string, string> = {}
      ;(evals || []).forEach((e: any) => {
        evalToClass[e.id] = e.class_id
      })

      // Grades (query séparée)
      let grades: any[] = []
      if (evalIds.length > 0) {
        const { data: g } = await supabase
          .from('grades')
          .select('evaluation_id, score')
          .in('evaluation_id', evalIds)
          .eq('establishment_id', estabId)
        grades = g || []
      }

      // Compute per class
      const classAgg: Record<string, { sum: number; count: number }> = {}
      let overallSum = 0
      let overallCount = 0

      grades.forEach((g: any) => {
        const cid = evalToClass[g.evaluation_id]
        if (!cid) return
        const num = typeof g.score === 'number' ? g.score : parseFloat(g.score)
        if (isNaN(num)) return
        if (!classAgg[cid]) classAgg[cid] = { sum: 0, count: 0 }
        classAgg[cid].sum += num
        classAgg[cid].count += 1
        overallSum += num
        overallCount += 1
      })

      const stats: ClassStat[] = classIds.map((cid) => ({
        class_name: classMap.get(cid) || '—',
        students: studentsByClass[cid]?.size || 0,
        average:
          classAgg[cid] && classAgg[cid].count > 0
            ? +(classAgg[cid].sum / classAgg[cid].count).toFixed(2)
            : null,
        grades_count: classAgg[cid]?.count || 0,
      }))

      setClassStats(stats)
      setTotalStudents(stats.reduce((s, c) => s + c.students, 0))
      setTotalGrades(overallCount)
      setOverallAvg(
        overallCount > 0 ? +(overallSum / overallCount).toFixed(2) : null,
      )
    } catch (e: any) {
      console.error('[teacher-stats]', e?.message || e)
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

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            إحصائياتي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            نظرة على أقسامك ومعدلات تلاميذك
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">أقسامي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {classStats.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">تلاميذي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">نقط مسجلة</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalGrades}</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المعدل العام</span>
          </div>
          <div className="text-2xl font-bold text-slate-800" dir="ltr">
            {overallAvg !== null ? `${overallAvg}/20` : '—'}
          </div>
        </div>
      </div>

      {classStats.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما كايناش معطيات كافية</p>
          <p className="text-xs text-slate-400 mt-1">
            خاص التلاميذ يكونو مسجلين والنقط مدخلة
          </p>
        </div>
      )}

      {/* Charts */}
      {classStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Moyennes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-sky-600" />
              معدل كل قسم
            </h2>
            {classStats.filter((c) => c.average !== null).length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
                ما كايناش نقط مسجلة دابا
              </div>
            ) : (
              <div style={{ width: '100%', height: 260 }} dir="ltr">
                <ResponsiveContainer>
                  <BarChart
                    data={classStats.filter((c) => c.average !== null)}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              تلاميذ كل قسم
            </h2>
            <div style={{ width: '100%', height: 260 }} dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={classStats.filter((c) => c.students > 0)}
                    dataKey="students"
                    nameKey="class_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: any) => entry.class_name}
                  >
                    {classStats
                      .filter((c) => c.students > 0)
                      .map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table détails */}
      {classStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">تفاصيل الأقسام</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {classStats.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
              >
                <span className="font-bold text-slate-800 text-sm">
                  {c.class_name}
                </span>
                <div className="flex items-center gap-5 text-xs">
                  <span className="text-slate-500">
                    <Users className="h-3 w-3 inline mr-1" />
                    <span dir="ltr">{c.students}</span>
                  </span>
                  <span className="text-slate-500">
                    نقط: <span dir="ltr">{c.grades_count}</span>
                  </span>
                  <span
                    className={`font-bold ${
                      c.average == null
                        ? 'text-slate-400'
                        : c.average >= 10
                        ? 'text-emerald-600'
                        : 'text-orange-600'
                    }`}
                    dir="ltr"
                  >
                    {c.average != null ? `${c.average}/20` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}