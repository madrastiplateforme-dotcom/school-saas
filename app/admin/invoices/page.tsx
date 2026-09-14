'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  FileText, Search, RefreshCw, CheckCircle2, Clock, X,
  AlertCircle, Filter, TrendingUp, Mail, Loader2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────
// زر إرسال الفاتورة
// ─────────────────────────────────────────────────────────
function SendInvoiceButton({
  invoiceId,
  onSent,
}: {
  invoiceId: string
  onSent?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.reason || 'فشل الإرسال')
      }
      setSent(true)
      onSent?.()
      setTimeout(() => setSent(false), 3000)
    } catch (e: any) {
      setErr(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> تم الإرسال
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={send}
        disabled={loading}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-60"
        title="إرسال الفاتورة بالبريد"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
      </button>
      {err && <span className="text-[10px] text-red-600 max-w-[80px]">{err}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
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

type InvoiceRow = {
  id: string
  invoice_number: string
  period_month: number
  period_year: number
  students_count: number
  amount: number
  status: string
  issued_at: string
  due_date: string | null
  paid_at: string | null
  payment_reference: string | null
  school_name: string
  establishment_id: string
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('subscription_invoices')
      .select(`*, establishments(name)`)
      .order('issued_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const rows: InvoiceRow[] = (data || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number || '—',
      period_month: inv.period_month,
      period_year: inv.period_year,
      students_count: inv.students_count || 0,
      amount: Number(inv.amount || 0),
      status: inv.status || 'draft',
      issued_at: inv.issued_at,
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      payment_reference: inv.payment_reference,
      school_name: inv.establishments?.name || '—',
      establishment_id: inv.establishment_id,
    }))

    setInvoices(rows)
    setLoading(false)
  }

  const handleMarkPaid = async (inv: InvoiceRow) => {
    const refValue = prompt('رقم التحويل البنكي (référence)?', inv.payment_reference || '')
    if (refValue === null) return

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('subscription_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: refValue.trim() || null,
      })
      .eq('id', inv.id)

    if (upErr) setError(upErr.message)
    else {
      setSuccess(`تم تأكيد دفع ${inv.invoice_number}`)
      setTimeout(() => setSuccess(''), 2500)
      await loadAll()
    }
  }

  const handleCancel = async (inv: InvoiceRow) => {
    if (!confirm(`إلغاء الفاتورة ${inv.invoice_number}؟`)) return

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('subscription_invoices')
      .update({ status: 'cancelled' })
      .eq('id', inv.id)

    if (upErr) setError(upErr.message)
    else {
      setSuccess('تم إلغاء الفاتورة')
      setTimeout(() => setSuccess(''), 2500)
      await loadAll()
    }
  }

  const totalInvoices = invoices.length
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + i.amount, 0)

  const years = Array.from(new Set(invoices.map(i => i.period_year))).sort((a, b) => b - a)

  const filtered = invoices.filter(inv => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterYear && inv.period_year !== Number(filterYear)) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !inv.invoice_number.toLowerCase().includes(q) &&
        !inv.school_name.toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            فواتير الاشتراك
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل فواتير المدارس مع إمكانية تأكيد الدفع
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <TrendingUp className="h-4 w-4" /> الاشتراكات
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

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">إجمالي الفواتير</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{totalInvoices}</div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">إجمالي محصّل</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatMoney(totalPaid)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${totalUnpaid > 0 ? 'border-rose-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${totalUnpaid > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">غير محصّل</span>
          </div>
          <div className={`text-xl font-bold ${totalUnpaid > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatMoney(totalUnpaid)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">الفلاتر</h3>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم المدرسة..."
            className="w-full h-11 pr-10 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">مرسلة</option>
            <option value="paid">مدفوعة</option>
            <option value="cancelled">ملغاة</option>
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">كل السنوات</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {invoices.length === 0 ? 'لا توجد فواتير' : 'لا توجد نتائج'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">رقم الفاتورة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">المدرسة</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">الفترة</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">المبلغ</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">الحالة</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-40">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => {
                  const isPaid = inv.status === 'paid'
                  const isCancelled = inv.status === 'cancelled'
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                          {inv.invoice_number}
                        </code>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatDate(inv.issued_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {inv.school_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {monthName(inv.period_month)} {inv.period_year}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {formatMoney(inv.amount)}
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
                        ) : inv.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" /> مرسل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" /> مسودة
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!isPaid && !isCancelled && (
                            <>
                              {/* 📧 زر إرسال الفاتورة */}
                              <SendInvoiceButton invoiceId={inv.id} onSent={loadAll} />

                              <button
                                onClick={() => handleMarkPaid(inv)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="تأكيد الدفع"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancel(inv)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="إلغاء"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
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
    </div>
  )
}