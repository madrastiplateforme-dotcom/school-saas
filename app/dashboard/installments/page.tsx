'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import DateInput from '@/components/DateInput'
import { Search, Wallet, X, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react'

type Installment = {
  id: string
  description: string
  amount: number
  paid_amount: number
  due_date: string
  status: string
  student_id: string
  students: {
    first_name: string
    last_name: string
  } | null
  contracts: {
    id: string
    start_date: string
    end_date: string | null
  } | null
  payments: {
    id: string
  }[] | null
}

type CashRegister = {
  id: string
  name: string
}

export default function InstallmentsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewInstallments = hasPermission('installments', 'view')
  const canCreatePayments = hasPermission('payments', 'create')

  const [installments, setInstallments] = useState<Installment[]>([])
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleDownloadReceipt = (installmentId: string) => {
    window.open(`/api/pdf/payment-receipt?installmentId=${installmentId}`, '_blank')
  }

  useEffect(() => {
    if (!establishmentId) return
    fetchData(establishmentId)
  }, [establishmentId])

  const fetchData = async (sid: string) => {
    const supabase = createClient()

    const { data: installmentsData, error: installmentsError } = await supabase
      .from('installments')
      .select(`
        *,
        students (first_name, last_name),
        contracts (id, start_date, end_date),
        payments (id)
      `)
      .eq('establishment_id', sid)
      .order('due_date', { ascending: true })

    if (installmentsError) setError(installmentsError.message)
    else setInstallments(installmentsData || [])

    const { data: cashData, error: cashError } = await supabase
      .from('cash_registers')
      .select('id, name')
      .eq('establishment_id', sid)

    if (cashError) setError(cashError.message)
    else {
      setCashRegisters(cashData || [])
      if (cashData && cashData.length > 0) setCashRegisterId(cashData[0].id)
    }

    setLoading(false)
  }

  const openPaymentModal = (installment: Installment) => {
    setSelectedInstallment(installment)
    setPaymentAmount(installment.amount - installment.paid_amount)
    setPaymentMethod('cash')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setCashRegisterId(cashRegisters.length > 0 ? cashRegisters[0].id : '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedInstallment(null)
  }

  const handleSavePayment = async () => {
    if (!selectedInstallment || !establishmentId) return
    if (paymentAmount <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()

    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          establishment_id: establishmentId,
          student_id: selectedInstallment.student_id,
          installment_id: selectedInstallment.id,
          amount: paymentAmount,
          payment_date: paymentDate,
          method: paymentMethod,
          cash_register_id: cashRegisterId || null,
          status: 'completed',
        })

      if (paymentError) throw paymentError

      const newPaidAmount = selectedInstallment.paid_amount + paymentAmount
      const newStatus = newPaidAmount >= selectedInstallment.amount ? 'paid' : 'partially_paid'

      const { error: updateError } = await supabase
        .from('installments')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', selectedInstallment.id)

      if (updateError) throw updateError

      fetchData(establishmentId)
      closeModal()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const filteredInstallments = installments.filter((inst) => {
    const matchesSearch =
      (inst.students?.first_name + ' ' + inst.students?.last_name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      inst.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (inst: Installment) => {
    if (inst.status !== 'paid' && inst.due_date < today) {
      return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" /> متأخر</span>
    }
    switch (inst.status) {
      case 'paid':
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> مدفوع</span>
      case 'partially_paid':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" /> جزئي</span>
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> غير مدفوع</span>
    }
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewInstallments) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" />
          Échéances
        </h1>
        <p className="text-gray-600">Suivez les paiements des échéances</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="بحث بالاسم أو الوصف..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">غير مدفوع</option>
          <option value="partially_paid">جزئي</option>
          <option value="paid">مدفوع</option>
        </select>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">الأقساط ({filteredInstallments.length})</h2>
        {filteredInstallments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد أقساط مطابقة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الاستحقاق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  {canCreatePayments && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstallments.map((inst) => (
                  <tr key={inst.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inst.students ? `${inst.students.first_name} ${inst.students.last_name}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.due_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.amount} DH</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.paid_amount} DH</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inst.amount - inst.paid_amount} DH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(inst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {inst.status !== 'paid' && canCreatePayments && (
                          <button
                            onClick={() => openPaymentModal(inst)}
                            className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-100 text-xs"
                          >
                            تسجيل دفعة
                          </button>
                        )}
                        {inst.payments && inst.payments.length > 0 && (
                          <button
                            onClick={() => handleDownloadReceipt(inst.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="تحميل إيصال"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedInstallment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">تسجيل دفعة</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
<div className="space-y-4">
  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
    <p className="text-sm text-gray-600">
      <span className="font-medium">التلميذ:</span> {selectedInstallment.students?.first_name} {selectedInstallment.students?.last_name}
    </p>
    <p className="text-sm text-gray-600">
      <span className="font-medium">القسط:</span> {selectedInstallment.description}
    </p>
    <p className="text-sm text-gray-600">
      <span className="font-medium">المبلغ المستحق:</span> {selectedInstallment.amount - selectedInstallment.paid_amount} DH
    </p>
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      المبلغ المدفوع (درهم) <span className="text-red-500">*</span>
    </label>
    <input
      type="number"
      min="1"
      max={selectedInstallment.amount - selectedInstallment.paid_amount}
      value={paymentAmount}
      onChange={(e) => setPaymentAmount(Number(e.target.value))}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      طريقة الدفع
    </label>
    <select
      value={paymentMethod}
      onChange={(e) => setPaymentMethod(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
    <DateInput value={paymentDate} onChange={setPaymentDate} />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      الصندوق
    </label>
    <select
      value={cashRegisterId}
      onChange={(e) => setCashRegisterId(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    >
      {cashRegisters.map((cr) => (
        <option key={cr.id} value={cr.id}>{cr.name}</option>
      ))}
    </select>
  </div>

  {error && <div className="text-red-600 text-sm">{error}</div>}

  <button
    onClick={handleSavePayment}
    disabled={saving}
    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
  >
    {saving ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
  </button>
</div>

          </div>
        </div>
      )}
    </div>
  )
}