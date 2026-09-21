'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { buildImpayeMessage, openWhatsApp } from '@/lib/whatsapp'
import { toast } from 'sonner'
import {
  AlertCircle, Search, RefreshCw, Bell, MessageCircle, Mail,
  Send, TrendingDown, Users, Wallet, Clock, CheckCircle2,
  Filter, Phone,
} from 'lucide-react'

type UnpaidStudent = {
  student_id: string
  full_name: string
  family_name: string
  parent_phone: string
  parent_email: string
  parent_user_id: string | null
  className: string
  levelName: string
  total_unpaid: number
  installments: {
    id: string
    description: string
    amount: number
    paid_amount: number
    due_date: string
    days_overdue: number
  }[]
  oldest_due_date: string
  max_days_overdue: number
}

export default function ImpayesPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [loading, setLoading] = useState(true)

  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([])
  const [schoolName, setSchoolName] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')

  const [relanceStudent, setRelanceStudent] = useState<UnpaidStudent | null>(null)
  const [relanceType, setRelanceType] = useState<'notification' | 'sms' | 'email' | 'all'>('all')
  const [sending, setSending] = useState(false)

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
    loadSchoolName()
  }, [establishmentId, role])

  const loadSchoolName = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('establishments')
      .select('name')
      .eq('id', establishmentId)
      .maybeSingle()
    if (data?.name) setSchoolName(data.name)
  }

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: instData, error: instError } = await supabase
      .from('installments')
      .select(`
        id, description, amount, paid_amount, due_date, status, student_id,
        students (
          id, first_name, last_name, family_id,
          families (family_name, phone, email, parent_user_id),
          enrollments (classes(name), levels(name))
        )
      `)
      .eq('establishment_id', establishmentId)
      .in('status', ['pending', 'partially_paid'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (instError) {
      console.error('[impayes]', instError?.message || instError)
      toast.error(instError.message)
      setLoading(false)
      return
    }

    const studentsMap = new Map<string, UnpaidStudent>()
    const today = new Date()

    ;(instData || []).forEach((inst: any) => {
      const s = inst.students
      if (!s) return

      const remaining = Number(inst.amount) - Number(inst.paid_amount)
      if (remaining <= 0) return

      const dueDate = new Date(inst.due_date)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      const family = s.families || {}
      const enr = s.enrollments?.[0] || {}
      const className = enr.classes?.name || '-'
      const levelName = enr.levels?.name || '-'

      if (!studentsMap.has(s.id)) {
        studentsMap.set(s.id, {
          student_id: s.id,
          full_name: `${s.first_name} ${s.last_name}`,
          family_name: family.family_name || '',
          parent_phone: family.phone || '',
          parent_email: family.email || '',
          parent_user_id: family.parent_user_id || null,
          className,
          levelName,
          total_unpaid: 0,
          installments: [],
          oldest_due_date: inst.due_date,
          max_days_overdue: daysOverdue,
        })
      }

      const entry = studentsMap.get(s.id)!
      entry.total_unpaid += remaining
      entry.installments.push({
        id: inst.id,
        description: inst.description,
        amount: Number(inst.amount),
        paid_amount: Number(inst.paid_amount),
        due_date: inst.due_date,
        days_overdue: daysOverdue,
      })
      if (daysOverdue > entry.max_days_overdue) {
        entry.max_days_overdue = daysOverdue
        entry.oldest_due_date = inst.due_date
      }
    })

    setUnpaidStudents(Array.from(studentsMap.values()).sort((a, b) => b.total_unpaid - a.total_unpaid))
    setLoading(false)
  }

  const classes = useMemo(() => {
    const set = new Set(unpaidStudents.map(s => s.className).filter(c => c !== '-'))
    return Array.from(set).sort()
  }, [unpaidStudents])

  const levels = useMemo(() => {
    const set = new Set(unpaidStudents.map(s => s.levelName).filter(l => l !== '-'))
    return Array.from(set).sort()
  }, [unpaidStudents])

  const filtered = useMemo(() => {
    return unpaidStudents.filter(s => {
      if (searchTerm && !s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && !s.family_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (classFilter !== 'all' && s.className !== classFilter) return false
      if (levelFilter !== 'all' && s.levelName !== levelFilter) return false
      if (minAmount && s.total_unpaid < Number(minAmount)) return false
      return true
    })
  }, [unpaidStudents, searchTerm, classFilter, levelFilter, minAmount])

  const totals = useMemo(() => {
    return filtered.reduce((acc, s) => ({
      count: acc.count + 1,
      amount: acc.amount + s.total_unpaid,
      installments: acc.installments + s.installments.length,
    }), { count: 0, amount: 0, installments: 0 })
  }, [filtered])

  const handleWhatsApp = (s: UnpaidStudent) => {
    if (!s.parent_phone) {
      toast.error('لا يوجد رقم هاتف لهذا الولي')
      return
    }

    const message = buildImpayeMessage({
      parentName: s.family_name || undefined,
      studentName: s.full_name,
      amount: `${s.total_unpaid.toFixed(2)} DH`,
      dueDate: s.oldest_due_date,
      schoolName,
    })

    const ok = openWhatsApp(s.parent_phone, message)
    if (!ok) {
      toast.error('رقم الهاتف غير صحيح')
    }
  }

  const handleRelance = async () => {
    if (!relanceStudent) return
    setSending(true)

    try {
      const res = await fetch('/api/establishment/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: relanceStudent.student_id,
          parentUserId: relanceStudent.parent_user_id,
          parentPhone: relanceStudent.parent_phone,
          parentEmail: relanceStudent.parent_email,
          studentName: relanceStudent.full_name,
          amount: relanceStudent.total_unpaid,
          installmentsCount: relanceStudent.installments.length,
          maxDaysOverdue: relanceStudent.max_days_overdue,
          type: relanceType,
          establishmentId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')

      const parts = []
      if (relanceType === 'all' || relanceType === 'notification') parts.push('إشعار')
      if (relanceType === 'all' || relanceType === 'sms') parts.push('SMS')
      if (relanceType === 'all' || relanceType === 'email') parts.push('البريد')

      toast.success(`تم إرسال ${parts.join(' + ')} إلى ${relanceStudent.full_name}`)
      setRelanceStudent(null)
    } catch (err: any) {
      console.error('[impayes-relance]', err?.message || err)
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const getAgeBadge = (days: number) => {
    if (days <= 7) return { label: `${days} يوم`, color: 'bg-yellow-100 text-yellow-700' }
    if (days <= 30) return { label: `${days} يوم`, color: 'bg-orange-100 text-orange-700' }
    if (days <= 90) return { label: `${days} يوم`, color: 'bg-red-100 text-red-700' }
    return { label: `${days} يوم (متأخر جداً)`, color: 'bg-red-200 text-red-900 font-bold' }
  }

  // Skeleton
  if (loading || roleLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            المتأخرون عن الدفع
          </h1>
          <p className="text-gray-600">قائمة التلاميذ الذين لم يؤدوا الأقساط في وقتها</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">عدد التلاميذ</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-orange-600">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium">إجمالي المبالغ المتأخرة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totals.amount.toFixed(2)} DH</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">عدد الأقساط المتأخرة</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totals.installments}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">الفلاتر</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم..."
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="all">جميع المستويات</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="all">جميع الأقسام</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="الحد الأدنى (DH)"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium text-lg">لا يوجد متأخرون 🎉</p>
          <p className="text-sm text-gray-500 mt-1">جميع الأقساط مدفوعة في وقتها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const ageBadge = getAgeBadge(s.max_days_overdue)
            return (
              <div key={s.student_id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{s.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{s.levelName} - {s.className}</span>
                        {s.parent_phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span dir="ltr">{s.parent_phone}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-700">{s.total_unpaid.toFixed(2)} DH</p>
                      <p className="text-xs text-slate-500">{s.installments.length} قسط متأخر</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${ageBadge.color}`}>
                      <Clock className="h-3.5 w-3.5" /> {ageBadge.label}
                    </span>
                  </div>
                </div>

                <div className="mt-3 bg-slate-50 rounded-lg p-3 space-y-1">
                  {s.installments.map((inst) => {
                    const rem = inst.amount - inst.paid_amount
                    return (
                      <div key={inst.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{inst.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{inst.due_date}</span>
                          <span className="font-medium text-red-600">{rem.toFixed(2)} DH</span>
                          <span className="text-xs text-orange-600">({inst.days_overdue} يوم)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => handleWhatsApp(s)}
                    disabled={!s.parent_phone}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      s.parent_phone
                        ? 'bg-[#25D366] text-white hover:bg-[#1da851] shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>

                  <button
                    onClick={() => { setRelanceStudent(s); setRelanceType('all') }}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    <Send className="h-4 w-4" /> إرسال تذكير
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {relanceStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Send className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">إرسال تذكير</h3>
                <p className="text-sm text-gray-500">{relanceStudent.full_name} — {relanceStudent.total_unpaid.toFixed(2)} DH</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="relance" checked={relanceType === 'all'} onChange={() => setRelanceType('all')} className="text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">الكل (إشعار + SMS + بريد)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="relance" checked={relanceType === 'notification'} onChange={() => setRelanceType('notification')} className="text-indigo-600" />
                <Bell className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">إشعار فقط</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="relance" checked={relanceType === 'sms'} onChange={() => setRelanceType('sms')} className="text-indigo-600" />
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">SMS</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="relance" checked={relanceType === 'email'} onChange={() => setRelanceType('email')} className="text-indigo-600" />
                <Mail className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">البريد الإلكتروني</p>
                </div>
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              ⚠️ SMS والبريد سيتطلبان تفعيل الخدمة لاحقاً.
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleRelance}
                disabled={sending}
                className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                <Send className="h-4 w-4" />
                {sending ? 'جارٍ الإرسال...' : 'إرسال'}
              </button>
              <button
                onClick={() => setRelanceStudent(null)}
                className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}