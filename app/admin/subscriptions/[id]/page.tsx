'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { sendInvoiceEmailById } from '@/lib/send-invoice-email';
import {
  ArrowRight, Building2, Users, TrendingUp, FileText, AlertCircle,
  CheckCircle2, Calendar, CreditCard, Download, Plus, X, Save,
  Ban, PlayCircle, Clock, DollarSign, Mail, Phone, MapPin,
} from 'lucide-react'

const PRICE_PER_STUDENT = 1.5
const FREE_STUDENTS = 20

const calcAmount = (students: number) => {
  const billable = Math.max(0, students - FREE_STUDENTS)
  return Math.round(billable * PRICE_PER_STUDENT * 100) / 100
}

// من بعد ما تخلق الفاتورة:
const { data: invoice } = await supabaseAdmin
  .from('subscription_invoices')
  .insert({ /* ... */ })
  .select('id')
  .single();

// ✅ صيفط الإيميل (ما كتسناش باش ما يطيحش الـ request)
if (invoice?.id) {
  try {
    await sendInvoiceEmailById(invoice.id);
  } catch (e) {
    console.error('[invoice-create] email failed', e);
  }
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

const monthNames = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر']
const monthName = (m: number) => monthNames[m - 1] || `شهر ${m}`

export default function SubscriptionDetailPage() {
  const params = useParams()
  const subId = params?.id as string

  const [sub, setSub] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [studentsCount, setStudentsCount] = useState(0)
  const [invoices, setInvoices] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New invoice modal
  const [showInvModal, setShowInvModal] = useState(false)
  const [invYear, setInvYear] = useState(new Date().getFullYear())
  const [invMonth, setInvMonth] = useState(new Date().getMonth() + 1)
  const [invAmount, setInvAmount] = useState(0)
  const [invDueDate, setInvDueDate] = useState('')
  const [invNotes, setInvNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (subId) loadAll()
  }, [subId])

  useEffect(() => {
    if (studentsCount > 0) {
      setInvAmount(calcAmount(studentsCount))
    }
  }, [studentsCount])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Subscription
    const { data: subData } = await supabase
      .from('school_subscriptions')
      .select('*')
      .eq('id', subId)
      .single()

    if (!subData) {
      setError('الاشتراك غير موجود')
      setLoading(false)
      return
    }
    setSub(subData)

    // 2. School
    const { data: schoolData } = await supabase
      .from('establishments')
      .select('*')
      .eq('id', subData.establishment_id)
      .single()
    setSchool(schoolData)

    // 3. Students count
    const { count } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('establishment_id', subData.establishment_id)
      .eq('status', 'active')
    setStudentsCount(count || 0)

    // 4. Invoices
    const { data: invs } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('establishment_id', subData.establishment_id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
    setInvoices(invs || [])

    setLoading(false)
  }

  const handleCreateInvoice = async () => {
    if (!sub) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      // Generate invoice number
      const { count } = await supabase
        .from('subscription_invoices')
        .select('id', { count: 'exact', head: true })

      const num = String((count || 0) + 1).padStart(4, '0')
      const invoiceNumber = `F-${invYear}-${num}`

      const { error: insErr } = await supabase
        .from('subscription_invoices')
        .insert({
          establishment_id: sub.establishment_id,
          invoice_number: invoiceNumber,
          period_month: invMonth,
          period_year: invYear,
          students_count: studentsCount,
          price_per_student: PRICE_PER_STUDENT,
          amount: invAmount,
          status: 'draft',
          due_date: invDueDate || null,
          payment_method: 'bank_transfer',
          notes: invNotes.trim() || null,
        })

      if (insErr) throw insErr

      setSuccess(`تم إصدار الفاتورة ${invoiceNumber}`)
      setTimeout(() => setSuccess(''), 3000)
      setShowInvModal(false)
      setInvNotes('')
      setInvDueDate('')
      await loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (invId: string, ref: string) => {
    const refValue = prompt('رقم التحويل البنكي (référence)?', '')
    if (refValue === null) return

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('subscription_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: refValue.trim() || null,
      })
      .eq('id', invId)

    if (upErr) setError(upErr.message)
    else {
      setSuccess('تم تأكيد الدفع')
      setTimeout(() => setSuccess(''), 2500)
      await loadAll()
    }
  }

  const handleToggleStatus = async () => {
    if (!sub) return
    const newStatus = sub.status === 'active' ? 'suspended' : 'active'
    if (!confirm(`${newStatus === 'suspended' ? 'إيقاف' : 'تفعيل'} الاشتراك؟`)) return

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('school_subscriptions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (upErr) setError(upErr.message)
    else {
      setSuccess('تم التحديث')
      setTimeout(() => setSuccess(''), 2000)
      await loadAll()
    }
  }

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (error && !sub) return <div className="p-6">{error}</div>

  const monthlyAmount = calcAmount(studentsCount)
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/subscriptions"
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {school?.name?.charAt(0) || '؟'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{school?.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                منذ {formatDate(sub?.started_at)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> إصدار فاتورة
          </button>
          <button
            onClick={handleToggleStatus}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm ${
              sub?.status === 'active'
                ? 'bg-white border border-rose-300 text-rose-600 hover:bg-rose-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {sub?.status === 'active' ? (
              <><Ban className="h-4 w-4" /> إيقاف</>
            ) : (
              <><PlayCircle className="h-4 w-4" /> تفعيل</>
            )}
          </button>
        </div>
      </header>

      {error && !showInvModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* School info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-600" />
          معلومات المؤسسة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {school?.city && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {school.city}
            </div>
          )}
          {school?.phone && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              <span dir="ltr">{school.phone}</span>
            </div>
          )}
          {school?.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <span dir="ltr">{school.email}</span>
            </div>
          )}
          {school?.code && (
            <div className="flex items-center gap-2 text-slate-600">
              <CreditCard className="h-4 w-4 text-slate-400" />
              كود: <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{school.code}</code>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">التلاميذ</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{studentsCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">الاشتراك الشهري</span>
          </div>
          <div className={`text-xl font-bold ${monthlyAmount === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
            {formatMoney(monthlyAmount)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">إجمالي مدفوع</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatMoney(totalPaid)}
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

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            الفواتير ({invoices.length})
          </h3>
        </div>

        {invoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">لا توجد فواتير بعد</p>
            <button
              onClick={() => setShowInvModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> إصدار أول فاتورة
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    رقم الفاتورة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الفترة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    التلاميذ
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    المبلغ
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => {
                  const isPaid = inv.status === 'paid'
                  const isCancelled = inv.status === 'cancelled'
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                          {inv.invoice_number}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {monthName(inv.period_month)} {inv.period_year}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                        {inv.students_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {formatMoney(Number(inv.amount))}
                        </span>
                        <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <CheckCircle2 className="h-3 w-3" /> مدفوع
                          </span>
                        ) : isCancelled ? (
                          <span className="text-xs text-slate-400">ملغى</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" /> معلّق
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!isPaid && !isCancelled && (
                            <button
                              onClick={() => handleMarkPaid(inv.id, inv.payment_reference || '')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="تأكيد الدفع"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Invoice Modal */}
      {showInvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">إصدار فاتورة</h3>
              <button onClick={() => setShowInvModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Période */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                  <select
                    value={invMonth}
                    onChange={(e) => setInvMonth(Number(e.target.value))}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {monthNames.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                  <input
                    type="number"
                    value={invYear}
                    onChange={(e) => setInvYear(Number(e.target.value))}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>
              </div>

              {/* Calculated amount */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs text-emerald-700 mb-1">المبلغ المحتسب</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatMoney(invAmount)} <span className="text-sm font-normal">د.م</span>
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  ({studentsCount} - 20) × 1.5 = {((studentsCount - 20) * 1.5).toFixed(2)} د.م
                </p>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الاستحقاق
                </label>
                <input
                  type="date"
                  value={invDueDate}
                  onChange={(e) => setInvDueDate(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleCreateInvoice}
                  disabled={saving}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'جارٍ الإصدار...' : 'إصدار الفاتورة'}
                </button>
                <button
                  onClick={() => setShowInvModal(false)}
                  className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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