'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Save, RefreshCw, Upload } from 'lucide-react'

type Setting = {
  key: string
  value: string
}

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)

  // حالات خاصة بحقول التواصل ووضع الصيانة
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [maintenanceMode, setMaintenanceMode] = useState('false')

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
            setError('غير مصرح')
            setLoading(false)
            return
          }
          fetchSettings()
        })
    })
  }, [])

  const fetchSettings = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('settings').select('*')
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSettings(data || [])

    // تعبئة حالات التواصل والصيانة
    const contactEmailSetting = data?.find((s) => s.key === 'contact_email')
    const contactPhoneSetting = data?.find((s) => s.key === 'contact_phone')
    const maintenanceSetting = data?.find((s) => s.key === 'maintenance_mode')

    if (contactEmailSetting) setContactEmail(contactEmailSetting.value)
    if (contactPhoneSetting) setContactPhone(contactPhoneSetting.value)
    if (maintenanceSetting) setMaintenanceMode(maintenanceSetting.value)

    setLoading(false)
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `platform-logo-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)

    if (uploadError) {
      setError(uploadError.message)
      setLogoUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(fileName)
    handleChange('platform_logo', publicUrl.publicUrl)
    setLogoUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    // حفظ الإعدادات العامة
    for (const setting of settings) {
      const { error } = await supabase
        .from('settings')
        .update({ value: setting.value })
        .eq('key', setting.key)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    // حفظ حقول التواصل ووضع الصيانة
    const upserts = [
      { key: 'contact_email', value: contactEmail },
      { key: 'contact_phone', value: contactPhone },
      { key: 'maintenance_mode', value: maintenanceMode },
    ]

    for (const upsert of upserts) {
      const { error } = await supabase
        .from('settings')
        .upsert(upsert, { onConflict: 'key' })
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSuccess('تم حفظ الإعدادات بنجاح')
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>
  }

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || ''

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-indigo-600" />
          إعدادات المنصة
        </h1>
        <p className="text-gray-600">تحكم في الإعدادات العامة للمنصة</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">اسم المنصة</label>
          <input
            type="text"
            value={getSetting('platform_name')}
            onChange={(e) => handleChange('platform_name', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">شعار المنصة</label>
          {getSetting('platform_logo') && (
            <img src={getSetting('platform_logo')} alt="logo" className="h-10 w-10 rounded-full object-cover my-2" />
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200">
            <Upload className="h-4 w-4" />
            {logoUploading ? 'جاري الرفع...' : 'رفع شعار'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogoUpload(file)
              }}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">اللون الأساسي</label>
          <input
            type="color"
            value={getSetting('primary_color')}
            onChange={(e) => handleChange('primary_color', e.target.value)}
            className="mt-1 block"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">العملة</label>
          <input
            type="text"
            value={getSetting('currency')}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">اللغة الافتراضية</label>
          <select
            value={getSetting('default_language')}
            onChange={(e) => handleChange('default_language', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">بريد التواصل</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">هاتف التواصل</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">وضع الصيانة</label>
          <select
            value={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="false">معطّل</option>
            <option value="true">مفعّل</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}