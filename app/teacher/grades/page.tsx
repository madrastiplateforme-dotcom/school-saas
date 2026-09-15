// app/teacher/grades/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ClipboardList, RefreshCw, Save, Check, Info } from 'lucide-react'

type ClassOpt = { id: string; name: string }
type SubjectOpt = { id: string; name: string; class_id: string }
type Evaluation = {
  id: string
  name: string
  date: string | null
  coefficient: number | null
}
type Student = { id: string; full_name: string; code: string | null }

export default function TeacherGradesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)

  const [classOpts, setClassOpts] = useState<ClassOpt[]>([])
  const [subjectOpts, setSubjectOpts] = useState<SubjectOpt[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedEval, setSelectedEval] = useState('')

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

      // teacher_subjects → classes + subjects
      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('subject_id, class_id, subjects(name), classes(name)')
        .eq('teacher_id', staffRow.id)

      const classesMap = new Map<string, ClassOpt>()
      const subjects: SubjectOpt[] = []
      ;(ts || []).forEach((row: any) => {
        if (row.classes?.id) {
          classesMap.set(row.classes.id, {
            id: row.classes.id,
            name: row.classes.name || '—',
          })
        }
        if (row.subjects?.id && row.class_id) {
          subjects.push({
            id: row.subjects.id,
            name: row.subjects.name || '—',
            class_id: row.class_id,
          })
        }
      })
      setClassOpts(Array.from(classesMap.values()))
      setSubjectOpts(subjects)
    } catch (e: any) {
      console.error('[teacher-grades]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  // ── 2. Evaluations when class + subject change ──
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setEvaluations([])
      setSelectedEval('')
      return
    }
    loadEvaluations()
  }, [selectedClass, selectedSubject])

  const loadEvaluations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('evaluations')
      .select('id, name, date, coefficient')
      .eq('class_id', selectedClass)
      .eq('subject_id', selectedSubject)
      .order('date', { ascending: false })

    setEvaluations(data || [])
    setSelectedEval('')
    setStudents([])
    setScores({})
  }

  // ── 3. Students + grades when evaluation changes ──
  useEffect(() => {
    if (!selectedEval) {
      setStudents([])
      setScores({})
      return
    }
    loadStudentsAndGrades()
  }, [selectedEval])

  const loadStudentsAndGrades = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      // students via enrollments
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('student_id, students(id, full_name, massar_code)')
        .eq('class_id', selectedClass)
        .eq('status', 'active')

      const studentList: Student[] = (enrolls || [])
        .map((e: any) => ({
          id: e.students?.id,
          full_name: e.students?.full_name || '—',
          code: e.students?.massar_code || null,
        }))
        .filter((s) => s.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      setStudents(studentList)

      // existing grades
      const { data: existing } = await supabase
        .from('grades')
        .select('student_id, score, value, note')
        .eq('evaluation_id', selectedEval)

      const map: Record<string, string> = {}
      ;(existing || []).forEach((g: any) => {
        const v = g.score ?? g.value ?? g.note
        if (g.student_id != null && v != null) {
          map[g.student_id] = String(v)
        }
      })
      setScores(map)
    } catch (e: any) {
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = useMemo(
    () => subjectOpts.filter((s) => s.class_id === selectedClass),
    [subjectOpts, selectedClass],
  )

  const selectedEvalObj = evaluations.find((e) => e.id === selectedEval)

  const handleSave = async () => {
    if (!selectedEval || !establishmentId || !teacherId) return
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    try {
      const rows = students
        .map((s) => {
          const raw = scores[s.id]
          if (raw === undefined || raw === '') return null
          const num = parseFloat(raw)
          if (isNaN(num)) return null
          return {
            evaluation_id: selectedEval,
            student_id: s.id,
            score: num,
            establishment_id: establishmentId,
          }
        })
        .filter(Boolean)

      if (rows.length === 0) {
        setSaving(false)
        setError('ما كايناش نقط مسجلة')
        return
      }

      const { error: err } = await supabase
        .from('grades')
        .upsert(rows as any, {
          onConflict: 'evaluation_id,student_id',
        })

      if (err) throw err
      setSuccess('✅ تم حفظ النقط بنجاح')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      console.error('[grades-save]', e)
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

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-sky-600" />
            تسجيل النقط
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            اختر القسم والمادة والتقييم لتسجيل النقط
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              القسم
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSubject('')
                setSelectedEval('')
              }}
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
            <label className="block text-sm font-bold text-slate-700 mb-2">
              المادة
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">— اختر —</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              التقييم
            </label>
            <select
              value={selectedEval}
              onChange={(e) => setSelectedEval(e.target.value)}
              disabled={!selectedSubject || evaluations.length === 0}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">— اختر —</option>
              {evaluations.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.date ? `(${ev.date})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && selectedSubject && evaluations.length === 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              ما كايناش تقييمات لهذا القسم والمادة. تواصل مع الإدارة باش تصاوب تقييم.
            </p>
          </div>
        )}
      </div>

      {/* Students + scores */}
      {selectedEval && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-slate-800">
              التلاميذ ({students.length})
              {selectedEvalObj?.coefficient ? ` • المعامل: ${selectedEvalObj.coefficient}` : ''}
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'جارٍ الحفظ...' : 'حفظ النقط'}
            </button>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ما كايناش تلاميذ مسجلين فهاد القسم</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition"
                >
                  <span className="w-8 text-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate text-sm">
                      {s.full_name}
                    </p>
                    {s.code && (
                      <p
                        className="text-xs text-slate-500 mt-0.5"
                        dir="ltr"
                      >
                        {s.code}
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    value={scores[s.id] ?? ''}
                    onChange={(e) =>
                      setScores((p) => ({ ...p, [s.id]: e.target.value }))
                    }
                    placeholder="—"
                    dir="ltr"
                    className="w-20 text-center border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}