// app/teacher/stats/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  BarChart3, RefreshCw, Users, BookOpen, TrendingUp, Award,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classStats, setClassStats] = useState<ClassStat[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalGrades, setTotalGrades] = useState(0)
  const [overallAvg, setOverallAvg] = useState<number | null>(null)

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

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!staffRow?.id) {
        setLoading(false)
        return
      }

      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('class_id, subject_id, classes(id, name)')
        .eq('teacher_id', staffRow.id)

      const classMap = new Map<string, string>()
      const subjectIds: string[] = []
      ;(ts || []).forEach((r: any) => {
        if (r.classes?.id) classMap.set(r.classes.id, r.classes.name || '—')
        if (r.subject_id) subjectIds.push(r.subject_id)
      })

      const classIds = Array.from(classMap.keys())
      if (classIds.length === 0) {
        setLoading(false)
        return
      }

      // students count per class
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('class_id, student_id')
        .in('class_id', classIds)
        .eq('status', 'active')

      const studentsByClass: Record<string, Set<string>> = {}
      ;(enrolls || []).forEach((e: any) => {
        if (!studentsByClass[e.class_id]) studentsByClass[e.class_id] = new Set()
        studentsByClass[e.class_id].add(e.student_id)
      })

      // evaluations for these classes
      const { data: evals } = await supabase
        .from('evaluations')
        .select('id, class_id')
        .in('class_id', classIds)

      const evalIds = (evals || []).map((e: any) => e.id)
      const evalToClass: Record<string, string> = {}
      ;(evals || []).forEach((e: any) => {
        evalToClass[e.id] = e.class_id
      })

      // grades
      let grades: any[] = []
      if (evalIds.length > 0) {
        const { data: g } = await supabase
          .from('grades')
          .select('evaluation_id, score, value, note')
          .in('evaluation_id', evalIds)
        grades = g || []
      }

      // compute per class
      const classAgg: Record<string, { sum: number; count: number }> = {}
      let overallSum = 0
      let overallCount = 0
      grades.forEach((g: any) => {
        const cid = evalToClass[g.evaluation_id]
        if (!cid) return
        const v = g.score ?? g.value ?? g.note
        const num = typeof v === 'number' ? v : parseFloat(v)
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
      setTotalStudents(
        stats.reduce((s, c) => s + c.students, 0),
      )
      setTotalGrades(overallCount)
      setOverallAvg(
        overallCount > 0 ? +(overallSum / overallCount).toFixed(2) : null,
      )
    } catch (e: any) {
      console.error('[teacher-stats]', e)
      setError(e.message || 'خطأ')
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
            نظرة عامة على أقسامك ومعدلات تلاميذك
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
          <div className="text-2xl font-bold text-slate-800">{classStats.length}</div>
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
        </div>
      )}

      {/* Charts */}
      {classStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Moyennes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">معدل كل قسم</h2>
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
          </div>

          {/* Students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">تلاميذ كل قسم</h2>
            <div style={{ width: '100%', height: 260 }} dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={classStats}
                    dataKey="students"
                    nameKey="class_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => entry.class_name}
                  >
                    {classStats.map((_, i) => (
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
    </div>
  )
}