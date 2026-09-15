'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import {
  Sparkles, UserPlus, Wallet, Shield, Users, ClipboardList,
  MessageSquare, ChevronLeft, Clock, AlertCircle, CheckCircle2,
  GraduationCap,
} from 'lucide-react'

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
type WidgetData = {
  recentEnrollments: {
    id: string
    student_name: string
    class_name: string | null
    created_at: string
  }[]
  topUnpaid: {
    id: string
    student_name: string
    amount: number
    due_date: string
    daysLate: number
  }[]
  recentDisciplines: {
    id: string
    title: string
    severity: 'low' | 'medium' | 'high'
    incident_date: string
    student_name: string
  }[]
  upcomingMeetings: {
    id: string
    title: string
    meeting_date: string
    bookedCount: number
    totalSlots: number
  }[]
  todayAbsences: {
    count: number
  }
  unreadMessages: {
    count: number
  }
}

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

const dayName = (d: string) => {
  try { return DAYS_AR[new Date(d).getDay()] } catch { return '' }
}

const formatMoney = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const daysUntil = (dateStr: string) => {
  const d = new Date(dateStr)
  const t = new Date()
  d.setHours(0, 0, 0, 0)
  t.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))
}

const timeAgo = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'دابا'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} ي`
  return formatDate(dateStr)
}

export default function DirectorWidgets() {
  const establishmentId = useEstablishmentId()
  const [data, setData] = useState<WidgetData>({
    recentEnrollments: [],
    topUnpaid: [],
    recentDisciplines: [],
    upcomingMeetings: [],
    todayAbsences: { count: 0 },
    unreadMessages: { count: 0 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (establishmentId) loadWidgets()
  }, [establishmentId])

  const loadWidgets = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const today = new Date().toISOString().slice(0, 10)

      // ─── 1) Recent enrollments (7 derniers jours) ───
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data: enrs } = await supabase
        .from('enrollments')
        .select(`
          id, created_at, class_id,
          students ( id, first_name, last_name ),
          classes ( name, levels(name) )
        `)
        .eq('establishment_id', establishmentId)
        .eq('status', 'active')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3)

      const recentEnrollments = (enrs || []).map((e: any) => ({
        id: e.id,
        student_name: e.students ? `${e.students.first_name} ${e.students.last_name}` : '—',
        class_name: e.classes
          ? `${e.classes.levels?.name ? e.classes.levels.name + ' - ' : ''}${e.classes.name}`
          : null,
        created_at: e.created_at,
      }))

      // ─── 2) Top impayés (installments non payés, triés par due_date) ───
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, student_id, students(id, first_name, last_name)')
        .eq('establishment_id', establishmentId)

      const contractMap: Record<string, any> = {}
      ;(contracts || []).forEach((c: any) => { contractMap[c.id] = c })

      const contractIds = (contracts || []).map((c: any) => c.id)

      let topUnpaid: any[] = []
      if (contractIds.length > 0) {
        const { data: insts } = await supabase
          .from('installments')
          .select('id, amount, due_date, contract_id')
          .in('contract_id', contractIds)
          .lte('due_date', today)
          .order('due_date', { ascending: true })

        if (insts && insts.length > 0) {
          const { data: pays } = await supabase
            .from('payments')
            .select('installment_id')
            .in('installment_id', insts.map((i: any) => i.id))
          const paidSet = new Set((pays || []).map((p: any) => p.installment_id))
          const unpaid = insts.filter((i: any) => !paidSet.has(i.id))

          topUnpaid = unpaid.slice(0, 3).map((i: any) => {
            const contract = contractMap[i.contract_id]
            const st = contract?.students
            return {
              id: i.id,
              student_name: st ? `${st.first_name} ${st.last_name}` : '—',
              amount: Number(i.amount || 0),
              due_date: i.due_date,
              daysLate: Math.abs(daysUntil(i.due_date)),
            }
          })
        }
      }

      // ─── 3) Recent disciplines (3) ───
      const { data: discs } = await supabase
        .from('disciplines')
        .select('id, title, severity, incident_date, student_id, students(first_name, last_name)')
        .eq('establishment_id', establishmentId)
        .order('incident_date', { ascending: false })
        .limit(3)

      const recentDisciplines = (discs || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        severity: d.severity,
        incident_date: d.incident_date,
        student_name: d.students ? `${d.students.first_name} ${d.students.last_name}` : '—',
      }))

      // ─── 4) Upcoming meetings ───
      const { data: mts } = await supabase
        .from('meetings')
        .select('id, title, meeting_date')
        .eq('establishment_id', establishmentId)
        .eq('status', 'open')
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true })
        .limit(3)

      let upcomingMeetings: any[] = []
      if (mts && mts.length > 0) {
        const { data: slots } = await supabase
          .from('meeting_slots')
          .select('meeting_id, parent_user_id')
          .in('meeting_id', mts.map((m: any) => m.id))

        upcomingMeetings = mts.map((m: any) => {
          const mslots = (slots || []).filter((s: any) => s.meeting_id === m.id)
          return {
            id: m.id,
            title: m.title,
            meeting_date: m.meeting_date,
            bookedCount: mslots.filter((s: any) => s.parent_user_id).length,
            totalSlots: mslots.length,
          }
        })
      }

      // ─── 5) Absences aujourd'hui ───
      const { count: absCount } = await supabase
        .from('attendances')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('attendance_date', today)
        .in('status', ['absent', 'late'])

      // ─── 6) Unread messages (conversations avec messages non lus) ───
      const { data: { user } } = await supabase.auth.getUser()
      let unreadCount = 0
      if (user) {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id)

        if (parts && parts.length > 0) {
          const convIds = parts.map((p: any) => p.conversation_id)
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, created_at, sender_user_id')
            .in('conversation_id', convIds)
            .eq('is_deleted', false)
            .neq('sender_user_id', user.id)

          const lastReadByConv: Record<string, string | null> = {}
          parts.forEach((p: any) => { lastReadByConv[p.conversation_id] = p.last_read_at })

          ;(msgs || []).forEach((m: any) => {
            const lr = lastReadByConv[m.conversation_id]
            if (!lr || new Date(m.created_at) > new Date(lr)) unreadCount++
          })
        }
      }

      setData({
        recentEnrollments,
        topUnpaid,
        recentDisciplines,
        upcomingMeetings,
        todayAbsences: { count: absCount || 0 },
        unreadMessages: { count: unreadCount },
      })
    } catch (e) {
      console.error('[director-widgets]', e)
    } finally {
      setLoading(false)
    }
  }

  const hasAnything =
    data.recentEnrollments.length > 0 ||
    data.topUnpaid.length > 0 ||
    data.recentDisciplines.length > 0 ||
    data.upcomingMeetings.length > 0 ||
    data.todayAbsences.count > 0 ||
    data.unreadMessages.count > 0

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!hasAnything) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">✨ نظرة سريعة</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* ═══ ABSENCES AUJOURD'HUI ═══ */}
        {data.todayAbsences.count > 0 && (
          <Link
            href="/dashboard/attendance"
            className="group bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                  اليوم
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📊 غيابات اليوم</p>
              <p className="text-3xl font-bold text-amber-600">
                {data.todayAbsences.count}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                تلميذ (غائب / متأخر)
              </p>
            </div>
          </Link>
        )}

        {/* ═══ UNREAD MESSAGES ═══ */}
        {data.unreadMessages.count > 0 && (
          <Link
            href="/dashboard/messages"
            className="group bg-white rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  جديد
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📨 رسائل غير مقروءة</p>
              <p className="text-3xl font-bold text-indigo-600">
                {data.unreadMessages.count}
              </p>
              <p className="text-xs text-slate-500 mt-1">افتح صندوق الرسائل</p>
            </div>
          </Link>
        )}

        {/* ═══ RECENT ENROLLMENTS ═══ */}
        {data.recentEnrollments.length > 0 && (
          <Link
            href="/dashboard/students"
            className="group bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  {data.recentEnrollments.length} جديد
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">🎓 تسجيلات حديثة</p>
              <div className="space-y-1">
                {data.recentEnrollments.slice(0, 2).map((e) => (
                  <div key={e.id} className="text-xs">
                    <span className="font-bold text-slate-700 truncate block">
                      {e.student_name}
                    </span>
                    {e.class_name && (
                      <span className="text-slate-500">{e.class_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}

        {/* ═══ TOP UNPAID ═══ */}
        {data.topUnpaid.length > 0 && (
          <Link
            href="/dashboard/impayes"
            className="group bg-white rounded-2xl border border-rose-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                  متأخرات
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">💰 أقساط متأخرة</p>
              <div className="space-y-1.5">
                {data.topUnpaid.slice(0, 2).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-700 truncate flex-1">
                      {u.student_name}
                    </span>
                    <span className="font-bold text-rose-600 flex-shrink-0" dir="ltr">
                      {formatMoney(u.amount)} د.م
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}

        {/* ═══ RECENT DISCIPLINES ═══ */}
        {data.recentDisciplines.length > 0 && (
          <Link
            href="/dashboard/discipline"
            className="group bg-white rounded-2xl border border-rose-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                  {data.recentDisciplines.length} حديثة
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">⚠️ مخالفات حديثة</p>
              <div className="space-y-1">
                {data.recentDisciplines.slice(0, 2).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        d.severity === 'high'
                          ? 'bg-rose-500'
                          : d.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-slate-700 truncate flex-1">
                      {d.student_name}: {d.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}

        {/* ═══ UPCOMING MEETINGS ═══ */}
        {data.upcomingMeetings.length > 0 && (
          <Link
            href="/dashboard/meetings"
            className="group bg-white rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  {data.upcomingMeetings.length} قادمة
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">📅 لقاءات قادمة</p>
              <div className="space-y-1.5">
                {data.upcomingMeetings.slice(0, 2).map((m) => {
                  const dl = daysUntil(m.meeting_date)
                  return (
                    <div key={m.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700 truncate">
                          {m.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            dl === 0
                              ? 'bg-rose-100 text-rose-700'
                              : dl === 1
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {dl === 0 ? 'اليوم' : dl === 1 ? 'غدا' : `باقي ${dl} أيام`}
                        </span>
                      </div>
                      {m.totalSlots > 0 && (
                        <span className="text-slate-500">
                          {m.bookedCount} / {m.totalSlots} محجوز
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}