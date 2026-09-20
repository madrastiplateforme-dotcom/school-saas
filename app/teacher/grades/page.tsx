'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ClipboardList, RefreshCw, Save, Check, Info, Users, BookOpen,
  GraduationCap, Calendar, AlertCircle,
} from 'lucide-react'

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
type LevelOpt = { id: string; name: string }
type ClassOpt = { id: string; name: string; level_id: string; level_name: string }
type SubjectOpt = { id: string; name: string; level_id: string }
type Evaluation = {
  id: string
  name: string
  date: string | null
  weight: number | null
  term: number
  class_id: string
  subject_id: string
  max_score: number | null
}
type Student = { id: string; full_name: string; massar_code: string | null }

const DEFAULT_MAX = 20

export default function TeacherGradesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)

  const [classes, setClasses] = useState<ClassOpt[]>([])
  const [subjects, setSubjects] = useState<SubjectOpt[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedEval, setSelectedEval] = useState('')

  // ═══════════════════════════════════════════════════
  // 1) Initial load
  // ═══════════════════════════════════════════════════
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
        .maybeSingle()

      const estabId = profile?.establishment_id
      if (!estabId) {
        setError('لا توجد مؤسسة')
        setLoading(false)
        return
      }
      setEstablishmentId(estabId)

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!staffRow?.id) {
        setError('لم يتم العثور على بيانات الأستاذ')
        setLoading(false)
        return
      }
      setStaffId(staffRow.id)

      const { data: tsList, error: tsErr } = await supabase
        .from('teacher_subjects')
        .select('subject_id, level_id')
        .eq('teacher_id', staffRow.id)
        .eq('establishment_id', estabId)

      if (tsErr) throw new Error(tsErr.message)

      const rows = tsList || []
      const levelIds = Array.from(
        new Set(rows.map((r: any) => r.level_id).filter(Boolean)),
      ) as string[]
      const subjectIds = Array.from(
        new Set(rows.map((r: any) => r.subject_id).filter(Boolean)),
      ) as string[]

      if (levelIds.length === 0 || subjectIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: levelsData } = await supabase
        .from('levels')
        .select('id, name')
        .in('id', levelIds)
        .eq('establishment_id', estabId)

      const levelMap = new Map<string, string>()
      ;(levelsData || []).forEach((l: any) => levelMap.set(l.id, l.name || '—'))

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds)
        .eq('establishment_id', estabId)

      const subjectMap = new Map<string, string>()
      ;(subjectsData || []).forEach((s: any) => subjectMap.set(s.id, s.name || '—'))

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, level_id')
        .in('level_id', levelIds)
        .eq('establishment_id', estabId)
        .order('name')

      const classList: ClassOpt[] = (classesData || []).map((c: any) => ({
        id: c.id,
        name: c.name || '—',
        level_id: c.level_id,
        level_name: levelMap.get(c.level_id) || '—',
      }))
      setClasses(classList)

      const subjectList: SubjectOpt[] = rows
        .map((r: any) => ({
          id: r.subject_id,
          name: subjectMap.get(r.subject_id) || '—',
          level_id: r.level_id,
        }))
        .filter((s: any) => s.id && s.level_id)

      const uniqueSubjects = Array.from(
        new Map(subjectList.map((s) => [`${s.id}:${s.level_id}`, s])).values(),
      )
      setSubjects(uniqueSubjects)
    } catch (e: any) {
      console.error('[teacher-grades]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════
  // 2) Evaluations quand class + subject changent
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setEvaluations([])
      setSelectedEval('')
      setStudents([])
      setScores({})
      return
    }
    loadEvaluations()
  }, [selectedClass, selectedSubject])

  const loadEvaluations = async () => {
    const supabase = createClient()
    setEvaluations([])
    setSelectedEval('')
    setStudents([])
    setScores({})

    try {
      // ⚠️ On tente de lire max_score. S'il n'existe pas en DB, on retombe sur null → DEFAULT_MAX (20).
      const { data, error: err } = await supabase
        .from('evaluations')
        .select('id, name, date, weight, term, class_id, subject_id, max_score')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('is_active', true)
        .order('date', { ascending: false })

      if (err) {
        // Fallback si la colonne max_score n'existe pas encore
        console.warn('[loadEvaluations] retry without max_score:', err.message)
        const { data: data2, error: err2 } = await supabase
          .from('evaluations')
          .select('id, name, date, weight, term, class_id, subject_id')
          .eq('class_id', selectedClass)
          .eq('subject_id', selectedSubject)
          .eq('is_active', true)
          .order('date', { ascending: false })

        if (err2) {
          console.error('[loadEvaluations]', err2?.message || err2)
          return
        }

        const fallback = (data2 || []).map((e: any) => ({ ...e, max_score: null }))
        setEvaluations(fallback as Evaluation[])
        return
      }

      setEvaluations((data || []) as Evaluation[])
    } catch (e: any) {
      console.error('[loadEvaluations]', e?.message || e)
    }
  }

  // ═══════════════════════════════════════════════════
  // 3) Students + grades quand evaluation change
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedEval) {
      setStudents([])
      setScores({})
      return
    }
    loadStudentsAndGrades()
  }, [selectedEval])

  const loadStudentsAndGrades = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const { data: enrolls, error: enrErr } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('establishment_id', establishmentId)
        .eq('status', 'active')

      if (enrErr) throw new Error(enrErr.message)

      const studentIds = Array.from(
        new Set((enrolls || []).map((e: any) => e.student_id).filter(Boolean)),
      ) as string[]

      if (studentIds.length === 0) {
        setStudents([])
        setScores({})
        setLoading(false)
        return
      }

      const { data: studentsData, error: stErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .in('id', studentIds)
        .eq('establishment_id', establishmentId)

      if (stErr) throw new Error(stErr.message)

      const studentList: Student[] = (studentsData || [])
        .map((s: any) => ({
          id: s.id,
          full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          massar_code: s.massar_code || null,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))

      setStudents(studentList)

      const { data: existing, error: gErr } = await supabase
        .from('grades')
        .select('student_id, score')
        .eq('evaluation_id', selectedEval)
        .in('student_id', studentIds)

      if (gErr) {
        console.warn('[loadGrades]', gErr.message)
      }

      const map: Record<string, string> = {}
      ;(existing || []).forEach((g: any) => {
        if (g.student_id != null && g.score != null) {
          map[g.student_id] = String(g.score)
        }
      })
      setScores(map)
    } catch (e: any) {
      console.error('[loadStudentsAndGrades]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════
  // Computed
  // ═══════════════════════════════════════════════════
  const selectedClassObj = classes.find((c) => c.id === selectedClass)
  const selectedClassLevelId = selectedClassObj?.level_id

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => s.level_id === selectedClassLevelId),
    [subjects, selectedClassLevelId],
  )

  const selectedEvalObj = evaluations.find((e) => e.id === selectedEval)

  // ⭐ Barème dynamique : max_score de l'évaluation, sinon 20
  const currentMax = selectedEvalObj?.max_score ?? DEFAULT_MAX

  // ⭐ Détection des notes invalides
  const invalidStudents = useMemo(() => {
    const out: { id: string; name: string; value: string; reason: string }[] = []
    students.forEach((s) => {
      const raw = scores[s.id]
      if (raw === undefined || raw === '') return
      const n = parseFloat(raw)
      if (isNaN(n)) {
        out.push({ id: s.id, name: s.full_name, value: raw, reason: 'قيمة غير رقمية' })
      } else if (n < 0) {
        out.push({ id: s.id, name: s.full_name, value: raw, reason: 'النقطة سالبة' })
      } else if (n > currentMax) {
        out.push({ id: s.id, name: s.full_name, value: raw, reason: `أكبر من ${currentMax}` })
      }
    })
    return out
  }, [scores, students, currentMax])

  const isRowInvalid = (id: string) => invalidStudents.some((x) => x.id === id)

  // ═══════════════════════════════════════════════════
  // Save
  // ═══════════════════════════════════════════════════
  const handleSave = async () => {
    if (!selectedEval || !establishmentId || !staffId || students.length === 0) return

    // ⭐ On refuse de sauvegarder s'il y a des notes invalides
    if (invalidStudents.length > 0) {
      const names = invalidStudents.slice(0, 3).map((x) => x.name).join('، ')
      const more = invalidStudents.length > 3 ? ` و ${invalidStudents.length - 3} آخرون` : ''
      setError(
        `❌ لا يمكن الحفظ: ${invalidStudents.length} نقطة خارج النطاق (0-${currentMax}). ` +
          `تحقق من: ${names}${more}.`,
      )
      return
    }

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
          if (isNaN(num) || num < 0 || num > currentMax) return null
          return {
            evaluation_id: selectedEval,
            student_id: s.id,
            score: num,
            establishment_id: establishmentId,
          }
        })
        .filter(Boolean) as any[]

      if (rows.length === 0) {
        setError(`ما كايناش نقط صحيحة للحفظ (0-${currentMax})`)
        setSaving(false)
        return
      }

      const { error: err } = await supabase
        .from('grades')
        .upsert(rows, { onConflict: 'evaluation_id,student_id' })

      if (err) throw new Error(err.message)

      setSuccess(`✅ تم حفظ ${rows.length} نقطة بنجاح`)
      setTimeout(() => setSuccess(''), 3500)
    } catch (e: any) {
      console.error('[grades-save]', e?.message || e)
      setError(e?.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  if (loading && classes.length === 0) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const hasTS = classes.length > 0 && subjects.length > 0

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
            اختر القسم والمادة والتقييم
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {!hasTS && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Info className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            ما عندكش أقسام ومواد مسندة ليك
          </p>
          <p className="text-xs text-slate-400 mt-1">
            تواصل مع الإدارة باش يسندو ليك المستويات والمواد
          </p>
        </div>
      )}

      {/* Filters */}
      {hasTS && (
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
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.level_name} - {c.name}
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
                    {ev.name}
                    {ev.date ? ` (${new Date(ev.date).toLocaleDateString('fr-FR')})` : ''}
                    {ev.term ? ` — الفصل ${ev.term}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClass && selectedSubject && evaluations.length === 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                ما كايناش تقييمات مفعّلة لهذا القسم والمادة. خاص الإدارة تصاوب تقييم.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Students + Scores */}
      {selectedEval && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-600" />
                التلاميذ ({students.length})
              </h2>
              {selectedEvalObj && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <Calendar className="h-3 w-3" />
                  {selectedEvalObj.name}
                  {selectedEvalObj.weight ? ` • المعامل: ${selectedEvalObj.weight}` : ''}
                  {' • '}
                  <span className="font-bold text-sky-700">
                    Barème: <span dir="ltr">/{currentMax}</span>
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || students.length === 0 || invalidStudents.length > 0}
              className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'جارٍ الحفظ...' : 'حفظ النقط'}
            </button>
          </div>

          {invalidStudents.length > 0 && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold mb-0.5">
                  ⚠️ {invalidStudents.length} نقطة خارج النطاق (0-{currentMax}):
                </p>
                <ul className="list-disc pr-4 space-y-0.5">
                  {invalidStudents.slice(0, 5).map((x) => (
                    <li key={x.id}>
                      {x.name} — <span dir="ltr" className="font-mono">{x.value}</span> ({x.reason})
                    </li>
                  ))}
                  {invalidStudents.length > 5 && (
                    <li className="text-red-600">و {invalidStudents.length - 5} آخرون...</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">ما كايناش تلاميذ مسجلين فهاد القسم</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((s, idx) => {
                const invalid = isRowInvalid(s.id)
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 px-5 py-3 transition ${
                      invalid ? 'bg-red-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-8 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate text-sm">
                        {s.full_name}
                      </p>
                      {s.massar_code && (
                        <p
                          className="text-xs text-slate-500 mt-0.5 font-mono"
                          dir="ltr"
                        >
                          {s.massar_code}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={currentMax}
                          step="0.25"
                          value={scores[s.id] ?? ''}
                          onChange={(e) =>
                            setScores((p) => ({ ...p, [s.id]: e.target.value }))
                          }
                          placeholder="—"
                          dir="ltr"
                          className={`w-20 text-center border rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 ${
                            invalid
                              ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                              : 'border-slate-200 focus:ring-sky-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 font-mono">
                          /{currentMax}
                        </span>
                      </div>
                      {invalid && (
                        <span className="text-[10px] text-red-600 font-bold">
                          خارج النطاق
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {students.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                <span className="font-bold">
                  مسجلين: <span dir="ltr">{Object.keys(scores).filter((k) => scores[k] !== '').length}</span> / <span dir="ltr">{students.length}</span>
                </span>
                <span className="text-slate-400">|</span>
                <span>Barème: <span dir="ltr" className="font-bold">/{currentMax}</span></span>
                {invalidStudents.length > 0 && (
                  <>
                    <span className="text-slate-400">|</span>
                    <span className="text-red-600 font-bold">
                      ❌ {invalidStudents.length} خطأ
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || students.length === 0 || invalidStudents.length > 0}
                className="inline-flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      {hasTS && !selectedEval && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900">
            <p className="font-bold mb-1">💡 نصيحة</p>
            <p className="text-sky-800">
              اختر القسم ثم المادة ثم التقييم لتسجيل النقط. النقط غادي تتحفظ مباشرة.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}