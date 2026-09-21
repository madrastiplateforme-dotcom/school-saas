'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  CreditCard, Search, RefreshCw, Building2, Users, TrendingUp,
  AlertCircle, CheckCircle2, Clock, X, Save, Calendar, DollarSign,
  MoreVertical, Ban, PlayCircle, FileText,
} from 'lucide-react'

type SchoolSub = {
  id: string
  establishment_id: string
  plan: 'gratuit' | 'standard' | 'pro'
  status: 'active' | 'suspended' | 'cancelled'
  started_at: string
  current_period_start: string | null
  current_period_end: string | null
  school_name: string
  students_count: number
  active_student_count: number
  monthly_amount: number
  invoices_count: number
  unpaid_amount: number
}

const PRICE_PER_STUDENT = 1.5
const FREE_STUDENTS = 20

const calcAmount = (students: number) => {
  const billable = Math.max(0, students - FREE_STUDENTS)
  return Math.round(billable * PRICE_PER_STUDENT * 100) / 100
}

const formatMoney = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const planLabel = (p: string) =>
  p === 'gratuit' ? 'مجانية' : p === 'standard' ? 'قياسية' : 'احترافية'

const statusLabel = (s: string) =>
  s === 'active' ? 'نشط' : s === 'suspended' ? 'موقوف' : 'ملغى'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SchoolSub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlan, setFilterPlan] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. All subscriptions + establishments
    const { data: subsData, error: subsErr } = await supabase
      .from('school_subscriptions')
      .select(`
        id, establishment_id, plan, status, started_at,
        current_period_start, current_period_end,
        establishments(name)
      `)
      .order('created_at', { ascending: false })

    if (subsErr) {
      setError(subsErr.message)
      setLoading(false)
      return
    }

    const estabIds = (subsData || [])
      .map((s: any) => s.establishment_id)
      .filter(Boolean)

    // ✅ 2. Années courantes par établissement
    const currentYearByEstab = new Map<string, string>()
    if (estabIds.length > 0) {
      const { data: currentYears } = await supabase
        .from('academic_years')
        .select('id, establishment_id')
        .eq('is_current', true)
        .in('establishment_id', estabIds)

      ;(currentYears || []).forEach((y: any) => {
        if (y.establishment_id && y.id) {
          currentYearByEstab.set(y.establishment_id, y.id)
        }
      })
    }

    const yearIds = Array.from(currentYearByEstab.values())

    // ✅ 3. Élèves actifs f l'année courante per établissement
    const activeCountByEstab = new Map<string, number>()
    if (yearIds.length > 0) {
      const { data: enrollsData } = await supabase
        .from('enrollments')
        .select('student_id, academic_year_id')
        .in('academic_year_id', yearIds)
        .eq('status', 'active')

      const yearToEstab = new Map<string, string>()
      currentYearByEstab.forEach((yearId, estabId) => {
        yearToEstab.set(yearId, estabId)
      })

      const studentSetByEstab = new Map<string, Set<string>>()
      ;(enrollsData || []).forEach((e: any) => {
        const estabId = yearToEstab.get(e.academic_year_id)
        if (!estabId || !e.student_id) return
        if (!studentSetByEstab.has(estabId)) {
          studentSetByEstab.set(estabId, new Set())
        }
        studentSetByEstab.get(estabId)!.add(e.student_id)
      })

      studentSetByEstab.forEach((set, estabId) => {
        activeCountByEstab.set(estabId, set.size)
      })
    }

    // 4. For each, count students (global) + invoices
    const rows: SchoolSub[] = []
    for (const s of subsData || []) {
      const { count: studentsCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', s.establishment_id)
        .eq('status', 'active')

      const { data: invs } = await supabase
        .from('subscription_invoices')
        .select('amount, status')
        .eq('establishment_id', s.establishment_id)

      const invoicesCount = (invs || []).length
      const unpaidAmount = (invs || [])
        .filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0)

      rows.push({
        id: s.id,
        establishment_id: s.establishment_id,
        plan: s.plan as any,
        status: s.status as any,
        started_at: s.started_at,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        school_name: (s.establishments as any)?.name || '—',
        students_count: studentsCount || 0,
        active_student_count: activeCountByEstab.get(s.establishment_id) || 0,
        monthly_amount: calcAmount(studentsCount || 0),
        invoices_count: invoicesCount,
        unpaid_amount: unpaidAmount,
      })
    }

    setSubs(rows)
    setLoading(false)
  }

  const handleChangePlan = async (sub: SchoolSub, newPlan: 'gratuit' | 'standard' | 'pro') => {
    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('school_subscriptions')
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (upErr) {
      setError(upErr.message)
    } else {
      setSuccess(`تم تغيير خطة ${sub.school_name} إلى "${planLabel(newPlan)}"`)
      setTimeout(() => setSuccess(''), 2500)
      await loadAll()
    }
  }

  const handleToggleStatus = async (sub: SchoolSub) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active'
    if (!confirm(`${newStatus === 'suspended' ? 'إيقاف' : 'تفعيل'} اشتراك "${sub.school_name}"؟`)) return

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('school_subscriptions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (upErr) {
      setError(upErr.message)
    } else {
      setSuccess(`تم ${newStatus === 'suspended' ? 'إيقاف' : 'تفعيل'} ${sub.school_name}`)
      setTimeout(() => setSuccess(''), 2500)
      await loadAll()
    }
  }

  const filtered = subs.filter(s => {
    if (filterStatus && s.status !== filterStatus) return false
    if (filterPlan && s.plan !== filterPlan) return false
    if (search && !s.school_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalStudents = subs.reduce((s, r) => s + r.students_count, 0)
  const totalActiveStudents = subs.reduce((s, r) => s + r.active_student_count, 0)
  const totalMonthlyRevenue = subs
    .filter(s => s.status === 'active')
    .reduce((s, r) => s + r.monthly_amount, 0)
  const totalUnpaid = subs.reduce((s, r) => s + r.unpaid_amount, 0)

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            اشتراكات المدارس
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة خطط الاشتراك والمداخيل الشهرية
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/invoices"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <FileText className="h-4 w-4" /> الفواتير
          </Link>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المدارس</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{subs.length}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">النشطون (السنة الجارية)</span>
          </div>
          <div className="text-2xl font-bold">{totalActiveStudents}</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">إجمالي التلاميذ (كلي)</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalStudents}</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المداخيل الشهرية</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatMoney(totalMonthlyRevenue)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${
          totalUnpaid > 0 ? 'border-rose-200' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              totalUnpaid > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
            }`}>
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">غير مدفوع</span>
          </div>
          <div className={`text-xl font-bold ${totalUnpaid > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatMoney(totalUnpaid)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن مدرسة..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">كل الخطط</option>
            <option value="gratuit">مجانية</option>
            <option value="standard">قياسية</option>
            <option value="pro">احترافية</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {subs.length === 0 ? 'لا توجد مدارس' : 'لا توجد نتائج'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    المدرسة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    النشطون
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الكلي
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الخطة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    المبلغ الشهري
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الفواتير
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const isActive = s.status === 'active'
                  const isFree = s.monthly_amount === 0
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {s.school_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{s.school_name}</p>
                            <p className="text-xs text-slate-400">
                              منذ {formatDate(s.started_at)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                          <Users className="h-3.5 w-3.5" />
                          {s.active_student_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium">
                        {s.students_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={s.plan}
                          onChange={(e) => handleChangePlan(s, e.target.value as any)}
                          className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer ${
                            s.plan === 'gratuit' ? 'bg-slate-100 text-slate-700' :
                            s.plan === 'standard' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}
                        >
                          <option value="gratuit">مجانية</option>
                          <option value="standard">قياسية</option>
                          <option value="pro">احترافية</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`text-sm font-bold ${isFree ? 'text-slate-400' : 'text-emerald-600'}`}>
                          {formatMoney(s.monthly_amount)}
                          <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
                        </div>
                        {!isFree && (
                          <p className="text-[10px] text-slate-400">
                            {s.students_count} - 20 = {s.students_count - 20} × 1.5
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <CheckCircle2 className="h-3 w-3" /> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded">
                            <Ban className="h-3 w-3" /> موقوف
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-bold text-slate-700">{s.invoices_count}</div>
                        {s.unpaid_amount > 0 && (
                          <p className="text-[10px] text-rose-600 font-bold">
                            غير مدفوع: {formatMoney(s.unpaid_amount)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/subscriptions/${s.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="التفاصيل"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className={`p-1.5 rounded-lg transition ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'إيقاف' : 'تفعيل'}
                          >
                            {isActive ? <Ban className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-800">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>معادلة الحساب:</strong> المبلغ الشهري = (عدد التلاميذ الكلي − 20) × 1.5 د.م. المدارس اللي عندها 20 تلميذاً أو أقل مجانية. عمود <strong>النشطون</strong> = élèves مسجلين فـ السنة الجارية.
        </div>
      </div>
    </div>
  )
}