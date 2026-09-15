'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, RefreshCw, Calendar, Clock, MapPin, BookOpen, UserCheck,
  CheckCircle2, X, AlertCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react'

type Slot = {
  id: string
  start_time: string
  end_time: string
  parent_user_id: string | null
  student_id: string | null
  notes: string | null
  is_mine: boolean
  is_taken: boolean
}

type Meeting = {
  id: string
  title: string
  description: string | null
  meeting_date: string
  location: string | null
  status: 'open' | 'closed' | 'cancelled'
  teacher_name: string | null
  class_name: string | null
  slots: Slot[]
  my_booked_slot: Slot | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  class_id: string | null
  class_name: string | null
}

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const dayName = (d: string) => {
  try {
    return AR_DAYS[new Date(d).getDay()]
  } catch {
    return ''
  }
}

export default function ParentMeetingsPage() {
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Booking modal
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null)
  const [bookingMeeting, setBookingMeeting] = useState<Meeting | null>(null)
  const [selectedChild, setSelectedChild] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')

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
      setMyUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const estabId = profile?.establishment_id
      if (!estabId) {
        setError('لم يتم العثور على المؤسسة')
        setLoading(false)
        return
      }

      const { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!family) {
        setError('لم يتم العثور على ملف العائلة')
        setLoading(false)
        return
      }

      const { data: year } = await supabase
        .from('academic_years')
        .select('id')
        .eq('establishment_id', estabId)
        .eq('is_current', true)
        .maybeSingle()

      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('family_id', family.id)
        .order('first_name')

      if (!students || students.length === 0) {
        setChildren([])
        setMeetings([])
        setLoading(false)
        return
      }

      const childIds = students.map((s) => s.id)

      // Enrollments → class
      let enrollmentsData: any[] = []
      if (year?.id) {
        const { data } = await supabase
          .from('enrollments')
          .select('student_id, class_id, classes(name, levels(name))')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)
        enrollmentsData = data || []
      }

      const childrenList: Child[] = students.map((st) => {
        const enr = enrollmentsData.find((e) => e.student_id === st.id)
        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_id: enr?.class_id || null,
          class_name: enr?.classes?.name || null,
        }
      })
      setChildren(childrenList)

      const classIds = Array.from(
        new Set(childrenList.map((c) => c.class_id).filter(Boolean)),
      ) as string[]

      if (classIds.length === 0) {
        setMeetings([])
        setLoading(false)
        return
      }

      // Meetings de ces classes (ou sans classe = tous)
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select(`
          id, title, description, meeting_date, location, status,
          class_id,
          staff (full_name),
          classes (name, levels(name))
        `)
        .eq('establishment_id', estabId)
        .in('status', ['open', 'closed'])
        .order('meeting_date', { ascending: true })

      const filtered = (meetingsData || []).filter((m: any) => {
        // Inclure si: pas de class_id (tous) OU class_id est dans les classes de l'enfant
        if (!m.class_id) return true
        return classIds.includes(m.class_id)
      })

      const meetingIds = filtered.map((m: any) => m.id)

      // Slots
      let slotsData: any[] = []
      if (meetingIds.length > 0) {
        const { data: slots } = await supabase
          .from('meeting_slots')
          .select('*')
          .in('meeting_id', meetingIds)
          .order('start_time')
        slotsData = slots || []
      }

      const list: Meeting[] = filtered.map((m: any) => {
        const rawSlots = slotsData.filter((s: any) => s.meeting_id === m.id)
        const slots: Slot[] = rawSlots.map((s: any) => ({
          id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          parent_user_id: s.parent_user_id,
          student_id: s.student_id,
          notes: s.notes,
          is_mine: s.parent_user_id === user.id,
          is_taken: !!s.parent_user_id && s.parent_user_id !== user.id,
        }))

        return {
          id: m.id,
          title: m.title,
          description: m.description,
          meeting_date: m.meeting_date,
          location: m.location,
          status: m.status,
          teacher_name: m.staff?.full_name || null,
          class_name: m.classes
            ? `${m.classes.levels?.name ? m.classes.levels.name + ' - ' : ''}${m.classes.name}`
            : null,
          slots,
          my_booked_slot: slots.find((s) => s.is_mine) || null,
        }
      })

      setMeetings(list)
    } catch (e: any) {
      console.error('[parent-meetings]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const openBooking = (meeting: Meeting, slot: Slot) => {
    setBookingMeeting(meeting)
    setBookingSlot(slot)
    setSelectedChild(children[0]?.id || '')
    setBookingNotes('')
  }

 const handleBook = async () => {
  if (!bookingSlot || !selectedChild) return
  setBooking(true)
  setError('')
  const supabase = createClient()
  try {
    const { error: upErr } = await supabase
      .from('meeting_slots')
      .update({
        parent_user_id: myUserId,
        student_id: selectedChild,
        booked_at: new Date().toISOString(),
        notes: bookingNotes.trim() || null,
      })
      .eq('id', bookingSlot.id)

    if (upErr) throw upErr

    // 📧 إرسال تأكيد
    let msg = '✅ تم حجز الموعد بنجاح'
    try {
      const res = await fetch('/api/establishment/meeting-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: bookingSlot.id }),
      })
      const json = await res.json()
      if (json.sent) {
        msg = '✅ تم حجز الموعد + إرسال تأكيد بالإيميل'
      }
    } catch (e) {
      console.error('Email confirm failed:', e)
    }

    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
    setBookingSlot(null)
    setBookingMeeting(null)
    await loadData()
  } catch (e: any) {
    setError(e.message || 'فشل الحجز')
  } finally {
    setBooking(false)
  }
}

  const handleCancel = async (slot: Slot) => {
    if (!confirm('إلغاء الحجز؟')) return
    setError('')
    const supabase = createClient()
    try {
      const { error: upErr } = await supabase
        .from('meeting_slots')
        .update({
          parent_user_id: null,
          student_id: null,
          booked_at: null,
          notes: null,
        })
        .eq('id', slot.id)

      if (upErr) throw upErr

      setSuccess('✅ تم إلغاء الحجز')
      setTimeout(() => setSuccess(''), 3000)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'فشل الإلغاء')
    }
  }

  const upcomingMeetings = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return meetings.filter((m) => new Date(m.meeting_date) >= today)
  }, [meetings])

  const pastMeetings = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return meetings.filter((m) => new Date(m.meeting_date) < today)
  }, [meetings])

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
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            لقاءات الأولياء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            احجز موعداً للقاء مع أستاذ ابنك
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {children.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون</p>
        </div>
      )}

      {/* Upcoming meetings */}
      {children.length > 0 && upcomingMeetings.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما كايناش لقاءات قادمة</p>
          <p className="text-xs text-slate-400 mt-1">
            غادي تبان هنا ملي ينظم المدير لقاء
          </p>
        </div>
      )}

      {upcomingMeetings.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            اللقاءات القادمة ({upcomingMeetings.length})
          </h2>

          {upcomingMeetings.map((m) => {
            const isExpanded = expandedId === m.id
            const bookedCount = m.slots.filter((s) => s.is_taken || s.is_mine).length
            const totalSlots = m.slots.length
            const mySlot = m.my_booked_slot

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  mySlot ? 'border-emerald-300' : 'border-gray-100'
                }`}
              >
                {/* Header */}
                <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {mySlot && (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          محجوز
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

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* My booking summary */}
                {mySlot && !isExpanded && (
                  <div className="px-5 pb-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-emerald-700" />
                        <div>
                          <p className="text-sm font-bold text-emerald-800">
                            موعدك: <span dir="ltr">{mySlot.start_time.slice(0, 5)} - {mySlot.end_time.slice(0, 5)}</span>
                          </p>
                          {mySlot.notes && (
                            <p className="text-xs text-emerald-700 mt-0.5">{mySlot.notes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(mySlot)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-white px-3 py-1.5 rounded-lg border border-rose-200"
                      >
                        إلغاء الحجز
                      </button>
                    </div>
                  </div>
                )}

                {/* Slots expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-slate-50/50 p-4">
                    {m.slots.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          ما كايناش فترات متاحة دابا
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          اختر الفترة المناسبة ليك
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {m.slots.map((s) => {
                            const takenByOther = s.is_taken
                            const isMine = s.is_mine
                            const disabled = takenByOther || m.status === 'closed'

                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  if (isMine) {
                                    handleCancel(s)
                                  } else if (!disabled) {
                                    openBooking(m, s)
                                  }
                                }}
                                disabled={disabled}
                                className={`p-3 rounded-lg border-2 transition text-center ${
                                  isMine
                                    ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600'
                                    : takenByOther
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : m.status === 'closed'
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700'
                                }`}
                              >
                                <p className="text-sm font-bold" dir="ltr">
                                  {s.start_time.slice(0, 5)}
                                </p>
                                <p className="text-[10px] opacity-80" dir="ltr">
                                  → {s.end_time.slice(0, 5)}
                                </p>
                                <p className="text-[10px] mt-1 font-bold">
                                  {isMine
                                    ? 'موعدك ✓'
                                    : takenByOther
                                    ? 'محجوز'
                                    : m.status === 'closed'
                                    ? 'مغلق'
                                    : 'احجز'}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Past meetings */}
      {pastMeetings.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            اللقاءات السابقة ({pastMeetings.length})
          </summary>
          <div className="border-t border-gray-100 divide-y divide-gray-100">
            {pastMeetings.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between gap-3 flex-wrap opacity-70">
                <div>
                  <p className="font-bold text-slate-700 text-sm">{m.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(m.meeting_date)}
                    {m.teacher_name ? ` — ${m.teacher_name}` : ''}
                  </p>
                </div>
                {m.my_booked_slot ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                    كان عندك موعد: <span dir="ltr">{m.my_booked_slot.start_time.slice(0, 5)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">ما حجزتيش</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal Booking */}
      {bookingSlot && bookingMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                حجز الموعد
              </h3>
              <button
                onClick={() => {
                  setBookingSlot(null)
                  setBookingMeeting(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-xs text-indigo-700 mb-1">الموعد المختار</p>
                <p className="text-sm font-bold text-indigo-900">
                  {bookingMeeting.title}
                </p>
                <p className="text-xs text-indigo-800 mt-1">
                  {dayName(bookingMeeting.meeting_date)} {formatDate(bookingMeeting.meeting_date)}
                  {' — '}
                  <span dir="ltr">{bookingSlot.start_time.slice(0, 5)} - {bookingSlot.end_time.slice(0, 5)}</span>
                </p>
                {bookingMeeting.teacher_name && (
                  <p className="text-xs text-indigo-800 mt-0.5">
                    مع: {bookingMeeting.teacher_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  التلميذ(ة) *
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.class_name ? ` (${c.class_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  placeholder="مثال: عندي استفسار حول المستوى في الرياضيات..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end p-6 border-t border-slate-100">
              <button
                onClick={() => {
                  setBookingSlot(null)
                  setBookingMeeting(null)
                }}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleBook}
                disabled={booking || !selectedChild}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {booking ? 'جارٍ الحجز...' : 'تأكيد الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}