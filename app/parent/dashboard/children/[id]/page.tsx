'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  ArrowRight, BookOpen, GraduationCap, Wallet, Calendar, TrendingUp,
  CheckCircle2, AlertCircle, Clock, Award, FileText, User,
  ChevronLeft, CreditCard, BookMarked,
} from 'lucide-react'

type Tab = 'overview' | 'grades' | 'payments' | 'attendance'

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

export default function ChildDetailPage() {
  const params = useParams()
  const childId = params?.id as string
  const { yearId, year } = useAcademicYear()

  const [child, setChild] = useState<any>(null)
  const [gradeMax, setGradeMax] = useState(20)
  const [tab, setTab] = useState<Tab>('overview')

  const [bulletins, setBulletins] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [stats, setStats] = useState({
    average: null as number | null,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    absences: 0,
    lates: 0,
    justified: 0,
    unjustified: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (childId && yearId) loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, yearId])

  const loadAll = async () => {
    if (!yearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const estabId = profile?.establishment_id
    if (!estabId) { setError('لا توجد مؤسسة'); setLoading(false); return }

    const { data: family } = await supabase
      .from('families')
      .select('id')
      .eq('parent_user_id', user.id)
      .eq('establishment_id', estabId)
      .maybeSingle()

    if (!family) { setError('لم يتم العثور على العائلة'); setLoading(false); return }

    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', childId)
      .eq('family_id', family.id)
      .maybeSingle()

    if (!student) { setError('التلميذ غير موجود'); setLoading(false); return }
    setChild(student)

    // Enrollment + class (yearId du context)
    const { data: enr } = await supabase
      .from('enrollments')
      .select('*, classes(name, levels(name, grade_max))')
      .eq('student_id', childId)
      .eq('academic_year_id', yearId)
      .maybeSingle()

    setGradeMax(Number((enr?.classes as any)?.levels?.grade_max) || 20)

    // Bulletins (yearId)
    const { data: bData } = await supabase
      .from('bulletins')
      .select('*')
      .eq('student_id', childId)
      .eq('academic_year_id', yearId)
      .eq('is_published', true)
      .order('term', { ascending: true })
    setBulletins(bData || [])

    let avg: number | null = null
    if (bData && bData.length > 0) {
      const latest = [...bData].sort((a, b) => b.term - a.term)[0]
      avg = latest.average
    }

    // Contracts (yearId)
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('student_id', childId)
      .eq('academic_year_id', yearId)

    const contractIds = (contracts || []).map(c => c.id)

    let insts: any[] = []
    if (contractIds.length > 0) {
      const { data } = await supabase
        .from('installments')
        .select('*')
        .in('contract_id', contractIds)
        .order('due_date', { ascending: true })
      insts = data || []
    }
    setInstallments(insts)

    const instIds = insts.map(i => i.id)
    let pays: any[] = []
    if (instIds.length > 0) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .in('installment_id', instIds)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
      pays = data || []
    }
    setPayments(pays)

    const paidInstIds = new Set(pays.map(p => p.installment_id))
    const totalAmount = insts.reduce((s, i) => s + Number(i.amount || 0), 0)
    const paidAmount = pays.reduce((s, p) => s + Number(p.amount || 0), 0)
    const unpaidAmount = insts
      .filter(i => !paidInstIds.has(i.id))
      .reduce((s, i) => s + Number(i.amount || 0), 0)

    // ✅ Attendances dyal l'année active (LOGIC FIX)
    const { data: att } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', childId)
      .eq('academic_year_id', yearId)
      .order('attendance_date', { ascending: false })
      .limit(50)
    setAttendances(att || [])

    const absences = (att || []).filter(a => a.status === 'absent').length
    const lates = (att || []).filter(a => a.status === 'late').length
    const justified = (att || []).filter(a => a.status === 'excused').length
    const unjustified = absences - justified

    setStats({
      average: avg,
      totalAmount,
      paidAmount,
      unpaidAmount,
      absences,
      lates,
      justified,
      unjustified,
    })

    setLoading(false)
  }

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
      <Link href="/parent/dashboard" className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:underline font-medium">
        <ArrowRight className="h-4 w-4" /> رجوع للرئيسية
      </Link>
    </div>
  )

  const passThreshold = gradeMax / 2
  const overallPass = stats.average != null && stats.average >= passThreshold

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center gap-3">
        <Link
          href="/parent/dashboard"
          className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
        >
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {child?.first_name} {child?.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
            {child?.massar_code && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {child.massar_code}
              </span>
            )}
            {child?.birth_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(child.birth_date)}
              </span>
            )}
            {year?.name && (
              <span className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                {year.name}
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`bg-white rounded-2xl border shadow-sm p-4 ${
          overallPass ? 'border-emerald-200' : 'border-orange-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-medium text-slate-500">المعدل العام</span>
          </div>
          <div className={`text-2xl font-bold ${
            stats.average == null ? 'text-slate-400' : overallPass ? 'text-emerald-600' : 'text-orange-600'
          }`}>
            {stats.average != null ? stats.average.toFixed(2) : '—'}
            <span className="text-xs font-normal text-slate-400 mr-1">/ {gradeMax}</span>
          </div>
        </div>

        <div className={`bg-white rounded-2xl border shadow-sm p-4 ${
          stats.unpaidAmount > 0 ? 'border-rose-200' : 'border-emerald-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-medium text-slate-500">المتبقي</span>
          </div>
          <div className={`text-xl font-bold ${
            stats.unpaidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
          }`}>
            {formatMoney(stats.unpaidAmount)}
            <span className="text-xs font-normal text-slate-400 mr-1">د.م</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-slate-500">الغيابات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.absences}
            <span className="text-xs font-normal text-slate-400 mr-1">({stats.justified} مبرر)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">التأخيرات</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.lates}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {([
          { id: 'overview', label: 'نظرة عامة', icon: User },
          { id: 'grades', label: 'النقط', icon: BookMarked },
          { id: 'payments', label: 'المدفوعات', icon: CreditCard },
          { id: 'attendance', label: 'الغيابات', icon: Calendar },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              الكشوف المنشورة ({bulletins.length})
            </h3>
            {bulletins.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">لا توجد كشوف منشورة بعد</p>
            ) : (
              <div className="space-y-2">
                {bulletins.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">
                      الدورة {b.term}
                    </span>
                    <span className={`text-sm font-bold ${
                      b.average >= passThreshold ? 'text-emerald-600' : 'text-orange-600'
                    }`}>
                      {Number(b.average).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-600" />
              الملخص المالي
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">الإجمالي</span>
                <span className="font-bold text-slate-800">{formatMoney(stats.totalAmount)} د.م</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">المدفوع</span>
                <span className="font-bold text-emerald-600">{formatMoney(stats.paidAmount)} د.م</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">المتبقي</span>
                <span className={`font-bold ${stats.unpaidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatMoney(stats.unpaidAmount)} د.م
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'grades' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {bulletins.length === 0 ? (
            <div className="p-16 text-center">
              <BookMarked className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد نقط منشورة بعد</p>
              <p className="text-xs text-slate-400 mt-2">النقط غادي تبان من بعد ما تنشرها الإدارة</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bulletins.map(b => (
                <div key={b.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-800">الدورة {b.term}</h4>
                    <div className={`text-xl font-bold ${
                      b.average >= passThreshold ? 'text-emerald-600' : 'text-orange-600'
                    }`}>
                      {Number(b.average).toFixed(2)} <span className="text-xs text-slate-400">/ {gradeMax}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {b.rank && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                        <Award className="h-3 w-3" />
                        الرتبة {b.rank} / {b.class_size}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">الأقساط ({installments.length})</h3>
            </div>
            {installments.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">لا توجد أقساط</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {installments.map(inst => {
                  const isPaid = payments.some(p => p.installment_id === inst.id)
                  return (
                    <div key={inst.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {formatDate(inst.due_date)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {isPaid ? 'مدفوع' : 'غير مدفوع'}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatMoney(Number(inst.amount))} د.م
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">سجل المدفوعات ({payments.length})</h3>
            </div>
            {payments.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">لا توجد مدفوعات</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(p.payment_date)}
                        </p>
                        <p className="text-xs text-slate-500">{p.method || '—'}</p>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-emerald-600">
                      {formatMoney(Number(p.amount))} د.م
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {attendances.length === 0 ? (
            <div className="p-16 text-center">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد سجلات غياب</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendances.map(a => {
                const styleMap: Record<string, { bg: string; text: string; icon: string; label: string }> = {
                  absent:  { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: 'bg-rose-100 text-rose-700',    label: 'غائب' },
                  late:    { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'bg-amber-100 text-amber-700',  label: 'متأخر' },
                  excused: { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: 'bg-blue-100 text-blue-700',    label: 'مبرر' },
                  present: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100 text-emerald-700', label: 'حاضر' },
                }
                const st = styleMap[a.status] || styleMap.present

                return (
                  <div key={a.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${st.icon}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(a.attendance_date)}
                        </p>
                        {a.note && (
                          <p className="text-xs text-slate-500">{a.note}</p>
                        )}
                        {(a.check_in_time || a.check_out_time) && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {a.check_in_time?.slice(0, 5) || '—'} → {a.check_out_time?.slice(0, 5) || '—'}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}