'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Settings, RefreshCw, Bell, Mail, Smartphone, Check, Save,
  AlertCircle, BookOpen, FileText, MessageSquare, Users, Shield,
  GraduationCap,
} from 'lucide-react'

type ChannelPrefs = Record<string, boolean>

type Prefs = {
  email: ChannelPrefs
  in_app: ChannelPrefs
  push: ChannelPrefs
}

const NOTIF_TYPES = [
  { key: 'absence',    labelAr: 'غياب تلميذ',       labelFr: 'Absence élève',       icon: AlertCircle },
  { key: 'grade',      labelAr: 'نقطة جديدة',       labelFr: 'Nouvelle note',       icon: GraduationCap },
  { key: 'message',    labelAr: 'رسالة جديدة',      labelFr: 'Message',             icon: MessageSquare },
  { key: 'meeting',    labelAr: 'لقاء مع ولي',      labelFr: 'Réunion parent',      icon: Users },
  { key: 'discipline', labelAr: 'مخالفة / سلوك',    labelFr: 'Discipline',          icon: Shield },
  { key: 'cahier',     labelAr: 'تذكير cahier',     labelFr: 'Cahier de textes',    icon: BookOpen },
  { key: 'homework',   labelAr: 'تسليم فرض',        labelFr: 'Devoir à rendre',     icon: FileText },
]

const CHANNELS = [
  { key: 'email'  as const, labelAr: 'البريد الإلكتروني', labelFr: 'Email',              icon: Mail },
  { key: 'in_app' as const, labelAr: 'داخل التطبيق',      labelFr: 'Notifications in-app', icon: Bell },
  { key: 'push'   as const, labelAr: 'إشعارات Push',      labelFr: 'Push (mobile)',      icon: Smartphone },
]

const DEFAULT_PREFS: Prefs = {
  email: { absence: true, grade: false, message: true, meeting: true, discipline: true, cahier: false, homework: true },
  in_app: { absence: true, grade: true, message: true, meeting: true, discipline: true, cahier: true, homework: true },
  push:  { absence: true, grade: false, message: true, meeting: true, discipline: true, cahier: false, homework: true },
}

export default function TeacherSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

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

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .maybeSingle()

      const stored = profile?.notification_preferences as Prefs | null
      if (stored) {
        setPrefs({
          email: { ...DEFAULT_PREFS.email, ...(stored.email || {}) },
          in_app: { ...DEFAULT_PREFS.in_app, ...(stored.in_app || {}) },
          push: { ...DEFAULT_PREFS.push, ...(stored.push || {}) },
        })
      }
    } catch (e: any) {
      console.error('[teacher-settings]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (channel: keyof Prefs, notifKey: string) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [notifKey]: !prev[channel][notifKey],
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({ notification_preferences: prefs })
        .eq('user_id', user.id)

      if (upErr) throw new Error(upErr.message)

      setSuccess('✅ تم حفظ إعدادات الإشعارات')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      console.error('[teacher-settings-save]', e?.message || e)
      setError(e?.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const enableAll = (channel: keyof Prefs) => {
    const all: ChannelPrefs = {}
    NOTIF_TYPES.forEach((t) => (all[t.key] = true))
    setPrefs((prev) => ({ ...prev, [channel]: all }))
  }

  const disableAll = (channel: keyof Prefs) => {
    const none: ChannelPrefs = {}
    NOTIF_TYPES.forEach((t) => (none[t.key] = false))
    setPrefs((prev) => ({ ...prev, [channel]: none }))
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-sky-600" />
            إعدادات الإشعارات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تحكم فالإشعارات اللي كتوصلك
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" /> {success}
        </div>
      )}

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <Bell className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-900">
          <p className="font-bold mb-1">💡 ملاحظة</p>
          <p className="text-sky-800">
            اختار نوع الإشعارات اللي بغيتي توصلك وكيفاش.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {CHANNELS.map((channel) => {
          const ChIcon = channel.icon
          const channelPrefs = prefs[channel.key]
          const enabledCount = Object.values(channelPrefs).filter(Boolean).length
          const total = NOTIF_TYPES.length

          return (
            <div
              key={channel.key}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
                    <ChIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">{channel.labelAr}</p>
                    <p className="text-xs text-slate-500">
                      {channel.labelFr} — {enabledCount} / {total} مُفعّل
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enableAll(channel.key)}
                    className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                  >
                    تفعيل الكل
                  </button>
                  <button
                    onClick={() => disableAll(channel.key)}
                    className="text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {NOTIF_TYPES.map((type) => {
                  const TIcon = type.icon
                  const isOn = channelPrefs[type.key] || false
                  return (
                    <div
                      key={type.key}
                      className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <TIcon
                          className={`h-4 w-4 ${
                            isOn ? 'text-sky-600' : 'text-slate-300'
                          }`}
                        />
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              isOn ? 'text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {type.labelAr}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {type.labelFr}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggle(channel.key, type.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                          isOn ? 'bg-sky-600' : 'bg-slate-300'
                        }`}
                        aria-label={`Toggle ${type.key}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isOn ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-lg hover:bg-sky-700 font-bold text-sm disabled:opacity-50 shadow-sm"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}