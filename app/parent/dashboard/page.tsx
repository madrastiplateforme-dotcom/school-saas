'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import ParentWidgets from '@/components/dashboard/ParentWidgets'
import {
  Users, Wallet, TrendingUp, Calendar, MessageSquare, Bell,
  GraduationCap, ArrowLeft, AlertCircle, CheckCircle2, Award,
  BookOpen, Clock,
} from 'lucide-react'

type ChildRow = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  gender: string | null
  birth_date: string | null
  class_name: string | null
  level_name: string | null
  level_grade_max: number
  // stats
  unpaid_count: number
  unpaid_amount: number
  total_amount: number
  paid_amount: number
  average: number | null
  absences_count: number
}

type RecentNotif = {
  id: string
  title: string
  message: string | null
  created_at: string
  read: boolean
  link: string | null
}

const formatMoney = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ي`
  return d.toLocaleDateString('fr-FR')
}

export default function ParentDashboardPage() {
  const [parentName, setParentName] = useState('')
  const [establishmentName, setEstablishmentName] = useState('')
  const [children, setChildren] = useState<ChildRow[]>([])
  const [recentNotifs, setRecentNotifs] = useState<RecentNotif[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Parent + establishment
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, establishment_id')
      .eq('user_id', user.id)
      .maybeSingle()

    setParentName(profile?.full_name || 'ولي الأمر')
    const estabId = profile?.establishment_id
    if (!estabId) {
      setError('لم يتم العثور على المؤسسة')
      setLoading(false)
      return
    }

    // جيب اسم المدرسة
    const { data: estab } = await supabase
      .from('establishments')
      .select('name')
      .eq('id', estabId)
      .single()
    setEstablishmentName(estab?.name || '')

    // 2. Family
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

    // 3. Academic year current
    const { data: year } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', estabId)
      .eq('is_current', true)
      .maybeSingle()

    // 4. Children (students of this family)
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name, massar_code, gender, birth_date')
      .eq('family_id', family.id)
      .eq('establishment_id', estabId)
      .order('first_name')

    if (!students || students.length === 0) {
      setChildren([])
      setLoading(false)
      return
    }

    const childIds = students.map(s => s.id)

    // 5. Enrollments (with class + level)
    let enrollmentsData: any[] = []
    if (year?.id) {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          class_id,
          classes(name, level_id, levels(name, grade_max))
        `)
        .in('student_id', childIds)
        .eq('academic_year_id', year.id)
      enrollmentsData = data || []
    }

    // 6. Contracts
    let contractsData: any[] = []
    if (year?.id) {
      const { data } = await supabase
        .from('contracts')
        .select('id, student_id')
        .in('student_id', childIds)
        .eq('academic_year_id', year.id)
      contractsData = data || []
    }

    // 7. Installments
    const contractIds = contractsData.map(c => c.id)
    let installmentsData: any[] = []
    if (contractIds.length > 0) {
      const { data } = await supabase
        .from('installments')
        .select('id, contract_id, amount, due_date')
        .in('contract_id', contractIds)
      installmentsData = data || []
    }

    // 8. Payments
    const installmentIds = installmentsData.map(i => i.id)
    let paymentsData: any[] = []
    if (installmentIds.length > 0) {
      const { data } = await supabase
        .from('payments')
        .select('id, installment_id, amount')
        .in('installment_id', installmentIds)
      paymentsData = data || []
    }

    // 9. Attendances (of current year) — جيب كل الغيابات
    let attendancesData: any[] = []
    const { data: attData } = await supabase
      .from('attendances')
      .select('student_id, status')
      .in('student_id', childIds)
      .in('status', ['absent', 'late'])
    attendancesData = attData || []

    // 10. Grades → نحسبو المعدل العام (للفصل الحالي)
    // نجيبو آخر bulletins منشورة
    let bulletinsData: any[] = []
    if (year?.id) {
      const { data } = await supabase
        .from('bulletins')
        .select('student_id, average, term')
        .in('student_id', childIds)
        .eq('academic_year_id', year.id)
        .eq('is_published', true)
      bulletinsData = data || []
    }

    // ============= نبنيو Row لكل ابن =============
    const rows: ChildRow[] = students.map(st => {
      const enr = enrollmentsData.find(e => e.student_id === st.id)
      const cls = enr?.classes
      const lvl = cls?.levels

      // Contracts of this child
      const childContracts = contractsData.filter(c => c.student_id === st.id)
      const childContractIds = childContracts.map(c => c.id)

      // Installments
      const childInsts = installmentsData.filter(i => childContractIds.includes(i.contract_id))
      const childInstIds = childInsts.map(i => i.id)

      // Payments
      const childPays = paymentsData.filter(p => childInstIds.includes(p.installment_id))
      const paidInstallmentIds = new Set(childPays.map(p => p.installment_id))

      // Unpaid
      const unpaidInsts = childInsts.filter(i => !paidInstallmentIds.has(i.id))

      const totalAmount = childInsts.reduce((s, i) => s + Number(i.amount || 0), 0)
      const paidAmount = childPays.reduce((s, p) => s + Number(p.amount || 0), 0)
      const unpaidAmount = unpaidInsts.reduce((s, i) => s + Number(i.amount || 0), 0)

      // Average (آخر فصل منشور)
      const childBulletins = bulletinsData.filter(b => b.student_id === st.id)
      let avg: number | null = null
      if (childBulletins.length > 0) {
        // خذ آخر فصل
        const latest = childBulletins.sort((a, b) => b.term - a.term)[0]
        avg = latest.average
      }

      // Absences
      const absences = attendancesData.filter(a => a.student_id === st.id).length

      return {
        id: st.id,
        first_name: st.first_name,
        last_name: st.last_name,
        massar_code: st.massar_code,
        gender: st.gender,
        birth_date: st.birth_date,
        class_name: cls?.name || null,
        level_name: lvl?.name || null,
        level_grade_max: Number(lvl?.grade_max) || 20,
        unpaid_count: unpaidInsts.length,
        unpaid_amount: unpaidAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        average: avg,
        absences_count: absences,
      }
    })

    setChildren(rows)

    // 11. Recent notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, title, message, created_at, read, link')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentNotifs(notifs || [])

    // Count unread
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)

    setLoading(false)
  }

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>

  // ============ STATS ============
  const totalUnpaid = children.reduce((s, c) => s + c.unpaid_amount, 0)
  const totalPaid = children.reduce((s, c) => s + c.paid_amount, 0)
  const totalAbsences = children.reduce((s, c) => s + c.absences_count, 0)
  const averages = children.filter(c => c.average != null).map(c => c.average!)
  const globalAverage = averages.length > 0
    ? averages.reduce((s, v) => s + v, 0) / averages.length
    : null

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm opacity-80">مرحباً بك</p>
            <h1 className="text-2xl font-bold mt-1">{parentName}</h1>
            {establishmentName && (
              <p className="text-sm opacity-90 mt-1 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                {establishmentName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/parent/dashboard/messages"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-lg font-medium text-sm transition backdrop-blur-sm"
            >
              <MessageSquare className="h-4 w-4" />
              الرسائل
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">أبنائي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{children.length}</div>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${
          totalUnpaid > 0 ? 'border-rose-200' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalUnpaid > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">المتبقي</span>
          </div>
          <div className={`text-xl font-bold ${totalUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatMoney(totalUnpaid)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">المعدل العام</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {globalAverage != null ? globalAverage.toFixed(2) : '—'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">الغيابات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalAbsences}</div>
        </div>
      </div>
<ParentWidgets />
      {/* Children list */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          أبنائي ({children.length})
        </h2>

        {children.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map(c => {
              const hasUnpaid = c.unpaid_count > 0
              const avgPass = c.average != null && c.average >= c.level_grade_max / 2
              return (
                <Link
                  key={c.id}
                  href={`/parent/dashboard/children/${c.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition p-5"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm">
                      {c.first_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg truncate">
                        {c.first_name} {c.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                        {c.class_name && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {c.class_name}
                          </span>
                        )}
                        {c.level_name && (
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {c.level_name}
                          </span>
                        )}
                      </div>
                      {c.massar_code && (
                        <code className="text-[10px] font-mono text-slate-400 mt-1 block">
                          {c.massar_code}
                        </code>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className={`text-lg font-bold ${
                        c.average == null ? 'text-slate-400' : avgPass ? 'text-emerald-600' : 'text-orange-600'
                      }`}>
                        {c.average != null ? c.average.toFixed(2) : '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">المعدل</div>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${
                      hasUnpaid ? 'bg-rose-50' : 'bg-emerald-50'
                    }`}>
                      <div className={`text-lg font-bold ${
                        hasUnpaid ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {c.unpaid_count}
                      </div>
                      <div className="text-[10px] text-slate-500">أقساط</div>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${
                      c.absences_count > 0 ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                      <div className={`text-lg font-bold ${
                        c.absences_count > 0 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {c.absences_count}
                      </div>
                      <div className="text-[10px] text-slate-500">غيابات</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {hasUnpaid ? (
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        متبقي: {formatMoney(c.unpaid_amount)} د.م
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        خالص
                      </span>
                    )}
                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      التفاصيل
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent notifications */}
      {recentNotifs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              آخر الإشعارات
              {unreadCount > 0 && (
                <span className="min-w-[22px] h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </h2>
            <Link
              href="/parent/dashboard/notifications"
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              عرض الكل
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {recentNotifs.map(n => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 ${!n.read ? 'bg-indigo-50/40' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  !n.read ? 'bg-indigo-500' : 'bg-transparent'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                  {n.message && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}