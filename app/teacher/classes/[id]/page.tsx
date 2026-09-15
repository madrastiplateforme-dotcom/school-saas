// app/teacher/classes/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, RefreshCw, Users, GraduationCap, ChevronLeft, User,
  AlertCircle, Search,
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [className, setClassName] = useState('')
  const [levelName, setLevelName] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [authorized, setAuthorized] = useState(true)

  useEffect(() => { if (classId) loadData() }, [classId])

  const loadData = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffRow } = await supabase
        .from('staff').select('id').eq('user_id', user.id).maybeSingle()
      if (!staffRow?.id) { setError('ملف الأستاذ غير موجود'); setLoading(false); return }

      // تأكد أن الأستاذ كيدرّس هاد القسم
      const { data: ts } = await supabase
        .from('teacher_subjects')
        .select('subject_id, subjects(name), classes(name, levels(name))')
        .eq('teacher_id', staffRow.id)
        .eq('class_id', classId)

      if (!ts || ts.length === 0) {
        setAuthorized(false); setLoading(false); return
      }

      const cls = (ts[0] as any)?.classes
      setClassName(cls?.name || '—')
      setLevelName(cls?.levels?.name || null)
      setSubjects(Array.from(new Set((ts as any[]).map((r) => r.subjects?.name).filter(Boolean))))

      // students via enrollments (current year)
      const { data: profile } = await supabase
        .from('user_profiles').select('establishment_id').eq('user_id', user.id).maybeSingle()
      const estab = profile?.establishment_id

      const { data: year } = await supabase
        .from('academic_years').select('id')
        .eq('establishment_id', estab).eq('is_current', true).maybeSingle()

      let enrollQuery = supabase
        .from('enrollments')
        .select('student_id, students(id, first_name, last_name, massar_code)')
        .eq('class_id', classId)
        .eq('status', 'active')
      if (year?.id) enrollQuery = enrollQuery.eq('academic_year_id', year.id)

      const { data: enrolls } = await enrollQuery
      const list: Student[] = (enrolls || [])
        .map((e: any) => e.students)
        .filter(Boolean)
        .map((s: any) => ({
          id: s.id, first_name: s.first_name, last_name: s.last_name, massar_code: s.massar_code,
        }))
        .sort((a: Student, b: Student) => a.first_name.localeCompare(b.first_name))
      setStudents(list)
    } catch (e: any) {
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) ||
      (s.massar_code || '').toLowerCase().includes(q)
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
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/teacher/classes" className="text-xs text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 mb-1">
            <ChevronLeft className="h-3 w-3" /> رجع للأقسام
          </Link>
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
        <button onClick={loadData} className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
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
              <span key={s} className="text-xs font-bold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md">{s}</span>
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
                        {s.first_name.charAt(0)}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {s.first_name} {s.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-500 font-mono" dir="ltr">{s.massar_code || '—'}</span>
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