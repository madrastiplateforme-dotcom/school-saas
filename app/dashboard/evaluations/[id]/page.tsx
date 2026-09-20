'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  ArrowRight, Save, RefreshCw, CheckCircle2, X, Users,
  GraduationCap, BookOpen, Calendar, AlertTriangle, Info,
  Download, Search, FileText, AlertCircle,
} from 'lucide-react'

type Student = {
  id: string
  full_name: string
  registration_number?: string | null
}

type GradeRow = {
  student_id: string
  grade: number | null
  is_absent: boolean
  comment: string | null
  // UI only
  rawValue: string
  dirty: boolean
  validationError: string | null
}

export default function EvaluationGradesPage() {
  const params = useParams()
  const router = useRouter()
  const evalId = params?.id as string

  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'
  const isSecretaire = role === 'secretaire'
  const canManage = isDirector || isSecretaire

  const [evaluation, setEvaluation] = useState<any>(null)
  const [classInfo, setClassInfo] = useState<{ id: string; name: string; level_id: string | null; level_name: string | null } | null>(null)
  const [subject, setSubject] = useState<{ id: string; name: string; color: string } | null>(null)
  const [typeName, setTypeName] = useState('')
  const [termName, setTermName] = useState('')
  const [gradeMax, setGradeMax] = useState(20)

  const [students, setStudents] = useState<Student[]>([])
  const [rows, setRows] = useState<Record<string, GradeRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!establishmentId || !evalId || !role) return
    loadAll()
  }, [establishmentId, evalId, role])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Evaluation
    const { data: ev } = await supabase
      .from('evaluations')
      .select('*')
      .eq('id', evalId)
      .single()

    if (!ev) {
      setError('التقييم غير موجود')
      setLoading(false)
      return
    }
    setEvaluation(ev)

    // 2. Class + level
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name, grade_max)')
      .eq('id', ev.class_id)
      .single()

    if (cls) {
      setClassInfo({
        id: cls.id,
        name: cls.name,
        level_id: cls.level_id,
        level_name: (cls.levels as any)?.name || null,
      })
      setGradeMax(Number((cls.levels as any)?.grade_max) || 20)
    }

    // 3. Subject
    const { data: sub } = await supabase
      .from('subjects')
      .select('id, name, color')
      .eq('id', ev.subject_id)
      .single()
    if (sub) setSubject(sub)

    // 4. Type
    const { data: tp } = await supabase
      .from('evaluation_types')
      .select('name_ar')
      .eq('id', ev.evaluation_type_id)
      .single()
    setTypeName(tp?.name_ar || '')

    // 5. Term name
    const { data: settings } = await supabase
      .from('school_settings')
      .select('term_names')
      .eq('establishment_id', establishmentId)
      .maybeSingle()
    const tnames = Array.isArray(settings?.term_names) ? settings.term_names : ['الدورة 1', 'الدورة 2']
    setTermName(tnames[ev.term - 1] || `الفصل ${ev.term}`)

    // 6. Students in class (from enrollments of this class + year)
    const { data: enrs, error: enrsErr } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        students!inner(id, first_name, last_name, massar_code, gender)
      `)
      .eq('class_id', ev.class_id)
      .eq('academic_year_id', ev.academic_year_id)
      .eq('establishment_id', establishmentId)

    if (enrsErr) {
      console.error('Erreur chargement élèves:', enrsErr)
      setError('خطأ في تحميل قائمة التلاميذ: ' + enrsErr.message)
    }

    const studs: Student[] = (enrs || [])
      .map((e: any) => {
        const s = e.students
        if (!s) return null
        return {
          id: s.id,
          full_name: `${s.first_name} ${s.last_name}`.trim(),
          registration_number: s.massar_code || null,
        } as Student
      })
      .filter(Boolean) as Student[]

    studs.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'))

    setStudents(studs)

    // 7. Existing grades
    const { data: existingGrades } = await supabase
      .from('grades')
      .select('student_id, grade, is_absent, comment')
      .eq('evaluation_id', evalId)

    const gradeMap: Record<string, GradeRow> = {}
    studs.forEach((s: Student) => {
      const existing = (existingGrades || []).find((g: any) => g.student_id === s.id)
      gradeMap[s.id] = {
        student_id: s.id,
        grade: existing?.grade ?? null,
        is_absent: existing?.is_absent ?? false,
        comment: existing?.comment ?? null,
        rawValue: existing?.grade != null ? String(existing.grade) : (existing?.is_absent ? 'ABS' : ''),
        dirty: false,
        validationError: null,
      }
    })
    setRows(gradeMap)

    setLoading(false)
  }

  // ⭐ VALIDATION: on garde la valeur brute + on calcule l'erreur
  const validateRaw = (raw: string): { grade: number | null; is_absent: boolean; validationError: string | null } => {
    const trimmed = raw.trim().toUpperCase()

    // Absent
    if (trimmed === 'ABS' || trimmed === 'غ') {
      return { grade: null, is_absent: true, validationError: null }
    }

    // Vide
    if (trimmed === '') {
      return { grade: null, is_absent: false, validationError: null }
    }

    // Nombre
    const n = parseFloat(trimmed.replace(',', '.'))

    if (isNaN(n)) {
      return { grade: null, is_absent: false, validationError: 'قيمة غير رقمية' }
    }
    if (n < 0) {
      return { grade: null, is_absent: false, validationError: 'النقطة سالبة' }
    }
    if (n > gradeMax) {
      return { grade: null, is_absent: false, validationError: `أكبر من ${gradeMax}` }
    }

    return { grade: n, is_absent: false, validationError: null }
  }

  const updateRow = (studentId: string, rawValue: string) => {
    const { grade, is_absent, validationError } = validateRaw(rawValue)

    setRows(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rawValue,
        grade,
        is_absent,
        validationError,
        dirty: true,
      },
    }))
  }

  const markAbsent = (studentId: string) => {
    setRows(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rawValue: 'ABS',
        grade: null,
        is_absent: true,
        validationError: null,
        dirty: true,
      },
    }))
  }

  const clearRow = (studentId: string) => {
    setRows(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rawValue: '',
        grade: null,
        is_absent: false,
        validationError: null,
        dirty: true,
      },
    }))
  }

  const handleSave = async () => {
    if (!establishmentId || !evalId) return

    // ⭐ BLOCAGE si erreurs de validation
    const invalidRows = Object.values(rows).filter(r => r.validationError)
    if (invalidRows.length > 0) {
      const names = invalidRows
        .slice(0, 3)
        .map(r => {
          const s = students.find(x => x.id === r.student_id)
          return `${s?.full_name || '—'} (${r.rawValue})`
        })
        .join('، ')
      const more = invalidRows.length > 3 ? ` و ${invalidRows.length - 3} آخرون` : ''
      setError(
        `❌ لا يمكن الحفظ: ${invalidRows.length} قيمة غير صحيحة. تحقق من: ${names}${more}`,
      )
      return
    }

    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      const upsertRows = Object.values(rows)
        .filter(r => r.dirty)
        .map(r => ({
          establishment_id: establishmentId,
          evaluation_id: evalId,
          student_id: r.student_id,
          grade: r.is_absent ? null : r.grade,
          is_absent: r.is_absent,
          comment: r.comment,
          updated_at: new Date().toISOString(),
        }))

      if (upsertRows.length === 0) {
        setSuccess('ما كاينش شي تغيير')
        setTimeout(() => setSuccess(''), 2000)
        setSaving(false)
        return
      }

      const { data: existing } = await supabase
        .from('grades')
        .select('student_id')
        .eq('evaluation_id', evalId)

      const existingSet = new Set((existing || []).map((g: any) => g.student_id))

      const toInsert = upsertRows.filter(r => !existingSet.has(r.student_id))
      const toUpdate = upsertRows.filter(r => existingSet.has(r.student_id))

      if (toInsert.length > 0) {
        const { error: e1 } = await supabase.from('grades').insert(toInsert)
        if (e1) throw e1
      }

      for (const row of toUpdate) {
        const { error: e2 } = await supabase
          .from('grades')
          .update({
            grade: row.grade,
            is_absent: row.is_absent,
            comment: row.comment,
            updated_at: row.updated_at,
          })
          .eq('evaluation_id', evalId)
          .eq('student_id', row.student_id)
        if (e2) throw e2
      }

      setRows(prev => {
        const next: Record<string, GradeRow> = {}
        Object.entries(prev).forEach(([k, v]) => {
          next[k] = { ...v, dirty: false }
        })
        return next
      })

      setSuccess(`✅ تم حفظ ${upsertRows.length} نقطة`)
      setTimeout(() => setSuccess(''), 2500)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    const vals = Object.values(rows).filter(r => !r.is_absent && r.grade != null)
    const absent = Object.values(rows).filter(r => r.is_absent).length
    const empty = students.length - vals.length - absent
    const sum = vals.reduce((s, r) => s + (r.grade || 0), 0)
    const avg = vals.length > 0 ? sum / vals.length : 0
    const pass = vals.filter(r => (r.grade || 0) >= gradeMax / 2).length
    const fail = vals.filter(r => (r.grade || 0) < gradeMax / 2).length
    return {
      total: students.length,
      filled: vals.length,
      absent,
      empty,
      avg: Math.round(avg * 100) / 100,
      pass,
      fail,
      successRate: vals.length > 0 ? Math.round((pass / vals.length) * 100) : 0,
    }
  }, [rows, students, gradeMax])

  const filteredStudents = students.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const dirtyCount = Object.values(rows).filter(r => r.dirty).length
  const invalidCount = Object.values(rows).filter(r => r.validationError).length

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!canManage) return <div className="p-6">ليس لديك صلاحية</div>
  if (!evaluation) return <div className="p-6">التقييم غير موجود</div>

  const color = subject?.color || '#4F46E5'

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/evaluations" className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6" style={{ color }} />
              {evaluation.name || typeName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {classInfo?.name} {classInfo?.level_name ? `· ${classInfo.level_name}` : ''}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" style={{ color }} />
                <span style={{ color }}>{subject?.name}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {termName}
              </span>
              <span className="font-medium text-slate-400">على {gradeMax}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || invalidCount > 0}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : `حفظ${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <span className="text-sm">{error}</span>
      </div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      {/* ⭐ Bandeau des erreurs de validation */}
      {invalidCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold mb-0.5">
              ⚠️ {invalidCount} قيمة غير صحيحة — لا يمكن الحفظ
            </p>
            <p className="text-red-700">
              خاص كل نقطة تكون بين 0 و {gradeMax}، ولا "ABS" للغائب، ولا فارغة.
            </p>
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>ملاحظات:</strong> أدخل رقماً من 0 إلى {gradeMax} · اكتب <code className="bg-white px-1.5 rounded text-xs font-mono">ABS</code> للغائب · اترك الخانة فارغة للتلميذ الذي لم تُصحَّح ورقته بعد.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">تلميذ</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.filled}</div>
          <div className="text-xs text-slate-500 mt-1">نقطة مسجلة</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-rose-600">{stats.absent}</div>
          <div className="text-xs text-slate-500 mt-1">غائب</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.avg}</div>
          <div className="text-xs text-slate-500 mt-1">المعدل / {gradeMax}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.successRate}%</div>
          <div className="text-xs text-slate-500 mt-1">نسبة النجاح</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن تلميذ..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grades table */}
      {students.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">لا يوجد تلاميذ في هذا القسم</p>
          <Link href="/dashboard/enroll" className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:underline font-medium">
            إضافة تلاميذ
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase w-12">#</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">الاسم الكامل</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-44">النقطة / {gradeMax}</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">إجراءات</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase w-48">ملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s, i) => {
                const row = rows[s.id]
                if (!row) return null
                const isAbsent = row.is_absent
                const numGrade = !isAbsent && row.grade != null ? row.grade : null
                const isPass = numGrade != null && numGrade >= gradeMax / 2
                const isFail = numGrade != null && numGrade < gradeMax / 2
                const isInvalid = !!row.validationError
                return (
                  <tr
                    key={s.id}
                    className={`transition ${isInvalid ? 'bg-red-50/60' : row.dirty ? 'bg-amber-50/40' : ''} ${isAbsent ? 'bg-rose-50/30' : ''}`}
                  >
                    <td className="px-4 py-2 text-slate-400 text-sm">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {(row.dirty || isInvalid) && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isInvalid ? 'bg-red-500' : 'bg-amber-500'}`}
                            title={isInvalid ? 'قيمة غير صحيحة' : 'تغيير غير محفوظ'}
                          />
                        )}
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={row.rawValue}
                        onChange={(e) => updateRow(s.id, e.target.value)}
                        placeholder={`0 - ${gradeMax}`}
                        className={`w-32 h-10 px-3 rounded-lg border-2 text-center font-bold text-lg transition focus:outline-none focus:ring-2 ${
                          isInvalid
                            ? 'bg-red-100 border-red-400 text-red-700 focus:ring-red-500'
                            : isAbsent
                              ? 'bg-rose-100 border-rose-300 text-rose-700 focus:ring-rose-500'
                              : isPass
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 focus:ring-emerald-500'
                                : isFail
                                  ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-orange-500'
                                  : 'bg-white border-slate-300 text-slate-800 focus:ring-indigo-500'
                        }`}
                      />
                      {isInvalid && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">
                          {row.validationError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => markAbsent(s.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            isAbsent
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                          title="غائب"
                        >
                          ABS
                        </button>
                        <button
                          onClick={() => clearRow(s.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                          title="مسح"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.comment || ''}
                        onChange={(e) => {
                          setRows(prev => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], comment: e.target.value, dirty: true },
                          }))
                        }}
                        placeholder="ملاحظة قصيرة..."
                        className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky save bar */}
      {dirtyCount > 0 && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 ${
          invalidCount > 0 ? 'bg-red-900 text-white' : 'bg-slate-900 text-white'
        }`}>
          <span className="text-sm">
            {invalidCount > 0 ? (
              <>
                ⚠️ <strong>{invalidCount}</strong> قيمة غير صحيحة
              </>
            ) : (
              <>
                <strong>{dirtyCount}</strong> تغيير غير محفوظ
              </>
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={saving || invalidCount > 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              invalidCount > 0
                ? 'bg-red-500/50 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            <Save className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={loadAll}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  )
}