'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import Amount from '@/components/Amount'
import DateInput from '@/components/DateInput'
import { Save, Lock } from 'lucide-react'
import { logAudit } from '@/lib/audit'

type Student = {
  id: string
  first_name: string
  last_name: string
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
  const canCreatePayments = hasPermission('payments', 'create')

  const isSecretary = role === 'secretaire'
  const isDirector = role === 'directeur'

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [installments, setInstallments] = useState<Installment[]>([])
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('')
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [cashRegisterId, setCashRegisterId] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!establishmentId || !role) {
      setLoading(false)
      return
    }
    fetchInitialData(establishmentId)
  }, [establishmentId, role])

  const fetchInitialData = async (sid: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ✅ Save current user ID
    setCurrentUserId(user.id)

    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('establishment_id', sid)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    setStudents(studentsData || [])

    let caisseQuery = supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id')
      .eq('establishment_id', sid)

    if (isSecretary) {
      caisseQuery = caisseQuery.eq('owner_user_id', user.id)
    }

    const { data: cashData } = await caisseQuery

    setCashRegisters(cashData || [])
    if (cashData && cashData.length > 0) {
      setCashRegisterId(cashData[0].id)
    }

    setLoading(false)
  }

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedInstallmentId('')
    setSelectedInstallment(null)
    setInstallments([])

    if (!studentId || !establishmentId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('student_id', studentId)
      .eq('establishment_id', establishmentId)
      .in('status', ['pending', 'partially_paid'])
      .order('due_date', { ascending: true })

    if (error) setError(error.message)
    else setInstallments(data || [])
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

  const handleSavePayment = async () => {
    if (!selectedInstallment || !establishmentId || !paymentAmount) {
      setError('يرجى اختيار قسط وإدخال مبلغ')
      return
    }

    const amount = Number(paymentAmount)
    const remaining = selectedInstallment.amount - selectedInstallment.paid_amount
    if (amount <= 0 || amount > remaining) {
      setError('المبلغ غير صالح')
      return
    }

    const finalCaisseId = isSecretary
      ? cashRegisters[0]?.id
      : cashRegisterId

    if (!finalCaisseId) {
      setError('لا يوجد صندوق متاح')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          establishment_id: establishmentId,
          student_id: selectedStudentId,
          installment_id: selectedInstallment.id,
          amount,
          payment_date: paymentDate,
          method: paymentMethod,
          reference: reference || null,
          notes: notes || null,
          cash_register_id: finalCaisseId,
          status: 'completed',
          user_id: currentUserId,   // ✅ ZEDNA
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      const newPaidAmount = selectedInstallment.paid_amount + amount
      const newStatus = newPaidAmount >= selectedInstallment.amount ? 'paid' : 'partially_paid'

      const { error: updateError } = await supabase
        .from('installments')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', selectedInstallment.id)

      if (updateError) throw updateError

      await logAudit('create_payment', { amount, studentId: selectedStudentId }, establishmentId!)

      setSuccess('تم تسجيل الدفعة بنجاح')
      setSelectedInstallment(null)
      setSelectedInstallmentId('')
      setPaymentAmount('')
      setReference('')
      setNotes('')
      handleStudentChange(selectedStudentId)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (loading || permissionsLoading || roleLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canCreatePayments) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">دفعة جديدة</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        {/* التلميذ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            التلميذ <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">-- اختر التلميذ --</option>
            {students
              .filter((s) =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
          </select>
        </div>

        {/* القسط */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            القسط (غير المدفوع فقط) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedInstallmentId}
            onChange={(e) => handleInstallmentChange(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={!selectedStudentId}
          >
            <option value="">-- اختر القسط --</option>
            {installments.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.description} — متبقي {inst.amount - inst.paid_amount} DH
              </option>
            ))}
          </select>
          {selectedStudentId && installments.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">هذا التلميذ ليس لديه أقساط في الانتظار</p>
          )}
        </div>

        {selectedInstallment && (
          <div className="bg-slate-50 p-4 rounded-lg space-y-1">
            <p className="text-sm">المبلغ الأصلي: <span className="font-medium"><Amount value={selectedInstallment.amount} /></span></p>
            <p className="text-sm">المدفوع سابقاً: <span className="font-medium"><Amount value={selectedInstallment.paid_amount} /></span></p>
            <p className="text-sm font-bold">المتبقي: <Amount value={selectedInstallment.amount - selectedInstallment.paid_amount} /></p>
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
            <DateInput value={paymentDate} onChange={setPaymentDate} className="h-11" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الصندوق
            </label>
            {isSecretary ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-3">
                <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    {cashRegisters[0]?.name || 'صندوقك'}
                  </p>
                  <p className="text-xs text-emerald-600">سيتم تسجيل الدفعة في صندوقك تلقائياً</p>
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
                    {cr.name} ({cr.type === 'central' || cr.type === 'principal' ? 'مركزي' : cr.type === 'secretary' ? 'سكرتيرة' : 'خدمة'})
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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