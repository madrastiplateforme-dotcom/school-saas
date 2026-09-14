'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import DateInput from '@/components/DateInput'
import {
  Search, Plus, Trash2, X, Users, GraduationCap, Car, Briefcase,
  UserCog, Sparkles, KeyRound, Copy, CheckCircle2, Pencil, Loader2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type Staff = {
  id: string
  full_name: string
  type: string
  custom_type: string | null
  phone: string | null
  salary_amount: number
  hire_date: string | null
  status: string
  user_id: string | null
}

const STAFF_TYPES = [
  { value: 'secretaire', label: 'Secrétaire', icon: UserCog, hasAccount: true },
  { value: 'teacher', label: 'Enseignant', icon: GraduationCap, hasAccount: false },
  { value: 'chauffeur', label: 'Chauffeur', icon: Car, hasAccount: false },
  { value: 'admin', label: 'Administratif', icon: Briefcase, hasAccount: false },
  { value: 'assistant', label: 'Assistant', icon: Users, hasAccount: false },
  { value: 'femme_menage', label: 'Femme de ménage', icon: Sparkles, hasAccount: false },
  { value: 'autre', label: 'Autre', icon: Users, hasAccount: false },
]

type Credentials = {
  email: string
  password: string
  full_name: string
  role: string
  emailSent?: boolean
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────
export default function PersonnelPage() {
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canView = hasPermission('staff', 'view') || hasPermission('users', 'view')
  const canCreate = hasPermission('staff', 'create') || hasPermission('users', 'create')

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // ── Add state ──
  const [showModal, setShowModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [staffType, setStaffType] = useState('secretaire')
  const [customType, setCustomType] = useState('')
  const [phone, setPhone] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Credentials / Reset ──
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [copied, setCopied] = useState(false)
  const [resetData, setResetData] = useState<Credentials | null>(null)
  const [resetting, setResetting] = useState(false)

  // ── Edit state (🆕) ──
  const [editStaff, setEditStaff] = useState<Staff | null>(null)
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eSalary, setESalary] = useState('')
  const [eHireDate, setEHireDate] = useState('')
  const [eCustomType, setECustomType] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchData(establishmentId)
  }, [establishmentId])

  const fetchData = async (sid: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setStaffList(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFullName('')
    setStaffType('secretaire')
    setCustomType('')
    setPhone('')
    setPersonalEmail('')
    setSalaryAmount('')
    setHireDate('')
    setError('')
  }

  // ─────────────────────────────────────────────────────
  // Ajouter staff
  // ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId) return
    if (!fullName.trim()) {
      setError('الاسم مطلوب')
      return
    }
    if (staffType === 'autre' && !customType.trim()) {
      setError('يرجى كتابة نوع الموظف')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          role_type: staffType,
          custom_type: staffType === 'autre' ? customType : null,
          phone: phone || null,
          salary_amount: Number(salaryAmount) || 0,
          hire_date: hireDate || null,
          personal_email: personalEmail.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      if (data.hasAccount) {
        setCredentials({
          email: data.email,
          password: data.password,
          full_name: fullName.trim(),
          role: STAFF_TYPES.find((t) => t.value === staffType)?.label || staffType,
          emailSent: data.emailSent === true,
        })
      } else {
        setSuccess('تمت إضافة الموظف بنجاح')
        setTimeout(() => setSuccess(''), 3000)
      }

      resetForm()
      setShowModal(false)
      fetchData(establishmentId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────
  // Supprimer
  // ─────────────────────────────────────────────────────
  const handleDelete = async (staff: Staff) => {
    const msg = staff.user_id
      ? `هل تريد حذف ${staff.full_name} وحساب الدخول ديالو؟\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه.`
      : `هل تريد حذف ${staff.full_name}؟`

    if (!confirm(msg)) return

    setError('')
    try {
      const res = await fetch('/api/establishment/delete-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staff.id }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل الحذف')
      }

      setSuccess(data.message || 'تم الحذف')
      setTimeout(() => setSuccess(''), 3000)
      fetchData(establishmentId!)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // ─────────────────────────────────────────────────────
  // Reset Password
  // ─────────────────────────────────────────────────────
  const handleResetPassword = async (staff: Staff) => {
    if (!staff.user_id) {
      alert('هذا الموظف ليس لديه حساب دخول')
      return
    }
    if (!confirm(`هل تريد إعادة تعيين كلمة مرور ${staff.full_name}؟`)) return

    setResetting(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: staff.user_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ')
      }

      if (data.emailSent) {
        setSuccess(`✅ تم إرسال كلمة المرور الجديدة إلى ${staff.full_name}`)
        setTimeout(() => setSuccess(''), 4000)
      } else {
        setResetData({
          email: data.email || '(نفس البريد السابق)',
          password: data.password,
          full_name: data.fullName || staff.full_name,
          role: 'Reset',
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  // ─────────────────────────────────────────────────────
  // 🆕 Edit
  // ─────────────────────────────────────────────────────
  const openEdit = (staff: Staff) => {
    setEditStaff(staff)
    setEName(staff.full_name || '')
    setEPhone(staff.phone || '')
    setESalary(String(staff.salary_amount || ''))
    setEHireDate(staff.hire_date || '')
    setECustomType(staff.custom_type || '')
    setError('')
  }

  const handleSaveEdit = async () => {
    if (!editStaff || !establishmentId) return
    if (!eName.trim()) {
      setError('الاسم مطلوب')
      return
    }

    setSavingEdit(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/update-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: editStaff.id,
          full_name: eName.trim(),
          phone: ePhone.trim() || null,
          salary_amount: Number(eSalary) || 0,
          hire_date: eHireDate || null,
          custom_type: editStaff.type === 'autre' ? eCustomType.trim() : null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل التحديث')
      }

      setSuccess(data.message || 'تم تحديث الموظف')
      if (data.warnings?.length) {
        setError(`⚠️ تحذيرات: ${data.warnings.join(' · ')}`)
      }
      setTimeout(() => setSuccess(''), 3000)

      setEditStaff(null)
      fetchData(establishmentId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // ─────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTypeLabel = (staff: Staff) => {
    if (staff.type === 'autre' && staff.custom_type) return staff.custom_type
    return STAFF_TYPES.find((t) => t.value === staff.type)?.label || staff.type
  }

  const getTypeIcon = (type: string) => {
    return STAFF_TYPES.find((t) => t.value === type)?.icon || Users
  }

  const filtered = staffList.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').includes(searchTerm),
  )

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canView) return <div className="p-6">ليس لديك صلاحية</div>

  const selectedType = STAFF_TYPES.find((t) => t.value === staffType)

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="p-6" dir="rtl">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            الموظفون
          </h1>
          <p className="text-gray-600">إدارة فريق العمل والرواتب</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> إضافة موظف
          </button>
        )}
      </header>

      {error && !showModal && !editStaff && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="بحث بالاسم أو الهاتف..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الراتب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  لا يوجد موظفون
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const Icon = getTypeIcon(s.type)
                const isSecretaire =
                  s.type === 'secretaire' ||
                  (s.type === 'admin' && s.custom_type === 'Secrétaire')
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        <Icon className="h-3.5 w-3.5" />
                        {getTypeLabel(s)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{s.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      <span dir="ltr">{s.salary_amount} DH</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        {isSecretaire && (
                          <button
                            onClick={() => handleResetPassword(s)}
                            disabled={resetting}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}

                        {/* ✅ زر Edit جديد */}
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════
          Modal: Ajouter staff
      ═══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">إضافة موظف جديد</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: فاطمة الزهراء"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  النوع <span className="text-red-500">*</span>
                </label>
                <select
                  value={staffType}
                  onChange={(e) => setStaffType(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {STAFF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {staffType === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الموظف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                    placeholder="مثال: حارس"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  placeholder="0612345678"
                  dir="ltr"
                />
              </div>

              {selectedType?.hasAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني للموظف{' '}
                    <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                    placeholder="ahmed@gmail.com"
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 سترسل معلومات الدخول إلى هذا البريد تلقائياً. إذا تركته فارغاً، ستظهر لك
                    بيانات الدخول على الشاشة لترسلها يدوياً.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الراتب الشهري (DH)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  placeholder="3000"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ التوظيف
                </label>
                <DateInput value={hireDate} onChange={setHireDate} className="h-10" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Modal: Credentials (ملي كيتخلق حساب جديد)
      ═══════════════════════════════════════════════════ */}
      {credentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">تم إنشاء الحساب</h3>
                <p className="text-sm text-gray-500">
                  {credentials.full_name} • {credentials.role}
                </p>
              </div>
            </div>

            {credentials.emailSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-800">
                ✅ <strong>تم إرسال البيانات تلقائياً</strong> إلى البريد{' '}
                <strong dir="ltr">{credentials.email}</strong>
                <p className="text-xs mt-1">احتفظ بنسخة احتياطية في حال لم يصل الإيميل.</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                ⚠️ <strong>مهم:</strong> هذه المعلومات ستظهر{' '}
                <strong>مرة واحدة فقط</strong>. انسخها الآن وشاركها مع الموظف.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">البريد الإلكتروني</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <code
                    className="flex-1 text-sm font-mono text-gray-800 break-all"
                    dir="ltr"
                  >
                    {credentials.email}
                  </code>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">كلمة المرور</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <code className="flex-1 text-sm font-mono text-gray-800" dir="ltr">
                    {credentials.password}
                  </code>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                copyToClipboard(
                  `البريد: ${credentials.email}\nكلمة المرور: ${credentials.password}`,
                )
              }
              className="w-full mt-4 h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> تم النسخ
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> نسخ المعلومات
                </>
              )}
            </button>
            <button
              onClick={() => setCredentials(null)}
              className="w-full mt-2 h-11 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Modal: Edit Staff (🆕)
      ═══════════════════════════════════════════════════ */}
      {editStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                تعديل الموظف
              </h3>
              <button
                onClick={() => setEditStaff(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {editStaff.type === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الموظف
                  </label>
                  <input
                    type="text"
                    value={eCustomType}
                    onChange={(e) => setECustomType(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الهاتف
                </label>
                <input
                  type="tel"
                  value={ePhone}
                  onChange={(e) => setEPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الراتب الشهري (DH)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={eSalary}
                  onChange={(e) => setESalary(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ التوظيف
                </label>
                <DateInput
                  value={eHireDate}
                  onChange={setEHireDate}
                  className="h-10"
                />
              </div>

              {editStaff.user_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    💡 هذا الموظف عندو حساب دخول. تغيير الاسم غادي يتزامن مع
                    <strong> /users</strong> و <strong>Supabase Auth</strong>.
                  </p>
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
                  className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2 font-medium"
                >
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savingEdit ? 'جارٍ...' : 'حفظ التعديلات'}
                </button>
                <button
                  onClick={() => setEditStaff(null)}
                  disabled={savingEdit}
                  className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Modal: Reset Password (fallback إلا فشل الإيميل)
      ═══════════════════════════════════════════════════ */}
      {resetData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">كلمة مرور جديدة</h3>
                <p className="text-sm text-gray-500">{resetData.full_name}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              ⚠️ فشل إرسال الإيميل. المرجو إعطاء كلمة المرور يدوياً للموظف.
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <code className="text-lg font-mono text-gray-800" dir="ltr">
                {resetData.password}
              </code>
            </div>

            <button
              onClick={() => copyToClipboard(resetData.password)}
              className="w-full h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> تم النسخ
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> نسخ كلمة المرور
                </>
              )}
            </button>
            <button
              onClick={() => setResetData(null)}
              className="w-full mt-2 h-11 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}