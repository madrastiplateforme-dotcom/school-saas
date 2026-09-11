'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useLanguage } from '@/lib/LanguageContext'
import Amount from '@/components/Amount'
import { AlertCircle, ArrowUpRight, CalendarDays, PiggyBank, TrendingDown, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'

type Stats = {
  studentCount: number
  totalPaymentsThisMonth: number
  totalPaymentsAll: number
  totalExpensesThisMonth: number
  totalExpensesAll: number
  totalOutstanding: number
  totalBalance: number
}

const initialStats: Stats = { studentCount: 0, totalPaymentsThisMonth: 0, totalPaymentsAll: 0, totalExpensesThisMonth: 0, totalExpensesAll: 0, totalOutstanding: 0, totalBalance: 0 }

export default function Dashboard() {
  const establishmentId = useEstablishmentId()
  const { t } = useLanguage()
  const [stats, setStats] = useState<Stats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolName, setSchoolName] = useState('')

  const fetchStats = async (sid: string) => {
    setError('')
    const supabase = createClient()
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    try {
      const [studentsResult, paymentsMonthResult, paymentsAllResult, expensesMonthResult, expensesAllResult, installmentsResult, schoolResult] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('establishment_id', sid).eq('status', 'active'),
        supabase.from('payments').select('amount').eq('establishment_id', sid).eq('status', 'completed').gte('payment_date', firstDayOfMonth),
        supabase.from('payments').select('amount').eq('establishment_id', sid).eq('status', 'completed'),
        supabase.from('expenses').select('amount').eq('establishment_id', sid).gte('expense_date', firstDayOfMonth),
        supabase.from('expenses').select('amount').eq('establishment_id', sid),
        supabase.from('installments').select('amount, paid_amount, due_date, status').eq('establishment_id', sid),
        supabase.from('establishments').select('name').eq('id', sid).single(),
      ])
      const sum = (rows: { amount: number }[] | null) => rows?.reduce((total, row) => total + Number(row.amount), 0) || 0
      const totalPaymentsAll = sum(paymentsAllResult.data)
      const totalExpensesAll = sum(expensesAllResult.data)
      setStats({
        studentCount: studentsResult.count || 0,
        totalPaymentsThisMonth: sum(paymentsMonthResult.data),
        totalPaymentsAll,
        totalExpensesThisMonth: sum(expensesMonthResult.data),
        totalExpensesAll,
        totalOutstanding: installmentsResult.data?.filter((item) => item.status !== 'paid').reduce((total, item) => total + (Number(item.amount) - Number(item.paid_amount)), 0) || 0,
        totalBalance: totalPaymentsAll - totalExpensesAll,
      })
      if (schoolResult.data) setSchoolName(schoolResult.data.name)
    } catch {
      setError('Impossible de charger les indicateurs pour le moment.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!establishmentId) return
    const timer = window.setTimeout(() => { void fetchStats(establishmentId) }, 0)
    return () => window.clearTimeout(timer)
  }, [establishmentId])

  if (loading) return <div className="surface-card grid min-h-72 place-items-center text-slate-500">{t('loadingSpace')}</div>

  const metrics = [
    { label: t('activeStudents'), value: stats.studentCount.toString(), note: t('registeredStudents'), icon: Users, iconClass: 'bg-emerald-100 text-emerald-700' },
    { label: t('monthlyIncome'), value: <Amount value={stats.totalPaymentsThisMonth} />, note: t('confirmedPayments'), icon: TrendingUp, iconClass: 'bg-sky-100 text-sky-700' },
    { label: t('outstandingAmount'), value: <Amount value={stats.totalOutstanding} />, note: t('pendingInstallments'), icon: AlertCircle, iconClass: 'bg-amber-100 text-amber-700' },
    { label: t('availableBalance'), value: <Amount value={stats.totalBalance} />, note: stats.totalBalance >= 0 ? t('positiveSituation') : t('watchSituation'), icon: PiggyBank, iconClass: stats.totalBalance >= 0 ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700' },
  ]

  return (
    <div>
      <section className="relative overflow-hidden rounded-[1.5rem] bg-[#0b4c42] px-6 py-7 text-white shadow-xl shadow-emerald-950/10 sm:px-8">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-emerald-300/10" /><div className="absolute -bottom-24 right-12 h-56 w-56 rounded-full bg-amber-300/10" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center"><div><p className="text-sm font-bold text-emerald-200">{t('dashboardKicker')}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t('dashboardGreeting')}, {schoolName || t('school')}.</h1><p className="mt-2 text-emerald-50/80">{t('dashboardIntro')}</p></div><Link href="/dashboard/enroll" style={{ color: '#0b4c42' }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-emerald-50"><UserPlus className="h-4 w-4" />{t('enroll')}</Link></div>
      </section>

      {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{t('dashboardLoadError')}</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, iconClass }) => <article key={label} className="surface-card p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-black tracking-tight text-slate-800">{value}</p></div><span className={`grid h-11 w-11 place-items-center rounded-2xl ${iconClass}`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{note}</p></article>)}</section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <article className="surface-card p-6"><div className="flex items-start justify-between"><div><p className="page-kicker">{t('financialOverview')}</p><h2 className="mt-2 text-xl font-extrabold">{t('cashHealth')}</h2></div><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Wallet className="h-5 w-5" /></span></div><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-5"><p className="text-sm font-bold text-emerald-800">{t('cumulativeIncome')}</p><p className="mt-2 text-2xl font-black text-emerald-900"><Amount value={stats.totalPaymentsAll} /></p></div><div className="rounded-2xl bg-rose-50 p-5"><p className="text-sm font-bold text-rose-800">{t('cumulativeExpenses')}</p><p className="mt-2 text-2xl font-black text-rose-900"><Amount value={stats.totalExpensesAll} /></p></div></div><Link href="/dashboard/reports" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900">{t('viewReports')} <ArrowUpRight className="h-4 w-4" /></Link></article>
        <article className="surface-card p-6"><p className="page-kicker">{t('shortcuts')}</p><h2 className="mt-2 text-xl font-extrabold">{t('frequentActions')}</h2><div className="mt-5 space-y-2"><QuickLink href="/dashboard/payments/new" label={t('recordPayment')} icon={Wallet} /><QuickLink href="/dashboard/expenses" label={t('addExpense')} icon={TrendingDown} /><QuickLink href="/dashboard/installments" label={t('viewInstallments')} icon={CalendarDays} /></div></article>
      </section>
    </div>
  )
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Wallet }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-800"><span className="rounded-lg bg-slate-100 p-2"><Icon className="h-4 w-4" /></span>{label}<ArrowUpRight className="ml-auto h-4 w-4" /></Link>
}
