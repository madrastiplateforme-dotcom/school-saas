'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  FileText, Shield, Users, Wallet, BookOpen, Calendar, AlertCircle,
  CheckCircle2, Clock, ChevronLeft, Sparkles, GraduationCap,
} from 'lucide-react'

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
type WidgetData = {
  nextDevoir: {
    id: string
    title: string
    due_date: string
    subject_name: string | null
    student_name: string
    daysLeft: number
  } | null
  nextMeeting: {
    id: string
    title: string
    meeting_date: string
    start_time: string
    end_time: string
    teacher_name: string | null
    student_name: string
    daysLeft: number
  } | null
  recentDisciplines: {
    id: string
    title: string
    severity: 'low' | 'medium' | 'high'
    incident_date: string
    student_name: string
  }[]
  nextPayment: {
    id: string
    amount: number
    due_date: string
    student_name: string
    daysLeft: number
  } | null
  lastCahierEntry: {
    id: string
    title: string
    entry_date: string
    subject_name: string | null
    student_name: string
  } | null
  recentAbsence: {
    id: string
    date: string
    status: string
    student_name: string
  } | null
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

const SEV: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { label: 'عالي', bg: 'bg-rose-50', text: 'text-rose-700' },
}

// ═══════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════
export default function ParentWidgets() {
  const [data, setData] = useState<WidgetData>({
    nextDevoir: null,
    nextMeeting: null,
    recentDisciplines: [],
    nextPayment: null,
    lastCahierEntry: null,
    recentAbsence: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWidgets()
  }, [])

  const loadWidgets = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const estabId = profile?.establishment_id
      if (!estabId) return

      const { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!family) return

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

      if (!students || students.length === 0) {
        setLoading(false)
        return
      }

      const childIds = students.map((s) => s.id)
      const studentName = (id: string) => {
        const s = students.find((x) => x.id === id)
        return s ? `${s.first_name} ${s.last_name}` : '—'
      }

      // Enrollments → class
      let enrollmentsData: any[] = []
      if (year?.id) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('student_id, class_id')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)
        enrollmentsData = enr || []
      }
      const classIds = Array.from(new Set(enrollmentsData.map((e) => e.class_id))).filter(Boolean) as string[]
      const classByStudent: Record<string, string> = {}
      enrollmentsData.forEach((e: any) => { classByStudent[e.student_id] = e.class_id })

      const today = new Date().toISOString().slice(0, 10)

      // ─── 1) Next devoir ───
      let nextDevoir = null
      if (classIds.length > 0) {
        const { data: dev } = await supabase
          .from('devoirs')
          .select('id, title, due_date, class_id, subjects(name)')
          .in('class_id', classIds)
          .gte('due_date', today)
          .order('due_date', { ascending: true })
          .limit(1)
        if (dev && dev.length > 0) {
          const d = dev[0] as any
          const studentId = Object.keys(classByStudent).find((k) => classByStudent[k] === d.class_id)
          nextDevoir = {
            id: d.id,
            title: d.title,
            due_date: d.due_date,
            subject_name: d.subjects?.name || null,
            student_name: studentId ? studentName(studentId) : '—',
            daysLeft: daysUntil(d.due_date),
          }
        }
      }

      // ─── 2) Next meeting (réservé) ───
      const { data: mySlots } = await supabase
        .from('meeting_slots')
        .select(`
          id, start_time, end_time, student_id,
          meetings ( id, title, meeting_date, staff(full_name) )
        `)
        .eq('parent_user_id', user.id)
        .order('id', { ascending: false })

      let nextMeeting = null
      if (mySlots && mySlots.length > 0) {
        const upcoming = mySlots
          .filter((s: any) => s.meetings && new Date(s.meetings.meeting_date) >= new Date(today))
          .sort((a: any, b: any) => new Date(a.meetings.meeting_date).getTime() - new Date(b.meetings.meeting_date).getTime())
        if (upcoming.length > 0) {
          const s = upcoming[0] as any
          nextMeeting = {
            id: s.id,
            title: s.meetings.title,
            meeting_date: s.meetings.meeting_date,
            start_time: s.start_time,
            end_time: s.end_time,
            teacher_name: s.meetings.staff?.full_name || null,
            student_name: s.student_id ? studentName(s.student_id) : '—',
            daysLeft: daysUntil(s.meetings.meeting_date),
          }
        }
      }

      // ─── 3) Recent disciplines (3) ───
      const { data: discs } = await supabase
        .from('disciplines')
        .select('id, title, severity, incident_date, student_id')
        .in('student_id', childIds)
        .order('incident_date', { ascending: false })
        .limit(3)

      const recentDisciplines = (discs || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        severity: d.severity,
        incident_date: d.incident_date,
        student_name: studentName(d.student_id),
      }))

      // ─── 4) Next payment ───
      let nextPayment = null
      if (year?.id) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, student_id')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)

        if (contracts && contracts.length > 0) {
          const contractIds = contracts.map((c: any) => c.id)
          const { data: insts } = await supabase
            .from('installments')
            .select('id, amount, due_date, contract_id')
            .in('contract_id', contractIds)
            .order('due_date', { ascending: true })

          if (insts && insts.length > 0) {
            const { data: pays } = await supabase
              .from('payments')
              .select('installment_id')
              .in('installment_id', insts.map((i: any) => i.id))
            const paidSet = new Set((pays || []).map((p: any) => p.installment_id))
            const unpaid = insts.filter((i: any) => !paidSet.has(i.id))
            if (unpaid.length > 0) {
              const inst = unpaid[0] as any
              const contract = contracts.find((c: any) => c.id === inst.contract_id)
              nextPayment = {
                id: inst.id,
                amount: Number(inst.amount || 0),
                due_date: inst.due_date,
                student_name: contract ? studentName(contract.student_id) : '—',
                daysLeft: daysUntil(inst.due_date),
              }
            }
          }
        }
      }

      // ─── 5) Last cahier entry ───
      let lastCahierEntry = null
      if (classIds.length > 0) {
        const { data: entries } = await supabase
          .from('cahier_entries')
          .select('id, title, entry_date, class_id, subjects(name)')
          .in('class_id', classIds)
          .order('entry_date', { ascending: false })
          .limit(1)
        if (entries && entries.length > 0) {
          const e = entries[0] as any
          const studentId = Object.keys(classByStudent).find((k) => classByStudent[k] === e.class_id)
          lastCahierEntry = {
            id: e.id,
            title: e.title,
            entry_date: e.entry_date,
            subject_name: e.subjects?.name || null,
            student_name: studentId ? studentName(studentId) : '—',
          }
        }
      }

      // ─── 6) Recent absence ───
      let recentAbsence = null
      const { data: atts } = await supabase
        .from('attendances')
        .select('id, attendance_date, status, student_id')
        .in('student_id', childIds)
        .in('status', ['absent', 'late'])
        .order('attendance_date', { ascending: false })
        .limit(1)
      if (atts && atts.length > 0) {
        const a = atts[0] as any
        recentAbsence = {
          id: a.id,
          date: a.attendance_date,
          status: a.status,
          student_name: studentName(a.student_id),
        }
      }

      setData({
        nextDevoir,
        nextMeeting,
        recentDisciplines,
        nextPayment,
        lastCahierEntry,
        recentAbsence,
      })
    } catch (e) {
      console.error('[parent-widgets]', e)
    } finally {
      setLoading(false)
    }
  }

  // Rien à afficher
  const hasAnything =
    data.nextDevoir ||
    data.nextMeeting ||
    data.recentDisciplines.length > 0 ||
    data.nextPayment ||
    data.lastCahierEntry ||
    data.recentAbsence

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">
          ✨ عندك جديد
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* ═══ NEXT DEVOIR ═══ */}
        {data.nextDevoir && (
          <Link
            href="/parent/dashboard/devoirs"
            className="group bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    data.nextDevoir.daysLeft === 0
                      ? 'bg-rose-100 text-rose-700'
                      : data.nextDevoir.daysLeft === 1
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {data.nextDevoir.daysLeft === 0
                    ? 'اليوم'
                    : data.nextDevoir.daysLeft === 1
                    ? 'غدا'
                    : `باقي ${data.nextDevoir.daysLeft} أيام`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📝 فرض قادم</p>
              <p className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">
                {data.nextDevoir.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {data.nextDevoir.subject_name && (
                  <span className="font-bold text-amber-700">{data.nextDevoir.subject_name}</span>
                )}
                <span>·</span>
                <span>{data.nextDevoir.student_name}</span>
              </div>
            </div>
          </Link>
        )}

        {/* ═══ NEXT MEETING ═══ */}
        {data.nextMeeting && (
          <Link
            href="/parent/dashboard/meetings"
            className="group bg-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  {data.nextMeeting.daysLeft === 0
                    ? 'اليوم'
                    : data.nextMeeting.daysLeft === 1
                    ? 'غدا'
                    : `باقي ${data.nextMeeting.daysLeft} أيام`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📅 موعد قادم</p>
              <p className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">
                {data.nextMeeting.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-bold text-emerald-700" dir="ltr">
                  {data.nextMeeting.start_time.slice(0, 5)} - {data.nextMeeting.end_time.slice(0, 5)}
                </span>
                <span>·</span>
                <span>{dayName(data.nextMeeting.meeting_date)}</span>
                {data.nextMeeting.teacher_name && (
                  <>
                    <span>·</span>
                    <span>أ. {data.nextMeeting.teacher_name}</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* ═══ NEXT PAYMENT ═══ */}
        {data.nextPayment && (
          <Link
            href="/parent/dashboard/payments"
            className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden ${
              data.nextPayment.daysLeft < 0
                ? 'border-rose-300'
                : 'border-slate-200'
            }`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    data.nextPayment.daysLeft < 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <Wallet className="h-5 w-5" />
                </div>
                {data.nextPayment.daysLeft < 0 ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                    متأخر
                  </span>
                ) : data.nextPayment.daysLeft === 0 ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                    اليوم
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    باقي {data.nextPayment.daysLeft} أيام
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">💰 قسط قادم</p>
              <p className="font-bold text-slate-800 text-lg mb-1" dir="ltr">
                {formatMoney(data.nextPayment.amount)} <span className="text-xs font-normal text-slate-400">د.م</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{formatDate(data.nextPayment.due_date)}</span>
                <span>·</span>
                <span>{data.nextPayment.student_name}</span>
              </div>
            </div>
          </Link>
        )}

        {/* ═══ RECENT DISCIPLINES ═══ */}
        {data.recentDisciplines.length > 0 && (
          <Link
            href="/parent/dashboard/discipline"
            className="group bg-white rounded-2xl border border-rose-200 shadow-sm hover:shadow-md transition overflow-hidden md:col-span-2 lg:col-span-1"
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
              <p className="text-xs text-slate-500 mb-2">⚠️ سلوك حديث</p>
              <div className="space-y-1.5">
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
                    <span className="text-slate-700 truncate flex-1">{d.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}

        {/* ═══ LAST CAHIER ═══ */}
        {data.lastCahierEntry && (
          <Link
            href="/parent/dashboard/cahier"
            className="group bg-white rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  جديد
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📚 آخر درس</p>
              <p className="font-bold text-slate-800 text-sm line-clamp-2 mb-2">
                {data.lastCahierEntry.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {data.lastCahierEntry.subject_name && (
                  <span className="font-bold text-indigo-700">{data.lastCahierEntry.subject_name}</span>
                )}
                <span>·</span>
                <span>{formatDate(data.lastCahierEntry.entry_date)}</span>
              </div>
            </div>
          </Link>
        )}

        {/* ═══ RECENT ABSENCE ═══ */}
        {data.recentAbsence && (
          <Link
            href="/parent/dashboard/attendance"
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    data.recentAbsence.status === 'absent'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    data.recentAbsence.status === 'absent'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {data.recentAbsence.status === 'absent' ? 'غياب' : 'تأخر'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">📊 آخر تسجيل</p>
              <p className="font-bold text-slate-800 text-sm mb-2">
                {data.recentAbsence.student_name}
              </p>
              <div className="text-xs text-slate-500">
                {dayName(data.recentAbsence.date)} {formatDate(data.recentAbsence.date)}
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}