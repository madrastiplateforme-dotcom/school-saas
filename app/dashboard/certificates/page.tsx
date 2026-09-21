'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  Award, RefreshCw, Search, X, User, Download, BookOpen,
  GraduationCap, CheckCircle2, AlertCircle, FileText,
} from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  class_name: string | null
  level_name: string | null
}

const CERT_TYPES = [
  { value: 'شهادة مدرسية', labelAr: 'شهادة مدرسية', labelFr: 'Attestation de scolarité', icon: FileText, color: 'indigo' },
  { value: 'شهادة التسجيل', labelAr: 'شهادة التسجيل', labelFr: "Certificat d'inscription", icon: CheckCircle2, color: 'emerald' },
  { value: 'شهادة المغادرة', labelAr: 'شهادة المغادرة', labelFr: 'Certificat de départ', icon: User, color: 'rose' },
  { value: 'شهادة النجاح', labelAr: 'شهادة النجاح', labelFr: 'Certificat de réussite', icon: Award, color: 'amber' },
]

export default function DashboardCertificatesPage() {
  const establishmentId = useEstablishmentId()
  const { yearId: contextYearId, year: contextYear } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedType, setSelectedType] = useState(CERT_TYPES[0].value)
  const [purpose, setPurpose] = useState('')

  // Combobox state
  const [studentQuery, setStudentQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const studentBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!establishmentId || !contextYearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, contextYearId])

  // Close dropdown outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentBoxRef.current && !studentBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadData = async () => {
    if (!contextYearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // ✅ 1) Enrollments dyal l'année active → studentIds
      const { data: enrollmentsData, error: enrErr } = await supabase
        .from('enrollments')
        .select('student_id, class_id')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', contextYearId)
        .eq('status', 'active')

      if (enrErr) throw new Error(enrErr.message)

      const studentIds = Array.from(
        new Set((enrollmentsData || []).map((e: any) => e.student_id).filter(Boolean))
      ) as string[]

      if (studentIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // ✅ 2) Students actifs dyal l'année active
      const { data: studentsData, error: stErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .eq('establishment_id', establishmentId)
        .eq('status', 'active')
        .in('id', studentIds)
        .order('first_name')

      if (stErr) throw new Error(stErr.message)

      const studentList = studentsData || []

      // ✅ 3) Classes + levels
      const classIds = Array.from(
        new Set((enrollmentsData || []).map((e: any) => e.class_id).filter(Boolean))
      ) as string[]

      const classMap = new Map<string, { name: string; level_name: string | null }>()

      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, level_id')
          .in('id', classIds)

        const levelIds = Array.from(
          new Set((classesData || []).map((c: any) => c.level_id).filter(Boolean))
        ) as string[]

        const levelMap = new Map<string, string>()
        if (levelIds.length > 0) {
          const { data: levelsData } = await supabase
            .from('levels')
            .select('id, name')
            .in('id', levelIds)
          ;(levelsData || []).forEach((l: any) => levelMap.set(l.id, l.name))
        }

        ;(classesData || []).forEach((c: any) => {
          classMap.set(c.id, {
            name: c.name || '—',
            level_name: c.level_id ? (levelMap.get(c.level_id) || null) : null,
          })
        })
      }

      // 4) Merge
      const result: Student[] = studentList.map((st: any) => {
        const enr = (enrollmentsData || []).find((e: any) => e.student_id === st.id)
        const cls = enr?.class_id ? classMap.get(enr.class_id) : null
        return {
          id: st.id,
          first_name: st.first_name || '',
          last_name: st.last_name || '',
          massar_code: st.massar_code || null,
          class_name: cls?.name || null,
          level_name: cls?.level_name || null,
        }
      })

      setStudents(result)
    } catch (e: any) {
      console.error('[dashboard-certificates]', e?.message || e)
      setError(e?.message || 'خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (s: Student) => {
    setSelectedStudentId(s.id)
    setSelectedStudent(s)
    setStudentQuery(`${s.first_name} ${s.last_name}`)
    setDropdownOpen(false)
  }

  const handleClearStudent = () => {
    setSelectedStudentId('')
    setSelectedStudent(null)
    setStudentQuery('')
  }

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return students.slice(0, 50)
    return students
      .filter((s) => {
        const name = `${s.first_name} ${s.last_name}`.toLowerCase()
        const massar = (s.massar_code || '').toLowerCase()
        return name.includes(q) || massar.includes(q)
      })
      .slice(0, 50)
  }, [students, studentQuery])

  const handleDownload = () => {
    if (!selectedStudentId) {
      setError('المرجو اختيار التلميذ أولاً')
      return
    }
    setError('')
    const params = new URLSearchParams({
      studentId: selectedStudentId,
      type: selectedType,
    })
    if (purpose.trim()) params.set('purpose', purpose.trim())
    window.open(`/api/pdf/certificate?${params.toString()}`, '_blank')
    setSuccess('✅ تم فتح الشهادة في نافذة جديدة')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
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
            <Award className="h-6 w-6 text-indigo-600" />
            الشهادات المدرسية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {contextYear?.name && `${contextYear.name} — `}
            إصدار شهادات للتلاميذ
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Élève searchable combobox */}
        <div ref={studentBoxRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            التلميذ <span className="text-red-500">*</span>
          </label>

          {selectedStudent ? (
            <div className="flex items-center justify-between gap-3 h-11 px-3 border-2 border-indigo-500 bg-indigo-50/50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white font-bold text-xs flex-shrink-0">
                  {selectedStudent.first_name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  {selectedStudent.massar_code && (
                    <p className="text-[10px] text-slate-500 font-mono" dir="ltr">
                      {selectedStudent.massar_code}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearStudent}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition flex-shrink-0"
                title="تغيير التلميذ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="ابحث بالاسم أو رقم مسار..."
                  className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  dir="rtl"
                />
                {studentQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentQuery('')}
                    className="absolute left-2 top-3 h-5 w-5 grid place-items-center rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {dropdownOpen && (
                <div className="absolute z-40 right-0 left-0 mt-1 max-h-72 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {studentQuery ? 'ما لقيناش نتائج' : 'ما كايناش تلاميذ مسجلين'}
                    </div>
                  ) : (
                    <>
                      {!studentQuery && (
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          آخر 50 تلميذ
                        </div>
                      )}
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full text-right px-4 py-3 hover:bg-indigo-50 transition flex items-center gap-3 border-b border-slate-100 last:border-0"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex-shrink-0">
                            {s.first_name.charAt(0)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {s.first_name} {s.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                              {s.massar_code && (
                                <span className="font-mono" dir="ltr">{s.massar_code}</span>
                              )}
                              {s.class_name && (
                                <span className="flex items-center gap-0.5">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  {s.class_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedStudent && !studentQuery && (
            <p className="text-xs text-slate-400 mt-1">
              💡 اكتب اسم التلميذ ولا رقم مسار باش تلقاه بسرعة
            </p>
          )}
        </div>

        {/* Type de certificat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            نوع الشهادة <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CERT_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.value
              const colorClasses: Record<string, string> = {
                indigo: isSelected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:border-indigo-300',
                emerald: isSelected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 hover:border-emerald-300',
                rose: isSelected
                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                  : 'border-slate-200 hover:border-rose-300',
                amber: isSelected
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-slate-200 hover:border-amber-300',
              }
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex flex-col items-start gap-2 p-4 border-2 rounded-xl transition text-right ${colorClasses[type.color]}`}
                >
                  <Icon className="h-6 w-6" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{type.labelAr}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5" dir="ltr">
                      {type.labelFr}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 self-end" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الغرض من الشهادة (اختياري)
          </label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="مثال: للتسجيل في مؤسسة أخرى، لطلب منحة، للبنك..."
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedStudentId}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            توليد الشهادة PDF
          </button>
        </div>
      </div>

      {/* Info card pour l'élève sélectionné */}
      {selectedStudent && (
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-xl flex-shrink-0">
            {selectedStudent.first_name.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-base">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </p>
            <div className="flex items-center gap-3 text-xs text-indigo-700 mt-1 flex-wrap">
              {selectedStudent.class_name && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {selectedStudent.class_name}
                </span>
              )}
              {selectedStudent.level_name && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {selectedStudent.level_name}
                </span>
              )}
              {selectedStudent.massar_code && (
                <code className="font-mono text-[10px] text-indigo-600 bg-white px-2 py-0.5 rounded" dir="ltr">
                  {selectedStudent.massar_code}
                </code>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">الشهادة المختارة</p>
            <p className="text-sm font-bold text-indigo-800 mt-0.5">{selectedType}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {students.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            لا يوجد تلاميذ مسجلون في السنة الحالية
          </p>
        </div>
      )}
    </div>
  )
}