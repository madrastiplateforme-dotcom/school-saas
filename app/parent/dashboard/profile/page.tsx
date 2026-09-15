'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  User, RefreshCw, Mail, Phone, Building2, KeyRound, Check, Save,
  Users, AlertCircle,
} from 'lucide-react'

export default function ParentProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [childrenCount, setChildrenCount] = useState(0)

  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()

      setFullName(profile?.full_name || '')
      const est = (profile as any)?.establishments
      if (est?.name) setSchoolName(est.name)

      // Family + phone
      const { data: family } = await supabase
        .from('families')
        .select('id, full_name, phone')
        .eq('parent_user_id', user.id)
        .maybeSingle()

      if (family) {
        setFamilyName(family.full_name || '')
        setPhone(family.phone || '')

        // Children count
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('family_id', family.id)
        setChildrenCount(count || 0)
      }
    } catch (e: any) {
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error: pErr } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id)
      if (pErr) throw pErr

      // Update phone if family exists
      const { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_user_id', user.id)
        .maybeSingle()

      if (family) {
        await supabase.from('families').update({ phone }).eq('id', family.id)
      }

      setSuccess('✅ تم حفظ المعلومات')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    setSuccess('')
    if (newPass.length < 6) {
      setError('كلمة المرور خاصها تكون 6 حروف على الأقل')
      return
    }
    if (newPass !== confirmPass) {
      setError('كلمتا المرور ما متطابقتاش')
      return
    }
    setChangingPass(true)
    const supabase = createClient()
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPass })
      if (err) throw err
      setSuccess('✅ تم تغيير كلمة المرور')
      setNewPass('')
      setConfirmPass('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'فشل التغيير')
    } finally {
      setChangingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 text-indigo-600" />
          حسابي
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          معلوماتك الشخصية وإعدادات الحساب
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" /> {success}
        </div>
      )}

      {/* Avatar + summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 flex-wrap">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-indigo-100 text-indigo-800 text-2xl font-bold flex-shrink-0">
          {(fullName || 'P').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-slate-800 truncate">
            {fullName || 'ولي الأمر'}
          </p>
          <p className="text-xs text-slate-500 truncate">{email}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {schoolName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {schoolName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {childrenCount} أبناء
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600" />
          المعلومات الشخصية
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" /> الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" /> البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> المؤسسة
            </label>
            <input
              type="text"
              value={schoolName}
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-indigo-600" />
          تغيير كلمة المرور
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleChangePassword}
            disabled={changingPass || !newPass}
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 font-medium text-sm disabled:opacity-50"
          >
            {changingPass ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {changingPass ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>
    </div>
  )
}