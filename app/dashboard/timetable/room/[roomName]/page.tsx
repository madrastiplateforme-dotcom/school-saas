'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  ArrowRight, RefreshCw, Printer, Coffee, GraduationCap,
  Calendar as CalendarIcon, Users, DoorOpen, AlertTriangle,
} from 'lucide-react'

type DayConfig = { enabled: boolean; start: string; end: string }
type Pause = { name: string; start: string; end: string; blocks?: boolean }
type Slot = {
  start: string; end: string; type: 'lesson' | 'pause'; label?: string; index: number;
  inlineBreaks?: { name: string; start: string; end: string }[]
}

type Timetable = {
  id: string; class_id: string; day_of_week: number;
  start_time: string; end_time: string;
  subject_id: string | null; teacher_id: string | null; room: string | null;
}

type Subject = { id: string; name: string; code: string | null; color: string }
type Staff = { id: string; full_name: string }
type Cls = { id: string; name: string }

const DAYS = [
  { value: 1, label: 'الإثنين' }, { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' }, { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' }, { value: 6, label: 'السبت' },
  { value: 7, label: 'الأحد' },
]

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toTime = (min: number) => {
  const h = Math.floor(min / 60); const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
const hhmm = (t: string) => (t || '').slice(0, 5)

export default function RoomTimetablePage() {
  const params = useParams()
  const roomParam = params?.roomName as string
  const roomName = decodeURIComponent(roomParam || '')
  const isUnassigned = roomName === '__none__'

  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [yearName, setYearName] = useState('')
  const [periodDuration, setPeriodDuration] = useState(60)
  const [daysConfig, setDaysConfig] = useState<Record<string, DayConfig>>({})
  const [pauses, setPauses] = useState<Pause[]>([])
  const [slots, setSlots] = useState<Slot[]>([])

  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [classes, setClasses] = useState<Cls[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!establishmentId || !role) return
    loadAll()
  }, [establishmentId, role, roomName])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: years } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)
      .maybeSingle()

    setYearName(years?.name || '')

    const { data: settings } = await supabase
      .from('school_settings')
      .select('*')
      .eq('establishment_id', establishmentId)
      .maybeSingle()

    let pd = 60
    const dcfg: Record<string, DayConfig> = {}
    let brk: Pause[] = []

    if (settings) {
      pd = settings.period_duration || 60
      brk = Array.isArray(settings.breaks) ? settings.breaks : []
      const raw = settings.days_config || {}
      DAYS.forEach(d => {
        dcfg[String(d.value)] = {
          enabled: raw[String(d.value)]?.enabled ?? (d.value <= 5),
          start: raw[String(d.value)]?.start || '08:00',
          end: raw[String(d.value)]?.end || (d.value === 5 ? '12:00' : '18:00'),
        }
      })
    } else {
      DAYS.forEach(d => {
        dcfg[String(d.value)] = {
          enabled: d.value <= 5,
          start: '08:00',
          end: d.value === 5 ? '12:00' : '18:00',
        }
      })
    }
    setPeriodDuration(pd)
    setDaysConfig(dcfg)
    setPauses(brk)

    const firstEnabledDay = DAYS.find(d => dcfg[String(d.value)]?.enabled)
    setSlots(generateSlots(firstEnabledDay?.value || 1, dcfg, brk, pd))

    if (years?.id) {
      let q = supabase
        .from('timetables')
        .select('id, class_id, day_of_week, start_time, end_time, subject_id, teacher_id, room')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', years.id)

      const { data: tt } = await q
      const filtered = (tt || []).filter((t: any) => {
        if (isUnassigned) return !t.room || !t.room.trim()
        return t.room?.trim() === roomName
      })
      setTimetables(filtered)
    }

    const { data: subs } = await supabase
      .from('subjects')
      .select('id, name, code, color')
      .eq('establishment_id', establishmentId)
    setSubjects(subs || [])

    const { data: st } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('establishment_id', establishmentId)
    setStaff(st || [])

    const { data: cls } = await supabase
      .from('classes')
      .select('id, name')
      .eq('establishment_id', establishmentId)
    setClasses(cls || [])

    setLoading(false)
  }

  const generateSlots = (
    dayValue: number,
    dcfg: Record<string, DayConfig>,
    brk: Pause[],
    pd: number
  ): Slot[] => {
    const config = dcfg[String(dayValue)]
    if (!config || !config.enabled) return []

    const result: Slot[] = []
    const startMin = toMin(config.start)
    const endMin = toMin(config.end)

    const sortedPauses = [...brk]
      .map(p => ({ ...p, s: toMin(p.start), e: toMin(p.end), isHard: p.blocks !== false }))
      .filter(p => p.e > startMin && p.s < endMin)
      .sort((a, b) => a.s - b.s)

    const hardPauses = sortedPauses.filter(p => p.isHard)
    const softPauses = sortedPauses.filter(p => !p.isHard)

    let current = startMin
    let idx = 1
    let safety = 0

    while (current < endMin && safety < 100) {
      safety++
      const pause = hardPauses.find(p => current >= p.s && current < p.e)
      if (pause) {
        result.push({ index: idx, start: toTime(pause.s), end: toTime(pause.e), type: 'pause', label: pause.name })
        current = pause.e
        continue
      }
      const nextHardPause = hardPauses.find(p => p.s > current)
      const maxEnd = nextHardPause ? Math.min(nextHardPause.s, current + pd) : current + pd
      const slotEnd = Math.min(maxEnd, endMin)
      if (slotEnd - current < 15) break

      const inlineBreaks = softPauses
        .filter(p => p.s >= current && p.e <= slotEnd)
        .map(p => ({ name: p.name, start: toTime(p.s), end: toTime(p.e) }))

      result.push({
        index: idx,
        start: toTime(current),
        end: toTime(slotEnd),
        type: 'lesson',
        inlineBreaks: inlineBreaks.length > 0 ? inlineBreaks : undefined,
      })
      idx++
      current = slotEnd
    }
    return result
  }

  const getSubject = (id: string | null) => subjects.find(s => s.id === id)
  const getTeacher = (id: string | null) => staff.find(s => s.id === id)
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || '—'

  const findTimetables = (day: number, startTime: string) =>
    timetables.filter(t => t.day_of_week === day && hhmm(t.start_time) === startTime)

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  const enabledDays = DAYS.filter(d => daysConfig[String(d.value)]?.enabled)
  const displayName = isUnassigned ? 'بدون قاعة' : roomName

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/timetable/room" className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-sm ${isUnassigned ? 'bg-amber-500' : 'bg-gradient-to-br from-cyan-500 to-cyan-600'}`}>
              {isUnassigned ? <AlertTriangle className="h-6 w-6" /> : <DoorOpen className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {yearName && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {yearName}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <Printer className="h-4 w-4" /> طباعة
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>}

      {timetables.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <DoorOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">لا توجد حصص ف هاد القاعة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 bg-slate-100 border-b-2 border-slate-200 p-3 text-xs font-bold text-slate-600 w-24 text-center">
                    التوقيت
                  </th>
                  {enabledDays.map(d => (
                    <th key={d.value} className="bg-slate-100 border-b-2 border-slate-200 p-3 text-sm font-bold text-slate-700 min-w-[150px]">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot, rowIdx) => {
                  if (slot.type === 'pause') {
                    return (
                      <tr key={`pause-${rowIdx}`}>
                        <td className="bg-amber-100/60 border-b border-amber-200 p-2 text-[11px] font-bold text-amber-700 text-center">
                          {slot.start}<br /><span className="opacity-60">{slot.end}</span>
                        </td>
                        <td colSpan={enabledDays.length} className="bg-amber-50/60 border-b border-amber-200 p-2 text-center">
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-700">
                            <Coffee className="h-3.5 w-3.5" />
                            {slot.label} · {slot.start} → {slot.end}
                          </span>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={`slot-${rowIdx}`}>
                      <td className="bg-slate-50 border-b border-slate-100 p-2 text-center align-middle">
                        <div className="text-xs font-bold text-slate-700">{slot.start}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{slot.end}</div>
                      </td>
                      {enabledDays.map(d => {
                        const items = findTimetables(d.value, slot.start)
                        return (
                          <td key={`${d.value}-${slot.start}`} className="border-b border-slate-100 p-1.5 align-top">
                            {items.length === 0 ? (
                              <div className="min-h-[80px] rounded-xl bg-slate-50/40 border border-dashed border-slate-100" />
                            ) : (
                              <div className="space-y-1">
                                {items.map(tt => {
                                  const subject = getSubject(tt.subject_id)
                                  const teacher = getTeacher(tt.teacher_id)
                                  const color = subject?.color || '#4F46E5'
                                  return (
                                    <div
                                      key={tt.id}
                                      className="rounded-xl p-2.5 text-right relative overflow-hidden"
                                      style={{ backgroundColor: color + '12', borderRight: `4px solid ${color}` }}
                                    >
                                      <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mb-0.5">
                                        <GraduationCap className="h-3 w-3" />
                                        {getClassName(tt.class_id)}
                                      </div>
                                      <div className="font-bold text-[13px] leading-tight" style={{ color }}>
                                        {subject?.name || '—'}
                                      </div>
                                      {teacher && (
                                        <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1 truncate">
                                          <Users className="h-2.5 w-2.5 opacity-60" />
                                          <span className="truncate">{teacher.full_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}