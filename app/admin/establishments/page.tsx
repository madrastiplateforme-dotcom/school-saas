'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import {
  School,
  RefreshCw,
  Plus,
  KeyRound,
  Pause,
  Play,
  Upload,
  Pencil,
  LogIn,
  Trash2,
  Search,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

type Establishment = {
  id: string
  name: string
  email: string
  phone: string
  status: string
  logo_url: string | null
  address?: string
  city?: string
  subscription_price_per_student: number
  subscription_status: string
  subscription_due_date: string | null
  grace_period_days?: number
  student_count: number
  user_profiles: {
    user_id: string
    full_name: string
    roles: { name: string; id: string } | null
  }[] | null
}

export default function EstablishmentsPage() {
  const router = useRouter()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [estName, setEstName] = useState('')
  const [estEmail, setEstEmail] = useState('')
  const [estPhone, setEstPhone] = useState('')
  const [dirName, setDirName] = useState('')
  const [dirEmail, setDirEmail] = useState('')
  const [dirPassword, setDirPassword] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [editModal, setEditModal] = useState<Establishment | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editPricePerStudent, setEditPricePerStudent] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editGracePeriod, setEditGracePeriod] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [directorModal, setDirectorModal] = useState<Establishment | null>(null)
  const [newDirectorName, setNewDirectorName] = useState('')
  const [newDirectorEmail, setNewDirectorEmail] = useState('')
  const [newDirectorPassword, setNewDirectorPassword] = useState('')
  const [changingDirector, setChangingDirector] = useState(false)

  // Pending count
  const pendingCount = establishments.filter((e) => e.status === 'pending').length

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data: adminData }) => {
          if (!adminData) {
            setError('ليس لديك صلاحية الوصول لهذه الصفحة')
            setLoading(false)
            return
          }
          fetchEstablishments()
        })
    })
  }, [])

  const fetchEstablishments = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('establishments')
      .select(`
        *,
        user_profiles (
          user_id,
          full_name,
          roles (id, name)
        ),
        students (count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      const formatted = data?.map((est: any) => ({
        ...est,
        student_count: est.students?.[0]?.count || 0,
      }))
      setEstablishments(formatted || [])
    }
    setLoading(false)
  }

  const handleCreateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch('/api/admin/create-establishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentName: estName,
          establishmentEmail: estEmail,
          establishmentPhone: estPhone,
          directorName: dirName,
          directorEmail: dirEmail,
          directorPassword: dirPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      if (logoFile && data.establishmentId) {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        logoFormData.append('establishmentId', data.establishmentId)
        const uploadRes = await fetch('/api/admin/upload-logo', {
          method: 'POST',
          body: logoFormData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          console.error('Logo upload failed:', uploadData.error)
        }
      }

      await logAudit('create_establishment', { name: estName, email: estEmail })

      setFormSuccess('تم إنشاء المؤسسة والمدير بنجاح!')
      setEstName('')
      setEstEmail('')
      setEstPhone('')
      setDirName('')
      setDirEmail('')
      setDirPassword('')
      setLogoFile(null)
      setShowCreateForm(false)
      fetchEstablishments()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEstablishment = async (establishmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المؤسسة نهائياً؟ سيتم حذف جميع بياناتها ومستخدميها.')) return

    try {
      const res = await fetch('/api/admin/delete-establishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      await logAudit('delete_establishment', { establishmentId }, establishmentId)
      fetchEstablishments()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateEstablishment = async () => {
    if (!editModal) return
    setSavingEdit(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase
      .from('establishments')
      .update({
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        city: editCity,
        subscription_price_per_student: Number(editPricePerStudent),
        subscription_due_date: editDueDate || null,
        grace_period_days: Number(editGracePeriod),
      })
      .eq('id', editModal.id)

    if (error) {
      setError(error.message)
    } else {
      await logAudit('update_establishment', { id: editModal.id, name: editName }, editModal.id)
      setEditModal(null)
      fetchEstablishments()
    }
    setSavingEdit(false)
  }

  const handleChangeDirector = async () => {
    if (!directorModal) return
    setChangingDirector(true)
    setError('')

    try {
      const supabaseAdmin = (await import('@/lib/supabase-admin')).createAdminClient()
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newDirectorEmail,
        password: newDirectorPassword,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'فشل إنشاء حساب المدير')
      }

      const newUserId = authData.user.id
      const supabase = createClient()

      let directorRoleId: string | null = null
      if (directorModal.user_profiles && directorModal.user_profiles.length > 0) {
        directorRoleId = directorModal.user_profiles[0].roles?.id || null
      }

      if (!directorRoleId) {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .insert({
            establishment_id: directorModal.id,
            name: 'Directeur',
            description: 'Directeur principal',
            is_system: true,
          })
          .select()
          .single()
        if (roleError) throw roleError
        directorRoleId = roleData.id
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: newUserId,
          establishment_id: directorModal.id,
          role_id: directorRoleId,
          full_name: newDirectorName,
        })

      if (profileError) throw profileError

      await logAudit('change_director', { establishmentId: directorModal.id, newDirector: newDirectorName }, directorModal.id)
      setDirectorModal(null)
      setNewDirectorName('')
      setNewDirectorEmail('')
      setNewDirectorPassword('')
      fetchEstablishments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChangingDirector(false)
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!confirm('هل تريد إعادة تعيين كلمة مرور هذا المدير؟')) return
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')
      await logAudit('reset_director_password', { userId })
      setResetMessage(`تم تعيين كلمة مرور جديدة للمدير: ${data.newPassword}`)
    } catch (err: any) {
      setResetMessage(`خطأ: ${err.message}`)
    }
  }

  const handleStatusChange = async (establishmentId: string, newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('establishments')
      .update({ status: newStatus })
      .eq('id', establishmentId)

    if (error) setError(error.message)
    else {
      await logAudit('change_establishment_status', { newStatus }, establishmentId)
      fetchEstablishments()
    }
  }

  const handleLogoUpload = async (establishmentId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('establishmentId', establishmentId)

    try {
      const res = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      await logAudit('upload_logo', { establishmentId }, establishmentId)
      fetchEstablishments()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAssistanceMode = (establishmentId: string) => {
    sessionStorage.setItem('assistance_return_path', window.location.pathname)
    sessionStorage.setItem('assistance_establishment_id', establishmentId)
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (error && !establishments.length) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  const filteredEstablishments = establishments.filter((est) => {
    const matchesSearch =
      est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.phone.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || est.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">المؤسسات</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
              <Bell className="h-4 w-4" />
              {pendingCount} طلب جديد
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          إضافة مؤسسة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">نشطة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {establishments.filter((e) => e.status === 'active').length}
          </p>
        </div>

        <div className={`rounded-xl p-5 border shadow-sm ${
          pendingCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">قيد المراجعة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">موقوفة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {establishments.filter((e) => e.status === 'suspended').length}
          </p>
        </div>
      </div>

      {resetMessage && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          {resetMessage}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="pending">معلقة</option>
          <option value="suspended">موقوفة</option>
        </select>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h2 className="text-lg font-semibold mb-4">إنشاء مؤسسة جديدة</h2>
          <form onSubmit={handleCreateEstablishment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المؤسسة</label>
              <input type="text" required value={estName} onChange={(e) => setEstName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">بريد المؤسسة</label>
              <input type="email" required value={estEmail} onChange={(e) => setEstEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">هاتف المؤسسة</label>
              <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المدير</label>
              <input type="text" required value={dirName} onChange={(e) => setDirName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">بريد المدير</label>
              <input type="email" required value={dirEmail} onChange={(e) => setDirEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
              <input type="password" required minLength={6} value={dirPassword} onChange={(e) => setDirPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">شعار المؤسسة (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-600" />
            </div>
            {formError && <div className="md:col-span-2 text-red-600 text-sm">{formError}</div>}
            {formSuccess && <div className="md:col-span-2 text-green-600 text-sm">{formSuccess}</div>}
            <div className="md:col-span-2">
              <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'جاري الإنشاء...' : 'إنشاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المؤسسة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدير</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الشعار</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEstablishments.map((est) => (
              <tr
                key={est.id}
                className={est.status === 'pending' ? 'bg-amber-50/50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {est.logo_url ? (
                      <img src={est.logo_url} alt="logo" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <School className="h-6 w-6 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{est.name}</p>
                      <p className="text-xs text-gray-500">{est.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    est.status === 'active' ? 'bg-green-100 text-green-700' :
                    est.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {est.status === 'active' ? 'نشطة' : est.status === 'pending' ? '⏳ معلقة' : 'موقوفة'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {est.user_profiles && est.user_profiles.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span>{est.user_profiles[0]?.full_name || 'مدير'}</span>
                      <button
                        onClick={() => setDirectorModal(est)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        تغيير
                      </button>
                      <button
                        onClick={() => handleResetPassword(est.user_profiles[0].user_id)}
                        className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100"
                      >
                        <KeyRound className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">لا يوجد مدير</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {est.logo_url ? (
                    <img src={est.logo_url} alt="logo" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <label className="cursor-pointer text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">
                      <Upload className="h-3 w-3 inline ml-1" />
                      رفع شعار
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleLogoUpload(est.id, file)
                        }}
                      />
                    </label>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditModal(est)
                        setEditName(est.name)
                        setEditEmail(est.email)
                        setEditPhone(est.phone)
                        setEditAddress(est.address || '')
                        setEditCity(est.city || '')
                        setEditPricePerStudent(String(est.subscription_price_per_student))
                        setEditDueDate(est.subscription_due_date || '')
                        setEditGracePeriod(String(est.grace_period_days ?? 5))
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {est.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(est.id, 'suspended')}
                        className="text-red-600 hover:text-red-800"
                        title="تعليق"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(est.id, 'active')}
                        className={`${est.status === 'pending' ? 'text-emerald-600 hover:text-emerald-800 font-bold' : 'text-green-600 hover:text-green-800'}`}
                        title={est.status === 'pending' ? 'تفعيل الطلب' : 'تفعيل'}
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAssistanceMode(est.id)}
                      className="text-purple-600 hover:text-purple-800"
                      title="دخول للمؤسسة (وضع المساعدة)"
                    >
                      <LogIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEstablishment(est.id)}
                      className="text-red-600 hover:text-red-800"
                      title="حذف نهائي"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-semibold mb-4">تعديل بيانات المؤسسة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">اسم المؤسسة</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">الهاتف</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">العنوان</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">المدينة</label>
                <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">سعر التلميذ (DH)</label>
                  <input type="number" min="0" step="0.01" value={editPricePerStudent} onChange={(e) => setEditPricePerStudent(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">تاريخ الاستحقاق</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">فترة السماح (أيام)</label>
                <input type="number" min="0" step="1" value={editGracePeriod} onChange={(e) => setEditGracePeriod(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={handleUpdateEstablishment} disabled={savingEdit} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingEdit ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => setEditModal(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Director Modal */}
      {directorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">تغيير المدير</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">اسم المدير الجديد</label>
                <input type="text" value={newDirectorName} onChange={(e) => setNewDirectorName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">بريد المدير الجديد</label>
                <input type="email" value={newDirectorEmail} onChange={(e) => setNewDirectorEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
                <input type="password" value={newDirectorPassword} onChange={(e) => setNewDirectorPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleChangeDirector} disabled={changingDirector} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {changingDirector ? 'جاري التغيير...' : 'تعيين مدير'}
                </button>
                <button onClick={() => setDirectorModal(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}