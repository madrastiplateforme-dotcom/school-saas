'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { User, Lock, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, roles(name)')
      .eq('user_id', user.id)
      .maybeSingle()

    setFullName(profile?.full_name || '')
    setRoleName((profile?.roles as any)?.name || '')
    setLoading(false)
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('كلمتا المرور غير متطابقتين')
        return
      }
    }

    setSaving(true)

    try {
      const supabase = createClient()

      // Update password
      if (newPassword) {
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword })
        if (pwdError) throw pwdError
      }

      // Update full name
      const { data: { user } } = await supabase.auth.getUser()
      if (user && fullName) {
        const { error: nameError } = await supabase
          .from('user_profiles')
          .update({ full_name: fullName })
          .eq('user_id', user.id)
        if (nameError) throw nameError
      }

      setSuccess('تم حفظ التغييرات بنجاح')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> رجوع
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 text-indigo-600" />
          حسابي الشخصي
        </h1>
        <p className="text-gray-600">إدارة معلوماتك الشخصية وكلمة المرور</p>
      </header>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      {/* Informations */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-4 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <User className="h-4 w-4" /> المعلومات الشخصية
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
          <input
            type="text"
            value={email}
            disabled
            className="w-full h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الصفة</label>
          <input
            type="text"
            value={roleName}
            disabled
            className="w-full h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-4 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Lock className="h-4 w-4" /> تغيير كلمة المرور
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="اتركها فارغة إذا لم ترد التغيير"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="أعد كتابة كلمة المرور الجديدة"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          <Save className="h-4 w-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}