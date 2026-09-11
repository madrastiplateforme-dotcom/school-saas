'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import DateInput from '@/components/DateInput'
import { Plus, Trash2, Pencil, Calendar, CheckCircle } from 'lucide-react'

type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  created_at: string
}

export default function AcademicYearsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canView = hasPermission('academic_years', 'view')
  const canCreate = hasPermission('academic_years', 'create')
  const canEdit = hasPermission('academic_years', 'edit')
  const canDelete = hasPermission('academic_years', 'delete')

  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isCurrent, setIsCurrent] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchData(establishmentId)
  }, [establishmentId])

  const fetchData = async (sid: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('establishment_id', sid)
      .order('start_date', { ascending: false })

    if (error) setError(error.message)
    else setYears(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setEditingYear(null)
    setName('')
    setStartDate('')
    setEndDate('')
    setIsCurrent(false)
  }

  const openEdit = (year: AcademicYear) => {
    setEditingYear(year)
    setName(year.name)
    setStartDate(year.start_date || '')
    setEndDate(year.end_date || '')
    setIsCurrent(year.is_current)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !name.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    try {
      // Ila kan is_current = true, n7aydo had l'flag mn les autres
      if (isCurrent) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('establishment_id', establishmentId)
          .eq('is_current', true)
      }

      if (editingYear) {
        const { error } = await supabase
          .from('academic_years')
          .update({
            name: name.trim(),
            start_date: startDate || null,
            end_date: endDate || null,
            is_current: isCurrent,
          })
          .eq('id', editingYear.id)
        if (error) throw error
        setSuccess('تم تحديث السنة الدراسية')
      } else {
        const { error } = await supabase
          .from('academic_years')
          .insert({
            establishment_id: establishmentId,
            name: name.trim(),
            start_date: startDate || null,
            end_date: endDate || null,
            is_current: isCurrent,
          })
        if (error) throw error
        setSuccess('تمت إضافة السنة الدراسية')
      }

      resetForm()
      setShowForm(false)
      fetchData(establishmentId)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (yearId: string) => {
    if (!establishmentId) return
    const supabase = createClient()

    // Vérifier s'il y a des inscriptions liées
    const { count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', yearId)

    if ((enrollmentCount || 0) > 0) {
      alert('لا يمكن حذف هذه السنة لأنها تحتوي على تسجيلات.')
      return
    }

    if (!confirm('هل تريد حذف هذه السنة الدراسية؟')) return
    const { error } = await supabase.from('academic_years').delete().eq('id', yearId)
    if (error) setError(error.message)
    else fetchData(establishmentId)
  }

  const handleSetCurrent = async (yearId: string) => {
    if (!establishmentId) return
    const supabase = createClient()

    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)

    const { error } = await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', yearId)

    if (error) setError(error.message)
    else fetchData(establishmentId)
  }

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canView) return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            Années scolaires
          </h1>
          <p className="text-gray-600">Gérez les années scolaires de votre établissement</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'إلغاء' : 'سنة جديدة'}
          </button>
        )}
      </header>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      {showForm && canCreate && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {editingYear ? 'تعديل السنة الدراسية' : 'إضافة سنة دراسية جديدة'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">اسم السنة الدراسية *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: 2026-2027"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">تاريخ البداية</label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">تاريخ النهاية</label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="is_current" className="text-sm font-medium text-gray-700">
                السنة الحالية
              </label>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : editingYear ? 'تحديث' : 'إضافة'}
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(false) }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">قائمة السنوات ({years.length})</h2>
        {years.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد سنوات دراسية.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البداية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ النهاية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {years.map((year) => (
                  <tr key={year.id} className={year.is_current ? 'bg-emerald-50/40' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {year.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {year.start_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {year.end_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {year.is_current ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle className="h-3 w-3" /> الحالية
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCurrent(year.id)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          تعيين كحالية
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(year)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(year.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}