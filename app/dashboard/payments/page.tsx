'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import Amount from '@/components/Amount'
import DateInput from '@/components/DateInput'
import * as XLSX from 'xlsx'
import {
  Search, Plus, FileText, RefreshCw, Filter, TrendingUp,
  Wallet, Calendar, Building2, Download, X, Eye,
  Trash2, AlertTriangle, Lock, CheckCircle2,
} from 'lucide-react'

type Payment = {
  id: string
  amount: number
  payment_date: string
  method: string
  reference: string | null
  notes: string | null
  student_id: string
  installment_id: string | null
  cash_register_id: string | null
  user_id: string | null
  students: { first_name: string; last_name: string } | null
  installments: { description: string } | null
  cash_registers: { name: string } | null
}

type CashRegister = {
  id: string
  name: string
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً',
  cheque: 'شيك',
  transfer: 'تحويل',
  card: 'بطاقة',
  other: 'أخرى',
}

const METHOD_COLORS: Record<string, string> = {
  cash: 'bg-emerald-100 text-emerald-700',
  cheque: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  card: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
}

export default function PaymentsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { role, loading: roleLoading } = useUserRole()
  const canViewPayments = hasPermission('payments', 'view')
  const canCreatePayments = hasPermission('payments', 'create')

  const isSecretary = role === 'secretaire'
  const isDirector = role === 'directeur'

  const [payments, setPayments] = useState<Payment[]>([])
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')

  // Filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [caisseFilter, setCaisseFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Cancel modal states
  const [cancelPayment, setCancelPayment] = useState<Payment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelConfirmText, setCancelConfirmText] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role) return
    fetchPayments(establishmentId)
  }, [establishmentId, role])

  const fetchPayments = async (sid: string) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // 1. Jib caisses (filtered b rôle)
    let caisseQuery = supabase
      .from('cash_registers')
      .select('id, name')
      .eq('establishment_id', sid)

    if (isSecretary) {
      caisseQuery = caisseQuery.eq('owner_user_id', user.id)
    }

    const { data: cashData } = await caisseQuery
    setCashRegisters(cashData || [])

    const caisseIds = (cashData || []).map(c => c.id)

    // 2. Jib paiements
    let query = supabase
      .from('payments')
      .select(`
        id, amount, payment_date, method, reference, notes,
        student_id, installment_id, cash_register_id, user_id,
        students (first_name, last_name),
        installments (description),
        cash_registers (name)
      `)
      .eq('establishment_id', sid)

    if (isSecretary && caisseIds.length > 0) {
      query = query.in('cash_register_id', caisseIds)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setPayments(data || [])
    setLoading(false)
  }

  // ✅ Filtrage
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const name = `${p.students?.first_name || ''} ${p.students?.last_name || ''}`.toLowerCase()
        const desc = (p.installments?.description || '').toLowerCase()
        const ref = (p.reference || '').toLowerCase()
        if (!name.includes(term) && !desc.includes(term) && !ref.includes(term)) return false
      }
      if (methodFilter !== 'all' && p.method !== methodFilter) return false
      if (caisseFilter !== 'all' && p.cash_register_id !== caisseFilter) return false
      if (dateFrom && p.payment_date < dateFrom) return false
      if (dateTo && p.payment_date > dateTo) return false
      return true
    })
  }, [payments, searchTerm, methodFilter, caisseFilter, dateFrom, dateTo])

  const totals = useMemo(() => {
    return filteredPayments.reduce((acc, p) => ({
      count: acc.count + 1,
      amount: acc.amount + Number(p.amount),
    }), { count: 0, amount: 0 })
  }, [filteredPayments])

  const resetFilters = () => {
    setSearchTerm('')
    setMethodFilter('all')
    setCaisseFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = searchTerm || methodFilter !== 'all' || caisseFilter !== 'all' || dateFrom || dateTo

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      alert('لا توجد مدفوعات للتصدير')
      return
    }

    const data = filteredPayments.map(p => ({
      'التاريخ': p.payment_date,
      'التلميذ': p.students ? `${p.students.first_name} ${p.students.last_name}` : '-',
      'القسط': p.installments?.description || '-',
      'المبلغ': Number(p.amount),
      'الطريقة': METHOD_LABELS[p.method] || p.method,
      'المرجع': p.reference || '-',
      'الصندوق': p.cash_registers?.name || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المدفوعات')
    XLSX.writeFile(wb, `payments-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // ✅ Chkoun kay9der y-annulli paiement
  const canCancelPayment = (p: Payment): boolean => {
    if (isDirector) return true

    if (isSecretary) {
      if (p.user_id !== currentUserId) return false

      const paymentDate = new Date(p.payment_date)
      const today = new Date()
      const diffDays = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 1
    }

    return false
  }

  // ✅ OPEN CANCEL
  const handleOpenCancel = (payment: Payment) => {
    if (!canCancelPayment(payment)) {
      alert('❌ لا يمكنك إلغاء هذه الدفعة\n\n- السكرتيرة يمكنها إلغاء دفعاتها فقط في نفس اليوم')
      return
    }
    setCancelPayment(payment)
    setCancelReason('')
    setCancelConfirmText('')
  }

  // ✅ CLOSE MODAL
  const closeCancelModal = () => {
    setCancelPayment(null)
    setCancelReason('')
    setCancelConfirmText('')
  }

  // ✅ CONFIRM CANCEL
  const handleConfirmCancel = async () => {
    if (!cancelPayment || !establishmentId) return

    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      setError('⚠️ سبب الإلغاء مطلوب (5 أحرف على الأقل)')
      return
    }

    if (cancelConfirmText.trim().toUpperCase() !== 'إلغاء') {
      setError('⚠️ اكتب كلمة "إلغاء" للتأكيد')
      return
    }

    setCancelling(true)
    setError('')

    const supabase = createClient()

    try {
      const paymentId = cancelPayment.id
      const studentId = cancelPayment.student_id
      const installmentId = cancelPayment.installment_id
      const amount = Number(cancelPayment.amount)

      // 1. LOG audit
      await supabase.from('notifications').insert({
        user_id: currentUserId,
        establishment_id: establishmentId,
        type: 'payment_cancelled',
        title: '🗑️ تم إلغاء دفعة',
        message: `تم إلغاء دفعة بمبلغ ${amount.toFixed(2)} DH\nالسبب: ${cancelReason.trim()}`,
        metadata: {
          payment_id: paymentId,
          amount,
          student_id: studentId,
          reason: cancelReason.trim(),
          cancelled_by: currentUserId,
        },
      })

      // 2. RJE3 installment
      if (installmentId) {
        const { data: inst } = await supabase
          .from('installments')
          .select('id, amount, paid_amount, status')
          .eq('id', installmentId)
          .single()

        if (inst) {
          const newPaidAmount = Math.max(0, Number(inst.paid_amount) - amount)
          const newStatus = newPaidAmount === 0
            ? 'pending'
            : newPaidAmount < Number(inst.amount)
            ? 'partially_paid'
            : 'paid'

          await supabase
            .from('installments')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
            })
            .eq('id', installmentId)
        }
      }

      // 3. MSA7 paiement
      const { error: delError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (delError) throw delError

      // 4. Notification l créateur
      if (cancelPayment.user_id && cancelPayment.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: cancelPayment.user_id,
          establishment_id: establishmentId,
          type: 'payment_cancelled_by',
          title: '⚠️ تم إلغاء دفعة سجلتها',
          message: `تم إلغاء دفعة بمبلغ ${amount.toFixed(2)} DH\nالسبب: ${cancelReason.trim()}`,
          link: '/dashboard/payments',
          metadata: { payment_id: paymentId, reason: cancelReason.trim() },
        })
      }

      fetchPayments(establishmentId)
      closeCancelModal()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setCancelling(false)
    }
  }

  if (loading || permissionsLoading || roleLoading) {
    return <div className="p-6 text-center">Chargement...</div>
  }

  if (!canViewPayments) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">

      {/* HEADER */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            {isSecretary ? 'مدفوعاتي' : 'المدفوعات'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSecretary ? 'جميع الدفعات المسجلة في صندوقك' : 'جميع مدفوعات المؤسسة'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fetchPayments(establishmentId!)}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium text-sm"
          >
            <Download className="h-4 w-4" /> تصدير Excel
          </button>
          {canCreatePayments && (
            <button
              onClick={() => router.push('/dashboard/payments/new')}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
            >
              <Plus className="h-4 w-4" /> دفعة جديدة
            </button>
          )}
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">إجمالي المدفوعات</span>
          </div>
          <p className="text-3xl font-bold">{totals.amount.toFixed(2)} DH</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium">عدد الدفعات</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
          <p className="text-xs text-slate-500 mt-1">من أصل {payments.length} إجمالي</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-amber-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">متوسط الدفعة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {totals.count > 0 ? (totals.amount / totals.count).toFixed(2) : '0.00'} DH
          </p>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، القسط، أو المرجع..."
              className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 h-11 rounded-lg font-medium text-sm transition ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            فلاتر
            {hasActiveFilters && (
              <span className="bg-white/20 rounded-full px-2 text-xs">
                {[searchTerm, methodFilter !== 'all', caisseFilter !== 'all', dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-4 h-11 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" /> مسح
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">طريقة الدفع</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="all">الكل</option>
                <option value="cash">نقداً</option>
                <option value="cheque">شيك</option>
                <option value="transfer">تحويل</option>
                <option value="card">بطاقة</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">الصندوق</label>
              <select
                value={caisseFilter}
                onChange={(e) => setCaisseFilter(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="all">الكل</option>
                {cashRegisters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">من تاريخ</label>
              <DateInput value={dateFrom} onChange={setDateFrom} className="h-10" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">إلى تاريخ</label>
              <DateInput value={dateTo} onChange={setDateTo} className="h-10" />
            </div>
          </div>
        )}
      </div>

      {/* LISTE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">
            قائمة المدفوعات ({filteredPayments.length})
          </h2>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-16 text-center">
            <Wallet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {hasActiveFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد مدفوعات'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-indigo-600 hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسط</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطريقة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصندوق</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payment.payment_date}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.students ? `${payment.students.first_name} ${payment.students.last_name}` : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {payment.installments?.description || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      + {Number(payment.amount).toFixed(2)} DH
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        METHOD_COLORS[payment.method] || 'bg-slate-100 text-slate-700'
                      }`}>
                        {METHOD_LABELS[payment.method] || payment.method}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payment.cash_registers?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {/* Reçu PDF */}
                        <button
                          onClick={() => window.open(`/api/pdf/payment-receipt?paymentId=${payment.id}`, '_blank')}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="تحميل الإيصال"
                        >
                          <FileText className="h-4 w-4" />
                        </button>

                        {/* Annuler */}
                        <button
                          onClick={() => handleOpenCancel(payment)}
                          className={`p-1.5 rounded-lg transition ${
                            canCancelPayment(payment)
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                          title={canCancelPayment(payment) ? 'إلغاء الدفعة' : 'لا يمكن الإلغاء'}
                          disabled={!canCancelPayment(payment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* FOOTER TOTAL */}
            <div className="bg-slate-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">المجموع</span>
              <span className="text-lg font-bold text-emerald-700">
                {totals.amount.toFixed(2)} DH
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ============ CANCEL MODAL ============ */}
      {cancelPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">إلغاء الدفعة</h3>
                <p className="text-sm text-slate-500">لا يمكن التراجع عن هذه العملية</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">التلميذ</span>
                <span className="font-medium text-slate-800">
                  {cancelPayment.students ? `${cancelPayment.students.first_name} ${cancelPayment.students.last_name}` : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">القسط</span>
                <span className="font-medium text-slate-800">{cancelPayment.installments?.description || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">التاريخ</span>
                <span className="font-medium text-slate-800">{cancelPayment.payment_date}</span>
              </div>
              <div className="flex justify-between text-base border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-500 font-medium">المبلغ</span>
                <span className="font-bold text-red-600">- {Number(cancelPayment.amount).toFixed(2)} DH</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ ما سيحدث:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>سيتم حذف الدفعة نهائياً</li>
                <li>سيتم إرجاع القسط إلى حالته السابقة (متبقي +{Number(cancelPayment.amount).toFixed(2)} DH)</li>
                <li>سيتم تسجيل العملية في السجل</li>
                <li>سيتم إشعار الطرف المعني</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                سبب الإلغاء <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                required
                minLength={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                placeholder="مثال: خطأ في المبلغ، دفعة مكررة، إلغاء من طرف ولي الأمر..."
              />
              <p className="text-xs text-slate-500 mt-1">
                {cancelReason.length}/5 أحرف على الأقل
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                للتأكيد، اكتب كلمة <span className="text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">إلغاء</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cancelConfirmText}
                onChange={(e) => setCancelConfirmText(e.target.value)}
                className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-bold"
                placeholder="اكتب هنا..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim() || cancelConfirmText.trim().toUpperCase() !== 'إلغاء'}
                className="h-11 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                {cancelling ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
              <button
                onClick={closeCancelModal}
                disabled={cancelling}
                className="h-11 px-6 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}