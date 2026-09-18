'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { pdf } from '@react-pdf/renderer'
import TimetablePDF from '@/components/pdfs/TimetablePDF'
import {
  ArrowRight, Plus, Trash2, X, Save, RefreshCw, AlertTriangle,
  Users, MapPin, Printer, Coffee, GraduationCap,
  Calendar as CalendarIcon, Clock, TrendingUp, CheckCircle2,
  Wand2, Copy, Eraser, CopyPlus, Sparkles, Info, History,
  DoorOpen, FileDown, GripVertical, // ← زيد
} from 'lucide-react'

type DayConfig = { enabled: boolean; start: string; end: string }
type Pause = { name: string; start: string; end: string; blocks?: boolean }
type Slot = {
  start: string
  end: string
  type: 'lesson' | 'pause'
  label?: string
  index: number
  inlineBreaks?: { name: string; start: string; end: string }[]
}

type Timetable = {
  id: string
  class_id: string
  academic_year_id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string | null
  teacher_id: string | null
  room: string | null
  type: string | null
  notes: string | null
}

type Subject = { id: string; name: string; code: string | null; color: string }
type Staff = { id: string; full_name: string }
type TeacherSubject = { subject_id: string; teacher_id: string; level_id: string | null; weekly_hours: number }

type TeacherPref = 'morning' | 'afternoon' | 'any'
type GenSubjectCfg = { hours: number; teacherId: string; preferredDays: number[] }

const DAYS = [
  { value: 1, label: 'الإثنين', short: 'إث' },
  { value: 2, label: 'الثلاثاء', short: 'ث' },
  { value: 3, label: 'الأربعاء', short: 'أر' },
  { value: 4, label: 'الخميس', short: 'خ' },
  { value: 5, label: 'الجمعة', short: 'ج' },
  { value: 6, label: 'السبت', short: 'س' },
  { value: 7, label: 'الأحد', short: 'ح' },
]

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toTime = (min: number) => {
  const h = Math.floor(min / 60); const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
const hhmm = (t: string) => (t || '').slice(0, 5)

export default function ClassTimetablePage() {
  const params = useParams()
  const classId = params?.classId as string

  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const canManage = role === 'directeur' || role === 'secretaire'
  const [classInfo, setClassInfo] = useState<{ id: string; name: string; level_id: string | null; level_name: string | null } | null>(null)
  const [yearId, setYearId] = useState<string | null>(null)
  const [yearName, setYearName] = useState<string>('')

  const [periodDuration, setPeriodDuration] = useState(60)
  const [daysConfig, setDaysConfig] = useState<Record<string, DayConfig>>({})
  const [pauses, setPauses] = useState<Pause[]>([])
  const [slots, setSlots] = useState<Slot[]>([])

  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [allTimetables, setAllTimetables] = useState<Timetable[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([])
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Timetable | null>(null)
  const [formDay, setFormDay] = useState(1)
  const [formStart, setFormStart] = useState('08:00')
  const [formEnd, setFormEnd] = useState('09:00')
  const [formSubject, setFormSubject] = useState('')
  const [formTeacher, setFormTeacher] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])

  // Drag & Drop
  const [draggedTt, setDraggedTt] = useState<Timetable | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  // Drag & Drop
  const [draggedSubject, setDraggedSubject] = useState<{ subjectId: string; teacherId: string } | null>(null) // ← جديد
  // PDF
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  // Auto-generate modal
  const [showGenModal, setShowGenModal] = useState(false)
  const [genMode, setGenMode] = useState<'clear' | 'fill'>('fill')
  const [genConfig, setGenConfig] = useState<Record<string, GenSubjectCfg>>({})
  const [genSpreadDays, setGenSpreadDays] = useState(true)
  const [genNoConsecutive, setGenNoConsecutive] = useState(true)
  const [genBalanceDaily, setGenBalanceDaily] = useState(true)
  const [genRespectTeacherPref, setGenRespectTeacherPref] = useState(false)
  const [genRespectSubjectDays, setGenRespectSubjectDays] = useState(false)
  const [teacherPrefs, setTeacherPrefs] = useState<Record<string, TeacherPref>>({})
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<{ placed: number; failed: number } | null>(null)

  // Copy from class modal
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySourceClassId, setCopySourceClassId] = useState('')
  const [copyMode, setCopyMode] = useState<'clear' | 'fill'>('clear')
  const [copying, setCopying] = useState(false)

  // Duplicate day modal
  const [showDupModal, setShowDupModal] = useState(false)
  const [dupSourceDay, setDupSourceDay] = useState(1)
  const [dupTargetDays, setDupTargetDays] = useState<number[]>([])
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    if (!establishmentId || !classId || !role) return
    loadAll()
  }, [establishmentId, classId, role])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('id', classId)
      .single()

    if (cls) {
      setClassInfo({
        id: cls.id,
        name: cls.name,
        level_id: cls.level_id,
        level_name: (cls.levels as any)?.name || null,
      })
    }

    const { data: years } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)
      .maybeSingle()

    setYearId(years?.id || null)
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

    let ttQuery = supabase.from('timetables').select('*').eq('class_id', classId)
    if (years?.id) ttQuery = ttQuery.eq('academic_year_id', years.id)
    const { data: ttData } = await ttQuery
    setTimetables(ttData || [])

    if (years?.id) {
      const { data: allTt } = await supabase
        .from('timetables')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', years.id)
      setAllTimetables(allTt || [])
    }

    const { data: subs } = await supabase
      .from('subjects')
      .select('id, name, code, color')
      .eq('establishment_id', establishmentId)
      .eq('active', true)
      .order('name')
    setSubjects(subs || [])

    const { data: st } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('establishment_id', establishmentId)
      .eq('type', 'teacher')
      .order('full_name')
    setStaff(st || [])

    const { data: ts } = await supabase
      .from('teacher_subjects')
      .select('subject_id, teacher_id, level_id, weekly_hours')
      .eq('establishment_id', establishmentId)
    setTeacherSubjects(ts || [])

    const { data: clsAll } = await supabase
      .from('classes')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .order('name')
    setAllClasses(clsAll || [])

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

  const findTimetable = (day: number, startTime: string) =>
    timetables.find(t => t.day_of_week === day && hhmm(t.start_time) === startTime)

  const getSubject = (id: string | null) => subjects.find(s => s.id === id)
  const getTeacher = (id: string | null) => staff.find(s => s.id === id)

  const teachersForSubject = (subjectId: string): Staff[] => {
    if (!subjectId) return staff
    const levelId = classInfo?.level_id
    const links = teacherSubjects.filter(
      ts => ts.subject_id === subjectId && (ts.level_id === null || ts.level_id === levelId)
    )
    const ids = new Set(links.map(l => l.teacher_id))
    return staff.filter(s => ids.has(s.id))
  }

  const availableSubjectsForLevel = useMemo(() => {
    if (!classInfo?.level_id) return subjects
    const idsWithTeachers = new Set(
      teacherSubjects
        .filter(ts => ts.level_id === null || ts.level_id === classInfo.level_id)
        .map(ts => ts.subject_id)
    )
    return subjects.filter(s => idsWithTeachers.has(s.id))
  }, [subjects, teacherSubjects, classInfo])

  const teacherStats = useMemo(() => {
    if (!classInfo) return []

    const teacherIds = new Set<string>()
    timetables.forEach(t => t.teacher_id && teacherIds.add(t.teacher_id))
    teacherSubjects.forEach(ts => {
      if (ts.level_id === null || ts.level_id === classInfo.level_id) {
        teacherIds.add(ts.teacher_id)
      }
    })

    const stats = Array.from(teacherIds).map(tid => {
      const teacher = staff.find(s => s.id === tid)
      if (!teacher) return null

      const thisClassHours = timetables
        .filter(t => t.teacher_id === tid)
        .reduce((sum, t) => sum + (toMin(hhmm(t.end_time)) - toMin(hhmm(t.start_time))) / 60, 0)

      const targetHours = teacherSubjects
        .filter(ts => ts.teacher_id === tid && (ts.level_id === null || ts.level_id === classInfo.level_id))
        .reduce((sum, ts) => sum + (Number(ts.weekly_hours) || 0), 0)

      const globalAssigned = allTimetables
        .filter(t => t.teacher_id === tid)
        .reduce((sum, t) => sum + (toMin(hhmm(t.end_time)) - toMin(hhmm(t.start_time))) / 60, 0)

      return {
        teacherId: tid,
        name: teacher.full_name,
        thisClassHours,
        targetHours,
        globalAssigned,
        remaining: targetHours - globalAssigned,
      }
    }).filter(Boolean) as Array<{
      teacherId: string
      name: string
      thisClassHours: number
      targetHours: number
      globalAssigned: number
      remaining: number
    }>

    return stats.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [timetables, allTimetables, teacherSubjects, staff, classInfo])
  // ============ REMAINING LESSONS TRAY ============
const remainingLessons = useMemo(() => {
  if (!classInfo) return []

  return availableSubjectsForLevel
    .map(s => {
      // Target: مجموع weekly_hours ديال المادة ف هاد المستوى
      const targetHours = teacherSubjects
        .filter(ts => ts.subject_id === s.id && (ts.level_id === null || ts.level_id === classInfo.level_id))
        .reduce((sum, ts) => sum + Number(ts.weekly_hours || 0), 0)

      // Placed: عدد الساعات المسجلة ف الجدول
      const placedHours = timetables
        .filter(t => t.subject_id === s.id)
        .reduce((sum, t) => sum + (toMin(hhmm(t.end_time)) - toMin(hhmm(t.start_time))) / 60, 0)

      const remaining = Math.max(0, targetHours - placedHours)

      // الأستاذ الرئيسي (أول واحد مرتبط)
      const primaryTeacherId = teacherSubjects.find(
        ts => ts.subject_id === s.id && (ts.level_id === null || ts.level_id === classInfo.level_id)
      )?.teacher_id || ''

      return {
        subject: s,
        targetHours,
        placedHours,
        remaining,
        primaryTeacherId,
      }
    })
    .filter(r => r.targetHours > 0 && r.remaining > 0)
}, [availableSubjectsForLevel, teacherSubjects, timetables, classInfo])
  // ============ MODAL ADD/EDIT ============
  const openCreate = (day: number, slot: Slot) => {
    setEditing(null)
    setFormDay(day)
    setFormStart(slot.start)
    setFormEnd(slot.end)
    setFormSubject('')
    setFormTeacher('')
    setFormRoom('')
    setFormNotes('')
    setConflicts([])
    setError('')
    setShowModal(true)
  }

  const openEdit = (tt: Timetable) => {
    setEditing(tt)
    setFormDay(tt.day_of_week)
    setFormStart(hhmm(tt.start_time))
    setFormEnd(hhmm(tt.end_time))
    setFormSubject(tt.subject_id || '')
    setFormTeacher(tt.teacher_id || '')
    setFormRoom(tt.room || '')
    setFormNotes(tt.notes || '')
    setConflicts([])
    setError('')
    setShowModal(true)
  }

  const detectConflicts = async (): Promise<string[]> => {
    if (!establishmentId || !yearId || !classInfo) return []
    const supabase = createClient()
    const found: string[] = []

    const existingSlot = timetables.find(t =>
      t.day_of_week === formDay && hhmm(t.start_time) === formStart && t.id !== editing?.id
    )
    if (existingSlot) {
      found.push(`القسم عنده حصة أخرى في نفس اليوم/التوقيت (${formStart})`)
    }

    if (formTeacher) {
      const { data: teacherConflicts } = await supabase
        .from('timetables')
        .select('id, class_id, start_time, end_time, classes(name)')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', yearId)
        .eq('day_of_week', formDay)
        .eq('teacher_id', formTeacher)
        .neq('class_id', classId)
        .lt('start_time', formEnd + ':00')
        .gt('end_time', formStart + ':00')

      ;(teacherConflicts || []).forEach((c: any) => {
        found.push(`الأستاذ مشغول ف قسم آخر: ${c.classes?.name || '—'} (${hhmm(c.start_time)} → ${hhmm(c.end_time)})`)
      })
    }

    return found
  }

  const handleSave = async () => {
    if (!establishmentId || !classInfo || !yearId) {
      setError('السنة الدراسية الحالية غير محددة')
      return
    }
    if (!formSubject) { setError('يرجى اختيار المادة'); return }
    if (!formTeacher) { setError('يرجى اختيار الأستاذ'); return }
    if (formStart >= formEnd) { setError('وقت البداية يجب أن يكون قبل النهاية'); return }

    setSaving(true)
    setError('')

    const conflictList = await detectConflicts()
    if (conflictList.length > 0) {
      setConflicts(conflictList)
      setSaving(false)
      return
    }

    const supabase = createClient()
    const payload = {
      establishment_id: establishmentId,
      class_id: classInfo.id,
      academic_year_id: yearId,
      day_of_week: formDay,
      start_time: formStart + ':00',
      end_time: formEnd + ':00',
      subject_id: formSubject,
      teacher_id: formTeacher,
      room: formRoom.trim() || null,
      type: 'lesson',
      notes: formNotes.trim() || null,
    }

    try {
      if (editing) {
        const { error } = await supabase.from('timetables').update(payload).eq('id', editing.id)
        if (error) throw error
        setSuccess('✅ تم تحديث الحصة')
      } else {
        const { error } = await supabase.from('timetables').insert(payload)
        if (error) throw error
        setSuccess('✅ تم إضافة الحصة')
      }
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      loadAll()
    } catch (err: any) {
      if (err.message?.includes('duplicate key')) {
        setError('هذا القسم عنده حصة ف نفس التوقيت مسبقاً.')
      } else {
        setError(err.message || 'حدث خطأ')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذه الحصة؟')) return
    const supabase = createClient()
    const { error } = await supabase.from('timetables').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      setSuccess('✅ تم الحذف')
      setTimeout(() => setSuccess(''), 3000)
      loadAll()
    }
  }

  // ============ DRAG & DROP ============
  const checkTeacherConflictAt = async (
    teacherId: string,
    day: number,
    startTime: string,
    endTime: string,
    excludeIds: string[] = []
  ): Promise<string | null> => {
    if (!establishmentId || !yearId) return null
    const supabase = createClient()

    const { data } = await supabase
      .from('timetables')
      .select('id, class_id, start_time, end_time, classes(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .eq('day_of_week', day)
      .eq('teacher_id', teacherId)
      .neq('class_id', classId)
      .lt('start_time', endTime + ':00')
      .gt('end_time', startTime + ':00')

    const found = (data || []).filter((c: any) => !excludeIds.includes(c.id))
    if (found.length === 0) return null
    const c = found[0]
    return `الأستاذ مشغول ف ${(c.classes as any)?.name || 'قسم آخر'} (${hhmm(c.start_time)} → ${hhmm(c.end_time)})`
  }

  const handleDragStart = (e: React.DragEvent, tt: Timetable) => {
    setDraggedTt(tt)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tt.id)
  }

  // ✅ خلي هاد
 const handleDragEnd = () => {
  setDraggedTt(null)
  setDraggedSubject(null) // ← جديد
  setDragOverKey(null)
 }

  const handleDragOver = (e: React.DragEvent, day: number, slot: Slot) => {
  if (!draggedTt && !draggedSubject) return // ← بدّل
  e.preventDefault()
  e.dataTransfer.dropEffect = draggedSubject ? 'copy' : 'move' // ← بدّل
  setDragOverKey(`${day}-${slot.start}`)
}


const handleDrop = async (e: React.DragEvent, day: number, slot: Slot) => {
  e.preventDefault()
  setDragOverKey(null)

  // ========== CASE 1: NEW LESSON FROM TRAY ==========
  if (draggedSubject) {
    if (!establishmentId || !classInfo || !yearId) return

    // الخلية خاصها تكون فارغة
    const existing = findTimetable(day, slot.start)
    if (existing) {
      setError('الخلية معمورة. اختر خلية فارغة.')
      setTimeout(() => setError(''), 3000)
      handleDragEnd()
      return
    }

    // تحقق من conflict ديال الأستاذ
    const conflict = await checkTeacherConflictAt(
      draggedSubject.teacherId,
      day, slot.start, slot.end
    )
    if (conflict) {
      setError(`لا يمكن الإضافة: ${conflict}`)
      setTimeout(() => setError(''), 4000)
      handleDragEnd()
      return
    }

    // زيد الحصة
    const supabase = createClient()
    const { error } = await supabase.from('timetables').insert({
      establishment_id: establishmentId,
      class_id: classId,
      academic_year_id: yearId,
      day_of_week: day,
      start_time: slot.start + ':00',
      end_time: slot.end + ':00',
      subject_id: draggedSubject.subjectId,
      teacher_id: draggedSubject.teacherId,
      type: 'lesson',
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('✅ تمت إضافة الحصة')
      setTimeout(() => setSuccess(''), 2000)
      loadAll()
    }
    handleDragEnd()
    return
  }

  // ========== CASE 2: MOVE/SWAP EXISTING ==========
  if (!draggedTt) return

  if (draggedTt.day_of_week === day && hhmm(draggedTt.start_time) === slot.start) {
    handleDragEnd()
    return
  }

  const supabase = createClient()
  const target = findTimetable(day, slot.start)

  if (draggedTt.teacher_id) {
    const conflict = await checkTeacherConflictAt(
      draggedTt.teacher_id,
      day, slot.start, slot.end,
      target ? [target.id] : []
    )
    if (conflict) {
      setError(`لا يمكن النقل: ${conflict}`)
      setTimeout(() => setError(''), 4000)
      handleDragEnd()
      return
    }
  }

  if (target?.teacher_id) {
    const conflict2 = await checkTeacherConflictAt(
      target.teacher_id,
      draggedTt.day_of_week,
      hhmm(draggedTt.start_time),
      hhmm(draggedTt.end_time),
      [draggedTt.id]
    )
    if (conflict2) {
      setError(`لا يمكن التبديل: ${conflict2}`)
      setTimeout(() => setError(''), 4000)
      handleDragEnd()
      return
    }
  }

  try {
    if (target) {
      const { error: e1 } = await supabase
        .from('timetables')
        .update({ day_of_week: day, start_time: slot.start + ':00', end_time: slot.end + ':00' })
        .eq('id', draggedTt.id)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('timetables')
        .update({ day_of_week: draggedTt.day_of_week, start_time: draggedTt.start_time, end_time: draggedTt.end_time })
        .eq('id', target.id)
      if (e2) throw e2

      setSuccess('✅ تم التبديل')
    } else {
      const { error } = await supabase
        .from('timetables')
        .update({ day_of_week: day, start_time: slot.start + ':00', end_time: slot.end + ':00' })
        .eq('id', draggedTt.id)
      if (error) throw error

      setSuccess('✅ تم النقل')
    }

    setTimeout(() => setSuccess(''), 2500)
    loadAll()
  } catch (err: any) {
    setError(err.message || 'حدث خطأ')
  } finally {
    handleDragEnd()
  }
}

  // ============ PDF ============
  const handleDownloadPDF = async () => {
    if (!establishmentId || !classInfo) return
    setDownloadingPDF(true)
    try {
      const supabase = createClient()
      const { data: estab } = await supabase
        .from('establishments')
        .select('name')
        .eq('id', establishmentId)
        .single()

      const enabledDays = DAYS.filter(d => daysConfig[String(d.value)]?.enabled)

      const blob = await pdf(
        <TimetablePDF
          schoolName={estab?.name || 'المدرسة'}
          className={classInfo.name}
          levelName={classInfo.level_name}
          yearName={yearName}
          days={enabledDays}
          slots={slots}
          timetables={timetables}
          subjects={subjects.map(s => ({ id: s.id, name: s.name, color: s.color }))}
          staff={staff}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `جدول-${classInfo.name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('خطأ ف توليد PDF: ' + (err.message || ''))
    } finally {
      setDownloadingPDF(false)
    }
  }

  // ============ CLEAR ALL ============
  const handleClearAll = async () => {
    if (!yearId) { setError('السنة الدراسية غير محددة'); return }
    if (!confirm(`حذف كل حصص ${classInfo?.name}؟ هذا الإجراء لا يمكن التراجع عنه.`)) return
    const supabase = createClient()
    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('class_id', classId)
      .eq('academic_year_id', yearId)
    if (error) setError(error.message)
    else {
      setSuccess('✅ تم مسح الجدول')
      setTimeout(() => setSuccess(''), 3000)
      loadAll()
    }
  }

  // ============ COPY FROM CLASS ============
  const handleCopyFromClass = async () => {
    if (!establishmentId || !yearId || !copySourceClassId) return
    if (copySourceClassId === classId) { setError('لا يمكن النسخ من نفس القسم'); return }

    setCopying(true)
    setError('')
    const supabase = createClient()

    try {
      if (copyMode === 'clear') {
        await supabase.from('timetables').delete().eq('class_id', classId).eq('academic_year_id', yearId)
      }

      const { data: sourceData, error: srcErr } = await supabase
        .from('timetables')
        .select('*')
        .eq('class_id', copySourceClassId)
        .eq('academic_year_id', yearId)

      if (srcErr) throw srcErr
      if (!sourceData || sourceData.length === 0) {
        setError('القسم المصدر لا يحتوي على أي حصص')
        setCopying(false)
        return
      }

      let existingKeys = new Set<string>()
      if (copyMode === 'fill') {
        existingKeys = new Set(timetables.map(t => `${t.day_of_week}-${hhmm(t.start_time)}`))
      }

      const rows = sourceData
        .filter(t => !existingKeys.has(`${t.day_of_week}-${hhmm(t.start_time)}`))
        .map(t => ({
          establishment_id: establishmentId,
          class_id: classId,
          academic_year_id: yearId,
          day_of_week: t.day_of_week,
          start_time: t.start_time,
          end_time: t.end_time,
          subject_id: t.subject_id,
          teacher_id: t.teacher_id,
          room: t.room,
          type: t.type || 'lesson',
          notes: t.notes,
        }))

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('timetables').insert(rows)
        if (insErr) throw insErr
      }

      setSuccess(`✅ تم نسخ ${rows.length} حصة`)
      setTimeout(() => setSuccess(''), 3000)
      setShowCopyModal(false)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setCopying(false)
    }
  }

  // ============ COPY FROM PREVIOUS YEAR ============
  const handleCopyFromPrevYear = async () => {
    if (!establishmentId || !yearId) return
    const supabase = createClient()

    const { data: prevYears } = await supabase
      .from('academic_years')
      .select('id, name, start_date')
      .eq('establishment_id', establishmentId)
      .neq('id', yearId)
      .order('start_date', { ascending: false })
      .limit(1)

    if (!prevYears || prevYears.length === 0) {
      setError('لا توجد سنة دراسية سابقة')
      return
    }

    const prevYear = prevYears[0]
    if (!confirm(`نسخ جدول ${classInfo?.name} من سنة "${prevYear.name}"؟ سيتم مسح الجدول الحالي.`)) return

    try {
      await supabase.from('timetables').delete().eq('class_id', classId).eq('academic_year_id', yearId)

      const { data: prevData } = await supabase
        .from('timetables')
        .select('*')
        .eq('class_id', classId)
        .eq('academic_year_id', prevYear.id)

      if (!prevData || prevData.length === 0) {
        setError(`السنة "${prevYear.name}" لا تحتوي على جدول لهذا القسم`)
        return
      }

      const rows = prevData.map(t => ({
        establishment_id: establishmentId,
        class_id: classId,
        academic_year_id: yearId,
        day_of_week: t.day_of_week,
        start_time: t.start_time,
        end_time: t.end_time,
        subject_id: t.subject_id,
        teacher_id: t.teacher_id,
        room: t.room,
        type: t.type || 'lesson',
        notes: t.notes,
      }))

      const { error } = await supabase.from('timetables').insert(rows)
      if (error) throw error

      setSuccess(`✅ تم النسخ من "${prevYear.name}" (${rows.length} حصة)`)
      setTimeout(() => setSuccess(''), 3000)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    }
  }

  // ============ DUPLICATE DAY ============
  const openDupModal = (sourceDay: number) => {
    setDupSourceDay(sourceDay)
    setDupTargetDays([])
    setShowDupModal(true)
  }

  const handleDuplicateDay = async () => {
    if (!establishmentId || !yearId || dupTargetDays.length === 0) return
    setDuplicating(true)
    setError('')
    const supabase = createClient()

    try {
      const sourceTt = timetables.filter(t => t.day_of_week === dupSourceDay)
      if (sourceTt.length === 0) {
        setError('اليوم المصدر فارغ')
        setDuplicating(false)
        return
      }

      for (const targetDay of dupTargetDays) {
        const targetKeys = new Set(
          timetables.filter(t => t.day_of_week === targetDay).map(t => hhmm(t.start_time))
        )
        const willConflict = sourceTt.some(t => targetKeys.has(hhmm(t.start_time)))
        if (willConflict) {
          if (!confirm(`اليوم ${DAYS.find(d => d.value === targetDay)?.label} فيه حصص موجودة. نستبدلها؟`)) {
            setDuplicating(false)
            return
          }
          await supabase.from('timetables').delete()
            .eq('class_id', classId)
            .eq('academic_year_id', yearId)
            .eq('day_of_week', targetDay)
        }
      }

      const rows: any[] = []
      for (const targetDay of dupTargetDays) {
        sourceTt.forEach(t => {
          rows.push({
            establishment_id: establishmentId,
            class_id: classId,
            academic_year_id: yearId,
            day_of_week: targetDay,
            start_time: t.start_time,
            end_time: t.end_time,
            subject_id: t.subject_id,
            teacher_id: t.teacher_id,
            room: t.room,
            type: t.type || 'lesson',
            notes: t.notes,
          })
        })
      }

      const { error } = await supabase.from('timetables').insert(rows)
      if (error) throw error

      setSuccess(`✅ تم نسخ ${rows.length} حصة`)
      setTimeout(() => setSuccess(''), 3000)
      setShowDupModal(false)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setDuplicating(false)
    }
  }

  // ============ AUTO GENERATE ============
  const openGenModal = () => {
    const cfg: Record<string, GenSubjectCfg> = {}
    availableSubjectsForLevel.forEach(s => {
      const linked = teacherSubjects.filter(
        ts => ts.subject_id === s.id && (ts.level_id === null || ts.level_id === classInfo?.level_id)
      )
      const totalHours = linked.reduce((sum, t) => sum + Number(t.weekly_hours || 0), 0)
      cfg[s.id] = {
        hours: totalHours || 2,
        teacherId: linked[0]?.teacher_id || '',
        preferredDays: [],
      }
    })
    setGenConfig(cfg)

    const prefs: Record<string, TeacherPref> = {}
    staff.forEach(s => { prefs[s.id] = 'any' })
    setTeacherPrefs(prefs)

    setGenMode('fill')
    setGenResult(null)
    setShowGenModal(true)
  }

  const handleAutoGenerate = async () => {
    if (!establishmentId || !yearId || !classInfo) return
    setGenerating(true)
    setError('')
    setGenResult(null)

    const supabase = createClient()

    try {
      if (genMode === 'clear') {
        const { error: delErr } = await supabase
          .from('timetables')
          .delete()
          .eq('class_id', classId)
          .eq('academic_year_id', yearId)
        if (delErr) throw delErr
      }

      const existing: Timetable[] = genMode === 'fill' ? timetables : []

      const lessons: { subjectId: string; teacherId: string }[] = []
      Object.entries(genConfig).forEach(([sid, cfg]) => {
        if (!cfg.teacherId) return
        for (let i = 0; i < cfg.hours; i++) {
          lessons.push({ subjectId: sid, teacherId: cfg.teacherId })
        }
      })

      if (lessons.length === 0) {
        setError('لا توجد حصص لتخطيطها. حدد أستاذاً لكل مادة و عدد الساعات.')
        setGenerating(false)
        return
      }

      const { data: otherTt } = await supabase
        .from('timetables')
        .select('day_of_week, start_time, end_time, teacher_id')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', yearId)
        .neq('class_id', classId)

      const classOccupied = new Set<string>()
      existing.forEach(t => classOccupied.add(`${t.day_of_week}-${hhmm(t.start_time)}`))

      const teacherBusy = new Set<string>()
      ;(otherTt || []).forEach(t => {
        if (t.teacher_id) teacherBusy.add(`${t.teacher_id}-${t.day_of_week}-${hhmm(t.start_time)}`)
      })

      const enabledDays = DAYS.filter(d => daysConfig[String(d.value)]?.enabled)
      const lessonSlots = slots.filter(s => s.type === 'lesson')
      const availableSlots: { day: number; slotIndex: number; startTime: string; endTime: string }[] = []
      enabledDays.forEach(d => {
        lessonSlots.forEach(s => {
          if (!classOccupied.has(`${d.value}-${s.start}`)) {
            availableSlots.push({ day: d.value, slotIndex: s.index, startTime: s.start, endTime: s.end })
          }
        })
      })

      const placed: { day: number; startTime: string; endTime: string; subjectId: string; teacherId: string }[] = []
      const dayLessonCount: Record<number, number> = {}
      const daySubjectCount: Record<string, number> = {}

      for (const lesson of lessons) {
        const cfg = genConfig[lesson.subjectId]
        const candidates = availableSlots.filter(slot => {
          if (classOccupied.has(`${slot.day}-${slot.startTime}`)) return false
          if (teacherBusy.has(`${lesson.teacherId}-${slot.day}-${slot.startTime}`)) return false
          return true
        })

        if (candidates.length === 0) continue

        const scored = candidates.map(slot => {
          let score = 100

          if (genRespectSubjectDays && cfg.preferredDays.length > 0) {
            if (!cfg.preferredDays.includes(slot.day)) score -= 200
            else score += 50
          }

          if (genRespectTeacherPref) {
            const pref = teacherPrefs[lesson.teacherId] || 'any'
            const hour = parseInt(slot.startTime.split(':')[0])
            const isMorning = hour < 12
            if (pref === 'morning') score += isMorning ? 30 : -30
            if (pref === 'afternoon') score += isMorning ? -30 : 30
          }

          if (genNoConsecutive) {
            const prevSlot = lessonSlots.find(s => s.index === slot.slotIndex - 1)
            const nextSlot = lessonSlots.find(s => s.index === slot.slotIndex + 1)
            const prevPlaced = placed.find(p => p.day === slot.day && p.startTime === prevSlot?.start)
            const nextPlaced = placed.find(p => p.day === slot.day && p.startTime === nextSlot?.start)
            if (prevPlaced?.subjectId === lesson.subjectId) score -= 100
            if (nextPlaced?.subjectId === lesson.subjectId) score -= 100
          }

          if (genSpreadDays) {
            const countToday = daySubjectCount[`${slot.day}-${lesson.subjectId}`] || 0
            score -= countToday * 40
          }

          if (genBalanceDaily) {
            const dayCount = dayLessonCount[slot.day] || 0
            score -= dayCount * 8
          }

          score -= slot.slotIndex * 0.5

          return { slot, score }
        })

        scored.sort((a, b) => b.score - a.score)
        const best = scored[0]

        if (best.score < 0) continue

        placed.push({
          day: best.slot.day,
          startTime: best.slot.startTime,
          endTime: best.slot.endTime,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
        })
        classOccupied.add(`${best.slot.day}-${best.slot.startTime}`)
        teacherBusy.add(`${lesson.teacherId}-${best.slot.day}-${best.slot.startTime}`)
        dayLessonCount[best.slot.day] = (dayLessonCount[best.slot.day] || 0) + 1
        daySubjectCount[`${best.slot.day}-${lesson.subjectId}`] = (daySubjectCount[`${best.slot.day}-${lesson.subjectId}`] || 0) + 1
      }

      if (placed.length > 0) {
        const rows = placed.map(p => ({
          establishment_id: establishmentId,
          class_id: classId,
          academic_year_id: yearId,
          day_of_week: p.day,
          start_time: p.startTime + ':00',
          end_time: p.endTime + ':00',
          subject_id: p.subjectId,
          teacher_id: p.teacherId,
          type: 'lesson',
        }))
        const { error: insErr } = await supabase.from('timetables').insert(rows)
        if (insErr) throw insErr
      }

      const failed = lessons.length - placed.length
      setGenResult({ placed: placed.length, failed })
      setSuccess(`✅ تم تخطيط ${placed.length} حصة${failed > 0 ? ` (تعذّر تخطيط ${failed})` : ''}`)
      setTimeout(() => setSuccess(''), 5000)
      loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setGenerating(false)
    }
  }

  // ============ RENDER ============
  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!canManage) return <div className="p-6">ليس لديك صلاحية</div>
  const enabledDays = DAYS.filter(d => daysConfig[String(d.value)]?.enabled)
  const lessonSlots = slots.filter(s => s.type === 'lesson')

  const totalSlots = enabledDays.length * lessonSlots.length
  const filledSlots = timetables.length
  const fillPercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0

  const genTotalHours = Object.values(genConfig).reduce((s, c) => s + (Number(c.hours) || 0), 0)

  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/timetable" className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
              جدول {classInfo.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3">
              {classInfo.level_name && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {classInfo.level_name}
                </span>
              )}
              {yearName && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {yearName}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openGenModal}
            disabled={!yearId || availableSubjectsForLevel.length === 0}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-bold text-sm shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> توليد تلقائي
          </button>
          <button
            onClick={() => setShowCopyModal(true)}
            disabled={!yearId || allClasses.length <= 1}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium text-sm"
          >
            <Copy className="h-4 w-4" /> نسخ من قسم
          </button>
          <button
            onClick={handleCopyFromPrevYear}
            disabled={!yearId}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium text-sm"
          >
            <History className="h-4 w-4" /> نسخ من سنة سابقة
          </button>
          <Link
            href="/dashboard/timetable/room"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <DoorOpen className="h-4 w-4" /> القاعات
          </Link>
          <button
            onClick={handleClearAll}
            disabled={!yearId || timetables.length === 0}
            className="inline-flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium text-sm"
          >
            <Eraser className="h-4 w-4" /> مسح الكل
          </button>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
          >
            <FileDown className="h-4 w-4" />
            {downloadingPDF ? 'جارٍ التوليد...' : 'PDF'}
          </button>
        </div>
      </header>

      {error && !showModal && !showGenModal && !showCopyModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg print:hidden">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg print:hidden">{success}</div>
      )}

      {/* DnD hint */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 print:hidden">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>💡 <strong>نصيحة:</strong> حيّد الحصة بالماوس و حطها ف خلية أخرى — النقل ولا التبديل كيتدار تلقائياً مع كشف التعارضات.</span>
      </div>

      {!yearId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>ما كايناش سنة دراسية حالية. اذهب لـ <Link href="/dashboard/academic-years" className="underline font-medium">السنوات الدراسية</Link> و فعّل وحدة.</div>
        </div>
      )}
      {/* ========== REMAINING LESSONS TRAY ========== */}
{remainingLessons.length > 0 && yearId && (
  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-dashed border-purple-200 p-4 print:hidden">
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
        <GripVertical className="h-4 w-4 text-purple-600" />
        الحصص المتبقية — اسحب وأفلت في الجدول
      </h3>
      <span className="text-xs font-bold text-purple-700 bg-white px-2.5 py-1 rounded-lg">
        {remainingLessons.reduce((s, r) => s + r.remaining, 0)} حصة متبقية
      </span>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-2">
      {remainingLessons.map(r => {
        const teacher = staff.find(s => s.id === r.primaryTeacherId)
        const canDrag = !!r.primaryTeacherId
        const isDraggingThis = draggedSubject?.subjectId === r.subject.id

        return (
          <div
            key={r.subject.id}
            draggable={canDrag}
            onDragStart={(e) => {
              if (!canDrag) {
                e.preventDefault()
                return
              }
              setDraggedSubject({
                subjectId: r.subject.id,
                teacherId: r.primaryTeacherId,
              })
              e.dataTransfer.effectAllowed = 'copy'
              e.dataTransfer.setData('text/plain', r.subject.id)
            }}
            onDragEnd={handleDragEnd}
            className={`flex-shrink-0 rounded-xl px-3 py-2.5 min-w-[150px] transition ${
              canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'
            } ${isDraggingThis ? 'opacity-40 scale-95' : ''}`}
            style={{
              backgroundColor: r.subject.color + '20',
              borderRight: `4px solid ${r.subject.color}`,
            }}
            title={canDrag ? 'اسحبني و حطني في خلية فارغة' : 'لا يوجد أستاذ مرتبط'}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[13px] leading-tight" style={{ color: r.subject.color }}>
                {r.subject.name}
              </span>
              <span
                className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: r.subject.color }}
              >
                {r.remaining}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1 truncate">
              <Users className="h-2.5 w-2.5 opacity-60 flex-shrink-0" />
              <span className="truncate">{teacher?.full_name || 'بدون أستاذ'}</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              {r.placedHours} / {r.targetHours} ساعة
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}
      {/* Stats + Teachers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-90">تقدّم الجدول</span>
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{filledSlots} / {totalSlots}</div>
          <div className="text-xs opacity-80 mb-3">حصة مبرمجة</div>
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${fillPercent}%` }} />
          </div>
          <div className="text-xs mt-2 opacity-90">{fillPercent}% مكتمل</div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            ساعات الأساتذة في هاد القسم
          </h3>
          {teacherStats.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">لا يوجد أساتذة مرتبطون بهذا القسم بعد</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teacherStats.map(s => {
                const hasTarget = s.targetHours > 0
                const isOver = s.remaining < 0
                const isDone = hasTarget && s.remaining === 0
                return (
                  <div key={s.teacherId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                        {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ف هاد القسم: <strong className="text-slate-700">{s.thisClassHours} س</strong>
                        {hasTarget && (
                          <>
                            {' · '}الهدف: <strong className="text-slate-700">{s.targetHours} س</strong>
                            {' · '}
                            <span className={isOver ? 'text-red-600 font-bold' : isDone ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                              {isOver ? `+${Math.abs(s.remaining)} س زايد` : isDone ? 'مكتمل' : `${s.remaining} س باقية`}
                            </span>
                          </>
                        )}
                        {!hasTarget && <span className="text-slate-400"> · لا يوجد هدف محدد</span>}
                      </p>
                    </div>
                    {hasTarget && (
                      <div className="flex-shrink-0 w-16">
                        <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all ${isOver ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, (s.globalAssigned / s.targetHours) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {enabledDays.length > 0 && lessonSlots.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 bg-slate-100 border-b-2 border-slate-200 p-3 text-xs font-bold text-slate-600 w-24 text-center">
                    التوقيت
                  </th>
                  {enabledDays.map(d => (
                    <th key={d.value} className="bg-slate-100 border-b-2 border-slate-200 p-2 min-w-[150px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-bold text-slate-700">{d.label}</span>
                        <button
                          onClick={() => openDupModal(d.value)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition print:hidden"
                          title={`نسخ ${d.label} ليوم آخر`}
                        >
                          <CopyPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                        {slot.inlineBreaks && slot.inlineBreaks.length > 0 && (
                          <div className="text-[9px] text-amber-600 mt-1 leading-tight">
                            ☕ {slot.inlineBreaks.map(b => b.name).join(', ')}
                          </div>
                        )}
                      </td>
                      {enabledDays.map(d => {
                        const tt = findTimetable(d.value, slot.start)
                        const cellKey = `${d.value}-${slot.start}`
                        const isDragTarget = dragOverKey === cellKey && draggedTt

                        if (!tt) {
                          return (
                            <td
                              key={cellKey}
                              className={`border-b border-slate-100 p-1.5 align-middle transition ${
                                isDragTarget ? 'bg-emerald-100 ring-2 ring-emerald-400 ring-inset' : ''
                              }`}
                              onDragOver={(e) => handleDragOver(e, d.value, slot)}
                              onDrop={(e) => handleDrop(e, d.value, slot)}
                            >
                              <button
                                onClick={() => openCreate(d.value, slot)}
                                className="w-full min-h-[80px] rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-300 hover:text-indigo-500 transition flex items-center justify-center group print:hidden"
                              >
                                <Plus className="h-5 w-5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition" />
                              </button>
                              <div className="hidden print:block min-h-[80px] rounded-xl border border-slate-200" />
                            </td>
                          )
                        }

                        const subject = getSubject(tt.subject_id)
                        const teacher = getTeacher(tt.teacher_id)
                        const color = subject?.color || '#4F46E5'
                        const isDragging = draggedTt?.id === tt.id

                        return (
                          <td
                            key={cellKey}
                            className={`border-b border-slate-100 p-1.5 align-middle transition ${
                              isDragTarget ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset' : ''
                            }`}
                            onDragOver={(e) => handleDragOver(e, d.value, slot)}
                            onDrop={(e) => handleDrop(e, d.value, slot)}
                          >
                            <button
                              onClick={() => openEdit(tt)}
                              draggable
                              onDragStart={(e) => handleDragStart(e, tt)}
                              onDragEnd={handleDragEnd}
                              className={`w-full min-h-[80px] rounded-xl p-2.5 text-right transition relative group overflow-hidden cursor-grab active:cursor-grabbing ${
                                isDragging ? 'opacity-40 scale-95' : 'hover:shadow-md hover:-translate-y-0.5'
                              }`}
                              style={{ backgroundColor: color + '12', borderRight: `4px solid ${color}` }}
                            >
                              <div className="flex flex-col gap-1.5 h-full">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-[13px] leading-tight" style={{ color }}>
                                    {subject?.name || '—'}
                                  </span>
                                  <span
                                    onClick={(e) => { e.stopPropagation(); handleDelete(tt.id) }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition print:hidden flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </span>
                                </div>
                                {teacher && (
                                  <div className="text-[11px] text-slate-700 flex items-center gap-1 truncate font-medium">
                                    <Users className="h-3 w-3 opacity-60" />
                                    <span className="truncate">{teacher.full_name}</span>
                                  </div>
                                )}
                                {tt.room && (
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                    <MapPin className="h-2.5 w-2.5 opacity-60" />
                                    <span className="truncate">{tt.room}</span>
                                  </div>
                                )}
                              </div>
                            </button>
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

      {/* ========== MODAL ADD/EDIT ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">{editing ? 'تعديل الحصة' : 'إضافة حصة'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اليوم</label>
                <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  {enabledDays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                  <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                  <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المادة <span className="text-red-500">*</span></label>
                <select value={formSubject} onChange={(e) => { setFormSubject(e.target.value); setFormTeacher('') }} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="">— اختر المادة —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الأستاذ <span className="text-red-500">*</span></label>
                <select value={formTeacher} onChange={(e) => setFormTeacher(e.target.value)} disabled={!formSubject} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="">— اختر الأستاذ —</option>
                  {teachersForSubject(formSubject).map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                {formSubject && teachersForSubject(formSubject).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ لا يوجد أساتذة مرتبطون بهاد المادة.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القاعة (اختياري)</label>
                <input type="text" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="مثال: قاعة 1، A12..." className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {conflicts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm"><AlertTriangle className="h-4 w-4" /> تعارض مكتشف:</div>
                  {conflicts.map((c, i) => <p key={i} className="text-xs text-red-700">• {c}</p>)}
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button onClick={handleSave} disabled={saving} className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                  <Save className="h-4 w-4" />{saving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
                <button onClick={() => setShowModal(false)} className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL AUTO-GENERATE ========== */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-3 border-b border-slate-100 z-10">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" /> توليد تلقائي للجدول
              </h3>
              <button onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الوضع:</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${genMode === 'fill' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" checked={genMode === 'fill'} onChange={() => setGenMode('fill')} className="mt-1" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">عمّر الخلايا الفارغة فقط</div>
                      <div className="text-xs text-slate-500 mt-0.5">يبقى الحصص الموجودة و يعمّر الفراغات</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${genMode === 'clear' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" checked={genMode === 'clear'} onChange={() => setGenMode('clear')} className="mt-1" />
                    <div>
                      <div className="text-sm font-bold text-slate-800">مسح الكل و نبدا من جديد</div>
                      <div className="text-xs text-red-600 mt-0.5">⚠️ سيتم حذف كل الحصص الحالية</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">خيارات التوزيع:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                    <input type="checkbox" checked={genSpreadDays} onChange={(e) => setGenSpreadDays(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">📅 توزيع المواد على الأيام</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                    <input type="checkbox" checked={genNoConsecutive} onChange={(e) => setGenNoConsecutive(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">🚫 تجنّب نفس المادة مرتين متتاليتين</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                    <input type="checkbox" checked={genBalanceDaily} onChange={(e) => setGenBalanceDaily(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">⚖️ توازن الحصص اليومية</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                    <input type="checkbox" checked={genRespectSubjectDays} onChange={(e) => setGenRespectSubjectDays(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">🎯 احترم الأيام المفضلة للمواد</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                    <input type="checkbox" checked={genRespectTeacherPref} onChange={(e) => setGenRespectTeacherPref(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">☀️ احترم تفضيلات الأساتذة (صباح/مساء)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المواد و الأساتذة:</label>
                {availableSubjectsForLevel.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
                    ⚠️ لا توجد مواد مرتبطة بمستوى {classInfo.level_name}. اذهب لـ{' '}
                    <Link href="/dashboard/teacher-subjects" className="underline font-medium">صفحة الأساتذة والمواد</Link>{' '}
                    و اربط أولاً.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">المادة</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-slate-600 w-24">عدد الحصص</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">الأستاذ</th>
                          {genRespectSubjectDays && (
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">أيام مفضلة</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableSubjectsForLevel.map(s => {
                          const cfg = genConfig[s.id]
                          if (!cfg) return null
                          const teachers = teachersForSubject(s.id)
                          return (
                            <tr key={s.id}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                                  <span className="text-sm font-medium text-slate-800">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={cfg.hours}
                                  onChange={(e) => setGenConfig(prev => ({ ...prev, [s.id]: { ...prev[s.id], hours: Number(e.target.value) || 0 } }))}
                                  className="w-16 h-9 px-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center text-sm"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={cfg.teacherId}
                                  onChange={(e) => setGenConfig(prev => ({ ...prev, [s.id]: { ...prev[s.id], teacherId: e.target.value } }))}
                                  className="w-full h-9 px-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                  <option value="">— اختر الأستاذ —</option>
                                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                </select>
                              </td>
                              {genRespectSubjectDays && (
                                <td className="px-3 py-2">
                                  <div className="flex gap-1 flex-wrap">
                                    {DAYS.filter(d => daysConfig[String(d.value)]?.enabled).map(d => {
                                      const active = cfg.preferredDays.includes(d.value)
                                      return (
                                        <button
                                          key={d.value}
                                          type="button"
                                          onClick={() => {
                                            setGenConfig(prev => {
                                              const cur = prev[s.id].preferredDays
                                              const next = active ? cur.filter(x => x !== d.value) : [...cur, d.value]
                                              return { ...prev, [s.id]: { ...prev[s.id], preferredDays: next } }
                                            })
                                          }}
                                          className={`w-7 h-7 rounded-lg text-[10px] font-bold transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                          {d.short}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {genRespectTeacherPref && staff.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تفضيلات الأساتذة:</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {staff.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                        <span className="text-sm font-medium text-slate-700 flex-1 truncate">{t.full_name}</span>
                        <select
                          value={teacherPrefs[t.id] || 'any'}
                          onChange={(e) => setTeacherPrefs(prev => ({ ...prev, [t.id]: e.target.value as TeacherPref }))}
                          className="h-8 px-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="any">أي وقت</option>
                          <option value="morning">صباح فقط</option>
                          <option value="afternoon">مساء فقط</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <p>📊 مجموع الحصص المطلوبة: <strong>{genTotalHours}</strong></p>
                    <p className="mt-0.5">🎯 الخلايا المتاحة: <strong>{enabledDays.length * lessonSlots.length}</strong></p>
                    <p className="mt-2 text-xs text-blue-700">
                      <strong>ملاحظات:</strong> منع تعارض الأستاذ مفعّل تلقائياً. إلا تعذّر تخطيط حصة، كتّلغى.
                    </p>
                  </div>
                </div>
              </div>

              {genResult && (
                <div className={`border rounded-xl p-3 text-sm ${genResult.failed === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  {genResult.failed === 0 ? (
                    <>✅ تم تخطيط كل الحصص ({genResult.placed}) بنجاح.</>
                  ) : (
                    <>
                      ⚠️ تم تخطيط <strong>{genResult.placed}</strong> حصة. تعذّر تخطيط <strong>{genResult.failed}</strong> بسبب تعارضات أو نقص خلايا.
                    </>
                  )}
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  onClick={handleAutoGenerate}
                  disabled={generating || genTotalHours === 0}
                  className="h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold"
                >
                  <Sparkles className="h-4 w-4" />{generating ? 'جارٍ التوليد...' : 'ولّد الجدول'}
                </button>
                <button onClick={() => setShowGenModal(false)} className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL COPY FROM CLASS ========== */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Copy className="h-5 w-5 text-indigo-600" /> نسخ من قسم آخر
              </h3>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القسم المصدر</label>
                <select
                  value={copySourceClassId}
                  onChange={(e) => setCopySourceClassId(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر القسم —</option>
                  {allClasses.filter(c => c.id !== classId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوضع:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" checked={copyMode === 'clear'} onChange={() => setCopyMode('clear')} />
                    <span className="text-sm">مسح الجدول الحالي و النسخ</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input type="radio" checked={copyMode === 'fill'} onChange={() => setCopyMode('fill')} />
                    <span className="text-sm">نسخ فقط الخلايا الفارغة</span>
                  </label>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleCopyFromClass}
                  disabled={copying || !copySourceClassId}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />{copying ? 'جارٍ النسخ...' : 'نسخ'}
                </button>
                <button onClick={() => setShowCopyModal(false)} className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DUPLICATE DAY ========== */}
      {showDupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CopyPlus className="h-5 w-5 text-indigo-600" /> نسخ {DAYS.find(d => d.value === dupSourceDay)?.label}
              </h3>
              <button onClick={() => setShowDupModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اختر الأيام الهدف:</label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.filter(d => daysConfig[String(d.value)]?.enabled && d.value !== dupSourceDay).map(d => {
                    const active = dupTargetDays.includes(d.value)
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          setDupTargetDays(prev => active ? prev.filter(x => x !== d.value) : [...prev, d.value])
                        }}
                        className={`h-11 rounded-lg text-sm font-bold transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {dupTargetDays.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
                  ⚠️ إلا كان في اليوم الهدف حصص، غادي يستبدلو.
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleDuplicateDay}
                  disabled={duplicating || dupTargetDays.length === 0}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <CopyPlus className="h-4 w-4" />{duplicating ? 'جارٍ...' : `نسخ إلى ${dupTargetDays.length}`}
                </button>
                <button onClick={() => setShowDupModal(false)} className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}