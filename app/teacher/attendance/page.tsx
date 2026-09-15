// app/teacher/attendance/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  UserCheck, RefreshCw, Save, Check, Info, Calendar,
} from 'lucide-react'

type ClassOpt = { id: string; name: string }
type Student = { id: string; full_name: string; code: string | null }
type Status = 'present' | 'absent' | 'late'

export default function TeacherAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [classOpts, setClassOpts] = useState<ClassOpt[]>([])

  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [students, setStudents] = useState<Student[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  // ── 1. Initial load ──
  useEffect(() => {
    loadInitial()
  }, [])

  const loadInitial = async () => {
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
        .select('establishment_id')
        .eq('user_id', user.id)
        .single()
      setEstablishmentId(profile?.establishment_id || null)

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!staffRow?.id) {
        setLoading(false)
        return
      }
      setTeacherId(staffRow.id)

      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('class_id, classes(id, name)')
        .eq('teacher_id', staffRow.id)

      const map = new Map<string, ClassOpt>()
      ;(ts || []).forEach((row: any) => {
        if (row.classes?.id) {
          map.set(row.classes.id, {
            id: row.classes.id,
            name: row.classes.name || '—',
          })
        }
      })
      setClassOpts(Array.from(map.values()))
    } catch (e: any) {
      console.error('[teacher-attendance]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  // ── 2. Load students + existing attendance when class/date change ──
  useEffect(() => {
    if (!selectedClass || !date) {
      setStudents([])
      setStatuses({})
      return
    }
    loadStudentsAndAttendance()
  }, [selectedClass, date])

  const loadStudentsAndAttendance = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    try {
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('student_id, students(id, full_name, massar_code)')
        .eq('class_id', selectedClass)
        .eq('status', 'active')

      const list: Student[] = (enrolls || [])
        .map((e: any) => ({
          id: e.students?.id,
          full_name: e.students?.full_name || '—',
          code: e.students?.massar_code || null,
        }))
        .filter((s) => s.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      setStudents(list)

      const { data: existing } = await supabase
        .from('attendances')
        .select('student_id, status')
        .eq('class_id', selectedClass)
        .eq('attendance_date', date)

      const map: Record<string, Status> = {}
      ;(existing || []).forEach((a: any) => {
        if (a.student_id) map[a.student_id] = a.status as Status
      })
      // default = present for those without record
      list.forEach((s) => {
        if (!map[s.id]) map[s.id] = 'present'
      })
      setStatuses(map)
    } catch (e: any) {
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
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
    if (!selectedClass || !date || !establishmentId || !teacherId) return
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    try {
      const rows = students.map((s) => ({
        establishment_id: establishmentId,
        class_id: selectedClass,
        student_id: s.id,
        attendance_date: date,
        status: statuses[s.id] || 'present',
        recorded_by: teacherId,
      }))

      const { error: err } = await supabase
        .from('attendances')
        .upsert(rows, { onConflict: 'class_id,student_id,attendance_date' })

      if (err) throw err
      setSuccess('✅ تم حفظ الحضور بنجاح')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      console.error('[attendance-save]', e)
      setError(e.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  if (loading && classOpts.length === 0) {
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
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-sky-600" />
            تسجيل الحضور
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              القسم
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">— اختر —</option>
              {classOpts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> التاريخ
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Students */}
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
                        {s.full_name}
                      </p>
                      {s.code && (
                        <p className="text-xs text-slate-500" dir="ltr">
                          {s.code}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setStatus(s.id, 'present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          current === 'present'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        حاضر
                      </button>
                      <button
                        onClick={() => setStatus(s.id, 'late')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          current === 'late'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        متأخر
                      </button>
                      <button
                        onClick={() => setStatus(s.id, 'absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          current === 'absent'
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        غائب
                      </button>
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
            💡 التلاميذ بدون تسجيل كيتحسبو <strong>حاضرين</strong> أوتوماتيكياً. بدل الحالة إلا بغيت.
          </p>
        </div>
      )}
    </div>
  )
}