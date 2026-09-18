// app/teacher/students/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  User, RefreshCw, ChevronLeft, BookOpen, GraduationCap, Calendar,
  AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp,
  ShieldAlert, ClipboardList, UserCheck,
} from 'lucide-react'

type Tab = 'overview' | 'grades' | 'attendance' | 'discipline'

type StudentInfo = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  birth_date: string | null
  gender: string | null
  class_id: string | null
  class_name: string | null
  level_name: string | null
}

type GradeRow = {
  id: string
  score: number
  evaluation_name: string
  evaluation_date: string
  coefficient: number
  subject_name: string
}

type AttendRow = {
  id: string
  attendance_date: string
  status: string
  note: string | null
}

type DiscRow = {
  id: string
  incident_date: string
  category: string | null
  severity: string | null
  title: string
  description: string | null
}

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

const statusLabel = (s: string) => {
  if (s === 'present') return { text: 'حاضر', color: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 }
  if (s === 'absent') return { text: 'غائب', color: 'text-rose-700 bg-rose-50', icon: XCircle }
  if (s === 'late') return { text: 'متأخر', color: 'text-amber-700 bg-amber-50', icon: Clock }
  if (s === 'excused') return { text: 'مبرر', color: 'text-sky-700 bg-sky-50', icon: CheckCircle2 }
  return { text: s, color: 'text-slate-700 bg-slate-50', icon: AlertCircle }
}

export default function TeacherStudentDetailPage() {
  const params = useParams()
  const studentId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authorized, setAuthorized] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  const [info, setInfo] = useState<StudentInfo | null>(null)
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [attends, setAttends] = useState<AttendRow[]>([])
  const [disciplines, setDisciplines] = useState<DiscRow[]>([])

  useEffect(() => { if (studentId) loadData() }, [studentId])

  const loadData = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      // 1) Auth + staff
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      const { data: staffRow } = await supabase
        .from('staff').select('id').eq('user_id', user.id).maybeSingle()
      if (!staffRow?.id) {
        setError('ملف الأستاذ غير موجود'); setLoading(false); return
      }

      // 2) teacher_subjects (SANS JOIN)
      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('subject_id, level_id')
        .eq('teacher_id', staffRow.id)

      const levelIds = Array.from(
        new Set((ts || []).map((r: any) => r.level_id).filter(Boolean)),
      )

      // 3) Student
      const { data: student } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code, birth_date, gender')
        .eq('id', studentId)
        .maybeSingle()

      if (!student) {
        setError('التلميذ غير موجود'); setLoading(false); return
      }

      // 4) Enrollment → class (SANS JOIN)
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('class_id, level_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .limit(1)

      const enr = enrolls?.[0] as any
      if (!enr?.class_id) {
        setAuthorized(false); setLoading(false); return
      }

      // 5) Class info (SANS JOIN)
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, level_id')
        .eq('id', enr.class_id)
        .maybeSingle()

      // ✅ AUTHORIZATION: level ديال class خاصو يكون فـ levels ديال الأستاذ
      if (!cls?.level_id || !levelIds.includes(cls.level_id)) {
        setAuthorized(false); setLoading(false); return
      }

      // 6) Level name
      let levelName: string | null = null
      if (cls.level_id) {
        const { data: lv } = await supabase
          .from('levels').select('name').eq('id', cls.level_id).maybeSingle()
        levelName = lv?.name || null
      }

      setInfo({
        id: student.id,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        massar_code: student.massar_code,
        birth_date: student.birth_date,
        gender: student.gender,
        class_id: cls.id,
        class_name: cls.name || null,
        level_name: levelName,
      })

      // 7) Grades (SANS JOIN)
      const { data: gradesRaw } = await supabase
        .from('grades')
        .select('id, score, evaluation_id')
        .eq('student_id', studentId)

      const evalIds = Array.from(
        new Set((gradesRaw || []).map((g: any) => g.evaluation_id).filter(Boolean)),
      )

      let evaluationsMap = new Map<string, any>()
      if (evalIds.length > 0) {
        const { data: evals } = await supabase
          .from('evaluations')
          .select('id, name, date, coefficient, subject_id')
          .in('id', evalIds)

        const subjectIds = Array.from(
          new Set((evals || []).map((e: any) => e.subject_id).filter(Boolean)),
        )

        let subjectsMap = new Map<string, string>()
        if (subjectIds.length > 0) {
          const { data: subjs } = await supabase
            .from('subjects').select('id, name').in('id', subjectIds)
          ;(subjs || []).forEach((s: any) => subjectsMap.set(s.id, s.name))
        }

        ;(evals || []).forEach((e: any) => {
          evaluationsMap.set(e.id, {
            ...e,
            subject_name: subjectsMap.get(e.subject_id) || '—',
          })
        })
      }

      const mappedGrades: GradeRow[] = (gradesRaw || [])
        .map((g: any) => {
          const ev = evaluationsMap.get(g.evaluation_id)
          if (!ev) return null
          return {
            id: g.id,
            score: Number(g.score) || 0,
            evaluation_name: ev.name || '—',
            evaluation_date: ev.date || '',
            coefficient: ev.coefficient || 1,
            subject_name: ev.subject_name,
          }
        })
        .filter(Boolean) as GradeRow[]

      mappedGrades.sort((a, b) =>
        (b.evaluation_date || '').localeCompare(a.evaluation_date || ''),
      )
      setGrades(mappedGrades)

      // 8) Attendances (SANS JOIN)
      const { data: atData } = await supabase
        .from('attendances')
        .select('id, attendance_date, status, note')
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false })
        .limit(100)
      setAttends(atData || [])

      // 9) Disciplines (SANS JOIN sur discipline_actions)
      const { data: discData } = await supabase
        .from('disciplines')
        .select('id, incident_date, category, severity, title, description')
        .eq('student_id', studentId)
        .order('incident_date', { ascending: false })

      setDisciplines(discData || [])
    } catch (e: any) {
      console.error('[teacher-student-detail]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  // Moyenne pondérée
  const moyenne = (() => {
    if (grades.length === 0) return null
    let sumW = 0, sumC = 0
    grades.forEach((g) => {
      const c = g.coefficient || 1
      sumW += g.score * c
      sumC += c
    })
    return sumC > 0 ? sumW / sumC : null
  })()

  const attendsStats = {
    present: attends.filter((a) => a.status === 'present').length,
    absent: attends.filter((a) => a.status === 'absent').length,
    late: attends.filter((a) => a.status === 'late').length,
    excused: attends.filter((a) => a.status === 'excused').length,
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-300 mx-auto mb-3" />
          <p className="text-slate-700 font-bold">ما عندكش صلاحية لهاد التلميذ</p>
          <p className="text-xs text-slate-500 mt-1">خاص التلميذ يكون مسجل فقسم من مستويات اللي كتدرّس</p>
          <Link href="/teacher/classes" className="text-sm text-sky-600 hover:text-sky-800 mt-3 inline-block">
            ← رجع للأقسام
          </Link>
        </div>
      </div>
    )
  }

  if (!info) return null

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: User },
    { key: 'grades', label: 'النقط', icon: ClipboardList },
    { key: 'attendance', label: 'الحضور', icon: UserCheck },
    { key: 'discipline', label: 'الانضباط', icon: ShieldAlert },
  ]

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header>
        <Link href={info.class_id ? `/teacher/classes/${info.class_id}` : '/teacher/classes'}
          className="text-xs text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 mb-1">
          <ChevronLeft className="h-3 w-3" /> رجع للقسم
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 font-bold text-sky-800 text-xl">
            {info.first_name.charAt(0) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {info.first_name} {info.last_name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              {info.class_name && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {info.class_name}
                </span>
              )}
              {info.level_name && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> {info.level_name}
                </span>
              )}
              {info.massar_code && (
                <span className="font-mono" dir="ltr">{info.massar_code}</span>
              )}
            </div>
          </div>
          <button onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition inline-flex items-center gap-2 ${
              tab === key ? 'bg-sky-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ═══ Overview ═══ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                <TrendingUp className="h-4 w-4 text-sky-600" /> المعدل العام
              </div>
              <p className="text-3xl font-bold text-slate-900" dir="ltr">
                {moyenne !== null ? moyenne.toFixed(2) : '—'}
                <span className="text-base text-slate-400">/20</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                <ClipboardList className="h-4 w-4 text-sky-600" /> عدد النقط
              </div>
              <p className="text-3xl font-bold text-slate-900" dir="ltr">{grades.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                <AlertCircle className="h-4 w-4 text-rose-500" /> غيابات
              </div>
              <p className="text-3xl font-bold text-rose-700" dir="ltr">{attendsStats.absent}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">معلومات شخصية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">تاريخ الميلاد</p>
                <p className="font-bold text-slate-800" dir="ltr">
                  {info.birth_date ? fmtDate(info.birth_date) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">الجنس</p>
                <p className="font-bold text-slate-800">
                  {info.gender === 'M' ? 'ذكر' : info.gender === 'F' ? 'أنثى' : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">كود مسار</p>
                <p className="font-bold text-slate-800 font-mono" dir="ltr">
                  {info.massar_code || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">آخر النقط</h3>
            {grades.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد نقط</p>
            ) : (
              <div className="space-y-2">
                {grades.slice(0, 5).map((g) => (
                  <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{g.evaluation_name}</p>
                      <p className="text-xs text-slate-500">
                        {g.subject_name} • {fmtDate(g.evaluation_date)}
                      </p>
                    </div>
                    <span className={`font-bold text-lg ${g.score >= 10 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                      {g.score}/20
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Grades ═══ */}
      {tab === 'grades' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {grades.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد نقط مسجلة</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr className="text-xs font-bold text-slate-600">
                  <th className="text-right px-4 py-3">المادة</th>
                  <th className="text-right px-4 py-3">التقييم</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">التاريخ</th>
                  <th className="text-left px-4 py-3">النقطة</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">{g.subject_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{g.evaluation_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {fmtDate(g.evaluation_date)}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={`font-bold ${g.score >= 10 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                        {g.score}/20
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ Attendance ═══ */}
      {tab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'حاضر', val: attendsStats.present, color: 'text-emerald-700 bg-emerald-50' },
              { label: 'غائب', val: attendsStats.absent, color: 'text-rose-700 bg-rose-50' },
              { label: 'متأخر', val: attendsStats.late, color: 'text-amber-700 bg-amber-50' },
              { label: 'مبرر', val: attendsStats.excused, color: 'text-sky-700 bg-sky-50' },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border border-gray-100 shadow-sm p-4 ${s.color}`}>
                <p className="text-xs font-bold">{s.label}</p>
                <p className="text-2xl font-bold mt-1" dir="ltr">{s.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {attends.length === 0 ? (
              <div className="p-12 text-center">
                <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">لا توجد سجلات حضور</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr className="text-xs font-bold text-slate-600">
                    <th className="text-right px-4 py-3">التاريخ</th>
                    <th className="text-right px-4 py-3">الحالة</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {attends.map((a) => {
                    const st = statusLabel(a.status)
                    const Icon = st.icon
                    return (
                      <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(a.attendance_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${st.color}`}>
                            <Icon className="h-3 w-3" /> {st.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{a.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ Discipline ═══ */}
      {tab === 'discipline' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {disciplines.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد حالات تأديبية</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {disciplines.map((d) => (
                <div key={d.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{d.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {fmtDate(d.incident_date)}
                        </span>
                        {d.category && <span>• {d.category}</span>}
                        {d.severity && <span className="font-bold text-amber-700">• {d.severity}</span>}
                      </div>
                    </div>
                  </div>
                  {d.description && (
                    <p className="text-sm text-slate-700 mt-2">{d.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}