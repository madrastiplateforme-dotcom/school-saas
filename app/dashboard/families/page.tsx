'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import {
  Search, Users, Pencil, Trash2, Eye, UserPlus, X, CheckCircle,
  AlertTriangle, Loader2, Mail, GraduationCap,
} from 'lucide-react'

type Family = {
  id: string
  family_name: string
  father_name: string
  mother_name: string
  phone: string
  email: string
  address: string
  city: string
  parent_user_id: string | null
}

type FamilyWithCount = Family & { students_count: number }

export default function FamiliesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewFamilies = hasPermission('families', 'view')
  const canEditFamilies = hasPermission('families', 'edit')

  const [families, setFamilies] = useState<FamilyWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // ── Edit modal state ──
  const [editFamily, setEditFamily] = useState<FamilyWithCount | null>(null)
  const [eName, setEName] = useState('')
  const [eFather, setEFather] = useState('')
  const [eMother, setEMother] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [eAddress, setEAddress] = useState('')
  const [eCity, setECity] = useState('')
  const [ePassword, setEPassword] = useState('')
  const [eUpdateAuth, setEUpdateAuth] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Delete modal state ──
  const [deleteFamily, setDeleteFamily] = useState<FamilyWithCount | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Parent modal ──
  const [parentFamily, setParentFamily] = useState<Family | null>(null)
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPassword, setParentPassword] = useState('')
  const [savingParent, setSavingParent] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchFamilies(establishmentId)
  }, [establishmentId])

  const fetchFamilies = async (sid: string) => {
    const supabase = createClient()
    setLoading(true)

    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // جيب عدد التلاميذ لكل عائلة
    const { data: studentsData } = await supabase
      .from('students')
      .select('family_id')
      .eq('establishment_id', sid)
      .neq('status', 'inactive')

    const counts = new Map<string, number>()
    ;(studentsData || []).forEach((s: any) => {
      if (s.family_id) {
        counts.set(s.family_id, (counts.get(s.family_id) || 0) + 1)
      }
    })

    const enriched: FamilyWithCount[] = (data || []).map((f) => ({
      ...f,
      students_count: counts.get(f.id) || 0,
    }))

    setFamilies(enriched)
    setLoading(false)
  }

  // ─────────────────────────────────────────────
  // Edit
  // ─────────────────────────────────────────────
  const openEdit = (family: FamilyWithCount) => {
    setEditFamily(family)
    setEName(family.family_name || '')
    setEFather(family.father_name || '')
    setEMother(family.mother_name || '')
    setEPhone(family.phone || '')
    setEEmail(family.email || '')
    setEAddress(family.address || '')
    setECity(family.city || '')
    setEPassword('')
    setEUpdateAuth(!!family.parent_user_id)
    setError('')
  }

  const handleSaveEdit = async () => {
    if (!editFamily || !establishmentId) return
    if (!eName.trim()) {
      setError('اسم العائلة مطلوب')
      return
    }
    setSavingEdit(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/update-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: editFamily.id,
          family_name: eName.trim(),
          father_name: eFather.trim() || null,
          mother_name: eMother.trim() || null,
          phone: ePhone.trim() || null,
          email: eEmail.trim() || null,
          address: eAddress.trim() || null,
          city: eCity.trim() || null,
          updateParentAuth: eUpdateAuth && !!editFamily.parent_user_id,
          parentPassword: ePassword || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل التحديث')

      setSuccess(data.message || 'تم تحديث العائلة')
      if (data.warnings?.length) {
        setError(`⚠️ تحذيرات: ${data.warnings.join(' · ')}`)
      }
      setTimeout(() => setSuccess(''), 4000)
      setEditFamily(null)
      fetchFamilies(establishmentId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // ─────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────
  const openDelete = (family: FamilyWithCount) => {
    setDeleteFamily(family)
    setDeleteConfirmName('')
    setError('')
  }

  const handleDelete = async () => {
    if (!deleteFamily || !establishmentId) return
    setDeleting(true)
    setError('')

    try {
      const hasStudents = deleteFamily.students_count > 0

      const res = await fetch('/api/establishment/delete-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: deleteFamily.id,
          deleteStudents: hasStudents,
          confirmedName: hasStudents ? deleteConfirmName.trim() : undefined,
        }),
      })

      const data = await res.json()

      // ⚠️ إلا كاينين تلاميذ و ما أكدش
      if (res.status === 409 && data.needsConfirmation) {
        setError(
          `هذه العائلة فيها ${data.studentsCount} تلميذ: ${data.students.join('، ')}`,
        )
        setDeleting(false)
        return
      }

      if (!res.ok || !data.success) throw new Error(data.error || 'فشل الحذف')

      setSuccess(data.message || 'تم الحذف')
      if (data.warnings?.length) {
        setError(`⚠️ تحذيرات: ${data.warnings.join(' · ')}`)
      }
      setTimeout(() => setSuccess(''), 4000)
      setDeleteFamily(null)
      fetchFamilies(establishmentId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // ─────────────────────────────────────────────
  // Parent
  // ─────────────────────────────────────────────
  const openParentModal = (family: Family) => {
    setParentFamily(family)
    setParentName(family.father_name || family.family_name || '')
    setParentEmail(family.email || '')
    setParentPassword('')
    setError('')
  }

  const handleCreateParent = async () => {
    if (!parentFamily || !parentName || !parentEmail || !parentPassword) {
      setError('جميع الحقول مطلوبة')
      return
    }
    if (parentPassword.length < 6) {
      setError('كلمة المرور 6 أحرف على الأقل')
      return
    }
    setSavingParent(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: parentName,
          email: parentEmail,
          password: parentPassword,
          role_type: 'parent',
          family_id: parentFamily.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      setSuccess('تم إنشاء حساب ولي الأمر')
      setTimeout(() => setSuccess(''), 4000)
      setParentFamily(null)
      fetchFamilies(establishmentId!)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingParent(false)
    }
  }

  const filteredFamilies = families.filter((f) =>
    (f.family_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.father_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.mother_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.phone || '').includes(searchTerm) ||
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canViewFamilies) return <div className="p-6">ليس لديك صلاحية</div>

  const nameMatches = deleteFamily
    ? deleteConfirmName.trim() === deleteFamily.family_name
    : false

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            العائلات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {families.length} عائلة — {families.reduce((s, f) => s + f.students_count, 0)} تلميذ
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 h-10 pr-10 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="بحث بالاسم، الهاتف، الإيميل..."
          />
        </div>
      </div>

      {/* Messages */}
      {error && !editFamily && !deleteFamily && !parentFamily && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العائلة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأب / الأم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاتصال</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">التلاميذ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">حساب الوالد</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredFamilies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {families.length === 0 ? 'لا توجد عائلات' : 'لا توجد نتائج'}
                </td>
              </tr>
            ) : (
              filteredFamilies.map((family) => (
                <tr key={family.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">
                      {family.family_name || '-'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {family.city || '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {family.father_name && (
                      <p>👨 {family.father_name}</p>
                    )}
                    {family.mother_name && (
                      <p className="text-xs text-gray-500">👩 {family.mother_name}</p>
                    )}
                    {!family.father_name && !family.mother_name && '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {family.phone && (
                      <p dir="ltr" className="text-xs">{family.phone}</p>
                    )}
                    {family.email && (
                      <p dir="ltr" className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {family.email}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {family.students_count > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {family.students_count}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {family.parent_user_id ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-medium">
                        <CheckCircle className="h-3 w-3" /> مُنشأ
                      </span>
                    ) : (
                      <button
                        onClick={() => openParentModal(family)}
                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-100"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> إنشاء حساب
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/families/${family.id}/students`)
                        }
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="عرض التلاميذ"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditFamilies && (
                        <button
                          onClick={() => openEdit(family)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openDelete(family)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════
          Modal: Edit
      ═══════════════════════════════════════════ */}
      {editFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                تعديل عائلة
              </h3>
              <button
                onClick={() => setEditFamily(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم العائلة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={eFather}
                    onChange={(e) => setEFather(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={eMother}
                    onChange={(e) => setEMother(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                  <input
                    type="tel"
                    value={ePhone}
                    onChange={(e) => setEPhone(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={eCity}
                    onChange={(e) => setECity(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={eEmail}
                  onChange={(e) => setEEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  dir="ltr"
                  placeholder="parent@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={eAddress}
                  onChange={(e) => setEAddress(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Sync auth section */}
              {editFamily.parent_user_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eUpdateAuth}
                      onChange={(e) => setEUpdateAuth(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-medium text-blue-900">
                      تحديث حساب الوالد (Email + Password)
                    </span>
                  </label>
                  <p className="text-xs text-blue-700">
                    ✅ البريد الإلكتروني الجديد سيتزامن مع حساب الوالد فـ النظام
                  </p>

                  {eUpdateAuth && (
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">
                        كلمة مرور جديدة (اختياري)
                      </label>
                      <input
                        type="text"
                        value={ePassword}
                        onChange={(e) => setEPassword(e.target.value)}
                        className="w-full h-10 px-3 border border-blue-300 rounded-lg bg-white"
                        placeholder="اتركها فارغة باش ما تبدلش"
                      />
                      {ePassword && ePassword.length < 6 && (
                        <p className="text-xs text-red-600 mt-1">6 أحرف على الأقل</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {savingEdit ? 'جارٍ...' : 'حفظ التعديلات'}
                </button>
                <button
                  onClick={() => setEditFamily(null)}
                  className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Modal: Delete (avec warning تلاميذ)
      ═══════════════════════════════════════════ */}
      {deleteFamily && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">حذف العائلة</h3>
                <p className="text-sm text-gray-500">{deleteFamily.family_name}</p>
              </div>
            </div>

            {deleteFamily.students_count > 0 ? (
              <>
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                    ⚠️ تحذير خطير!
                  </p>
                  <p className="text-sm text-red-800 leading-relaxed">
                    هذه العائلة فيها <strong>{deleteFamily.students_count} تلميذ</strong>.
                    إلا حذفتيها، غادي يتحيدو معاها:
                  </p>
                  <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                    <li>التلاميذ + التسجيلات</li>
                    <li>الحضور + النقط + البوليتان</li>
                    <li>الأداءات + العقود + الأقساط</li>
                    {deleteFamily.parent_user_id && <li>حساب الوالد (Auth)</li>}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-900 font-medium">
                    💡 إلا بغيتي تحيد غير الوالد بلا التلاميذ، سير لأول تعديل العائلة.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    للتأكيد، اكتب اسم العائلة بالضبط:
                    <code className="bg-gray-100 px-2 py-0.5 rounded mx-1 font-bold">
                      {deleteFamily.family_name}
                    </code>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="اكتب الاسم..."
                    autoFocus
                  />
                  {deleteConfirmName && !nameMatches && (
                    <p className="text-xs text-red-600 mt-1">❌ الاسم غير مطابق</p>
                  )}
                  {nameMatches && (
                    <p className="text-xs text-emerald-600 mt-1">✅ الاسم مطابق</p>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  هذه العائلة ما فيهاش تلاميذ.
                  {deleteFamily.parent_user_id && (
                    <>
                      <br />
                      <strong>⚠️ حساب الوالد غادي يتحيد تلقائياً.</strong>
                    </>
                  )}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={handleDelete}
                disabled={
                  deleting || (deleteFamily.students_count > 0 && !nameMatches)
                }
                className="h-10 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={() => setDeleteFamily(null)}
                disabled={deleting}
                className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Modal: Parent account
      ═══════════════════════════════════════════ */}
      {parentFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">إنشاء حساب ولي الأمر</h3>
              <button
                onClick={() => setParentFamily(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              العائلة: <strong className="text-gray-800">{parentFamily.family_name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  البريد <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  placeholder="6 أحرف على الأقل"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleCreateParent}
                  disabled={savingParent}
                  className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingParent ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {savingParent ? 'جارٍ...' : 'إنشاء الحساب'}
                </button>
                <button
                  onClick={() => setParentFamily(null)}
                  className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}