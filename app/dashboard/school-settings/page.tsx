'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  Settings, Save, Plus, Trash2, Clock, Coffee, Calendar,
  RefreshCw, X, Wand2, Pencil, GraduationCap, BookOpen,
} from 'lucide-react'

const DAYS = [
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
  { value: 7, label: 'الأحد' },
]

type DayConfig = {
  enabled: boolean
  start: string
  end: string
}

type Pause = {
  name: string
  start: string
  end: string
  blocks?: boolean
}

type Slot = {
  index: number
  start: string
  end: string
  type: 'lesson' | 'pause'
  label?: string
  inlineBreaks?: { name: string; start: string; end: string }[]
}

/* ====== TimeInput24 : input 24h بلا AM/PM ====== */
function TimeInput24({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  const commit = (raw: string) => {
    let v = raw.replace(/[^\d:]/g, '')

    if (/^\d{2}$/.test(v) && !v.includes(':')) v = v + ':'

    const m = v.match(/^(\d{0,2}):?(\d{0,2})$/)
    if (m) {
      let h = m[1]
      let mn = m[2] ?? ''

      if (h.length === 2) {
        const hn = Math.min(23, parseInt(h, 10))
        h = String(hn).padStart(2, '0')
      }
      if (mn.length === 2) {
        const mnN = Math.min(59, parseInt(mn, 10))
        mn = String(mnN).padStart(2, '0')
      }

      v = h + (v.includes(':') ? ':' + mn : '')
    }

    setText(v)

    if (/^\d{2}:\d{2}$/.test(v)) {
      const [hh, mm] = v.split(':').map(Number)
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        onChange(v)
      }
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="HH:MM"
      value={text}
      onChange={(e) => commit(e.target.value)}
      onBlur={() => {
        if (!/^\d{2}:\d{2}$/.test(text)) setText(value)
      }}
      className={className}
      dir="ltr"
    />
  )
}
/* ================================================ */

export default function SchoolSettingsPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [periodDuration, setPeriodDuration] = useState(60)
  const [daysConfig, setDaysConfig] = useState<Record<string, DayConfig>>({})
  const [pauses, setPauses] = useState<Pause[]>([])
  const [previewDay, setPreviewDay] = useState<number>(1)

  const [showPauseModal, setShowPauseModal] = useState(false)
  const [editingPauseIndex, setEditingPauseIndex] = useState<number | null>(null)
  const [pauseName, setPauseName] = useState('')
  const [pauseStart, setPauseStart] = useState('10:00')
  const [pauseEnd, setPauseEnd] = useState('10:15')
  const [pauseBlocks, setPauseBlocks] = useState(true)

  // Levels (سلم التنقيط لكل مستوى)
  const [levels, setLevels] = useState<{ id: string; name: string; grade_max: number }[]>([])
  const [savingLevelId, setSavingLevelId] = useState<string | null>(null)

  // Terms (الفصول)
  const [termsCount, setTermsCount] = useState(2)
  const [termNames, setTermNames] = useState<string[]>(['الدورة 1', 'الدورة 2'])

  useEffect(() => {
    if (!establishmentId || !role) return
    loadSettings()
  }, [establishmentId, role])

  const loadSettings = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .eq('establishment_id', establishmentId)
      .maybeSingle()

    if (error) console.error('Load settings error:', error)

    if (data) {
      setPeriodDuration(data.period_duration || 60)
      setPauses(Array.isArray(data.breaks) ? data.breaks : [])
      setTermsCount(Number(data.terms_count) || 2)
      setTermNames(
        Array.isArray(data.term_names) && data.term_names.length > 0
          ? data.term_names
          : ['الدورة 1', 'الدورة 2']
      )

      const config = data.days_config || {}
      const finalConfig: Record<string, DayConfig> = {}
      DAYS.forEach(d => {
        finalConfig[String(d.value)] = {
          enabled: config[String(d.value)]?.enabled ?? (d.value <= 5),
          start: config[String(d.value)]?.start || '08:00',
          end: config[String(d.value)]?.end || (d.value === 5 ? '12:00' : '18:00'),
        }
      })
      setDaysConfig(finalConfig)
    } else {
      const finalConfig: Record<string, DayConfig> = {}
      DAYS.forEach(d => {
        finalConfig[String(d.value)] = {
          enabled: d.value <= 5,
          start: '08:00',
          end: d.value === 5 ? '12:00' : '18:00',
        }
      })
      setDaysConfig(finalConfig)
      setPauses([
        { name: 'استراحة', start: '10:00', end: '10:15', blocks: false },
        { name: 'غداء', start: '12:00', end: '14:00', blocks: true },
      ])
    }

    // جيب المستويات (برا if/else)
    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name, grade_max')
      .eq('establishment_id', establishmentId)
      .order('name', { ascending: true })

    setLevels((levelsData || []).map(l => ({
      id: l.id,
      name: l.name,
      grade_max: Number(l.grade_max) || 20,
    })))

    setLoading(false)
  }

  const handleSave = async () => {
    if (!establishmentId) return
    setSaving(true)
    setError('')

    const supabase = createClient()

    try {
      const payload = {
        establishment_id: establishmentId,
        period_duration: periodDuration,
        breaks: pauses,
        days_config: daysConfig,
        days_of_week: Object.entries(daysConfig)
          .filter(([_, c]) => c.enabled)
          .map(([d]) => Number(d)),
        day_start: '08:00',
        day_end: '18:00',
        terms_count: termsCount,
        term_names: termNames,
        updated_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('school_settings')
        .select('id')
        .eq('establishment_id', establishmentId)
        .maybeSingle()

      if (existing) {
        const { error: upErr } = await supabase
          .from('school_settings')
          .update(payload)
          .eq('establishment_id', establishmentId)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from('school_settings')
          .insert(payload)
        if (insErr) throw insErr
      }

      setSuccess('✅ تم حفظ الإعدادات')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const generateSlots = (dayValue: number): Slot[] => {
    const config = daysConfig[String(dayValue)]
    if (!config || !config.enabled) return []

    const slots: Slot[] = []
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const toTime = (min: number) => {
      const h = Math.floor(min / 60)
      const m = min % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const startMin = toMin(config.start)
    const endMin = toMin(config.end)

    const sortedPauses = [...pauses]
      .map(p => ({ ...p, s: toMin(p.start), e: toMin(p.end), isHard: p.blocks !== false }))
      .filter(p => p.e > startMin && p.s < endMin)
      .sort((a, b) => a.s - b.s)

    const hardPauses = sortedPauses.filter(p => p.isHard)
    const softPauses = sortedPauses.filter(p => !p.isHard)

    let current = startMin
    let slotIndex = 1
    let safety = 0

    while (current < endMin && safety < 100) {
      safety++

      const pause = hardPauses.find(p => current >= p.s && current < p.e)
      if (pause) {
        slots.push({
          index: slotIndex,
          start: toTime(pause.s),
          end: toTime(pause.e),
          type: 'pause',
          label: pause.name,
        })
        current = pause.e
        continue
      }

      const nextHardPause = hardPauses.find(p => p.s > current)
      const maxEnd = nextHardPause ? Math.min(nextHardPause.s, current + periodDuration) : current + periodDuration
      const slotEnd = Math.min(maxEnd, endMin)

      if (slotEnd - current < 15) break

      const inlineBreaks = softPauses
        .filter(p => p.s >= current && p.e <= slotEnd)
        .map(p => ({ name: p.name, start: toTime(p.s), end: toTime(p.e) }))

      slots.push({
        index: slotIndex,
        start: toTime(current),
        end: toTime(slotEnd),
        type: 'lesson',
        inlineBreaks: inlineBreaks.length > 0 ? inlineBreaks : undefined,
      })
      slotIndex++
      current = slotEnd
    }

    return slots
  }

  const handleToggleDay = (dayValue: number) => {
    setDaysConfig(prev => ({
      ...prev,
      [String(dayValue)]: {
        ...prev[String(dayValue)],
        enabled: !prev[String(dayValue)]?.enabled,
      },
    }))
  }

  const handleDayTimeChange = (dayValue: number, field: 'start' | 'end', value: string) => {
    setDaysConfig(prev => ({
      ...prev,
      [String(dayValue)]: {
        ...prev[String(dayValue)],
        [field]: value,
      },
    }))
  }

  const handleOpenPauseModal = (index?: number) => {
    if (index !== undefined) {
      setEditingPauseIndex(index)
      setPauseName(pauses[index].name)
      setPauseStart(pauses[index].start)
      setPauseEnd(pauses[index].end)
      setPauseBlocks(pauses[index].blocks !== false)
    } else {
      setEditingPauseIndex(null)
      setPauseName('')
      setPauseStart('10:00')
      setPauseEnd('10:15')
      setPauseBlocks(true)
    }
    setShowPauseModal(true)
  }

  const handleSavePause = () => {
    if (!pauseName.trim() || !pauseStart || !pauseEnd) return
    const newPause = {
      name: pauseName.trim(),
      start: pauseStart,
      end: pauseEnd,
      blocks: pauseBlocks,
    }

    if (editingPauseIndex !== null) {
      setPauses(prev => prev.map((p, i) => i === editingPauseIndex ? newPause : p))
    } else {
      setPauses(prev => [...prev, newPause])
    }
    setShowPauseModal(false)
  }

  const handleDeletePause = (index: number) => {
    if (!confirm('حذف هذه الاستراحة؟')) return
    setPauses(prev => prev.filter((_, i) => i !== index))
  }

  const handleLevelGradeMaxChange = async (levelId: string, value: number) => {
    setSavingLevelId(levelId)
    setError('')
    const supabase = createClient()

    const { error } = await supabase
      .from('levels')
      .update({ grade_max: value })
      .eq('id', levelId)

    if (error) {
      setError(error.message)
    } else {
      setLevels(prev => prev.map(l => l.id === levelId ? { ...l, grade_max: value } : l))
      setSuccess('✅ تم تحديث سلم التنقيط')
      setTimeout(() => setSuccess(''), 2000)
    }
    setSavingLevelId(null)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  const previewSlots = generateSlots(previewDay)
  const enabledDays = DAYS.filter(d => daysConfig[String(d.value)]?.enabled)

  return (
    <div className="p-6 space-y-6" dir="rtl">

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            إعدادات المدرسة
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            سلم التنقيط، الفصول، أيام الدراسة، الاستراحات
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
          >
            <Save className="h-4 w-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      {/* ========== 1. سلم التنقيط حسب المستوى ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-600" /> سلم التنقيط حسب المستوى
        </h3>

        {levels.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            ⚠️ لا توجد مستويات. أضف من صفحة{' '}
            <a href="/dashboard/levels" className="underline font-medium">المستويات</a>{' '}
            أولاً.
          </div>
        ) : (
          <div className="space-y-2">
            {levels.map(l => {
              const current = l.grade_max || 20
              const isSaving = savingLevelId === l.id
              return (
                <div
                  key={l.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    isSaving ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{l.name}</span>
                  <div className="flex gap-1.5">
                    {[10, 20].map(v => (
                      <button
                        key={v}
                        onClick={() => handleLevelGradeMaxChange(l.id, v)}
                        disabled={isSaving}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition disabled:opacity-50 ${
                          current === v
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        / {v}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          💡 ابتدائي: على 10 · إعدادي و ثانوي: على 20 — كيتحفظ تلقائياً منين كتنقر
        </p>
      </div>

      {/* ========== 2. عدد الفصول ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-600" /> عدد الفصول (الدورات)
        </h3>

        <div className="flex gap-2 flex-wrap mb-4">
          {[2, 3].map(v => (
            <button
              key={v}
              onClick={() => {
                setTermsCount(v)
                setTermNames(prev => {
                  const next = [...prev]
                  while (next.length < v) next.push(`الدورة ${next.length + 1}`)
                  return next.slice(0, v)
                })
              }}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${
                termsCount === v
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {v} فصول
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {Array.from({ length: termsCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={termNames[i] || ''}
                onChange={(e) => {
                  const next = [...termNames]
                  next[i] = e.target.value
                  setTermNames(next)
                }}
                className="flex-1 h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder={`اسم الفصل ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          مثال: "الدورة 1" و "الدورة 2" · ولا "الفصل الأول" و "الفصل الثاني"...
        </p>
      </div>

      {/* ========== 3. مدة الحصة الواحدة ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" /> مدة الحصة الواحدة
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[45, 60, 90, 120].map(d => (
            <button
              key={d}
              onClick={() => setPeriodDuration(d)}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${
                periodDuration === d
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d} دقيقة
            </button>
          ))}
        </div>
      </div>

      {/* ========== 4. أيام الدراسة والساعات ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" /> أيام الدراسة والساعات
        </h3>
        <div className="space-y-2">
          {DAYS.map(d => {
            const config = daysConfig[String(d.value)] || { enabled: false, start: '08:00', end: '18:00' }
            return (
              <div
                key={d.value}
                className={`flex items-center gap-3 p-3 rounded-xl border transition flex-wrap ${
                  config.enabled ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer min-w-[120px]">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={() => handleToggleDay(d.value)}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className={`text-sm font-medium ${config.enabled ? 'text-emerald-800' : 'text-slate-500'}`}>
                    {d.label}
                  </span>
                </label>

                {config.enabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">من</span>
                      <TimeInput24
                        value={config.start}
                        onChange={(v) => handleDayTimeChange(d.value, 'start', v)}
                        className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">إلى</span>
                      <TimeInput24
                        value={config.end}
                        onChange={(v) => handleDayTimeChange(d.value, 'end', v)}
                        className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-center"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ========== 5. الاستراحات ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-600" /> الاستراحات ({pauses.length})
          </h3>
          <button
            onClick={() => handleOpenPauseModal()}
            className="inline-flex items-center gap-1 bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> إضافة استراحة
          </button>
        </div>
        {pauses.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">لا توجد استراحات</p>
        ) : (
          <div className="space-y-2">
            {pauses.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Coffee className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-amber-900">{p.name}</p>
                    {p.blocks === false ? (
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">
                        ما كتقطعش
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                        كتقطع
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-700">{p.start} → {p.end}</p>
                </div>
                <button
                  onClick={() => handleOpenPauseModal(i)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeletePause(i)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== 6. معاينة الحصص ========== */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-purple-600" /> معاينة الحصص (تلقائية)
        </h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {enabledDays.map(d => (
            <button
              key={d.value}
              onClick={() => setPreviewDay(d.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                previewDay === d.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {previewSlots.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">لا توجد حصص</p>
        ) : (
          <div className="space-y-1">
            {previewSlots.map((slot, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  slot.type === 'pause'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-indigo-50 border border-indigo-200'
                }`}
              >
                {slot.type === 'pause' ? (
                  <Coffee className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {slot.index}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${slot.type === 'pause' ? 'text-amber-800' : 'text-indigo-800'}`}>
                    {slot.type === 'pause' ? slot.label : `الحصة ${slot.index}`}
                  </span>
                  {slot.inlineBreaks && slot.inlineBreaks.length > 0 && (
                    <div className="text-[10px] text-amber-600 mt-1">
                      {slot.inlineBreaks.map((b, j) => (
                        <span key={j} className="inline-flex items-center gap-1 mr-2">
                          ☕ {b.name} ({b.start}→{b.end})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs ${slot.type === 'pause' ? 'text-amber-600' : 'text-indigo-600'}`}>
                  {slot.start} → {slot.end}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== Modal الاستراحة ========== */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingPauseIndex !== null ? 'تعديل استراحة' : 'إضافة استراحة'}
              </h3>
              <button onClick={() => setShowPauseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الاستراحة</label>
                <input
                  type="text"
                  value={pauseName}
                  onChange={(e) => setPauseName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: استراحة، غداء..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                  <TimeInput24
                    value={pauseStart}
                    onChange={setPauseStart}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                  <TimeInput24
                    value={pauseEnd}
                    onChange={setPauseEnd}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pauseBlocks}
                    onChange={(e) => setPauseBlocks(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    تقطع الحصص (بحال الغداء)
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 pr-6">
                  {pauseBlocks
                    ? '⛔ ممنوع تكون حصص خلال هذه الفترة'
                    : '☕ الحصة كتقدر تكمل عبر هذه الاستراحة (التلميذ كيخرج و كيرجع)'}
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSavePause}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
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