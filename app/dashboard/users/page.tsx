'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { Search, KeyRound, Copy, CheckCircle2, Mail, Shield, Users, User, RefreshCw, X } from 'lucide-react'

type UserRow = {
  user_id: string
  full_name: string
  role_name: string
  email?: string
  role_id: string | null
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Reset password modal
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState(false)
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string; full_name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Jib les user_profiles dyal l'établissement
    const { data: profiles, error: pError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role_id, created_at, roles(name)')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })

    if (pError) {
      setError(pError.message)
      setLoading(false)
      return
    }

    // 2. Jib emails mn auth (ghir l Director — b admin client)
    const userIds = (profiles || []).map((p: any) => p.user_id)

    let emailMap: Record<string, string> = {}
    if (userIds.length > 0 && isDirector) {
      // Ila Directeur, kaydir API call l get emails
      try {
        const res = await fetch('/api/establishment/list-users-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds }),
        })
        if (res.ok) {
          const data = await res.json()
          emailMap = data.emails || {}
        }
      } catch (e) {
        console.error('Emails fetch error:', e)
      }
    }

    const formatted: UserRow[] = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name || 'مستخدم',
      role_name: (p.roles as any)?.name || 'غير محدد',
      role_id: p.role_id,
      email: emailMap[p.user_id] || undefined,
      created_at: p.created_at,
    }))

    setUsers(formatted)
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!resetUser) return
    if (!confirm(`هل تريد إنشاء كلمة مرور جديدة لـ ${resetUser.full_name}؟`)) return

    setResetting(true)
    setError('')

    try {
      const res = await fetch('/api/establishment/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUser.user_id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      setNewCredentials({
        email: resetUser.email || '(البريد السابق)',
        password: data.password,
        full_name: resetUser.full_name,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getRoleBadge = (roleName: string) => {
    const r = roleName.toLowerCase()
    if (r.includes('directeur') || r.includes('مدير')) {
      return <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium"><Shield className="h-3.5 w-3.5" /> مدير</span>
    }
    if (r.includes('secr')) {
      return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium"><User className="h-3.5 w-3.5" /> سكرتيرة</span>
    }
    if (r.includes('parent')) {
      return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium"><Users className="h-3.5 w-3.5" /> ولي أمر</span>
    }
    return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">{roleName}</span>
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    const r = u.role_name.toLowerCase()
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'directeur' && (r.includes('directeur') || r.includes('مدير'))) ||
      (roleFilter === 'secretaire' && r.includes('secr')) ||
      (roleFilter === 'parent' && r.includes('parent'))

    return matchesSearch && matchesRole
  })

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            المستخدمون
          </h1>
          <p className="text-gray-600">جميع مستخدمي المؤسسة ({users.length})</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Filtres */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="بحث بالاسم أو البريد..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'directeur', label: 'المديرون' },
            { key: 'secretaire', label: 'السكرتيرات' },
            { key: 'parent', label: 'أولياء الأمور' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                roleFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصفة</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-slate-800">{u.full_name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {u.email ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span dir="ltr">{u.email}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {getRoleBadge(u.role_name)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isDirector && (
                      <button
                        onClick={() => { setResetUser(u); setNewCredentials(null) }}
                        className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 text-xs font-medium"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> إعادة تعيين كلمة المرور
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Modal */}
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
                    <h3 className="text-lg font-semibold text-gray-800">إعادة تعيين كلمة المرور</h3>
                    <p className="text-sm text-gray-500">{resetUser.full_name}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-900">
                  ⚠️ سيتم إنشاء <strong>كلمة مرور جديدة</strong> لهذا المستخدم. لن يتمكن من الدخول بكلمة المرور القديمة.
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="h-11 px-6 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    <KeyRound className="h-4 w-4" />
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
                    <h3 className="text-lg font-semibold text-gray-800">كلمة مرور جديدة</h3>
                    <p className="text-sm text-gray-500">{newCredentials.full_name}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                  ⚠️ <strong>مهم:</strong> هذه المعلومات ستظهر مرة واحدة. انسخها الآن وشاركها مع المستخدم.
                </div>

                <div className="space-y-3">
                  {newCredentials.email !== '(البريد السابق)' && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">البريد الإلكتروني</label>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <code className="text-sm font-mono text-gray-800 break-all">{newCredentials.email}</code>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">كلمة المرور الجديدة</label>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <code className="text-lg font-mono font-bold text-gray-800">{newCredentials.password}</code>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(`البريد: ${newCredentials.email}\nكلمة المرور: ${newCredentials.password}`)}
                  className="w-full mt-4 h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
                >
                  {copied ? <><CheckCircle2 className="h-4 w-4" /> تم النسخ</> : <><Copy className="h-4 w-4" /> نسخ المعلومات</>}
                </button>
                <button
                  onClick={() => { setNewCredentials(null); setResetUser(null) }}
                  className="w-full mt-2 h-11 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  إغلاق
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}