// app/teacher/classes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  BookOpen, RefreshCw, Users, GraduationCap, ChevronLeft,
  AlertCircle, Search, User, UserCheck, ShieldAlert,
} from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
}

export default function TeacherClassDetailPage() {
  const params = useParams()
  const classId = params?.id as string
  const { yearId } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authorized, setAuthorized] = useState(true)
  const [className, setClassName] = useState('')
  const [levelName, setLevelName] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (classId && yearId) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, yearId])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      // 1) Staff
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
      const subjectIds = Array.from(
        new Set((ts || []).map((r: any) => r.subject_id).filter(Boolean)),
      )

      // 3) Class — filtrée aussi par année
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, level_id, academic_year_id')
        .eq('id', classId)
        .eq('academic_year_id', yearId)
        .maybeSingle()

      if (!cls) {
        setError('القسم غير موجود في هذه السنة');
        setLoading(false);
        return
      }

      // ✅ AUTHORIZATION: level de la classe doit être dans les levels du prof
      if (!levelIds.includes(cls.level_id)) {
        setAuthorized(false); setLoading(false); return
      }

      setClassName(cls.name || '—')

      // 4) Level name
      if (cls.level_id) {
        const { data: lv } = await supabase
          .from('levels').select('name').eq('id', cls.level_id).maybeSingle()
        setLevelName(lv?.name || null)
      }

      // 5) Subjects enseignées dans ce niveau
      if (subjectIds.length > 0) {
        const { data: subjs } = await supabase
          .from('subjects').select('id, name').in('id', subjectIds)
        setSubjects((subjs || []).map((s: any) => s.name))
      }

      // 6) Students via enrollments de l'année active
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', yearId)
        .eq('status', 'active')

      const studentIds = (enrolls || [])
        .map((e: any) => e.student_id)
        .filter(Boolean)

      if (studentIds.length > 0) {
        const { data: studs } = await supabase
          .from('students')
          .select('id, first_name, last_name, massar_code')
          .in('id', studentIds)

        const list: Student[] = (studs || [])
          .map((s: any) => ({
            id: s.id,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            massar_code: s.massar_code,
          }))
          .sort((a, b) =>
            `${a.first_name} ${a.last_name}`.localeCompare(
              `${b.first_name} ${b.last_name}`,
            ),
          )
        setStudents(list)
      }
    } catch (e: any) {
      console.error('[teacher-class-detail]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.massar_code || '').toLowerCase().includes(q)
    )
  })

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
          <p className="text-slate-700 font-bold">ما عندكش صلاحية لهذا القسم</p>
          <Link href="/teacher/classes" className="text-sm text-sky-600 hover:text-sky-800 mt-2 inline-block">
            ← رجع للأقسام
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header>
        <Link href="/teacher/classes"
          className="text-xs text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 mb-1">
          <ChevronLeft className="h-3 w-3" /> رجع للأقسام
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-sky-600" />
              {className}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {levelName && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> {levelName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span dir="ltr" className="font-bold">{students.length}</span> تلميذ
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/teacher/attendance"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium text-sm">
              <UserCheck className="h-4 w-4" /> تسجيل الحضور
            </Link>
            <Link href="/teacher/discipline"
              className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 font-medium text-sm">
              <ShieldAlert className="h-4 w-4" /> الانضباط
            </Link>
            <button onClick={loadData}
              className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
              <RefreshCw className="h-4 w-4" /> تحديث
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-600 mb-2">المواد اللي كتدرّسها فهاد القسم:</p>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <span key={s} className="text-xs font-bold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالتلميذ..."
            className="w-full border border-gray-300 rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد تلاميذ مسجلين فهاد القسم</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr className="text-xs font-bold text-slate-600">
                <th className="text-right px-4 py-3">التلميذ</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">كود مسار</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 font-bold text-sky-800 text-sm">
                        {s.first_name.charAt(0) || '?'}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {s.first_name} {s.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-500 font-mono" dir="ltr">
                      {s.massar_code || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Link href={`/teacher/students/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800">
                      <User className="h-3.5 w-3.5" /> الملف
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}