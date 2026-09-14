'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  Search, KeyRound, Copy, CheckCircle2, Mail, Shield, Users, User,
  RefreshCw, X, Pencil, Trash2, AlertTriangle, Loader2,
} from 'lucide-react'

type UserRow = {
  user_id: string
  full_name: string
  role_name: string
  email: string | null
  role_id: string | null
  created_at: string
  type: 'directeur' | 'secretaire' | 'parent' | 'other'
  staff: { type: string; custom_type: string | null } | null
  family: { id: string; family_name: string } | null
}

export default function UsersPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Reset password
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newCredentials, setNewCredentials] = useState<{
    email: string
    password: string
    full_name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Edit
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [eName, setEName] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [ePassword, setEPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isDirector = role === 'directeur'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/list-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحميل')
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────
  // Reset password
  // ─────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetUser) return
    setResetting(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUser.user_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل')

      if (data.emailSent) {
        setSuccess(`✅ تم إرسال كلمة مرور جديدة إلى ${resetUser.full_name}`)
        setTimeout(() => setSuccess(''), 4000)
        setResetUser(null)
      } else {
        setNewCredentials({
          email: resetUser.email || '(البريد السابق)',
          password: data.password,
          full_name: resetUser.full_name,
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  // ─────────────────────────────────────
  // Edit
  // ─────────────────────────────────────
  const openEdit = (u: UserRow) => {
    setEditUser(u)
    setEName(u.full_name || '')
    setEEmail(u.email || '')
    setEPassword('')
    setError('')
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    if (!eName.trim()) {
      setError('الاسم مطلوب')
      return
    }
    setSavingEdit(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editUser.user_id,
          full_name: eName.trim(),
          email: eEmail.trim() || null,
          newPassword: ePassword || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل')

      setSuccess(data.message || 'تم التحديث')
      if (data.warnings?.length) {
        setError(`⚠️ تحذيرات: ${data.warnings.join(' · ')}`)
      }
      setTimeout(() => setSuccess(''), 4000)
      setEditUser(null)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // ─────────────────────────────────────
  // Delete
  // ─────────────────────────────────────
  const openDelete = (u: UserRow) => {
    setDeleteUser(u)
    setError('')
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteUser.user_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل')

      setSuccess(data.message || 'تم الحذف')
      setTimeout(() => setSuccess(''), 4000)
      setDeleteUser(null)
      loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getRoleBadge = (u: UserRow) => {
    if (u.type === 'directeur') {
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">
          <Shield className="h-3.5 w-3.5" /> مدير
        </span>
      )
    }
    if (u.type === 'secretaire') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
          <User className="h-3.5 w-3.5" /> سكرتيرة
        </span>
      )
    }
    if (u.type === 'parent') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold">
          <Users className="h-3.5 w-3.5" /> ولي أمر
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
        {u.role_name}
      </span>
    )
  }

  const filtered = users.filter((u) => {
    const q = searchTerm.toLowerCase()
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)

    const matchRole = roleFilter === 'all' || u.type === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    directeurs: users.filter((u) => u.type === 'directeur').length,
    secretaires: users.filter((u) => u.type === 'secretaire').length,
    parents: users.filter((u) => u.type === 'parent').length,
  }

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (!isDirector && role !== 'secretaire')
    return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            المستخدمون
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.total} مستخدم فـ المؤسسة
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'الكل', value: stats.total, color: 'slate' },
          { label: 'المديرون', value: stats.directeurs, color: 'indigo' },
          { label: 'السكرتيرات', value: stats.secretaires, color: 'emerald' },
          { label: 'الأولياء', value: stats.parents, color: 'amber' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pr-10 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="بحث بالاسم أو البريد..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'directeur', label: 'المديرون' },
            { key: 'secretaire', label: 'السكرتيرات' },
            { key: 'parent', label: 'الأولياء' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 h-11 rounded-lg text-sm font-bold transition ${
                roleFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {users.length === 0 ? 'لا يوجد مستخدمون' : 'لا توجد نتائج'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    الاسم
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    البريد
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    الصفة
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {u.full_name}
                          </p>
                          {u.family && (
                            <p className="text-xs text-slate-400">
                              عائلة: {u.family.family_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {u.email ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span dir="ltr" className="text-xs">
                            {u.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">{getRoleBadge(u)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {isDirector && (
                          <>
                            <button
                              onClick={() => {
                                setResetUser(u)
                                setNewCredentials(null)
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDelete(u)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Modal: Reset Password ═══ */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            {!newCredentials ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      إعادة تعيين كلمة المرور
                    </h3>
                    <p className="text-sm text-gray-500">{resetUser.full_name}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-900">
                  ⚠️ سيتم إنشاء <strong>كلمة مرور جديدة</strong>. لن يتمكن من
                  الدخول بالقديمة.
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="h-11 px-6 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {resetting ? 'جارٍ...' : 'إنشاء كلمة مرور جديدة'}
                  </button>
                  <button
                    onClick={() => setResetUser(null)}
                    className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      كلمة مرور جديدة
                    </h3>
                    <p className="text-sm text-gray-500">
                      {newCredentials.full_name}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                  ⚠️ <strong>مهم:</strong> هذه المعلومات ستظهر مرة واحدة.
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <code
                    className="text-lg font-mono font-bold text-gray-800"
                    dir="ltr"
                  >
                    {newCredentials.password}
                  </code>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(newCredentials.password)
                  }
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
                  onClick={() => {
                    setNewCredentials(null)
                    setResetUser(null)
                  }}
                  className="w-full mt-2 h-11 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  إغلاق
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Modal: Edit ═══ */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" /> تعديل المستخدم
              </h3>
              <button
                onClick={() => setEditUser(null)}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={eEmail}
                  onChange={(e) => setEEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">
                  💡 تغيير البريد سيُحدّث حساب الدخول
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة مرور جديدة (اختياري)
                </label>
                <input
                  type="text"
                  value={ePassword}
                  onChange={(e) => setEPassword(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg"
                  placeholder="اتركها فارغة باش ما تبدلش"
                />
                {ePassword && ePassword.length < 6 && (
                  <p className="text-xs text-red-600 mt-1">
                    6 أحرف على الأقل
                  </p>
                )}
              </div>

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
                  {savingEdit ? 'جارٍ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setEditUser(null)}
                  className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Delete ═══ */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  حذف المستخدم
                </h3>
                <p className="text-sm text-gray-500">{deleteUser.full_name}</p>
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900 leading-relaxed">
                ⚠️ غادي يتحيد:
              </p>
              <ul className="text-xs text-red-800 mt-2 space-y-1 list-disc list-inside">
                <li>حساب الدخول (Auth)</li>
                <li>الملف الشخصي</li>
                {deleteUser.type === 'secretaire' && <li>الصندوق ديالو</li>}
                {deleteUser.family && <li>الربط مع العائلة</li>}
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2 font-medium"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? 'جارٍ...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
                className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}