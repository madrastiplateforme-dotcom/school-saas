'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import { openWhatsApp } from '@/lib/whatsapp'
import { toast } from 'sonner'
import {
  Calendar, Plus, X, Save, RefreshCw, Users, Clock, MapPin,
  Edit, Trash2, UserCheck, BookOpen, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Info, MessageCircle,
} from 'lucide-react'

type Slot = {
  id: string
  start_time: string
  end_time: string
  parent_user_id: string | null
  student_id: string | null
  booked_at: string | null
  notes: string | null
  parent_name?: string
  student_name?: string
}

type Meeting = {
  id: string
  title: string
  description: string | null
  meeting_date: string
  location: string | null
  teacher_id: string | null
  class_id: string | null
  status: 'open' | 'closed' | 'cancelled'
  created_at: string
  teacher_name?: string | null
  class_name?: string | null
  slots: Slot[]
}

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const dayName = (d: string) => {
  try { return AR_DAYS[new Date(d).getDay()] } catch { return '' }
}

export default function MeetingsPage() {
  const establishmentId = useEstablishmentId()
  const { yearId: contextYearId, year: contextYear } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [parentPhones, setParentPhones] = useState<Map<string, string>>(new Map())
  const [schoolName, setSchoolName] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formLocation, setFormLocation] = useState('')
  const [formTeacher, setFormTeacher] = useState('')
  const [formClass, setFormClass] = useState('')
  const [modalError, setModalError] = useState('')

  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [slotsMeetingId, setSlotsMeetingId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:15')
  const [duration, setDuration] = useState(15)
  const [count, setCount] = useState(8)

  useEffect(() => {
    if (establishmentId && contextYearId) {
      loadData()
      loadSchoolName()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, contextYearId])

  const loadSchoolName = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('establishments')
      .select('name')
      .eq('id', establishmentId)
      .maybeSingle()
    if (data?.name) setSchoolName(data.name)
  }

  const loadData = async () => {
    if (!contextYearId) return
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('establishment_id', establishmentId)
        .eq('type', 'teacher')
        .order('full_name')
      setTeachers(staffData || [])

      // ✅ Classes dyal l'année active
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, levels(name)')
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', contextYearId)
        .order('name')
      setClasses(classData || [])

      const classIds = (classData || []).map((c: any) => c.id)

      // ✅ Meetings filtrés par plage de dates dyal l'année active
      let meetingsQuery = supabase
        .from('meetings')
        .select(`
          id, title, description, meeting_date, location,
          teacher_id, class_id, status, created_at,
          staff (full_name),
          classes (name, levels(name))
        `)
        .eq('establishment_id', establishmentId)

      // Filtrer par plage de dates dyal l'année active
      if (contextYear?.start_date) {
        meetingsQuery = meetingsQuery.gte('meeting_date', contextYear.start_date)
      }
      if (contextYear?.end_date) {
        meetingsQuery = meetingsQuery.lte('meeting_date', contextYear.end_date)
      }

      const { data: meetingsData, error: mErr } = await meetingsQuery
        .order('meeting_date', { ascending: false })

      if (mErr) throw mErr

      // Filtrer côté JS: meetings li 3ndhom class_id li machi dyal l'année active
      const filteredMeetings = (meetingsData || []).filter((m: any) => {
        if (!m.class_id) return true // meeting global → kayn
        return classIds.includes(m.class_id)
      })

      const meetingIds = filteredMeetings.map((m: any) => m.id)

      let slotsData: any[] = []
      if (meetingIds.length > 0) {
        const { data: slots } = await supabase
          .from('meeting_slots')
          .select('*')
          .in('meeting_id', meetingIds)
          .order('start_time')
        slotsData = slots || []
      }

      const parentIds = slotsData.map((s: any) => s.parent_user_id).filter(Boolean)
      const studentIds = slotsData.map((s: any) => s.student_id).filter(Boolean)

      const parentNames: Record<string, string> = {}
      const studentNames: Record<string, string> = {}

      if (parentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', parentIds)
        ;(profiles || []).forEach((p: any) => {
          parentNames[p.user_id] = p.full_name || '—'
        })
      }

      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', studentIds)
        ;(students || []).forEach((s: any) => {
          studentNames[s.id] = `${s.first_name} ${s.last_name}`
        })
      }

      const phoneMap = new Map<string, string>()
      if (parentIds.length > 0) {
        const { data: familiesData } = await supabase
          .from('families')
          .select('parent_user_id, phone')
          .in('parent_user_id', parentIds)
        ;(familiesData || []).forEach((f: any) => {
          if (f.parent_user_id && f.phone) {
            phoneMap.set(f.parent_user_id, f.phone)
          }
        })
      }
      setParentPhones(phoneMap)

      const list: Meeting[] = filteredMeetings.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        meeting_date: m.meeting_date,
        location: m.location,
        teacher_id: m.teacher_id,
        class_id: m.class_id,
        status: m.status,
        created_at: m.created_at,
        teacher_name: m.staff?.full_name || null,
        class_name: m.classes
          ? `${m.classes.levels?.name ? m.classes.levels.name + ' - ' : ''}${m.classes.name}`
          : null,
        slots: slotsData
          .filter((s: any) => s.meeting_id === m.id)
          .map((s: any) => ({
            id: s.id,
            start_time: s.start_time,
            end_time: s.end_time,
            parent_user_id: s.parent_user_id,
            student_id: s.student_id,
            booked_at: s.booked_at,
            notes: s.notes,
            parent_name: s.parent_user_id ? parentNames[s.parent_user_id] : undefined,
            student_name: s.student_id ? studentNames[s.student_id] : undefined,
          })),
      }))

      setMeetings(list)
    } catch (e: any) {
      console.error('[meetings]', e?.message || e)
      toast.error(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsApp = (slot: Slot, meeting: Meeting) => {
    if (!slot.parent_user_id) {
      toast.error('هذا الحجز ما عندوش ولي أمر')
      return
    }

    const phone = parentPhones.get(slot.parent_user_id)
    if (!phone) {
      toast.error('لا يوجد رقم هاتف لهذا الولي')
      return
    }

    const timeStr = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`

    const lines = [
      `السلام عليكم${slot.parent_name ? ' ' + slot.parent_name : ''}،`,
      ``,
      `نؤكد لكم موعد اللقاء:`,
      ``,
      `📌 *الموضوع:* ${meeting.title}`,
      `📅 *التاريخ:* ${dayName(meeting.meeting_date)} ${formatDate(meeting.meeting_date)}`,
      `⏰ *التوقيت:* ${timeStr}`,
    ]

    if (meeting.location) lines.push(`📍 *المكان:* ${meeting.location}`)
    if (meeting.teacher_name) lines.push(`👤 *مع:* ${meeting.teacher_name}`)
    if (slot.student_name) lines.push(`🎓 *التلميذ:* ${slot.student_name}`)

    lines.push(``, `نرجو الحضور في الوقت المحدد. شكراً لكم.`, ``, schoolName ? `— ${schoolName}` : '')

    const message = lines.filter((l) => l !== undefined).join('\n').trim()

    const ok = openWhatsApp(phone, message)
    if (!ok) toast.error('رقم الهاتف غير صحيح')
  }

  const openCreate = () => {
    setEditingId(null)
    setFormTitle('')
    setFormDesc('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormLocation('')
    setFormTeacher('')
    setFormClass('')
    setModalError('')
    setShowModal(true)
  }

  const openEdit = (m: Meeting) => {
    setEditingId(m.id)
    setFormTitle(m.title)
    setFormDesc(m.description || '')
    setFormDate(m.meeting_date)
    setFormLocation(m.location || '')
    setFormTeacher(m.teacher_id || '')
    setFormClass(m.class_id || '')
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) {
      setModalError('العنوان والتاريخ مطلوبان')
      return
    }
    setSaving(true)
    setModalError('')
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload: any = {
        establishment_id: establishmentId,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        meeting_date: formDate,
        location: formLocation.trim() || null,
        teacher_id: formTeacher || null,
        class_id: formClass || null,
        status: 'open',
        created_by: user?.id || null,
      }

      // ✅ Si la table meetings a academic_year_id, on le remplit
      // Sinon on laisse tomber (fallback: filtrage par date)
      if (contextYearId) {
        payload.academic_year_id = contextYearId
      }

      if (editingId) {
        const { error: upErr } = await supabase
          .from('meetings')
          .update(payload)
          .eq('id', editingId)
        if (upErr) throw upErr
        toast.success('تم تحديث اللقاء')
      } else {
        const { error: insErr } = await supabase
          .from('meetings')
          .insert(payload)
        if (insErr) throw insErr
        toast.success('تم إنشاء اللقاء')
      }

      setShowModal(false)
      await loadData()
    } catch (e: any) {
      console.error('[meetings-save]', e?.message || e)
      setModalError(e?.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هاد اللقاء؟ (كيحذف حتى الحجوزات)')) return
    const supabase = createClient()
    const { error: delErr } = await supabase.from('meetings').delete().eq('id', id)
    if (delErr) {
      console.error('[meetings-delete]', delErr?.message || delErr)
      toast.error(delErr.message)
    } else {
      toast.success('تم الحذف')
      await loadData()
    }
  }

  const handleToggleStatus = async (m: Meeting) => {
    const newStatus = m.status === 'open' ? 'closed' : 'open'
    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('meetings')
      .update({ status: newStatus })
      .eq('id', m.id)
    if (upErr) {
      console.error('[meetings-toggle]', upErr?.message || upErr)
      toast.error(upErr.message)
    } else {
      toast.success('تم التحديث')
      await loadData()
    }
  }

  const openSlotsModal = (meetingId: string) => {
    setSlotsMeetingId(meetingId)
    setStartTime('10:00')
    setEndTime('10:15')
    setDuration(15)
    setCount(8)
    setShowSlotsModal(true)
  }

  const handleAddSlots = async () => {
    if (!slotsMeetingId) return
    setSaving(true)
    const supabase = createClient()

    try {
      const [sh, sm] = startTime.split(':').map(Number)
      let current = sh * 60 + sm

      const slots = []
      for (let i = 0; i < count; i++) {
        const startMin = current
        const endMin = current + duration

        const fmt = (total: number) => {
          const h = Math.floor(total / 60)
          const m = total % 60
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
        }

        slots.push({
          meeting_id: slotsMeetingId,
          start_time: fmt(startMin),
          end_time: fmt(endMin),
        })

        current = endMin
      }

      const { error: insErr } = await supabase
        .from('meeting_slots')
        .insert(slots)

      if (insErr) throw insErr

      toast.success(`تم إضافة ${count} فترة`)
      setShowSlotsModal(false)
      await loadData()
    } catch (e: any) {
      console.error('[meetings-slots]', e?.message || e)
      toast.error(e?.message || 'فشل الإضافة')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('حذف هاد الفترة؟')) return
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('meeting_slots')
      .delete()
      .eq('id', slotId)
    if (delErr) {
      console.error('[slot-delete]', delErr?.message || delErr)
      toast.error(delErr.message)
    } else await loadData()
  }

  const handleCancelBooking = async (slot: Slot) => {
    if (!confirm(`إلغاء حجز ${slot.parent_name}؟`)) return
    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('meeting_slots')
      .update({ parent_user_id: null, student_id: null, booked_at: null, notes: null })
      .eq('id', slot.id)
    if (upErr) {
      console.error('[slot-cancel]', upErr?.message || upErr)
      toast.error(upErr.message)
    } else {
      toast.success('تم إلغاء الحجز')
      await loadData()
    }
  }

  const stats = useMemo(() => {
    const total = meetings.length
    const open = meetings.filter((m) => m.status === 'open').length
    const totalSlots = meetings.reduce((s, m) => s + m.slots.length, 0)
    const bookedSlots = meetings.reduce(
      (s, m) => s + m.slots.filter((x) => x.parent_user_id).length,
      0,
    )
    return { total, open, totalSlots, bookedSlots }
  }, [meetings])

  if (loading && meetings.length === 0) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            لقاءات الأولياء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {contextYear?.name && `${contextYear.name} — `}
            تنظيم مواعيد اللقاءات مع الأساتذة
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> لقاء جديد
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">اللقاءات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">مفتوحة</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.open}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">الفترات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalSlots}</div>
        </div>
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">محجوزة</span>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{stats.bookedSlots}</div>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">ما كايناش لقاءات في هذه السنة</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus className="h-4 w-4" /> إنشاء أول لقاء
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const isExpanded = expandedId === m.id
            const bookedCount = m.slots.filter((s) => s.parent_user_id).length
            const totalSlots = m.slots.length
            const isPast = new Date(m.meeting_date) < new Date(new Date().toDateString())

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  m.status === 'closed' ? 'border-slate-200 opacity-75' : 'border-gray-100'
                }`}
              >
                <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          m.status === 'open'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.status === 'open' ? 'مفتوح' : 'مغلق'}
                      </span>
                      {isPast && (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          انتهى
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dayName(m.meeting_date)} {formatDate(m.meeting_date)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-base mb-1">
                      {m.title}
                    </h3>

                    {m.description && (
                      <p className="text-sm text-slate-600 mb-2">{m.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.location}
                        </span>
                      )}
                      {m.teacher_name && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {m.teacher_name}
                        </span>
                      )}
                      {m.class_name && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {m.class_name}
                        </span>
                      )}
                      {totalSlots > 0 && (
                        <span className="text-indigo-600 font-bold">
                          {bookedCount} / {totalSlots} محجوز
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openSlotsModal(m.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="إضافة فترات"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(m)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                      title={m.status === 'open' ? 'إغلاق' : 'فتح'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-slate-50/50 p-4">
                    {m.slots.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 mb-3">ما كايناش فترات</p>
                        <button
                          onClick={() => openSlotsModal(m.id)}
                          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-bold"
                        >
                          <Plus className="h-4 w-4" /> إضافة فترات
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {m.slots.map((s) => {
                          const booked = !!s.parent_user_id
                          const phone = s.parent_user_id ? parentPhones.get(s.parent_user_id) : undefined

                          return (
                            <div
                              key={s.id}
                              className={`p-3 rounded-lg border-2 transition ${
                                booked ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-sm font-bold text-slate-800" dir="ltr">
                                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                                </span>
                                <button
                                  onClick={() => handleDeleteSlot(s.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                  title="حذف"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {booked ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                    <UserCheck className="h-3 w-3" />
                                    {s.parent_name}
                                  </p>
                                  {s.student_name && (
                                    <p className="text-[10px] text-slate-600">
                                      التلميذ: {s.student_name}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={() => handleWhatsApp(s, m)}
                                      disabled={!phone}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition ${
                                        phone
                                          ? 'bg-[#25D366] text-white hover:bg-[#1da851] shadow-sm'
                                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      }`}
                                      title={phone ? `إرسال WhatsApp (${phone})` : 'لا يوجد رقم هاتف'}
                                    >
                                      <MessageCircle className="h-3 w-3" />
                                      WhatsApp
                                    </button>

                                    <button
                                      onClick={() => handleCancelBooking(s)}
                                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold"
                                    >
                                      إلغاء الحجز
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">متاح</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                {editingId ? 'تعديل اللقاء' : 'لقاء جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">العنوان *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: لقاء أولياء الفصل الأول"
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الوصف (اختياري)</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">التاريخ *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المكان</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: قاعة 3"
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الأستاذ(ة)</label>
                  <select
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— الكل —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">القسم</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— الكل —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.levels?.name ? `${c.levels.name} - ` : ''}
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {modalError}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end p-6 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlotsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                إضافة فترات
              </h3>
              <button
                onClick={() => setShowSlotsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وقت البداية</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مدة الفترة (دقيقة)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 15)}
                    min={5}
                    max={120}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">عدد الفترات</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 8)}
                  min={1}
                  max={50}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-900">
                <p className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  غادي يزيد <strong>{count}</strong> فترات، من{' '}
                  <strong dir="ltr">{startTime}</strong>، مدة كل واحدة{' '}
                  <strong>{duration}</strong> دقيقة.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end p-6 border-t border-slate-100">
              <button
                onClick={() => setShowSlotsModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddSlots}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'جارٍ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}