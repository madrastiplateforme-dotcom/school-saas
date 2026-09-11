'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Search, Users, Pencil, Trash2, Eye, UserPlus, X, CheckCircle } from 'lucide-react'

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

export default function FamiliesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewFamilies = hasPermission('families', 'view')
  const canEditFamilies = hasPermission('families', 'edit')

  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [editFamily, setEditFamily] = useState<Family | null>(null)
  const [editFamilyName, setEditFamilyName] = useState('')
  const [editFatherName, setEditFatherName] = useState('')
  const [editMotherName, setEditMotherName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Parent modal
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
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setFamilies(data || [])
    setLoading(false)
  }

  const handleEditFamily = (family: Family) => {
    setEditFamily(family)
    setEditFamilyName(family.family_name || '')
    setEditFatherName(family.father_name || '')
    setEditMotherName(family.mother_name || '')
    setEditPhone(family.phone || '')
    setEditEmail(family.email || '')
    setEditAddress(family.address || '')
    setEditCity(family.city || '')
  }

  const handleSaveEdit = async () => {
    if (!editFamily || !establishmentId) return
    setSavingEdit(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('families')
      .update({
        family_name: editFamilyName,
        father_name: editFatherName || null,
        mother_name: editMotherName || null,
        phone: editPhone || null,
        email: editEmail || null,
        address: editAddress || null,
        city: editCity || null,
      })
      .eq('id', editFamily.id)
    if (!error) {
      setEditFamily(null)
      fetchFamilies(establishmentId)
    } else {
      setError(error.message)
    }
    setSavingEdit(false)
  }

  const handleDeleteFamily = async (familyId: string) => {
    const supabase = createClient()
    const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('family_id', familyId)
    if ((studentCount || 0) > 0) {
      alert('لا يمكن حذف هذه العائلة لأنها تحتوي على تلاميذ.')
      return
    }
    if (!confirm('هل تريد حذف هذه العائلة؟')) return
    const { error } = await supabase.from('families').delete().eq('id', familyId)
    if (error) setError(error.message)
    else fetchFamilies(establishmentId!)
  }

  // 🆕 Bouton Parent
  const openParentModal = (family: Family) => {
    setParentFamily(family)
    setParentName(family.father_name || family.family_name || '')
    setParentEmail(family.email || '')
    setParentPassword('')
    setError('')
    setSuccess('')
  }

  const handleCreateParent = async () => {
    if (!parentFamily || !parentName || !parentEmail || !parentPassword) {
      setError('جميع الحقول مطلوبة')
      return
    }
    if (parentPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setSavingParent(true)
    setError('')
    setSuccess('')

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

      setSuccess('تم إنشاء حساب ولي الأمر بنجاح')
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
    (f.phone || '').includes(searchTerm)
  )

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canViewFamilies) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">العائلات</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 h-10 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="بحث..."
          />
        </div>
      </div>

      {error && !parentFamily && !editFamily && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم العائلة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">حساب ولي الأمر</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredFamilies.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">لا توجد عائلات</td></tr>
            ) : (
              filteredFamilies.map((family) => (
                <tr key={family.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{family.family_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{family.father_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{family.phone || '-'}</td>
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
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/dashboard/families/${family.id}/students`)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="عرض التلاميذ"><Eye className="h-4 w-4" /></button>
                      {canEditFamilies && <button onClick={() => handleEditFamily(family)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>}
                      <button onClick={() => handleDeleteFamily(family.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">تعديل عائلة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العائلة <span className="text-red-500">*</span></label>
                <input type="text" value={editFamilyName} onChange={(e) => setEditFamilyName(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="مثال: العلوي" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأب</label>
                <input type="text" value={editFatherName} onChange={(e) => setEditFatherName(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="مثال: محمد" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأم</label>
                <input type="text" value={editMotherName} onChange={(e) => setEditMotherName(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="مثال: فاطمة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="0612345678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button onClick={handleSaveEdit} disabled={savingEdit} className="h-10 px-6 bg-indigo-600 text-white rounded-lg">{savingEdit ? 'جارٍ...' : 'حفظ'}</button>
                <button onClick={() => setEditFamily(null)} className="h-10 px-6 bg-white border border-gray-300 rounded-lg">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parent modal */}
      {parentFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">إنشاء حساب ولي الأمر</h3>
              <button onClick={() => setParentFamily(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              العائلة: <strong className="text-gray-800">{parentFamily.family_name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="مثال: محمد العلوي" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
                <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="parent@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور <span className="text-red-500">*</span></label>
                <input type="text" value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} className="w-full h-10 px-3 border border-gray-300 rounded-lg" placeholder="6 أحرف على الأقل" />
                <p className="text-xs text-gray-500 mt-1">شارك هذه المعلومات مع ولي الأمر</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button onClick={handleCreateParent} disabled={savingParent} className="h-10 px-6 bg-indigo-600 text-white rounded-lg disabled:opacity-50">{savingParent ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}</button>
                <button onClick={() => setParentFamily(null)} className="h-10 px-6 bg-white border border-gray-300 rounded-lg">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}