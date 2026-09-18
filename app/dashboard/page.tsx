'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import DirectorWidgets from '@/components/dashboard/DirectorWidgets'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, Users, FileText,
  Plus, Send, Bell, Wrench, Sparkles, Building2, User as UserIcon,
  Search, Home, GraduationCap, Calendar, CheckCircle2, ClipboardList,
  MessageSquare, Settings, BarChart3, Receipt, UserPlus, BookOpen,
} from 'lucide-react'

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
]

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

// ═══════════════════════════════════════════════════
// Quick Actions (style secrétaire)
// ═══════════════════════════════════════════════════
const QUICK_ACTIONS = [
  { href: '/dashboard/payments/new', label: 'دفعة جديدة', desc: 'تسجيل دفعة', icon: Plus, gradient: 'from-emerald-500 to-emerald-700' },
  { href: '/dashboard/expenses', label: 'مصروف جديد', desc: 'تسجيل مصروف', icon: TrendingDown, gradient: 'from-rose-500 to-rose-700' },
  { href: '/dashboard/enroll', label: 'تسجيل تلميذ', desc: 'تسجيل جديد', icon: UserPlus, gradient: 'from-sky-500 to-sky-700' },
  { href: '/dashboard/students', label: 'التلاميذ', desc: 'لائحة التلاميذ', icon: Users, gradient: 'from-cyan-500 to-cyan-700' },
  { href: '/dashboard/contracts', label: 'العقود', desc: 'إدارة العقود', icon: FileText, gradient: 'from-indigo-500 to-indigo-700' },
  { href: '/dashboard/impayes', label: 'Impayés', desc: 'المتأخرات', icon: AlertCircle, gradient: 'from-amber-500 to-amber-700' },
  { href: '/dashboard/caisse', label: 'الصناديق', desc: 'كشف الصناديق', icon: Wallet, gradient: 'from-violet-500 to-violet-700' },
  { href: '/dashboard/caisse/transfers', label: 'التحويلات', desc: 'تحويلات الصندوق', icon: Send, gradient: 'from-fuchsia-500 to-fuchsia-700' },
  { href: '/dashboard/attendance', label: 'الحضور', desc: 'متابعة الحضور', icon: CheckCircle2, gradient: 'from-teal-500 to-teal-700' },
  { href: '/dashboard/bulletins', label: 'الكشوف', desc: 'الكشوف المدرسية', icon: GraduationCap, gradient: 'from-orange-500 to-orange-700' },
  { href: '/dashboard/reports', label: 'التقارير', desc: 'التقارير المالية', icon: BarChart3, gradient: 'from-purple-500 to-purple-700' },
  { href: '/dashboard/users', label: 'المستخدمون', desc: 'إدارة الفريق', icon: Settings, gradient: 'from-slate-500 to-slate-700' },
]

export default function DashboardPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [userName, setUserName] = useState('')

  // Data
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [contractItems, setContractItems] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [caisses, setCaisses] = useState<any[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])

  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [searchPayment, setSearchPayment] = useState('')

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 1. Profile — SANS JOIN (R1)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, establishment_id')
      .eq('user_id', user.id)
      .maybeSingle()

    setUserName(profile?.full_name || '')

    // Nom établissement — query séparée
    if (profile?.establishment_id) {
      const { data: est } = await supabase
        .from('establishments')
        .select('name')
        .eq('id', profile.establishment_id)
        .maybeSingle()
      setSchoolName(est?.name || '')
    }

    // 2. Caisses
    const { data: caissesData } = await supabase
      .from('cash_registers')
      .select('id, name, type, initial_balance, owner_user_id')
      .eq('establishment_id', establishmentId)

    setCaisses(caissesData || [])

    // 3. Payments — ✅ FIX : filtrer deleted_at IS NULL
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: payData } = await supabase
      .from('payments')
      .select('id, amount, payment_date, cash_register_id, student_id, installment_id, method, notes, reference')
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null)                     // ✅ FIX
      .gte('payment_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('payment_date', { ascending: false })

    setPayments(payData || [])

    // 4. Recent payments — ✅ FIX : filtrer deleted_at IS NULL
    const { data: recentData } = await supabase
      .from('payments')
      .select(`
        id, amount, payment_date, method, cash_register_id,
        students (first_name, last_name),
        installments (description)
      `)
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null)                     // ✅ FIX
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentPayments(recentData || [])

    // 5. Expenses
    const { data: expData } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, nature, cash_register_id')
      .eq('establishment_id', establishmentId)
      .gte('expense_date', sixMonthsAgo.toISOString().split('T')[0])

    setExpenses(expData || [])

    // 6. Installments
    const { data: instData } = await supabase
      .from('installments')
      .select('id, amount, paid_amount, due_date, status, student_id, service_id')
      .eq('establishment_id', establishmentId)
      .in('status', ['pending', 'partially_paid'])

    setInstallments(instData || [])

    // 7. Students
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name, status, family_id, created_at')
      .eq('establishment_id', establishmentId)
      .eq('status', 'active')

    setStudents(studentsData || [])

    // 8. Services
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, type')
      .eq('establishment_id', establishmentId)

    setServices(servicesData || [])

    // 9. Contracts
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('id, student_id')
      .eq('establishment_id', establishmentId)

    setContracts(contractsData || [])

    // 10. Contract items
    const { data: ciData } = await supabase
      .from('contract_items')
      .select('id, contract_id, service_id, final_price')

    setContractItems(ciData || [])

    // 11. Families
    const { data: familiesData } = await supabase
      .from('families')
      .select('id, family_name, created_at')
      .eq('establishment_id', establishmentId)

    setFamilies(familiesData || [])

    // 12. Transfers
    const { data: transfersData } = await supabase
      .from('cash_transfers')
      .select('id, amount, status, transfer_date, from_cash_register_id, to_cash_register_id')
      .eq('establishment_id', establishmentId)
      .eq('status', 'accepted')

    setTransfers(transfersData || [])

    // 13. Notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('id, title, message, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setNotifications(notifData || [])

    setLoading(false)
  }

  // ============ STATS ============
  const thisMonth = new Date().toISOString().slice(0, 7)
  const lastMonth = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()

  const monthlyEncaissements = payments
    .filter(p => p.payment_date?.startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount), 0)

  const lastMonthEncaissements = payments
    .filter(p => p.payment_date?.startsWith(lastMonth))
    .reduce((s, p) => s + Number(p.amount), 0)

  const encaissementChange = lastMonthEncaissements > 0
    ? ((monthlyEncaissements - lastMonthEncaissements) / lastMonthEncaissements) * 100
    : 0

  const monthlyDepenses = expenses
    .filter(e => e.expense_date?.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0)

  const lastMonthDepenses = expenses
    .filter(e => e.expense_date?.startsWith(lastMonth))
    .reduce((s, e) => s + Number(e.amount), 0)

  const depenseChange = lastMonthDepenses > 0
    ? ((monthlyDepenses - lastMonthDepenses) / lastMonthDepenses) * 100
    : 0

  const monthlyRba7 = monthlyEncaissements - monthlyDepenses

  const totalImpayes = installments.reduce(
    (s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0
  )

  const monthlyPaymentsCount = payments.filter(p => p.payment_date?.startsWith(thisMonth)).length

  const newStudentsThisMonth = students.filter(
    s => s.created_at?.startsWith(thisMonth)
  ).length

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX PRINCIPAL : balance avec paiements actifs seulement
  // ═══════════════════════════════════════════════════════════
  const caisseBalances = useMemo(() => {
    return caisses.map(c => {
      const initial = Number(c.initial_balance || 0)
      const inPay = payments
        .filter(p => p.cash_register_id === c.id)
        .reduce((s, p) => s + Number(p.amount), 0)
      const outExp = expenses
        .filter(e => e.cash_register_id === c.id)
        .reduce((s, e) => s + Number(e.amount), 0)
      const inTrans = transfers
        .filter(t => t.to_cash_register_id === c.id)
        .reduce((s, t) => s + Number(t.amount), 0)
      const outTrans = transfers
        .filter(t => t.from_cash_register_id === c.id)
        .reduce((s, t) => s + Number(t.amount), 0)
      return {
        ...c,
        balance: initial + inPay - outExp + inTrans - outTrans,
      }
    })
  }, [caisses, payments, expenses, transfers])

  const totalBalance = caisseBalances.reduce((s, c) => s + c.balance, 0)

  // ============ CHARTS ============
  const monthlyChartData = useMemo(() => {
    const data: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthKey = d.toISOString().slice(0, 7)
      const monthName = ARABIC_MONTHS[d.getMonth()]

      const enc = payments
        .filter(p => p.payment_date?.startsWith(monthKey))
        .reduce((s, p) => s + Number(p.amount), 0)

      const dep = expenses
        .filter(e => e.expense_date?.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.amount), 0)

      data.push({
        name: monthName,
        encaissements: Number(enc.toFixed(2)),
        depenses: Number(dep.toFixed(2)),
        rba7: Number((enc - dep).toFixed(2)),
      })
    }
    return data
  }, [payments, expenses])

  const serviceDistribution = useMemo(() => {
    const studentContracts = new Map<string, string[]>()
    contracts.forEach(c => {
      if (!studentContracts.has(c.student_id)) studentContracts.set(c.student_id, [])
      studentContracts.get(c.student_id)!.push(c.id)
    })

    const contractServices = new Map<string, string[]>()
    contractItems.forEach(ci => {
      if (!contractServices.has(ci.contract_id)) contractServices.set(ci.contract_id, [])
      contractServices.get(ci.contract_id)!.push(ci.service_id)
    })

    const result: any[] = []
    services.forEach(svc => {
      const total = payments
        .filter(p => {
          const studentCts = studentContracts.get(p.student_id) || []
          return studentCts.some(cid => (contractServices.get(cid) || []).includes(svc.id))
        })
        .reduce((s, p) => s + Number(p.amount), 0)

      if (total > 0) result.push({ name: svc.name, value: Number(total.toFixed(2)) })
    })
    return result
  }, [services, payments, contracts, contractItems])

  const filteredRecentPayments = useMemo(() => {
    if (!searchPayment.trim()) return recentPayments
    const term = searchPayment.toLowerCase()
    return recentPayments.filter(p => {
      const name = `${p.students?.first_name || ''} ${p.students?.last_name || ''}`.toLowerCase()
      return name.includes(term) || (p.installments?.description || '').toLowerCase().includes(term)
    })
  }, [recentPayments, searchPayment])

  const topImpayes = useMemo(() => {
    const studentImpayes = new Map<string, { name: string, amount: number }>()
    installments.forEach(i => {
      const s = students.find(x => x.id === i.student_id)
      if (!s) return
      const key = s.id
      const remaining = Number(i.amount) - Number(i.paid_amount)
      if (!studentImpayes.has(key)) {
        studentImpayes.set(key, { name: `${s.first_name} ${s.last_name}`, amount: 0 })
      }
      studentImpayes.get(key)!.amount += remaining
    })
    return Array.from(studentImpayes.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [installments, students])

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* HEADER */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">لوحة القيادة</p>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            مرحباً {userName || 'المدير'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">هذه أهم مؤشرات مؤسستك اليوم</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
            🏫 {schoolName || '-'}
          </span>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* ═══ QUICK ACTIONS (style secrétaire) ═══ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold text-slate-800 text-lg">الوصول السريع</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className={`group relative bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-200 overflow-hidden text-right`}
              >
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/10 group-hover:bg-white/20 transition" />
                <div className="absolute -bottom-10 -left-6 w-16 h-16 rounded-full bg-white/5" />

                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-extrabold text-base leading-tight text-white drop-shadow-sm">
                    {action.label}
                  </p>
                  <p className="text-xs font-medium text-white/95 mt-1 leading-tight">
                    {action.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Encaissements */}
        <button
          onClick={() => router.push('/dashboard/payments')}
          className="text-right bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
              <TrendingUp className="h-6 w-6" />
            </div>
            {encaissementChange !== 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                encaissementChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {encaissementChange >= 0 ? '↑' : '↓'} {Math.abs(encaissementChange).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-800">{monthlyEncaissements.toFixed(2)} DH</p>
          <p className="text-xs text-slate-500 mt-1">
            مداخيل هذا الشهر ({monthlyPaymentsCount} دفعة)
          </p>
        </button>

        {/* Dépenses */}
        <button
          onClick={() => router.push('/dashboard/expenses')}
          className="text-right bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-red-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition">
              <TrendingDown className="h-6 w-6" />
            </div>
            {depenseChange !== 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                depenseChange <= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {depenseChange >= 0 ? '↑' : '↓'} {Math.abs(depenseChange).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-800">{monthlyDepenses.toFixed(2)} DH</p>
          <p className="text-xs text-slate-500 mt-1">مصاريف هذا الشهر</p>
        </button>

        {/* Rba7 */}
        <button
          onClick={() => router.push('/dashboard/reports')}
          className={`text-right rounded-2xl p-5 border shadow-sm hover:shadow-md transition group ${
            monthlyRba7 >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-600'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-lg">
              {monthlyRba7 >= 0 ? '✅ ربح' : '⚠️ خسارة'}
            </span>
          </div>
          <p className="text-2xl font-bold">{monthlyRba7.toFixed(2)} DH</p>
          <p className="text-xs opacity-90 mt-1">النتيجة (مداخيل - مصاريف)</p>
        </button>

        {/* Impayés */}
        <button
          onClick={() => router.push('/dashboard/impayes')}
          className={`text-right rounded-2xl p-5 border shadow-sm hover:shadow-md transition group ${
            totalImpayes > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition ${
              totalImpayes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertCircle className="h-6 w-6" />
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
              totalImpayes > 0 ? 'text-amber-700 bg-amber-100' : 'text-slate-500 bg-slate-100'
            }`}>
              {installments.length} قسط
            </span>
          </div>
          <p className={`text-2xl font-bold ${totalImpayes > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {totalImpayes.toFixed(2)} DH
          </p>
          <p className="text-xs text-slate-500 mt-1">إجمالي المتأخرات</p>
        </button>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => router.push('/dashboard/students')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-indigo-300 transition"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500 truncate">تلميذ نشط</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/families')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-emerald-300 transition"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Home className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{families.length}</p>
            <p className="text-xs text-slate-500 truncate">أسرة</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/contracts')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-purple-300 transition"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{contracts.length}</p>
            <p className="text-xs text-slate-500 truncate">عقد</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/services')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-amber-300 transition"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{services.length}</p>
            <p className="text-xs text-slate-500 truncate">خدمة</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/enroll')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-cyan-300 transition"
        >
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 flex-shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{newStudentsThisMonth}</p>
            <p className="text-xs text-slate-500 truncate">تسجيل جديد</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/caisse')}
          className="text-right bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 hover:shadow-md hover:border-slate-400 transition"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 flex-shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-800">{totalBalance.toFixed(0)} DH</p>
            <p className="text-xs text-slate-500 truncate">إجمالي الصناديق</p>
          </div>
        </button>
      </div>

      <DirectorWidgets />

      {/* CAISSES SECTION */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800">الصناديق ({caisseBalances.length})</h3>
          </div>
          <button
            onClick={() => router.push('/dashboard/caisse')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            عرض الكل ←
          </button>
        </div>
        {caisseBalances.length === 0 ? (
          <p className="text-center text-slate-400 py-8">لا توجد صناديق</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {caisseBalances.map((c) => {
              const isCentral = c.type === 'central' || c.type === 'principal'
              const isSecr = c.type === 'secretary'
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/dashboard/caisse/${c.id}`)}
                  className="text-right bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCentral ? 'bg-indigo-100 text-indigo-600' :
                    isSecr ? 'bg-emerald-100 text-emerald-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {isCentral ? <Building2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className={`text-lg font-bold ${c.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {c.balance.toFixed(2)} DH
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800">المداخيل والمصاريف (6 أشهر)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
              <YAxis fontSize={10} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                formatter={(value: any) => `${Number(value).toFixed(2)} DH`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="encaissements" fill="#10B981" name="مداخيل" radius={[4, 4, 0, 0]} />
              <Bar dataKey="depenses" fill="#EF4444" name="مصاريف" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="font-bold text-slate-800">توزيع المداخيل حسب الخدمة</h3>
          </div>
          {serviceDistribution.length === 0 ? (
            <p className="text-center text-slate-400 py-20">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(e: any) => `${e.name}: ${Number(e.value).toFixed(0)}`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {serviceDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} DH`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* LINE CHART */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="font-bold text-slate-800">تطور الأرباح (6 أشهر)</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
            <YAxis fontSize={10} stroke="#94A3B8" />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(value: any) => `${Number(value).toFixed(2)} DH`}
            />
            <Line
              type="monotone"
              dataKey="rba7"
              stroke="#4F46E5"
              strokeWidth={3}
              name="الربح"
              dot={{ r: 5, fill: '#4F46E5' }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RECENT PAYMENTS + TOP IMPAYES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800">آخر المدفوعات</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchPayment}
                  onChange={(e) => setSearchPayment(e.target.value)}
                  placeholder="بحث..."
                  className="w-40 md:w-56 pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => router.push('/dashboard/payments')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
              >
                عرض الكل ←
              </button>
            </div>
          </div>
          {filteredRecentPayments.length === 0 ? (
            <p className="text-center text-slate-400 py-12">لا توجد مدفوعات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">التلميذ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">القسط</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {p.students ? `${p.students.first_name} ${p.students.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.installments?.description || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600">+ {Number(p.amount).toFixed(2)} DH</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              أكبر المتأخرات
            </h3>
            <button
              onClick={() => router.push('/dashboard/impayes')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              عرض الكل ←
            </button>
          </div>
          {topImpayes.length === 0 ? (
            <p className="text-center text-slate-400 py-12">لا توجد متأخرات 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topImpayes.map((s, i) => (
                <div key={i} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  </div>
                  <p className="text-sm font-bold text-red-600 whitespace-nowrap">{s.amount.toFixed(2)} DH</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600" />
            آخر الإشعارات
          </h3>
          <button onClick={() => router.push('/dashboard/notifications')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            عرض الكل ←
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`p-3 rounded-lg border text-sm ${!n.read ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-xs ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                  {n.title}
                </p>
                {n.message && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}