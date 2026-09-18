'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  ArrowRight, RefreshCw, Save, Users, GraduationCap, Search,
  Award, AlertTriangle, CheckCircle2, X, Info, FileText,
  Crown, Medal, Download, FileDown,
} from 'lucide-react'

import { pdf } from '@react-pdf/renderer'
import BulletinPDF, {
  type BulletinData,
  type BulletinSubjectRow,
  type Establishment,
} from '@/components/pdfs/BulletinPDF'

type Student = {
  id: string
  full_name: string
  registration_number?: string | null
  birth_date?: string | null
  gender?: string | null
}

type Subject = {
  id: string
  name: string
  color: string
  coefficient: number
}

type SubjectMoyenne = {
  subjectId: string
  average: number | null
  gradesCount: number
  absentCount: number
}

type StudentRow = {
  student: Student
  bySubject: Record<string, SubjectMoyenne>
  overall: number | null
  rank: number | null
  isPublished: boolean
}

export default function ClassBulletinsPage() {
  const params = useParams()
  const classId = params?.classId as string

  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const canManage = role === 'directeur' || role === 'secretaire'

  const [classInfo, setClassInfo] = useState<{ id: string; name: string; level_id: string | null; level_name: string | null } | null>(null)
  const [yearId, setYearId] = useState<string | null>(null)
  const [yearName, setYearName] = useState('')
  const [gradeMax, setGradeMax] = useState(20)

  const [termsCount, setTermsCount] = useState(2)
  const [termNames, setTermNames] = useState<string[]>(['الدورة 1', 'الدورة 2'])
  const [selectedTerm, setSelectedTerm] = useState(1)

  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [rows, setRows] = useState<StudentRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showPublishModal, setShowPublishModal] = useState(false)

  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId || !classId || !role) return
    loadAll()
  }, [establishmentId, classId, role])

  useEffect(() => {
    if (students.length > 0 && subjects.length > 0 && yearId) {
      computeMoyennes()
    }
  }, [selectedTerm, students, subjects, yearId])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Class + level + grade_max
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name, grade_max)')
      .eq('id', classId)
      .single()

    if (!cls) {
      setError('القسم غير موجود')
      setLoading(false)
      return
    }

    setClassInfo({
      id: cls.id,
      name: cls.name,
      level_id: cls.level_id,
      level_name: (cls.levels as any)?.name || null,
    })
    setGradeMax(Number((cls.levels as any)?.grade_max) || 20)

    // 2. Current year
    const { data: years } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)
      .maybeSingle()

    if (!years?.id) {
      setError('لا توجد سنة دراسية حالية')
      setLoading(false)
      return
    }
    setYearId(years.id)
    setYearName(years.name)

    // 3. Terms
    const { data: settings } = await supabase
      .from('school_settings')
      .select('terms_count, term_names')
      .eq('establishment_id', establishmentId)
      .maybeSingle()
    const tc = Number(settings?.terms_count) || 2
    const tn =
      Array.isArray(settings?.term_names) && settings.term_names.length > 0
        ? settings.term_names
        : ['الدورة 1', 'الدورة 2']
    setTermsCount(tc)
    setTermNames(tn)

    // 4. Establishment info (for PDF)
    const { data: est } = await supabase
      .from('establishments')
      .select('name, logo_url, address, city, phone')
      .eq('id', establishmentId)
      .single()
    if (est) setEstablishment(est)

    // 5. Students enrolled
    const { data: enrs, error: enrsErr } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        students!inner(id, first_name, last_name, massar_code, gender, birth_date)
      `)
      .eq('class_id', classId)
      .eq('academic_year_id', years.id)
      .eq('establishment_id', establishmentId)

    if (enrsErr) {
      console.error('خطأ في تحميل التلاميذ:', enrsErr)
      setError('خطأ في تحميل قائمة التلاميذ: ' + enrsErr.message)
    }

    const studs: Student[] = (enrs || [])
      .map((e: any) => {
        const s = e.students
        if (!s) return null
        return {
          id: s.id,
          full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          registration_number: s.massar_code || null,
          birth_date: s.birth_date || null,
          gender: s.gender || null,
        } as Student
      })
      .filter((s): s is Student => s !== null)

    studs.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'))
    setStudents(studs)

    // 6. Subjects for this class (from evaluations)
    const { data: evals } = await supabase
      .from('evaluations')
      .select('subject_id')
      .eq('class_id', classId)
      .eq('academic_year_id', years.id)
      .eq('is_active', true)

    const subjectIds = Array.from(
      new Set((evals || []).map((e: any) => e.subject_id))
    )

    if (subjectIds.length === 0) {
      setSubjects([])
      setLoading(false)
      return
    }

    const { data: subsData } = await supabase
      .from('subjects')
      .select('id, name, color, coefficient')
      .in('id', subjectIds)
      .order('name')

    // 7. Coefficients per level
    const levelId = cls.level_id
    const coeffMap: Record<string, number> = {}
    if (levelId) {
      const { data: coeffs } = await supabase
        .from('subject_level_coefficients')
        .select('subject_id, coefficient')
        .eq('establishment_id', establishmentId)
        .eq('level_id', levelId)
        .in('subject_id', subjectIds)
      ;(coeffs || []).forEach((c: any) => {
        coeffMap[c.subject_id] = Number(c.coefficient) || 1
      })
    }

    const subs: Subject[] = (subsData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#4F46E5',
      coefficient: coeffMap[s.id] ?? Number(s.coefficient) ?? 1,
    }))
    setSubjects(subs)

    setLoading(false)
  }

  const computeMoyennes = async () => {
    if (!establishmentId || !yearId || !classInfo) return
    const supabase = createClient()

    // 1. Evaluations for this term
    const { data: evals } = await supabase
      .from('evaluations')
      .select('id, subject_id')
      .eq('class_id', classId)
      .eq('academic_year_id', yearId)
      .eq('term', selectedTerm)
      .eq('is_active', true)

    const evalsBySubject: Record<string, string[]> = {}
    ;(evals || []).forEach((e: any) => {
      if (!evalsBySubject[e.subject_id]) evalsBySubject[e.subject_id] = []
      evalsBySubject[e.subject_id].push(e.id)
    })

    const allEvalIds = (evals || []).map((e: any) => e.id)

    // 2. Grades
    let grades: any[] = []
    if (allEvalIds.length > 0) {
      const { data: gr } = await supabase
        .from('grades')
        .select('evaluation_id, student_id, grade, is_absent')
        .in('evaluation_id', allEvalIds)
      grades = gr || []
    }

    // 3. Published bulletins
    const { data: published } = await supabase
      .from('bulletins')
      .select('student_id')
      .eq('class_id', classId)
      .eq('academic_year_id', yearId)
      .eq('term', selectedTerm)
      .eq('is_published', true)
    const publishedSet = new Set((published || []).map((b: any) => b.student_id))

    // 4. Compute per student
    const newRows: StudentRow[] = students.map(st => {
      const bySubject: Record<string, SubjectMoyenne> = {}

      subjects.forEach(sub => {
        const evalIds = evalsBySubject[sub.id] || []
        const studentGrades = grades.filter(
          g => g.student_id === st.id && evalIds.includes(g.evaluation_id)
        )
        const validGrades = studentGrades.filter(g => !g.is_absent && g.grade != null)
        const absentCount = studentGrades.filter(g => g.is_absent).length

        let avg: number | null = null
        if (validGrades.length > 0) {
          const sum = validGrades.reduce((s, g) => s + Number(g.grade), 0)
          avg = sum / validGrades.length
        }

        bySubject[sub.id] = {
          subjectId: sub.id,
          average: avg,
          gradesCount: validGrades.length,
          absentCount,
        }
      })

      let sumW = 0
      let sumCoef = 0
      subjects.forEach(sub => {
        const m = bySubject[sub.id]?.average
        if (m != null) {
          sumW += m * sub.coefficient
          sumCoef += sub.coefficient
        }
      })
      const overall = sumCoef > 0 ? sumW / sumCoef : null

      return {
        student: st,
        bySubject,
        overall,
        rank: null,
        isPublished: publishedSet.has(st.id),
      }
    })

    // 5. Ranks (ex-aequo)
    const sorted = [...newRows]
      .filter(r => r.overall != null)
      .sort((a, b) => (b.overall || 0) - (a.overall || 0))

    let currentRank = 1
    let prevAvg: number | null = null

    sorted.forEach((r, idx) => {
      if (prevAvg === null || r.overall !== prevAvg) {
        currentRank = idx + 1
      }
      const found = newRows.find(x => x.student.id === r.student.id)
      if (found) found.rank = currentRank
      prevAvg = r.overall
    })

    newRows.sort((a, b) => {
      if (a.rank === null && b.rank === null)
        return a.student.full_name.localeCompare(b.student.full_name, 'ar')
      if (a.rank === null) return 1
      if (b.rank === null) return -1
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.student.full_name.localeCompare(b.student.full_name, 'ar')
    })

    setRows(newRows)
  }

  const handlePublish = async () => {
    if (!establishmentId || !yearId || !classInfo) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      const classSize = rows.filter(r => r.overall != null).length

      const payload = rows
        .filter(r => r.overall != null)
        .map(r => ({
          establishment_id: establishmentId,
          academic_year_id: yearId,
          student_id: r.student.id,
          class_id: classId,
          term: selectedTerm,
          average: r.overall,
          rank: r.rank,
          class_size: classSize,
          is_published: true,
          generated_at: new Date().toISOString(),
        }))

      if (payload.length === 0) {
        setError('لا توجد معدلات لحفظها')
        setSaving(false)
        return
      }

      const { data: existing } = await supabase
        .from('bulletins')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', yearId)
        .eq('term', selectedTerm)

      const existingSet = new Set((existing || []).map((b: any) => b.student_id))

      const toInsert = payload.filter(p => !existingSet.has(p.student_id))
      const toUpdate = payload.filter(p => existingSet.has(p.student_id))

      if (toInsert.length > 0) {
        const { error: e1 } = await supabase.from('bulletins').insert(toInsert)
        if (e1) throw e1
      }

      for (const row of toUpdate) {
        const { error: e2 } = await supabase
          .from('bulletins')
          .update({
            average: row.average,
            rank: row.rank,
            class_size: row.class_size,
            is_published: true,
            generated_at: row.generated_at,
          })
          .eq('class_id', classId)
          .eq('academic_year_id', yearId)
          .eq('term', selectedTerm)
          .eq('student_id', row.student_id)
        if (e2) throw e2
      }

      setSuccess(`✅ تم نشر ${payload.length} كشف نقطة`)
      setTimeout(() => setSuccess(''), 3000)
      setShowPublishModal(false)
      await computeMoyennes()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  // ============ CLASS AVERAGES (لكل مادة) ============
  const classAverages = useMemo(() => {
    const result: Record<string, number | null> = {}
    subjects.forEach(sub => {
      const avgs = rows
        .map(r => r.bySubject[sub.id]?.average)
        .filter((v): v is number => v != null)
      result[sub.id] =
        avgs.length > 0
          ? Math.round((avgs.reduce((s, v) => s + v, 0) / avgs.length) * 100) / 100
          : null
    })
    return result
  }, [rows, subjects])

  // ============ BUILD BULLETIN DATA ============
  const buildBulletinData = (row: StudentRow): BulletinData => {
    const subjectRows: BulletinSubjectRow[] = subjects.map(s => {
      const m = row.bySubject[s.id]
      const avg = m?.average ?? null
      const weighted = avg != null ? avg * s.coefficient : null
      return {
        subjectId: s.id,
        subjectName: s.name,
        subjectColor: s.color,
        coefficient: s.coefficient,
        studentAverage: avg,
        classAverage: classAverages[s.id] ?? null,
        weightedValue: weighted,
        absentCount: m?.absentCount || 0,
      }
    })

    const totalCoef = subjectRows
      .filter(s => s.studentAverage != null)
      .reduce((sum, s) => sum + s.coefficient, 0)
    const totalWeighted = subjectRows
      .filter(s => s.weightedValue != null)
      .reduce((sum, s) => sum + (s.weightedValue || 0), 0)

    return {
      student: {
        id: row.student.id,
        fullName: row.student.full_name,
        massarCode: row.student.registration_number || null,
        birthDate: row.student.birth_date || null,
        gender: row.student.gender || null,
      },
      subjects: subjectRows,
      overall: row.overall,
      rank: row.rank,
      classSize: rows.filter(r => r.overall != null).length,
      totalCoef,
      totalWeighted,
      absencesJustified: 0,
      absencesUnjustified: 0,
      lates: 0,
      behavior: null,
      decision: null,
      decisionNotes: null,
      directorComment: null,
    }
  }

  // ============ PDF DOWNLOAD ============
  const handleDownloadPDF = async (row?: StudentRow) => {
    if (!establishment || !classInfo) return
    setDownloading(row ? row.student.id : '__all__')
    setError('')

    try {
      const targetRows = row ? [row] : rows.filter(r => r.overall != null)
      if (targetRows.length === 0) {
        setError('لا توجد بيانات لإصدار الكشوف')
        setDownloading(null)
        return
      }

      const bulletinsData = targetRows.map(r => buildBulletinData(r))

      const blob = await pdf(
        <BulletinPDF
          establishment={establishment}
          yearName={yearName}
          termName={termNames[selectedTerm - 1] || `الفصل ${selectedTerm}`}
          className={classInfo.name}
          levelName={classInfo.level_name}
          gradeMax={gradeMax}
          bulletins={bulletinsData}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = row
        ? `كشف-${row.student.full_name}-${termNames[selectedTerm - 1]}.pdf`
        : `كشوف-${classInfo.name}-${termNames[selectedTerm - 1]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(`تم توليد ${bulletinsData.length} كشف`)
      setTimeout(() => setSuccess(''), 2500)
    } catch (err: any) {
      setError('خطأ في توليد PDF: ' + (err.message || ''))
    } finally {
      setDownloading(null)
    }
  }

  // ============ STATS ============
  const stats = useMemo(() => {
    const withAvg = rows.filter(r => r.overall != null)
    if (withAvg.length === 0) {
      return { count: rows.length, average: 0, success: 0 }
    }
    const avg = withAvg.reduce((s, r) => s + (r.overall || 0), 0) / withAvg.length
    const passThreshold = gradeMax / 2
    const passed = withAvg.filter(r => (r.overall || 0) >= passThreshold).length
    const successRate = Math.round((passed / withAvg.length) * 100)
    return {
      count: rows.length,
      average: Math.round(avg * 100) / 100,
      success: successRate,
    }
  }, [rows, gradeMax])

  const filteredRows = rows.filter(r =>
    !search || r.student.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || roleLoading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (!canManage) return <div className="p-6">ليس لديك صلاحية</div>
  if (!classInfo) return <div className="p-6">القسم غير موجود</div>

  const noSubjects = subjects.length === 0
  const noStudents = students.length === 0
  const canDownload = downloading === null && rows.length > 0 && establishment

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bulletins" className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-600" />
              نقاط {classInfo.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3">
              {classInfo.level_name && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {classInfo.level_name}
                </span>
              )}
              {yearName && (
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  {yearName}
                </span>
              )}
              <span className="font-medium text-slate-400">على {gradeMax}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={() => handleDownloadPDF()}
            disabled={!canDownload}
            className="inline-flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium text-sm"
          >
            {downloading === '__all__' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> جارٍ التوليد...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> تحميل كل الكشوف
              </>
            )}
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={rows.length === 0 || noSubjects || noStudents}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm"
          >
            <Save className="h-4 w-4" /> حفظ ونشر
          </button>
        </div>
      </header>

      {error && !showPublishModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Term selector */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">اختر الفصل:</h3>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: termsCount }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setSelectedTerm(i + 1)}
              className={`px-5 py-2.5 rounded-lg font-bold transition ${
                selectedTerm === i + 1
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {termNames[i] || `الفصل ${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Warning */}
      {(noSubjects || noStudents) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            {noStudents && <p>⚠️ لا يوجد تلاميذ مسجلون في هذا القسم.</p>}
            {noSubjects && (
              <p>
                ⚠️ لا توجد تقييمات لهذا القسم في هذه السنة. أنشئ تقييمات من{' '}
                <Link href="/dashboard/evaluations" className="underline font-medium">
                  صفحة التقييمات
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-slate-800">{stats.count}</div>
            <div className="text-xs text-slate-500 mt-1">تلميذ في القسم</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.average}</div>
            <div className="text-xs text-slate-500 mt-1">معدل القسم / {gradeMax}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.success}%</div>
            <div className="text-xs text-slate-500 mt-1">نسبة النجاح</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-amber-600">
              {rows.filter(r => r.isPublished).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">كشوف منشورة</div>
          </div>
        </div>
      )}

      {/* Search */}
      {rows.length > 0 && (
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن تلميذ..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      )}

      {/* Table */}
      {filteredRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky right-0 z-10 bg-slate-50 border-b-2 border-slate-200 p-3 text-xs font-bold text-slate-600 w-12 text-center">
                    #
                  </th>
                  <th className="sticky right-12 z-10 bg-slate-50 border-b-2 border-slate-200 p-3 text-right text-xs font-bold text-slate-600 min-w-[180px]">
                    الاسم الكامل
                  </th>
                  {subjects.map(s => (
                    <th key={s.id} className="border-b-2 border-slate-200 p-2 text-center min-w-[90px]">
                      <div className="text-[11px] font-bold" style={{ color: s.color }}>
                        {s.name}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        معامل {s.coefficient}
                      </div>
                    </th>
                  ))}
                  <th className="border-b-2 border-slate-200 p-3 text-center bg-indigo-50 min-w-[100px]">
                    <div className="text-xs font-bold text-indigo-700">المعدل العام</div>
                    <div className="text-[9px] text-indigo-400 mt-0.5">/ {gradeMax}</div>
                  </th>
                  <th className="border-b-2 border-slate-200 p-3 text-center bg-amber-50 min-w-[80px]">
                    <div className="text-xs font-bold text-amber-700">الرتبة</div>
                  </th>
                  <th className="border-b-2 border-slate-200 p-3 text-center min-w-[80px]">
                    <div className="text-xs font-bold text-slate-600">الحالة</div>
                  </th>
                  <th className="border-b-2 border-slate-200 p-3 text-center min-w-[70px] print:hidden">
                    <div className="text-xs font-bold text-slate-600">PDF</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const pass = r.overall != null && r.overall >= gradeMax / 2
                  const hasAvg = r.overall != null
                  const isTop3 = r.rank != null && r.rank <= 3
                  return (
                    <tr
                      key={r.student.id}
                      className={`hover:bg-slate-50/50 transition ${isTop3 ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="sticky right-0 bg-white border-b border-slate-100 p-2 text-center">
                        <div className="flex items-center justify-center">
                          {r.rank === 1 ? (
                            <Crown className="h-4 w-4 text-amber-500" />
                          ) : r.rank === 2 ? (
                            <Medal className="h-4 w-4 text-slate-400" />
                          ) : r.rank === 3 ? (
                            <Medal className="h-4 w-4 text-amber-700" />
                          ) : (
                            <span className="text-slate-400 text-xs">{idx + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="sticky right-12 bg-white border-b border-slate-100 p-3">
                        <div className="flex items-center gap-2">
                          {r.isPublished && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          <span
                            className={`font-medium truncate ${
                              isTop3 ? 'text-amber-900' : 'text-slate-800'
                            }`}
                          >
                            {r.student.full_name || '(بدون اسم)'}
                          </span>
                        </div>
                      </td>
                      {subjects.map(s => {
                        const m = r.bySubject[s.id]
                        if (!m || m.average == null) {
                          return (
                            <td
                              key={s.id}
                              className="border-b border-slate-100 p-2 text-center"
                            >
                              <span className="text-slate-300 text-xs">—</span>
                            </td>
                          )
                        }
                        const subPass = m.average >= gradeMax / 2
                        return (
                          <td
                            key={s.id}
                            className="border-b border-slate-100 p-2 text-center"
                          >
                            <div className="flex flex-col items-center">
                              <span
                                className={`text-sm font-bold ${
                                  subPass ? 'text-emerald-700' : 'text-orange-700'
                                }`}
                              >
                                {m.average.toFixed(2)}
                              </span>
                              {m.absentCount > 0 && (
                                <span className="text-[9px] text-rose-500">
                                  {m.absentCount} غ
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="border-b border-slate-100 p-2 text-center bg-indigo-50/40">
                        {hasAvg ? (
                          <span
                            className={`text-base font-extrabold ${
                              pass ? 'text-emerald-600' : 'text-orange-600'
                            }`}
                          >
                            {r.overall!.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 p-2 text-center bg-amber-50/40">
                        {r.rank != null ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              r.rank === 1
                                ? 'bg-amber-400 text-white'
                                : r.rank === 2
                                  ? 'bg-slate-300 text-slate-700'
                                  : r.rank === 3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {r.rank}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 p-2 text-center">
                        {r.isPublished ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <CheckCircle2 className="h-3 w-3" /> منشور
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">غير منشور</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 p-2 text-center print:hidden">
                        <button
                          onClick={() => handleDownloadPDF(r)}
                          disabled={downloading !== null || r.overall == null}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                          title="تحميل كشف PDF"
                        >
                          {downloading === r.student.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !noStudents && !noSubjects && (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Info className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">لا توجد معدلات</p>
          <p className="text-sm text-slate-400 mt-2">
            تأكد من وجود تقييمات مسجلة ونقاط مدخلة لهذا الفصل
          </p>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Save className="h-5 w-5 text-emerald-600" />
                حفظ ونشر الكشوف
              </h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>ملاحظة:</strong> سيتم حفظ صورة ثابتة للمعدلات والرتب في قاعدة
              البيانات. أي تغيير لاحق في النقاط لن يؤثر على الكشوف المنشورة.
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">القسم:</span>
                <span className="font-bold text-slate-800">{classInfo.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">الفصل:</span>
                <span className="font-bold text-slate-800">
                  {termNames[selectedTerm - 1]}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">عدد التلاميذ:</span>
                <span className="font-bold text-slate-800">
                  {rows.filter(r => r.overall != null).length}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">معدل القسم:</span>
                <span className="font-bold text-indigo-600">{stats.average}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t mt-4">
              <button
                onClick={handlePublish}
                disabled={saving}
                className="h-11 px-6 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-bold"
              >
                <Save className="h-4 w-4" />
                {saving ? 'جارٍ النشر...' : 'حفظ ونشر'}
              </button>
              <button
                onClick={() => setShowPublishModal(false)}
                className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}