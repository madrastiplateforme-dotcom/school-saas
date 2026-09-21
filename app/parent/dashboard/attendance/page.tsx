'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  ClipboardList, RefreshCw, Users, Calendar, AlertCircle, CheckCircle2,
  Clock, FileText,
} from 'lucide-react'

type Attendance = {
  id: string
  attendance_date: string
  status: string
  note: string | null
  check_in_time: string | null
  check_out_time: string | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  absences: number
  lates: number
  excused: number
  records: Attendance[]
}

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  absent:  { bg: 'bg-rose-50',    text: 'text-rose-700',    label: 'غائب' },
  late:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'متأخر' },
  excused: { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'مبرر' },
  present: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'حاضر' },
}

export default function ParentAttendancePage() {
  const { yearId, year } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState('')

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

      // ✅ LOGIC CHANGE : attendances filtrées par année active
      const { data: attendances } = await supabase
        .from('attendances')
        .select('id, student_id, attendance_date, status, note, check_in_time, check_out_time')
        .in('student_id', childIds)
        .eq('academic_year_id', yearId)
        .order('attendance_date', { ascending: false })
        .limit(200)

      const result: Child[] = students.map((st) => {
        const childAtt = (attendances || []).filter((a: any) => a.student_id === st.id)
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          absences: childAtt.filter((a: any) => a.status === 'absent').length,
          lates: childAtt.filter((a: any) => a.status === 'late').length,
          excused: childAtt.filter((a: any) => a.status === 'excused').length,
          records: childAtt.map((a: any) => ({
            id: a.id,
            attendance_date: a.attendance_date,
            status: a.status,
            note: a.note,
            check_in_time: a.check_in_time,
            check_out_time: a.check_out_time,
          })),
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-attendance]', e?.message || e)
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

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            الغيابات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {year?.name ? `${year.name} — ` : ''}
            سجل غيابات أبنائك
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
              {c.first_name}
              {c.absences > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {c.absences}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-medium text-slate-500">غيابات</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{current.absences}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-slate-500">تأخيرات</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{current.lates}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500">مبررة</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{current.excused}</div>
          </div>
        </div>
      )}

      {current && current.records.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا توجد سجلات غياب</p>
          <p className="text-xs text-slate-400 mt-1">
            ممتاز! ما كايناش غيابات مسجلة فـ هاد السنة
          </p>
        </div>
      )}

      {current && current.records.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-600" />
            <h2 className="font-bold text-slate-800 text-sm">
              السجلات ({current.records.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {current.records.map((a) => {
              const st = statusMap[a.status] || statusMap.present
              return (
                <div key={a.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${st.bg} ${st.text}`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {formatDate(a.attendance_date)}
                      </p>
                      {a.note && (
                        <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>
                      )}
                      {(a.check_in_time || a.check_out_time) && (
                        <p className="text-[10px] text-slate-400 mt-0.5" dir="ltr">
                          {a.check_in_time?.slice(0, 5) || '—'} → {a.check_out_time?.slice(0, 5) || '—'}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}