'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  CreditCard, RefreshCw, Users, Wallet, CheckCircle2, AlertCircle,
  Calendar, TrendingUp,
} from 'lucide-react'

type Installment = {
  id: string
  amount: number
  due_date: string | null
  is_paid: boolean
  paid_amount: number
  paid_date: string | null
}

type Payment = {
  id: string
  amount: number
  payment_date: string
  method: string | null
}

type Child = {
  id: string
  first_name: string
  last_name: string
  total_amount: number
  paid_amount: number
  unpaid_amount: number
  installments: Installment[]
  payments: Payment[]
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

export default function ParentPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState('')
  const [yearName, setYearName] = useState('')

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
        .select('id, name')
        .eq('establishment_id', estabId)
        .eq('is_current', true)
        .maybeSingle()

      if (year?.name) setYearName(year.name)

      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('family_id', family.id)
        .order('first_name')

      if (!students || students.length === 0) {
        setChildren([])
        setLoading(false)
        return
      }

      const childIds = students.map((s) => s.id)

      // Contracts
      let contractsData: any[] = []
      if (year?.id) {
        const { data } = await supabase
          .from('contracts')
          .select('id, student_id')
          .in('student_id', childIds)
          .eq('academic_year_id', year.id)
        contractsData = data || []
      }

      const contractIds = contractsData.map((c) => c.id)

      // Installments
      let installmentsData: any[] = []
      if (contractIds.length > 0) {
        const { data } = await supabase
          .from('installments')
          .select('id, contract_id, amount, due_date')
          .in('contract_id', contractIds)
          .order('due_date', { ascending: true })
        installmentsData = data || []
      }

      // Payments
      const instIds = installmentsData.map((i) => i.id)
      let paymentsData: any[] = []
      if (instIds.length > 0) {
        const { data } = await supabase
          .from('payments')
          .select('id, installment_id, amount, payment_date, method')
          .in('installment_id', instIds)
          .order('payment_date', { ascending: false })
        paymentsData = data || []
      }

      const result: Child[] = students.map((st) => {
        const childContracts = contractsData.filter((c) => c.student_id === st.id)
        const childContractIds = childContracts.map((c) => c.id)
        const childInsts = installmentsData.filter((i) =>
          childContractIds.includes(i.contract_id),
        )

        const instList: Installment[] = childInsts.map((inst: any) => {
          const instPays = paymentsData.filter((p) => p.installment_id === inst.id)
          const paidSum = instPays.reduce((s, p) => s + Number(p.amount || 0), 0)
          return {
            id: inst.id,
            amount: Number(inst.amount || 0),
            due_date: inst.due_date,
            is_paid: paidSum >= Number(inst.amount || 0),
            paid_amount: paidSum,
            paid_date: instPays[0]?.payment_date || null,
          }
        })

        const childPays: Payment[] = paymentsData
          .filter((p) => childInsts.some((i) => i.id === p.installment_id))
          .map((p: any) => ({
            id: p.id,
            amount: Number(p.amount || 0),
            payment_date: p.payment_date,
            method: p.method,
          }))

        const total = instList.reduce((s, i) => s + i.amount, 0)
        const paid = childPays.reduce((s, p) => s + p.amount, 0)

        return {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          total_amount: total,
          paid_amount: paid,
          unpaid_amount: Math.max(0, total - paid),
          installments: instList,
          payments: childPays,
        }
      })

      setChildren(result)
      if (result.length > 0) setActiveChild(result[0].id)
    } catch (e: any) {
      console.error('[parent-payments]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const current = children.find((c) => c.id === activeChild)
  const totalAll = children.reduce((s, c) => s + c.total_amount, 0)
  const paidAll = children.reduce((s, c) => s + c.paid_amount, 0)
  const unpaidAll = children.reduce((s, c) => s + c.unpaid_amount, 0)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            المدفوعات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {yearName && `${yearName} — `}
            تتبع مدفوعات أبنائك
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {children.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا يوجد أبناء مسجلون</p>
        </div>
      )}

      {/* Global stats */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">الإجمالي</span>
            </div>
            <div className="text-xl font-bold text-slate-800" dir="ltr">
              {formatMoney(totalAll)} <span className="text-xs text-slate-400">د.م</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">المدفوع</span>
            </div>
            <div className="text-xl font-bold text-emerald-600" dir="ltr">
              {formatMoney(paidAll)} <span className="text-xs text-slate-400">د.م</span>
            </div>
          </div>

          <div className={`bg-white rounded-2xl border shadow-sm p-5 ${
            unpaidAll > 0 ? 'border-rose-200' : 'border-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                unpaidAll > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <AlertCircle className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-500">المتبقي</span>
            </div>
            <div className={`text-xl font-bold ${unpaidAll > 0 ? 'text-rose-600' : 'text-slate-800'}`} dir="ltr">
              {formatMoney(unpaidAll)} <span className="text-xs text-slate-400">د.م</span>
            </div>
          </div>
        </div>
      )}

      {/* Children tabs */}
      {children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChild(c.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                activeChild === c.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.first_name}
              {c.unpaid_amount > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  !
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Installments */}
      {current && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                الأقساط ({current.installments.length})
              </h2>
              <div className="text-xs text-slate-500">
                {current.first_name}:{' '}
                <span className="font-bold text-emerald-600" dir="ltr">
                  {formatMoney(current.paid_amount)}
                </span>
                {' / '}
                <span className="font-bold text-slate-700" dir="ltr">
                  {formatMoney(current.total_amount)}
                </span>
                {' د.م'}
              </div>
            </div>

            {current.installments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">لا توجد أقساط مسجلة</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {current.installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          inst.is_paid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {inst.is_paid ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {formatDate(inst.due_date)}
                        </p>
                        <p
                          className={`text-xs ${
                            inst.is_paid ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {inst.is_paid
                            ? `مدفوع ${inst.paid_date ? `في ${formatDate(inst.paid_date)}` : ''}`
                            : 'غير مدفوع'}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        inst.is_paid ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                      dir="ltr"
                    >
                      {formatMoney(inst.amount)} د.م
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments history */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                سجل المدفوعات ({current.payments.length})
              </h2>
            </div>

            {current.payments.length === 0 ? (
              <div className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">لا توجد مدفوعات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {current.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {formatDate(p.payment_date)}
                        </p>
                        {p.method && (
                          <p className="text-xs text-slate-500">{p.method}</p>
                        )}
                      </div>
                    </div>
                    <div
                      className="text-sm font-bold text-emerald-600"
                      dir="ltr"
                    >
                      {formatMoney(p.amount)} د.م
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}