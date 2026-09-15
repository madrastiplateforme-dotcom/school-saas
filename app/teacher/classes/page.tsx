// app/teacher/classes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  BookOpen, RefreshCw, Users, ChevronLeft, GraduationCap,
} from 'lucide-react'

type ClassRow = {
  class_id: string
  class_name: string
  level_name: string | null
  subjects: string[]
  students_count: number
}

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

      // profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()

      const est = (profile as any)?.establishments
      if (est?.name) setSchoolName(est.name)

      // staff
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!staffRow?.id) {
        setLoading(false)
        return
      }

      // teacher_subjects with class + subject + level
      const { data: ts, error: err } = await supabase
        .from('teacher_subjects')
        .select(
          'class_id, subject_id, classes(id, name, levels(name)), subjects(id, name)',
        )
        .eq('teacher_id', staffRow.id)

      if (err) throw err

      // group by class
      const map = new Map<string, ClassRow>()
      ;(ts || []).forEach((row: any) => {
        const cls = row.classes
        if (!cls?.id) return
        if (!map.has(cls.id)) {
          map.set(cls.id, {
            class_id: cls.id,
            class_name: cls.name || '—',
            level_name: cls.levels?.name || null,
            subjects: [],
            students_count: 0,
          })
        }
        const entry = map.get(cls.id)!
        if (row.subjects?.name && !entry.subjects.includes(row.subjects.name)) {
          entry.subjects.push(row.subjects.name)
        }
      })

      const classList = Array.from(map.values())

      // students count per class
      if (classList.length > 0) {
        const classIds = classList.map((c) => c.class_id)
        const { data: enrolls } = await supabase
          .from('enrollments')
          .select('class_id')
          .in('class_id', classIds)
          .eq('status', 'active')

        const counts: Record<string, number> = {}
        ;(enrolls || []).forEach((e: any) => {
          counts[e.class_id] = (counts[e.class_id] || 0) + 1
        })
        classList.forEach((c) => {
          c.students_count = counts[c.class_id] || 0
        })
      }

      setClasses(classList)
    } catch (e: any) {
      console.error('[teacher-classes]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const totalStudents = classes.reduce((sum, c) => sum + c.students_count, 0)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-600" />
            أقسامي
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {classes.length} قسم / {totalStudents} تلميذ
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {classes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش أقسام مسندة ليك</p>
          <p className="text-xs text-slate-400 mt-1">
            تواصل مع الإدارة باش يسندو ليك الأقسام والمواد
          </p>
        </div>
      )}

      {classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div
              key={c.class_id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg truncate">
                      {c.class_name}
                    </h3>
                    {c.level_name && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {c.level_name}
                      </p>
                    )}
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-sky-800 flex-shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-slate-800" dir="ltr">
                    {c.students_count}
                  </span>
                  <span className="text-xs text-slate-500">تلميذ</span>
                </div>

                {c.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.subjects.map((s) => (
                      <span
                        key={s}
                        className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}