'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  CreditCard,
  FileText,
  DollarSign,
  Users,
  Ban,
  X,
  Save,
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
  active_student_count: number
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

  const pendingCount = establishments.filter((e) => e.status === 'pending').length

  useEffect(() => {
    const supabase = createClient()
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.push('/login')
          return
        }

        // ✅ FIX: maybeSingle() au lieu de single()
        supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: adminData, error: adminErr }) => {
            if (adminErr) {
              console.error('[admin/establishments]', adminErr.message || adminErr)
            }
            if (!adminData) {
              setError('ليس لديك صلاحية الوصول لهذه الصفحة')
              setLoading(false)
              return
            }
            fetchEstablishments()
          })
      })
      .catch((e: any) => {
        console.error('[admin/establishments-auth]', e?.message || e)
        setError('خطأ في المصادقة')
        setLoading(false)
      })
  }, [router])

  const fetchEstablishments = async () => {
    const supabase = createClient()

    // 1) Établissements + user_profiles + count étudiants
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
      setLoading(false)
      return
    }

    const estList: any[] = data || []
    const establishmentIds = estList.map((e: any) => e.id)

    // ✅ 2) Années courantes par établissement
    const currentYearByEstab = new Map<string, string>()
    if (establishmentIds.length > 0) {
      const { data: currentYears } = await supabase
        .from('academic_years')
        .select('id, establishment_id')
        .eq('is_current', true)
        .in('establishment_id', establishmentIds)

      ;(currentYears || []).forEach((y: any) => {
        if (y.establishment_id && y.id) {
          currentYearByEstab.set(y.establishment_id, y.id)
        }
      })
    }

    const yearIds = Array.from(currentYearByEstab.values())

    // ✅ 3) Élèves actifs f l'année courante
    const activeCountByEstab = new Map<string, number>()
    if (yearIds.length > 0) {
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id, academic_year_id')
        .in('academic_year_id', yearIds)
        .eq('status', 'active')

      const yearToEstab = new Map<string, string>()
      currentYearByEstab.forEach((yearId, estabId) => {
        yearToEstab.set(yearId, estabId)
      })

      const studentSetByEstab = new Map<string, Set<string>>()
      ;(enrollmentsData || []).forEach((e: any) => {
        const estabId = yearToEstab.get(e.academic_year_id)
        if (!estabId || !e.student_id) return
        if (!studentSetByEstab.has(estabId)) {
          studentSetByEstab.set(estabId, new Set())
        }
        studentSetByEstab.get(estabId)!.add(e.student_id)
      })

      studentSetByEstab.forEach((set, estabId) => {
        activeCountByEstab.set(estabId, set.size)
      })
    }

    const formatted: Establishment[] = estList.map((est: any) => ({
      ...est,
      student_count: est.students?.[0]?.count || 0,
      active_student_count: activeCountByEstab.get(est.id) || 0,
    }))

    setEstablishments(formatted)
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

  const totalActive = establishments.filter((e) => e.status === 'active').length
  const totalSuspended = establishments.filter((e) => e.status === 'suspended').length
  const totalStudents = establishments.reduce((s, e) => s + (e.student_count || 0), 0)
  const totalActiveStudents = establishments.reduce((s, e) => s + (e.active_student_count || 0), 0)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">المؤسسات</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
              <Bell className="h-4 w-4" />
              {pendingCount} طلب جديد
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <CreditCard className="h-4 w-4" />
            الاشتراكات
          </Link>
          <Link
            href="/admin/invoices"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <FileText className="h-4 w-4" />
            الفواتير
          </Link>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة مؤسسة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">نشطة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalActive}</p>
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
            <Ban className="h-5 w-5" />
            <span className="text-sm font-medium">موقوفة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalSuspended}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">النشطون (السنة الحالية)</span>
          </div>
          <p className="text-2xl font-bold">{totalActiveStudents}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">إجمالي التلاميذ (كلي)</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resetMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-start justify-between gap-2">
          <span>{resetMessage}</span>
          <button onClick={() => setResetMessage('')} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="pending">معلقة</option>
          <option value="suspended">موقوفة</option>
        </select>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">إنشاء مؤسسة جديدة</h2>
          <form onSubmit={handleCreateEstablishment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المؤسسة</label>
              <input type="text" required value={estName} onChange={(e) => setEstName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">بريد المؤسسة</label>
              <input type="email" required value={estEmail} onChange={(e) => setEstEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">هاتف المؤسسة</label>
              <input type="tel" value={estPhone} onChange={(e) => setEstPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المدير</label>
              <input type="text" required value={dirName} onChange={(e) => setDirName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">بريد المدير</label>
              <input type="email" required value={dirEmail} onChange={(e) => setDirEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
              <input type="password" required minLength={6} value={dirPassword} onChange={(e) => setDirPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">شعار المؤسسة (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-600" />
            </div>
            {formError && <div className="md:col-span-2 text-red-600 text-sm">{formError}</div>}
            {formSuccess && <div className="md:col-span-2 text-green-600 text-sm">{formSuccess}</div>}
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={creating} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {creating ? <><RefreshCw className="h-4 w-4 animate-spin" /> جاري الإنشاء...</> : <><Save className="h-4 w-4" /> إنشاء</>}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 font-medium">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">المؤسسة</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">النشطون</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">الكلي</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">المدير</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">الشعار</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase w-40">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEstablishments.map((est) => (
                <tr key={est.id} className={est.status === 'pending' ? 'bg-amber-50/50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {est.logo_url ? (
                        <img src={est.logo_url} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                          <School className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{est.name}</p>
                        <p className="text-xs text-gray-500">{est.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      est.status === 'active' ? 'bg-green-100 text-green-700' :
                      est.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {est.status === 'active' ? 'نشطة' : est.status === 'pending' ? '⏳ معلقة' : 'موقوفة'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                      <Users className="h-3.5 w-3.5" />
                      {est.active_student_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500 font-medium">
                    {est.student_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {est.user_profiles && est.user_profiles.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[140px]">{est.user_profiles[0]?.full_name || 'مدير'}</span>
                        <button
                          onClick={() => setDirectorModal(est)}
                          className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                        >
                          تغيير
                        </button>
                        <button
                          onClick={() => handleResetPassword(est.user_profiles![0].user_id)}
                          className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <KeyRound className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">لا يوجد مدير</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {est.logo_url ? (
                      <img src={est.logo_url} alt="logo" className="h-10 w-10 rounded-lg object-cover mx-auto" />
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded hover:bg-gray-200 transition">
                        <Upload className="h-3 w-3" />
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/admin/subscriptions/${est.id}`}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="تفاصيل الاشتراك"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Link>
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
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {est.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(est.id, 'suspended')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="تعليق"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(est.id, 'active')}
                          className={`p-1.5 rounded-lg transition ${
                            est.status === 'pending'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={est.status === 'pending' ? 'تفعيل الطلب' : 'تفعيل'}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleAssistanceMode(est.id)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="دخول للمؤسسة (وضع المساعدة)"
                      >
                        <LogIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEstablishment(est.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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

        {filteredEstablishments.length === 0 && (
          <div className="p-16 text-center">
            <School className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {establishments.length === 0 ? 'لا توجد مؤسسات' : 'لا توجد نتائج'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تعديل بيانات المؤسسة</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المؤسسة</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                  <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر التلميذ (د.م)</label>
                  <input type="number" min="0" step="0.01" value={editPricePerStudent} onChange={(e) => setEditPricePerStudent(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">فترة السماح (أيام)</label>
                <input type="number" min="0" step="1" value={editGracePeriod} onChange={(e) => setEditGracePeriod(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center" />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button onClick={handleUpdateEstablishment} disabled={savingEdit} className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                  <Save className="h-4 w-4" />
                  {savingEdit ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => setEditModal(null)} className="h-11 px-6 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Director Modal */}
      {directorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تغيير المدير</h3>
              <button onClick={() => setDirectorModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدير الجديد</label>
                <input type="text" value={newDirectorName} onChange={(e) => setNewDirectorName(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بريد المدير الجديد</label>
                <input type="email" value={newDirectorEmail} onChange={(e) => setNewDirectorEmail(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input type="password" value={newDirectorPassword} onChange={(e) => setNewDirectorPassword(e.target.value)} className="block w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button onClick={handleChangeDirector} disabled={changingDirector} className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                  {changingDirector ? 'جاري التغيير...' : 'تعيين مدير'}
                </button>
                <button onClick={() => setDirectorModal(null)} className="h-11 px-6 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
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