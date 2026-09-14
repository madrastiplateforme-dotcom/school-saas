'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  CreditCard, Users, TrendingUp, CheckCircle2, AlertCircle,
  FileText, Download, Calendar, RefreshCw, Info, Sparkles, ArrowLeft,
} from 'lucide-react'

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

const monthNames = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر']
const monthName = (m: number) => monthNames[m - 1] || `شهر ${m}`

const planLabel = (p?: string) =>
  p === 'gratuit' ? 'مجانية' : p === 'standard' ? 'قياسية' : p === 'pro' ? 'احترافية' : '—'

const planColor = (p?: string) => {
  if (p === 'gratuit') return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
  if (p === 'standard') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
}

export default function BillingPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [subscription, setSubscription] = useState<any>(null)
  const [studentsCount, setStudentsCount] = useState(0)
  const [invoices, setInvoices] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!establishmentId || !role) return
    loadAll()
  }, [establishmentId, role])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    // 1. Subscription
    const { data: subData } = await supabase
      .from('school_subscriptions')
      .select('*')
      .eq('establishment_id', establishmentId)
      .maybeSingle()
    setSubscription(subData)

    // 2. Students count
    const { count } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('establishment_id', establishmentId)
      .eq('status', 'active')
    setStudentsCount(count || 0)

    // 3. Invoices
    const { data: invs } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
    setInvoices(invs || [])

    setLoading(false)
  }

  const handleDownloadInvoice = async (inv: any) => {
    // TODO: PDF generation — نزيدوه من بعد
    const text = `
      فاتورة الاشتراك
      ═══════════════════════════════════════
      رقم الفاتورة: ${inv.invoice_number}
      الفترة: ${monthName(inv.period_month)} ${inv.period_year}
      عدد التلاميذ: ${inv.students_count}
      السعر لكل تلميذ: ${inv.price_per_student} د.م
      المبلغ الإجمالي: ${formatMoney(Number(inv.amount))} د.م
      تاريخ الإصدار: ${formatDate(inv.issued_at)}
      تاريخ الاستحقاق: ${formatDate(inv.due_date)}
      الحالة: ${inv.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
      ═══════════════════════════════════════
      مدرستي - منصة تسيير المدارس الخاصة
    `
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${inv.invoice_number}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  const monthlyAmount = calcAmount(studentsCount)
  const billable = Math.max(0, studentsCount - FREE_STUDENTS)

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + Number(i.amount || 0), 0)

  const colors = planColor(subscription?.plan)

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            الاشتراك والفواتير
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة اشتراك مؤسستك وتحميل الفواتير
          </p>
        </div>
        <button
          onClick={loadAll}
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

      {/* Current plan card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-lg">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #1b8c77 0, transparent 35%), radial-gradient(circle at 88% 12%, #e9a63a55 0, transparent 30%)',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm opacity-80">خطتك الحالية</p>
              <h2 className="text-3xl font-black mt-1">{planLabel(subscription?.plan)}</h2>
              <p className="text-sm opacity-90 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {subscription?.status === 'active' ? 'نشط' : 'موقوف'}
              </p>
              {subscription?.started_at && (
                <p className="text-xs opacity-75 mt-1">
                  منذ {formatDate(subscription.started_at)}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm opacity-80 mb-1">المبلغ الشهري</p>
              <p className="text-3xl font-black">
                {monthlyAmount === 0 ? (
                  <span className="text-emerald-300">مجاناً</span>
                ) : (
                  <>
                    {formatMoney(monthlyAmount)}
                    <span className="text-base font-normal opacity-80 mr-1">د.م</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs opacity-80">التلاميذ النشطون</p>
                <p className="text-xl font-bold mt-1">{studentsCount}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs opacity-80">مجاني</p>
                <p className="text-xl font-bold mt-1">{FREE_STUDENTS}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs opacity-80">قابل للفوترة</p>
                <p className="text-xl font-bold mt-1">{billable}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs opacity-80">السعر / تلميذ</p>
                <p className="text-xl font-bold mt-1">1.5 <span className="text-xs font-normal">د.م</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-800">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>معادلة الحساب:</strong>{' '}
          {studentsCount <= FREE_STUDENTS ? (
            <>لديك {studentsCount} تلميذاً — أقل من {FREE_STUDENTS}، فاشتراكك <strong>مجاني</strong>.</>
          ) : (
            <>
              ({studentsCount} − {FREE_STUDENTS}) × 1.5 = <strong>{formatMoney(monthlyAmount)} د.م</strong> شهرياً.
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">الفواتير</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{invoices.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">مدفوع</span>
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
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            فواتيري ({invoices.length})
          </h3>
        </div>

        {invoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">لا توجد فواتير بعد</p>
            <p className="text-sm text-slate-400">
              {studentsCount <= FREE_STUDENTS
                ? 'اشتراكك مجاني — لا حاجة لفواتير'
                : 'ستظهر فواتيرك هنا بعد إصدارها من الإدارة'}
            </p>
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
                    تاريخ الاستحقاق
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-20">
                    تحميل
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
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {formatDate(inv.due_date)}
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
                            <AlertCircle className="h-3 w-3" /> معلّق
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="تحميل"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {subscription?.plan === 'gratuit' && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-amber-900 text-lg">هل تريد ميزات أكثر؟</h3>
              <p className="text-sm text-amber-800 mt-1">
                عندك حالياً {studentsCount} تلميذاً. باقي عندك{' '}
                <strong>{FREE_STUDENTS - studentsCount} مكاناً مجانياً</strong>. من بعد، كل تلميذ إضافي بـ <strong>1.5 د.م/شهر</strong> فقط.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}