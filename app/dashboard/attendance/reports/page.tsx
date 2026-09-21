'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import DateInput from '@/components/DateInput'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import {
  Users, TrendingUp, Download, Filter, RefreshCw, Search,
  CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft,
  FileText, Calendar, BookOpen, ChevronRight,
} from 'lucide-react'

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6']

const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'مبرر',
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700',
}

export default function AttendanceReportsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtres
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [classFilter, setClassFilter] = useState('all')
  const [studentSearch, setStudentSearch] = useState('')

  // Data
  const [attendances, setAttendances] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId, dateFrom, dateTo, classFilter])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Classes dyal l'année active
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .order('name')

    setClasses((classesData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      level_name: c.levels?.name || '-',
    })))

    // 2. Élèves de l'année active (via enrollments)
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('academic_year_id', yearId)
      .eq('status', 'active')

    const studentIds = (enrollmentsData || []).map((e: any) => e.student_id)

    let studentsData: any[] = []
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code, status')
        .eq('establishment_id', establishmentId)
        .eq('status', 'active')
        .in('id', studentIds)
      studentsData = data || []
    }
    setStudents(studentsData)

    // 3. Attendances dyal l'année active
    let query = supabase
      .from('attendances')
      .select('id, student_id, class_id, status, attendance_date, check_in_time, check_out_time, note')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .gte('attendance_date', dateFrom)
      .lte('attendance_date', dateTo)

    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }

    const { data: attData, error: attErr } = await query

    if (attErr) {
      setError(attErr.message)
      setLoading(false)
      return
    }

    setAttendances(attData || [])
    setLoading(false)
  }

  // Stats globales
  const stats = useMemo(() => {
    return {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      late: attendances.filter(a => a.status === 'late').length,
      excused: attendances.filter(a => a.status === 'excused').length,
    }
  }, [attendances])

  const attendanceRate = stats.total > 0
    ? ((stats.present / stats.total) * 100).toFixed(1)
    : '0'

  // Pie data
  const pieData = useMemo(() => {
    return [
      { name: 'حاضر', value: stats.present, color: '#10B981' },
      { name: 'غائب', value: stats.absent, color: '#EF4444' },
      { name: 'متأخر', value: stats.late, color: '#F59E0B' },
      { name: 'مبرر', value: stats.excused, color: '#3B82F6' },
    ].filter(x => x.value > 0)
  }, [stats])

  // Rapport par élève
  const studentReports = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      massar: string
      present: number
      absent: number
      late: number
      excused: number
      total: number
      rate: number
    }>()

    students.forEach(s => {
      map.set(s.id, {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        massar: s.massar_code || '-',
        present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0,
      })
    })

    attendances.forEach(a => {
      const entry = map.get(a.student_id)
      if (!entry) return
      entry.total += 1
      if (a.status === 'present') entry.present += 1
      else if (a.status === 'absent') entry.absent += 1
      else if (a.status === 'late') entry.late += 1
      else if (a.status === 'excused') entry.excused += 1
    })

    return Array.from(map.values())
      .filter(r => r.total > 0)
      .map(r => ({
        ...r,
        rate: r.total > 0 ? (r.present / r.total) * 100 : 0,
      }))
      .sort((a, b) => b.absent - a.absent)
  }, [students, attendances])

  // Filtrer par recherche
  const filteredStudentReports = useMemo(() => {
    if (!studentSearch.trim()) return studentReports
    const term = studentSearch.toLowerCase()
    return studentReports.filter(r =>
      r.name.toLowerCase().includes(term) || r.massar.toLowerCase().includes(term)
    )
  }, [studentReports, studentSearch])

  // Rapport par classe (bar chart)
  const classChartData = useMemo(() => {
    return classes.map(c => {
      const classAtt = attendances.filter(a => a.class_id === c.id)
      const present = classAtt.filter(a => a.status === 'present').length
      const absent = classAtt.filter(a => a.status === 'absent').length
      const late = classAtt.filter(a => a.status === 'late').length
      return {
        name: `${c.level_name} - ${c.name}`,
        present,
        absent,
        late,
      }
    }).filter(c => c.present + c.absent + c.late > 0)
  }, [classes, attendances])

  // Top absent
  const topAbsent = useMemo(() => {
    return studentReports
      .filter(r => r.absent > 0)
      .sort((a, b) => b.absent - a.absent)
      .slice(0, 5)
  }, [studentReports])

  // Export Excel
  const handleExportExcel = () => {
    if (filteredStudentReports.length === 0) {
      alert('لا توجد بيانات للتصدير')
      return
    }

    const data = filteredStudentReports.map(r => ({
      'التلميذ': r.name,
      'رقم مسار': r.massar,
      'حاضر': r.present,
      'غائب': r.absent,
      'متأخر': r.late,
      'مبرر': r.excused,
      'الإجمالي': r.total,
      'نسبة الحضور %': r.rate.toFixed(1),
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport')
    XLSX.writeFile(wb, `attendance-report-${dateFrom}-${dateTo}.xlsx`)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* HEADER */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => router.push('/dashboard/attendance')}
            className="mb-2 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> رجوع إلى الحضور
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            تقرير الحضور والغياب
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تحليل شامل لحضور التلاميذ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium text-sm"
          >
            <Download className="h-4 w-4" /> تصدير Excel
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* FILTRES */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">الفلاتر</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <DateInput value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <DateInput value={dateTo} onChange={setDateTo} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">جميع الأقسام</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.level_name} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-lg col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2 opacity-90 text-sm">
            <TrendingUp className="h-4 w-4" />
            نسبة الحضور
          </div>
          <p className="text-3xl font-bold">{attendanceRate}%</p>
          <p className="text-xs opacity-80 mt-1">{stats.total} سجل</p>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> حاضر
          </div>
          <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 text-red-600 text-xs mb-1">
            <XCircle className="h-3.5 w-3.5" /> غائب
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
            <Clock className="h-3.5 w-3.5" /> متأخر
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
            <AlertCircle className="h-3.5 w-3.5" /> مبرر
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.excused}</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800">توزيع الحالات</h3>
          </div>
          {pieData.length === 0 ? (
            <p className="text-center text-slate-400 py-20">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(e: any) => `${e.name}: ${e.value}`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart par classe */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-purple-600" />
            <h3 className="font-bold text-slate-800">الحضور حسب القسم</h3>
          </div>
          {classChartData.length === 0 ? (
            <p className="text-center text-slate-400 py-20">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" fontSize={10} stroke="#94A3B8" />
                <YAxis fontSize={10} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" fill="#10B981" name="حاضر" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#EF4444" name="غائب" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="#F59E0B" name="متأخر" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TOP ABSENT */}
      {topAbsent.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
          <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            أكثر التلاميذ غياباً (Top 5)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {topAbsent.map((s, i) => (
              <div key={s.id} className="bg-white rounded-xl p-4 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{s.absent}</p>
                <p className="text-xs text-slate-500 mt-1">غياب</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLEAU DÉTAILLÉ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-slate-800">تفاصيل حسب التلميذ ({filteredStudentReports.length})</h3>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="بحث..."
              className="w-56 pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filteredStudentReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>لا توجد بيانات في هذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">التلميذ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">مساr</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-600 uppercase">حاضر</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 uppercase">غائب</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600 uppercase">متأخر</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase">مبرر</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">نسبة الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentReports.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.massar}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                        {s.present}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                        s.absent > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {s.absent}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                        s.late > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {s.late}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                        s.excused > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {s.excused}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className={`h-2 rounded-full ${
                              s.rate >= 90 ? 'bg-emerald-500' :
                              s.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, s.rate)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{s.rate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}