// app/teacher/classes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import { BookOpen, RefreshCw, Users, GraduationCap, ChevronLeft } from 'lucide-react'

export default function TeacherClassesPage() {
  const { yearId } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [schoolName, setSchoolName] = useState('')
  const [totalStudents, setTotalStudents] = useState(0)

  useEffect(() => {
    if (!yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()
      const est = (profile as any)?.establishments
      if (est?.name) setSchoolName(est.name)

      const { classes: list, totalStudents: tot } = await fetchTeacherData(
        supabase,
        user.id,
        yearId,
      )
      setClasses(list)
      setTotalStudents(tot)
    } catch (e: any) {
      console.error('[teacher-classes]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-600" /> أقسامي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {classes.length} قسم / {totalStudents} تلميذ
          </p>
        </div>
        <button onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {classes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش أقسام مسندة ليك</p>
        </div>
      )}

      {classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition block">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg truncate">{c.name}</h3>
                    {c.level_name && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> {c.level_name}
                      </p>
                    )}
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-sky-800 flex-shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </span>
                </div>
                {c.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.subjects.map((s) => (
                      <span key={s.id} className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs font-bold text-sky-600">
                  <Users className="h-3.5 w-3.5" /> عرض التلاميذ <ChevronLeft className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}