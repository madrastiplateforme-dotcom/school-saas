'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Save, RefreshCw } from 'lucide-react'

type Setting = {
  key: string
  value: string
}

export default function SettingsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canManageSettings = hasPermission('settings', 'manage')

  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!establishmentId) return
    fetchSettings()
  }, [establishmentId])

  const fetchSettings = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('settings').select('*')
    if (error) setError(error.message)
    else setSettings(data || [])
    setLoading(false)
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    for (const setting of settings) {
      const { error } = await supabase.from('settings').update({ value: setting.value }).eq('key', setting.key)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSuccess('تم حفظ الإعدادات بنجاح')
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canManageSettings) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || ''

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-indigo-600" />
          Paramètres
        </h1>
        <p className="text-gray-600">Gérez les paramètres de la plateforme</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom de la plateforme</label>
          <input
            type="text"
            value={getSetting('platform_name')}
            onChange={(e) => handleChange('platform_name', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Devise</label>
          <input
            type="text"
            value={getSetting('currency')}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Langue par défaut</label>
          <select
            value={getSetting('default_language')}
            onChange={(e) => handleChange('default_language', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}