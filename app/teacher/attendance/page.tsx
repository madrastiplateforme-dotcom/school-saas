// app/teacher/attendance/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import {
  UserCheck, RefreshCw, Save, Check, Info, Calendar, AlertCircle,
} from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
}
type Status = 'present' | 'absent' | 'late'

export default function TeacherAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [students, setStudents] = useState<Student[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  useEffect(() => { loadInitial() }, [])
  useEffect(() => {
    if (selectedClass) loadStudentsAndAttendance()
  }, [selectedClass, date])

  const loadInitial = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      const { establishmentId: estId, classes: list } =
        await fetchTeacherData(supabase, user.id)

      setEstablishmentId(estId)
      setClasses(list)
      if (list.length > 0) setSelectedClass(list[0].id)
    } catch (e: any) {
      console.error('[teacher-attendance]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const loadStudentsAndAttendance = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      // 1) Enrollments
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')

      const ids = (enrolls || []).map((e: any) => e.student_id).filter(Boolean)

      // 2) Students
      let list: Student[] = []
      if (ids.length > 0) {
        const { data: studs } = await supabase
          .from('students')
          .select('id, first_name, last_name, massar_code')
          .in('id', ids)

        list = (studs || [])
          .map((s: any) => ({
            id: s.id,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            massar_code: s.massar_code || null,
          }))
          .sort((a, b) =>
            `${a.first_name} ${a.last_name}`.localeCompare(
              `${b.first_name} ${b.last_name}`,
            ),
          )
      }
      setStudents(list)

      // 3) Attendance الموجودة
      const { data: existing } = await supabase
        .from('attendances')
        .select('student_id, status')
        .eq('class_id', selectedClass)
        .eq('attendance_date', date)

      const map: Record<string, Status> = {}
      ;(existing || []).forEach((a: any) => {
        if (a.student_id) map[a.student_id] = a.status as Status
      })
      list.forEach((s) => {
        if (!map[s.id]) map[s.id] = 'present'
      })
      setStatuses(map)
    } catch (e: any) {
      console.error('[attendance-load]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const setStatus = (sid: string, st: Status) => {
    setStatuses((p) => ({ ...p, [sid]: st }))
  }

  const handleMarkAll = (st: Status) => {
    const next: Record<string, Status> = {}
    students.forEach((s) => (next[s.id] = st))
    setStatuses(next)
  }

 const handleSave = async () => {
  if (!selectedClass || !date || !establishmentId) return
  setSaving(true); setError(''); setSuccess('')
  const supabase = createClient()
  try {
    const rows = students.map((s) => ({
      establishment_id: establishmentId,
      class_id: selectedClass,
      student_id: s.id,
      attendance_date: date,
      status: statuses[s.id] || 'present',
    }))

    const { error: err } = await supabase
      .from('attendances')
      .upsert(rows, { onConflict: 'class_id,student_id,attendance_date' })

    if (err) throw err

    // ⭐ إيميلات الغياب (fire & forget)
    const absentIds = students
      .filter((s) => statuses[s.id] === 'absent')
      .map((s) => s.id)

    if (absentIds.length > 0) {
      fetch('/api/teacher/absence-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: absentIds, date }),
      }).catch((e) => console.error('[absence-alert-call]', e))
    }

    setSuccess(
      `✅ تم حفظ الحضور${absentIds.length > 0 ? ` — جارٍ إرسال ${absentIds.length} إشعار غياب` : ''}`,
    )
    setTimeout(() => setSuccess(''), 4000)
  } catch (e: any) {
    console.error('[attendance-save]', e?.message || e)
    setError(e?.message || 'فشل الحفظ')
  } finally { setSaving(false) }
}
  if (loading && classes.length === 0) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const counts = students.reduce(
    (acc, s) => {
      const st = statuses[s.id] || 'present'
      acc[st] = (acc[st] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-sky-600" /> تسجيل الحضور
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            سجل الحضور والغياب لتلاميذ قسمك
          </p>
        </div>
        <button
          onClick={loadInitial}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش أقسام مسندة ليك</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  القسم
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level_name ? `— ${c.level_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> التاريخ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {selectedClass && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-slate-800">
                    التلاميذ ({students.length})
                  </h2>
                  <div className="flex items-center gap-3 text-xs mt-1">
                    <span className="text-emerald-700 font-bold">
                      حاضر: {counts.present || 0}
                    </span>
                    <span className="text-amber-700 font-bold">
                      متأخر: {counts.late || 0}
                    </span>
                    <span className="text-rose-700 font-bold">
                      غائب: {counts.absent || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkAll('present')}
                    className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                  >
                    الكل حاضر
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || students.length === 0}
                    className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">ما كايناش تلاميذ مسجلين فهاد القسم</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {students.map((s, idx) => {
                    const current = statuses[s.id] || 'present'
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition flex-wrap"
                      >
                        <span className="w-8 text-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate text-sm">
                            {s.first_name} {s.last_name}
                          </p>
                          {s.massar_code && (
                            <p className="text-xs text-slate-500" dir="ltr">
                              {s.massar_code}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {(['present', 'late', 'absent'] as Status[]).map(
                            (st) => {
                              const label =
                                st === 'present'
                                  ? 'حاضر'
                                  : st === 'late'
                                  ? 'متأخر'
                                  : 'غائب'
                              const activeColor =
                                st === 'present'
                                  ? 'bg-emerald-500 text-white'
                                  : st === 'late'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-500 text-white'
                              const inactiveColor =
                                st === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : st === 'late'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              return (
                                <button
                                  key={st}
                                  onClick={() => setStatus(s.id, st)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    current === st
                                      ? activeColor
                                      : inactiveColor
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            },
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {selectedClass && students.length > 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-sky-900">
                💡 التلاميذ بدون تسجيل كيتحسبو <strong>حاضرين</strong> أوتوماتيكياً.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}