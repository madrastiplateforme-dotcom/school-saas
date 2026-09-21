'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import Amount from '@/components/Amount'
import DateInput from '@/components/DateInput'
import { toast } from 'sonner'
import { Save, Lock, Search, X, User, CheckCircle2 } from 'lucide-react'
import { logAudit } from '@/lib/audit'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code?: string | null
}

type Installment = {
  id: string
  description: string
  amount: number
  paid_amount: number
  due_date: string
  status: string
}

type CashRegister = {
  id: string
  name: string
  type: string
  owner_user_id: string | null
}

export default function NewPaymentPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()

  const canCreatePayments = hasPermission('payments', 'create')
  const isSecretary = role === 'secretaire'
  const isDirector = role === 'directeur'

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const [installments, setInstallments] = useState<Installment[]>([])
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('')
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [cashRegisterId, setCashRegisterId] = useState('')

  const [saving, setSaving] = useState(false)

  const [studentQuery, setStudentQuery] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const studentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!establishmentId || !role || !yearId) {
      return
    }
    fetchInitialData(establishmentId, yearId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  const fetchInitialData = async (sid: string, yid: string) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)
      .eq('status', 'active')

    const studentIds = (enrollmentsData || []).map((e: any) => e.student_id)

    let studentsData: Student[] = []
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .eq('establishment_id', sid)
        .eq('status', 'active')
        .in('id', studentIds)
        .order('first_name', { ascending: true })
      studentsData = (data as Student[]) || []
    }
    setStudents(studentsData)

    let caisseQuery = supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id')
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)

    if (isSecretary || isDirector) {
      caisseQuery = caisseQuery.eq('owner_user_id', user.id)
    }

    const { data: cashData } = await caisseQuery

    setCashRegisters(cashData || [])
    if (cashData && cashData.length > 0) {
      setCashRegisterId(cashData[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (studentRef.current && !studentRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return students.slice(0, 50)
    return students
      .filter((s) => {
        const name = `${s.first_name} ${s.last_name}`.toLowerCase()
        const massar = (s.massar_code || '').toLowerCase()
        return name.includes(q) || massar.includes(q)
      })
      .slice(0, 50)
  }, [students, studentQuery])

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudentId(student.id)
    setSelectedStudent(student)
    setStudentQuery(`${student.first_name} ${student.last_name}`)
    setStudentDropdownOpen(false)

    setSelectedInstallmentId('')
    setSelectedInstallment(null)
    setInstallments([])

    if (!establishmentId || !yearId) return

    const supabase = createClient()

    const { data: contractsData } = await supabase
      .from('contracts')
      .select('id')
      .eq('student_id', student.id)
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)

    const contractIds = (contractsData || []).map((c: any) => c.id)
    if (contractIds.length === 0) {
      setInstallments([])
      return
    }

    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .in('contract_id', contractIds)
      .eq('establishment_id', establishmentId)
      .in('status', ['pending', 'partially_paid'])
      .order('due_date', { ascending: true })

    if (error) {
      console.error('[new-payment-installments]', error?.message || error)
      toast.error(error.message)
    } else {
      setInstallments(data || [])
    }
  }

  const handleClearStudent = () => {
    setSelectedStudentId('')
    setSelectedStudent(null)
    setStudentQuery('')
    setInstallments([])
    setSelectedInstallmentId('')
    setSelectedInstallment(null)
  }

  const handleInstallmentChange = (instId: string) => {
    setSelectedInstallmentId(instId)
    const inst = installments.find((i) => i.id === instId) || null
    setSelectedInstallment(inst)
    if (inst) {
      const remaining = inst.amount - inst.paid_amount
      setPaymentAmount(remaining > 0 ? remaining.toString() : '')
    }
  }

  const loadRoleIds = async (supabase: any, sid: string) => {
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name')
      .eq('establishment_id', sid)

    const directorIds: string[] = []
    const secretaryIds: string[] = []

    for (const r of roles || []) {
      const n = (r.name || '').toLowerCase()
      if (
        n.includes('directeur') ||
        n.includes('director') ||
        n.includes('مدير')
      ) {
        directorIds.push(r.id)
      }
      if (
        n.includes('secretaire') ||
        n.includes('secrétaire') ||
        n.includes('secretary') ||
        n.includes('سكرتير')
      ) {
        secretaryIds.push(r.id)
      }
    }
    return { directorIds, secretaryIds }
  }

  const notifyPaymentParties = async (params: {
    paymentId: string
    amount: number
    studentId: string
    studentName: string
    installmentDesc: string
    method: string
    establishmentId: string
  }) => {
    const supabase = createClient()
    const inserts: any[] = []

    const baseNotif = {
      establishment_id: params.establishmentId,
      type: 'payment_received',
      title: '💰 دفعة جديدة',
      message: `دفعة ${params.amount.toFixed(2)} DH — ${params.studentName}\n${params.installmentDesc}`,
      link: '/dashboard/payments',
      metadata: {
        payment_id: params.paymentId,
        amount: params.amount,
        student_id: params.studentId,
        method: params.method,
      },
    }

    const { directorIds, secretaryIds } = await loadRoleIds(
      supabase,
      params.establishmentId,
    )

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, role_id')
      .eq('establishment_id', params.establishmentId)

    for (const p of profiles || []) {
      if (directorIds.includes(p.role_id)) {
        inserts.push({ ...baseNotif, user_id: p.user_id })
      }
    }

    for (const p of profiles || []) {
      if (secretaryIds.includes(p.role_id)) {
        if (inserts.some((i) => i.user_id === p.user_id)) continue
        inserts.push({ ...baseNotif, user_id: p.user_id })
      }
    }

    const { data: studentRow } = await supabase
      .from('students')
      .select('family_id')
      .eq('id', params.studentId)
      .maybeSingle()

    if (studentRow?.family_id) {
      const { data: family } = await supabase
        .from('families')
        .select('parent_user_id')
        .eq('id', studentRow.family_id)
        .maybeSingle()

      const parentUserId = family?.parent_user_id
      if (parentUserId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('notification_preferences')
          .eq('user_id', parentUserId)
          .maybeSingle()

        const prefs = (profile?.notification_preferences || {}) as any
        if (prefs?.payment?.in_app !== false) {
          inserts.push({
            ...baseNotif,
            user_id: parentUserId,
            title: '✅ تم استلام دفعتكم',
            message: `تم استلام دفعة ${params.amount.toFixed(2)} DH\n${params.installmentDesc}`,
            link: '/parent/dashboard/payments',
          })
        }
      }
    }

    if (inserts.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(inserts)
      if (notifError) {
        console.error(
          '⚠️ Notifications insert error:',
          notifError?.message || notifError,
        )
      }
    }
  }

  const triggerPaymentEmails = async (paymentId: string) => {
    try {
      const res = await fetch('/api/payments/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'received',
          paymentId,
          establishmentId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      console.log('📧 send-email response:', res.status, data)
    } catch (err: any) {
      console.error('⚠️ send-email API error:', err?.message || err)
    }
  }

  const handleSavePayment = async () => {
    if (!selectedInstallment || !establishmentId || !paymentAmount) {
      toast.error('يرجى اختيار قسط وإدخال مبلغ')
      return
    }

    if (!yearId) {
      toast.error('لا توجد سنة دراسية محددة')
      return
    }

    const amount = Number(paymentAmount)
    const remaining =
      selectedInstallment.amount - selectedInstallment.paid_amount
    if (amount <= 0 || amount > remaining) {
      toast.error('المبلغ غير صالح')
      return
    }

    const finalCaisseId =
      isSecretary || isDirector ? cashRegisters[0]?.id : cashRegisterId

    if (!finalCaisseId) {
      toast.error('لا يوجد صندوق متاح')
      return
    }

    setSaving(true)

    const supabase = createClient()

    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          establishment_id: establishmentId,
          academic_year_id: yearId,
          student_id: selectedStudentId,
          installment_id: selectedInstallment.id,
          amount,
          payment_date: paymentDate,
          method: paymentMethod,
          reference: reference || null,
          notes: notes || null,
          cash_register_id: finalCaisseId,
          status: 'completed',
          user_id: currentUserId,
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      const newPaidAmount = selectedInstallment.paid_amount + amount
      const newStatus =
        newPaidAmount >= selectedInstallment.amount ? 'paid' : 'partially_paid'

      const { error: updateError } = await supabase
        .from('installments')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', selectedInstallment.id)

      if (updateError) throw updateError

      await logAudit(
        'create_payment',
        { amount, studentId: selectedStudentId },
        establishmentId!,
      )

      if (paymentData && selectedStudent) {
        await notifyPaymentParties({
          paymentId: paymentData.id,
          amount,
          studentId: selectedStudentId,
          studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
          installmentDesc: selectedInstallment.description,
          method: paymentMethod,
          establishmentId,
        })
      }

      if (paymentData) {
        await triggerPaymentEmails(paymentData.id)
      }

      toast.success('تم تسجيل الدفعة بنجاح')
      setSelectedInstallment(null)
      setSelectedInstallmentId('')
      setPaymentAmount('')
      setReference('')
      setNotes('')

      if (selectedStudent) {
        handleSelectStudent(selectedStudent)
      }
    } catch (err: any) {
      console.error('[new-payment-save]', err?.message || err)
      toast.error(err?.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (loading || permissionsLoading || roleLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
        <div className="h-10 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-11 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!canCreatePayments) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-rose-600 font-bold">
          ليس لديك صلاحية للوصول لهذه الصفحة
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Save className="h-6 w-6 text-indigo-600" />
        دفعة جديدة
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        {/* ═══════ التلميذ — Searchable Combobox ═══════ */}
        <div ref={studentRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            التلميذ <span className="text-red-500">*</span>
          </label>

          {selectedStudent ? (
            <div className="flex items-center justify-between gap-3 h-11 px-3 border-2 border-indigo-500 bg-indigo-50/50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white font-bold text-xs flex-shrink-0">
                  {selectedStudent.first_name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  {selectedStudent.massar_code && (
                    <p
                      className="text-[10px] text-slate-500 font-mono"
                      dir="ltr"
                    >
                      {selectedStudent.massar_code}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearStudent}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition flex-shrink-0"
                title="تغيير التلميذ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value)
                    setStudentDropdownOpen(true)
                  }}
                  onFocus={() => setStudentDropdownOpen(true)}
                  placeholder="ابحث بالاسم أو رقم مسار..."
                  className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  dir="rtl"
                />
                {studentQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentQuery('')}
                    className="absolute left-2 top-3 h-5 w-5 grid place-items-center rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {studentDropdownOpen && (
                <div className="absolute z-40 right-0 left-0 mt-1 max-h-72 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {studentQuery
                        ? 'ما لقيناش نتائج'
                        : 'ما كايناش تلاميذ مسجلين'}
                    </div>
                  ) : (
                    <>
                      {!studentQuery && (
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          آخر 50 تلميذ
                        </div>
                      )}
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="w-full text-right px-4 py-3 hover:bg-indigo-50 transition flex items-center gap-3 border-b border-slate-100 last:border-0"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex-shrink-0">
                            {s.first_name.charAt(0)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {s.first_name} {s.last_name}
                            </p>
                            {s.massar_code && (
                              <p
                                className="text-[10px] text-slate-500 font-mono"
                                dir="ltr"
                              >
                                {s.massar_code}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedStudent && !studentQuery && (
            <p className="text-xs text-slate-400 mt-1">
              💡 اكتب اسم التلميذ ولا رقم مسار باش تلقاه بسرعة
            </p>
          )}
        </div>

        {/* ═══════ القسط ═══════ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            القسط (غير المدفوع فقط) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedInstallmentId}
            onChange={(e) => handleInstallmentChange(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            disabled={!selectedStudentId}
          >
            <option value="">— اختر القسط —</option>
            {installments.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.description} — متبقي{' '}
                {(inst.amount - inst.paid_amount).toFixed(2)} DH
              </option>
            ))}
          </select>
          {selectedStudentId && installments.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              هذا التلميذ ليس لديه أقساط في الانتظار
            </p>
          )}
        </div>

        {selectedInstallment && (
          <div className="bg-slate-50 p-4 rounded-lg space-y-1">
            <p className="text-sm">
              المبلغ الأصلي:{' '}
              <span className="font-medium">
                <Amount value={selectedInstallment.amount} />
              </span>
            </p>
            <p className="text-sm">
              المدفوع سابقاً:{' '}
              <span className="font-medium">
                <Amount value={selectedInstallment.paid_amount} />
              </span>
            </p>
            <p className="text-sm font-bold">
              المتبقي:{' '}
              <Amount
                value={
                  selectedInstallment.amount - selectedInstallment.paid_amount
                }
              />
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المبلغ (DH) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              طريقة الدفع
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="cash">نقداً</option>
              <option value="cheque">شيك</option>
              <option value="transfer">تحويل بنكي</option>
              <option value="card">بطاقة</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ الدفع
            </label>
            <DateInput
              value={paymentDate}
              onChange={setPaymentDate}
              className="h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الصندوق
            </label>
            {isSecretary || isDirector ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-3">
                <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    {cashRegisters[0]?.name || 'صندوقك'}
                  </p>
                  <p className="text-xs text-emerald-600">
                    سيتم تسجيل الدفعة في صندوقك تلقائياً
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={cashRegisterId}
                onChange={(e) => setCashRegisterId(e.target.value)}
                className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {cashRegisters.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name} (
                    {cr.type === 'central' || cr.type === 'principal'
                      ? 'مركزي'
                      : cr.type === 'secretary'
                        ? 'سكرتيرة'
                        : 'خدمة'}
                    )
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مرجع (اختياري)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="رقم الشيك..."
              dir="ltr"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={handleSavePayment}
            disabled={saving || !selectedInstallment}
            className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}