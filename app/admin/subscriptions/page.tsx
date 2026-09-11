'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { CreditCard, RefreshCw } from 'lucide-react'

type SubscriptionInvoice = {
  id: string
  establishment_id: string
  billing_month: string
  student_count: number
  amount: number
  status: string
  paid_at: string | null
  created_at: string
  establishments?: { name: string }
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentModal, setPaymentModal] = useState<SubscriptionInvoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [runningDailyCheck, setRunningDailyCheck] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data: adminData }) => {
          if (!adminData) {
            setError('غير مصرح')
            setLoading(false)
            return
          }
          generateInvoicesAndFetch()
        })
    })
  }, [])

  const generateInvoicesAndFetch = async () => {
    setLoading(true)
    try {
      // توليد الفواتير الناقصة
      await fetch('/api/admin/subscription-invoices/generate', { method: 'POST' })

      // جلب الفواتير
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*, establishments(name)')
        .order('billing_month', { ascending: false })

      if (error) setError(error.message)
      else setInvoices(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDailyCheck = async () => {
    setRunningDailyCheck(true)
    try {
      const res = await fetch('/api/admin/daily-check', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')
      alert(`تم الفحص اليومي: ${data.updatedInvoices} فاتورة تأخرت، ${data.suspended} مؤسسة أوقفت`)
      generateInvoicesAndFetch() // تحديث البيانات
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRunningDailyCheck(false)
    }
  }

  const handleSavePayment = async () => {
    if (!paymentModal) return
    setSavingPayment(true)
    setError('')

    try {
      const supabase = createClient()
      // تسجيل دفعة في subscription_payments
      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          establishment_id: paymentModal.establishment_id,
          amount: Number(paymentAmount),
          payment_date: new Date().toISOString().split('T')[0],
          period_start: paymentModal.billing_month,
          period_end: paymentModal.billing_month,
          notes: paymentNotes,
        })

      if (paymentError) throw paymentError

      // تحديث حالة الفاتورة
      const { error: updateError } = await supabase
        .from('subscription_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentModal.id)

      if (updateError) throw updateError

      // تحديث حالة الاشتراك في المؤسسة
      await supabase
        .from('establishments')
        .update({ subscription_status: 'paid' })
        .eq('id', paymentModal.establishment_id)

      await logAudit('pay_subscription_invoice', { invoiceId: paymentModal.id, amount: paymentAmount }, paymentModal.establishment_id)

      setPaymentModal(null)
      setPaymentAmount('')
      setPaymentNotes('')
      generateInvoicesAndFetch()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">فواتير الاشتراكات الشهرية</h1>
        <div className="flex gap-2">
          <button
            onClick={generateInvoicesAndFetch}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
          <button
            onClick={handleDailyCheck}
            disabled={runningDailyCheck}
            className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg hover:bg-yellow-200 disabled:opacity-50 text-sm"
          >
            {runningDailyCheck ? 'جارٍ الفحص...' : 'تشغيل الفحص اليومي'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المؤسسة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شهر الفاتورة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد التلاميذ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد فواتير</td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.establishments?.name || invoice.establishment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice.billing_month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice.student_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.amount} DH</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {invoice.status === 'paid' ? 'مدفوع' : invoice.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.status !== 'paid' && (
                      <button
                        onClick={() => {
                          setPaymentModal(invoice)
                          setPaymentAmount(String(invoice.amount))
                        }}
                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100 text-xs"
                      >
                        <CreditCard className="h-3 w-3" />
                        تسجيل دفعة
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* نافذة تسجيل دفعة */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">تسجيل دفعة فاتورة</h3>
            <p className="text-sm text-gray-600 mb-4">المؤسسة: {paymentModal.establishments?.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">المبلغ (DH)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="transfer">تحويل بنكي</option>
                  <option value="cash">نقداً</option>
                  <option value="cheque">شيك</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                ></textarea>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePayment}
                  disabled={savingPayment}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingPayment ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setPaymentModal(null)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}