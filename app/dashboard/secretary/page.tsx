'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  Wallet, TrendingUp, TrendingDown, Send, Users, Plus, RefreshCw,
  Building2, ClipboardList, BookOpen, FileText, Calendar, CreditCard,
  AlertCircle, CheckCircle2, ArrowLeft, Sparkles, Clock, UserPlus,
  GraduationCap, MessageSquare, Bell,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type Caisse = {
  id: string
  name: string
  initial_balance: number
}

type Stats = {
  balance: number
  totalIn: number
  totalOut: number
  pendingTransfers: number
  studentsCount: number
  todayPayments: number
  unpaidCount: number
}

type RecentItem = {
  id: string
  label: string
  amount: number
  date: string
  type: 'in' | 'out'
}

type DayBar = { day: string; in: number; out: number }

const QUICK_ACTIONS = [
  { href: '/dashboard/payments/new', label: 'دفعة جديدة', desc: 'تسجيل دفعة', icon: Plus, gradient: 'from-emerald-500 to-emerald-700' },
  { href: '/dashboard/expenses', label: 'مصروف جديد', desc: 'تسجيل مصروف', icon: TrendingDown, gradient: 'from-rose-500 to-rose-700' },
  { href: '/dashboard/enroll', label: 'تسجيل تلميذ', desc: 'تسجيل جديد', icon: UserPlus, gradient: 'from-sky-500 to-sky-700' },
  { href: '/dashboard/students', label: 'التلاميذ', desc: 'لائحة التلاميذ', icon: Users, gradient: 'from-cyan-500 to-cyan-700' },
  { href: '/dashboard/installments', label: 'الأقساط', desc: 'متابعة الأقساط', icon: Calendar, gradient: 'from-indigo-500 to-indigo-700' },
  { href: '/dashboard/impayes', label: 'Impayés', desc: 'متأخرات', icon: AlertCircle, gradient: 'from-amber-500 to-amber-700' },
  { href: '/dashboard/caisse', label: 'صندوقي', desc: 'كشف الصندوق', icon: Wallet, gradient: 'from-violet-500 to-violet-700' },
  { href: '/dashboard/caisse/transfers', label: 'التحويلات', desc: 'تحويلات الصندوق', icon: Send, gradient: 'from-fuchsia-500 to-fuchsia-700' },
  { href: '/dashboard/contracts', label: 'العقود', desc: 'إدارة العقود', icon: FileText, gradient: 'from-teal-500 to-teal-700' },
  { href: '/dashboard/families', label: 'الأسر', desc: 'ملفات الأسر', icon: Users, gradient: 'from-blue-500 to-blue-700' },
  { href: '/dashboard/bulletins', label: 'الكشوف', desc: 'الكشوف المدرسية', icon: GraduationCap, gradient: 'from-orange-500 to-orange-700' },
  { href: '/dashboard/messages', label: 'الرسائل', desc: 'التواصل', icon: MessageSquare, gradient: 'from-slate-500 to-slate-700' },
]

export default function SecretaryDashboard() {
  const router = useRouter()
  const { yearId } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userName, setUserName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [caisseName, setCaisseName] = useState('')
  const [caisseId, setCaisseId] = useState<string | null>(null)

  const [stats, setStats] = useState<Stats>({
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    pendingTransfers: 0,
    studentsCount: 0,
    todayPayments: 0,
    unpaidCount: 0,
  })

  const [recentPayments, setRecentPayments] = useState<RecentItem[]>([])
  const [recentExpenses, setRecentExpenses] = useState<RecentItem[]>([])
  const [chartData, setChartData] = useState<DayBar[]>([])

  useEffect(() => {
    if (!yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId])

  const loadData = async () => {
    if (!yearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, establishment_id')
        .eq('user_id', user.id)
        .maybeSingle()

      setUserName(profile?.full_name || '')
      const establishmentId = profile?.establishment_id

      if (!establishmentId) {
        setError('لا توجد مؤسسة')
        setLoading(false)
        return
      }

      const { data: est } = await supabase
        .from('establishments')
        .select('name')
        .eq('id', establishmentId)
        .maybeSingle()
      setSchoolName(est?.name || '')

      // ✅ Caisse de l'année active
      const { data: caisse } = await supabase
        .from('cash_registers')
        .select('id, name, initial_balance')
        .eq('owner_user_id', user.id)
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', yearId)
        .maybeSingle()

      if (!caisse) {
        setError('لم يتم العثور على صندوقك لهذه السنة. تواصل مع الإدارة.')
        setLoading(false)
        return
      }

      setCaisseId(caisse.id)
      setCaisseName(caisse.name || 'صندوقي')
      const initialBalance = Number(caisse.initial_balance || 0)

      // ✅ Payments filtrés par année active
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('id, amount, payment_date, created_at, student_id, is_refunded')
        .eq('cash_register_id', caisse.id)
        .eq('academic_year_id', yearId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)

      if (pErr) throw new Error(pErr.message)

      // ✅ Expenses (per-year via registerId)
      const { data: expenses, error: eErr } = await supabase
        .from('expenses')
        .select('id, description, amount, expense_date, created_at, nature, category')
        .eq('cash_register_id', caisse.id)
        .order('created_at', { ascending: false })
        .limit(500)

      if (eErr) throw new Error(eErr.message)

      // ✅ Transfers OUT (per-year via registerId)
      const { data: transfersOut } = await supabase
        .from('cash_transfers')
        .select('id, amount, transfer_date, to_cash_register_id, note, status')
        .eq('from_cash_register_id', caisse.id)
        .eq('status', 'accepted')

      // ✅ Transfers IN (per-year via registerId)
      const { data: transfersIn } = await supabase
        .from('cash_transfers')
        .select('id, amount, transfer_date, from_cash_register_id, note, status')
        .eq('to_cash_register_id', caisse.id)
        .eq('status', 'accepted')

      // Student names
      const studentIds = Array.from(
        new Set((payments || []).map((p: any) => p.student_id).filter(Boolean)),
      ) as string[]

      const studentMap = new Map<string, string>()
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', studentIds)
        ;(students || []).forEach((s: any) => {
          studentMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim())
        })
      }

      const totalPaymentsIn = (payments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      )
      const totalExpensesOut = (expenses || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0,
      )
      const totalTransfersOut = (transfersOut || []).reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      )
      const totalTransfersIn = (transfersIn || []).reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      )

      const balance =
        initialBalance +
        totalPaymentsIn +
        totalTransfersIn -
        totalExpensesOut -
        totalTransfersOut

      // ✅ Pending transfers vers ma caisse (per-year via registerId)
      const { count: pendingCount } = await supabase
        .from('cash_transfers')
        .select('*', { count: 'exact', head: true })
        .eq('to_cash_register_id', caisse.id)
        .eq('status', 'pending')

      // ✅ Students de l'année active via enrollments
      const { count: stCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('academic_year_id', yearId)
        .eq('status', 'active')

      const today = new Date().toISOString().slice(0, 10)
      const todayPayments = (payments || []).filter(
        (p: any) => p.payment_date === today,
      ).length

      // ✅ Impayés: contracts de l'année active → installments en retard
      let unpaidCount = 0
      try {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id')
          .eq('establishment_id', establishmentId)
          .eq('academic_year_id', yearId)

        const contractIds = (contracts || []).map((c: any) => c.id)

        if (contractIds.length > 0) {
          const { data: installments } = await supabase
            .from('installments')
            .select('id')
            .in('contract_id', contractIds)
            .lt('due_date', today)

          const instIds = (installments || []).map((i: any) => i.id)

          if (instIds.length > 0) {
            const { data: paidInst } = await supabase
              .from('payments')
              .select('installment_id')
              .in('installment_id', instIds)
              .is('deleted_at', null)

            const paidSet = new Set(
              (paidInst || []).map((p: any) => p.installment_id),
            )
            unpaidCount = instIds.filter((id) => !paidSet.has(id)).length
          }
        }
      } catch (e) {
        console.warn('unpaid count failed', (e as any)?.message)
      }

      setStats({
        balance,
        totalIn: totalPaymentsIn + totalTransfersIn,
        totalOut: totalExpensesOut + totalTransfersOut,
        pendingTransfers: pendingCount || 0,
        studentsCount: stCount || 0,
        todayPayments,
        unpaidCount,
      })

      const rPayments: RecentItem[] = (payments || []).slice(0, 5).map((p: any) => ({
        id: p.id,
        label: studentMap.get(p.student_id) || 'تلميذ',
        amount: Number(p.amount || 0),
        date: p.payment_date,
        type: 'in',
      }))

      const rExpenses: RecentItem[] = (expenses || []).slice(0, 5).map((e: any) => ({
        id: e.id,
        label: e.description || 'مصروف',
        amount: Number(e.amount || 0),
        date: e.expense_date,
        type: 'out',
      }))

      setRecentPayments(rPayments)
      setRecentExpenses(rExpenses)

      const days: DayBar[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const iso = d.toISOString().slice(0, 10)
        const dayIn = (payments || [])
          .filter((p: any) => p.payment_date === iso)
          .reduce((s, p) => s + Number(p.amount || 0), 0)
        const dayOut = (expenses || [])
          .filter((e: any) => e.expense_date === iso)
          .reduce((s, e) => s + Number(e.amount || 0), 0)

        const dayLabels = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
        days.push({
          day: dayLabels[d.getDay()] + ` ${d.getDate()}`,
          in: +dayIn.toFixed(2),
          out: +dayOut.toFixed(2),
        })
      }
      setChartData(days)
    } catch (e: any) {
      console.error('[secretary-dashboard]', e?.message || e)
      setError(e?.message || 'خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-violet-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            مرحباً {userName || 'سكرتيرة'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {schoolName || 'مؤسستك'} — {caisseName}
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

      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs opacity-90">رصيد الصندوق</p>
              <p className="text-sm font-bold">{caisseName}</p>
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight" dir="ltr">
            {stats.balance.toLocaleString('fr-FR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-lg font-bold opacity-90">DH</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المداخيل</span>
          </div>
          <div className="text-xl font-bold text-emerald-600" dir="ltr">
            {stats.totalIn.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المصاريف</span>
          </div>
          <div className="text-xl font-bold text-rose-600" dir="ltr">
            {stats.totalOut.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">التلاميذ</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.studentsCount}</div>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${stats.unpaidCount > 0 ? 'border-amber-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.unpaidCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">Impayés</span>
          </div>
          <div className={`text-2xl font-bold ${stats.unpaidCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {stats.unpaidCount}
          </div>
        </div>
      </div>

      {stats.pendingTransfers > 0 && (
        <Link
          href="/dashboard/caisse/transfers"
          className="block bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Send className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-base">تحويلات قيد الانتظار</p>
              <p className="text-xs opacity-95 mt-0.5">عندك تحويلات وصلت لصندوقك محتاجة تأكيد</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white text-amber-700 font-black rounded-xl px-3 py-1.5 text-lg">{stats.pendingTransfers}</span>
            <ArrowLeft className="h-5 w-5" />
          </div>
        </Link>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h2 className="font-bold text-slate-800 text-lg">الوصول السريع</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-200 overflow-hidden`}
              >
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/10 group-hover:bg-white/20 transition" />
                <div className="absolute -bottom-10 -left-6 w-16 h-16 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-extrabold text-base leading-tight text-white drop-shadow-sm">{action.label}</p>
                  <p className="text-xs font-medium text-white/95 mt-1 leading-tight">{action.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            حركة الصندوق — 7 أيام
          </h2>
          <div style={{ width: '100%', height: 260 }} dir="ltr">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="in" fill="#10b981" radius={[4, 4, 0, 0]} name="مداخيل" />
                <Bar dataKey="out" fill="#ef4444" radius={[4, 4, 0, 0]} name="مصاريف" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              آخر المدفوعات
            </h2>
            <Link href="/dashboard/payments" className="text-xs text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1">
              الكل <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">ما كايناش مدفوعات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.date}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 flex-shrink-0" dir="ltr">
                    + {p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              آخر المصاريف
            </h2>
            <Link href="/dashboard/expenses" className="text-xs text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1">
              الكل <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">ما كايناش مصاريف</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{e.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{e.date}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-600 flex-shrink-0" dir="ltr">
                    − {e.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-violet-900">
          <p className="font-bold mb-1">💡 نصيحة</p>
          <p className="text-violet-800">
            استعمل <strong>الوصول السريع</strong> باش تدخل مباشرة لأي خدمة. كل زر عندو لون خاص.
          </p>
        </div>
      </div>
    </div>
  )
}