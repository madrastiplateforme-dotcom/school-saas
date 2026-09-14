'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  ShieldCheck, Save, RefreshCw, Mail, Phone, AlertCircle,
  CheckCircle2, Building2, FileText, UserCog,
} from 'lucide-react'

export default function PrivacySettingsPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [dpoName, setDpoName] = useState('')
  const [dpoEmail, setDpoEmail] = useState('')
  const [cndpReg, setCndpReg] = useState('')
  const [retention, setRetention] = useState(60)

  useEffect(() => {
    if (!establishmentId || !role) return
    loadAll()
  }, [establishmentId, role])

  const loadAll = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('establishments')
      .select('dpo_name, dpo_email, cndp_registration, data_retention_months')
      .eq('id', establishmentId)
      .maybeSingle()

    if (data) {
      setDpoName(data.dpo_name || '')
      setDpoEmail(data.dpo_email || '')
      setCndpReg(data.cndp_registration || '')
      setRetention(data.data_retention_months || 60)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!establishmentId) return
    setSaving(true)
    setError('')
    setSuccess('')

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('establishments')
      .update({
        dpo_name: dpoName.trim() || null,
        dpo_email: dpoEmail.trim() || null,
        cndp_registration: cndpReg.trim() || null,
        data_retention_months: retention,
        updated_at: new Date().toISOString(),
      })
      .eq('id', establishmentId)

    if (upErr) setError(upErr.message)
    else {
      setSuccess('✅ تم حفظ إعدادات الخصوصية')
      setTimeout(() => setSuccess(''), 2500)
    }
    setSaving(false)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            الخصوصية وحماية المعطيات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إعدادات مسؤول حماية البيانات والتوافق مع القانون 09-08
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>القانون 09-08:</strong> كل مؤسسة ملزمة بالتصريح لدى CNDP إذا كانت تجمع معطيات شخصية. المعلومات التالية ستظهر في صفحة <a href="/legal/loi-09-08" className="underline font-medium">القانون 09-08</a>.
        </div>
      </div>

      {/* DPO */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">مسؤول حماية البيانات (DPO)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={dpoName}
              onChange={(e) => setDpoName(e.target.value)}
              placeholder="مثال: الأستاذ أحمد بناني"
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={dpoEmail}
                onChange={(e) => setDpoEmail(e.target.value)}
                placeholder="dpo@ecole.ma"
                className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          مسؤول حماية البيانات كيتواصل معاه المستخدمون بخصوص حقوقهم (الوصول، التصحيح، الحذف).
        </p>
      </div>

      {/* CNDP */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">التصريح لدى CNDP</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم التسجيل لدى CNDP
          </label>
          <input
            type="text"
            value={cndpReg}
            onChange={(e) => setCndpReg(e.target.value)}
            placeholder="مثال: CNDP-2026-XXXXX"
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-2">
            إلا مازال ما سجلتيش، تنجم تديرو عبر{' '}
            <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              موقع CNDP
            </a>{' '}
            مجاناً.
          </p>
        </div>
      </div>

      {/* Data retention */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">مدة الاحتفاظ بالمعطيات</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            المدة (بالأشهر)
          </label>
          <input
            type="number"
            min="12"
            max="120"
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
          />
          <p className="text-xs text-slate-500 mt-2">
            من بعد {retention} شهر من عدم النشاط، يمكن للمعطيات تُحذف تلقائياً. المدة القانونية الموصى بها: 60 شهراً.
          </p>
        </div>
      </div>

      {/* Rights info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          حقوق المستخدمين (يجب توفيرها)
        </h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>حق الوصول — يمكن للمستخدم تحميل نسخة من معطياته</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>حق التصحيح — يمكنه تعديل معطياته</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>حق الحذف — يمكنه طلب حذف حسابه</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>حق الاعتراض — يمكنه رفض معالجة معينة</span>
          </li>
        </ul>
        <p className="text-xs text-amber-700 mt-3">
          هاد الحقوق كتوفر ف صفحة <a href="/dashboard/profile" className="underline font-bold">حسابي</a> لكل مستخدم.
        </p>
      </div>

    </div>
  )
}