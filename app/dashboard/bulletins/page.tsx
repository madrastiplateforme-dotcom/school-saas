'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  FileText, RefreshCw, ArrowLeft, Users, GraduationCap, Search,
  TrendingUp, Award,
} from 'lucide-react'

type ClassRow = {
  id: string
  name: string
  level_id: string | null
  level_name: string | null
  students_count: number
  published_terms: number
}

export default function BulletinsListPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()
  const canManage = role === 'directeur' || role === 'secretaire'

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [termsCount, setTermsCount] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Terms settings
    const { data: settings } = await supabase
      .from('school_settings')
      .select('terms_count')
      .eq('establishment_id', establishmentId)
      .maybeSingle()
    setTermsCount(Number(settings?.terms_count) || 2)

    // ✅ Classes dyal l'année active
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .order('name')

    // For each class: count students + published bulletins (déjà par year)
    const rows: ClassRow[] = []
    for (const c of classesData || []) {
      const { count: sc } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', c.id)
        .eq('academic_year_id', yearId)

      const { count: pc } = await supabase
        .from('bulletins')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', c.id)
        .eq('academic_year_id', yearId)
        .eq('is_published', true)

      rows.push({
        id: c.id,
        name: c.name,
        level_id: c.level_id,
        level_name: (c.levels as any)?.name || null,
        students_count: sc || 0,
        published_terms: pc || 0,
      })
    }

    setClasses(rows)
    setLoading(false)
  }

  if (loading || roleLoading) {
    return <div className="p-6 text-center">جارٍ التحميل...</div>
  }
  if (!canManage) {
    return <div className="p-6">ليس لديك صلاحية</div>
  }

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            كشوف النقط
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            حساب المعدلات والرتب وإصدار الكشوف
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

      <div className="relative">
        <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن قسم..."
          className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {classes.length === 0 ? 'لا توجد أقسام في السنة الحالية' : 'لا توجد نتائج'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/bulletins/${c.id}`}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {c.name.charAt(0)}
                </div>
                {c.published_terms > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    <Award className="h-3.5 w-3.5" />
                    {c.published_terms} منشور
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-lg truncate">
                {c.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                {c.level_name && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    {c.level_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {c.students_count} تلميذ
                </span>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-indigo-600 font-medium group-hover:gap-3 transition-all">
                <TrendingUp className="h-4 w-4" />
                <span>عرض النقط والمعدلات</span>
                <ArrowLeft className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}