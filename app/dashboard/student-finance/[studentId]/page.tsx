'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import Amount from '@/components/Amount'
import { ArrowRight } from 'lucide-react'

type FinancialSummary = {
  studentName: string
  totalDue: number
  totalPaid: number
  totalRemaining: number
  status: 'up_to_date' | 'partially_paid' | 'overdue'
  services: {
    serviceName: string
    due: number
    paid: number
    remaining: number
  }[]
}

export default function StudentFinancePage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string

  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!establishmentId || !studentId) return
    fetchFinancialData(establishmentId, studentId)
  }, [establishmentId, studentId])

  const fetchFinancialData = async (sid: string, studentId: string) => {
    const supabase = createClient()

    // 1. جلب اسم التلميذ
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('first_name, last_name')
      .eq('id', studentId)
      .eq('establishment_id', sid)
      .single()

    if (studentError || !studentData) {
      setError('التلميذ غير موجود')
      setLoading(false)
      return
    }

    const studentName = `${studentData.first_name} ${studentData.last_name}`

    // 2. جلب الأقساط والمدفوعات المتعلقة بالتلميذ
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select(`
        id,
        amount,
        paid_amount,
        due_date,
        status,
        contract_id,
        contracts (
          id,
          contract_items (
            service_id,
            services (name)
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('establishment_id', sid)

    if (instError) {
      setError(instError.message)
      setLoading(false)
      return
    }

    // حساب الإجماليات وتجميع الخدمات
    let totalDue = 0
    let totalPaid = 0
    const serviceMap = new Map<string, { due: number; paid: number; remaining: number }>()

    installments?.forEach((inst: any) => {
      const due = Number(inst.amount)
      const paid = Number(inst.paid_amount || 0)
      totalDue += due
      totalPaid += paid

      let serviceName = inst.description || 'عام'
      const contract = inst.contracts
      if (contract && contract.contract_items && contract.contract_items.length > 0) {
        const item = contract.contract_items[0]
        if (item.services?.name) serviceName = item.services.name
      }

      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, { due: 0, paid: 0, remaining: 0 })
      }
      const service = serviceMap.get(serviceName)!
      service.due += due
      service.paid += paid
      service.remaining = service.due - service.paid
    })

    const totalRemaining = totalDue - totalPaid
    const today = new Date().toISOString().split('T')[0]
    const hasOverdue = installments?.some(
      (inst: any) => inst.status !== 'paid' && inst.due_date < today
    )

    let status: FinancialSummary['status']
    if (totalRemaining === 0) {
      status = 'up_to_date'
    } else if (hasOverdue) {
      status = 'overdue'
    } else {
      status = 'partially_paid'
    }

    setSummary({
      studentName,
      totalDue,
      totalPaid,
      totalRemaining,
      status,
      services: Array.from(serviceMap.entries()).map(([name, data]) => ({
        serviceName: name,
        due: data.due,
        paid: data.paid,
        remaining: data.remaining,
      })),
    })

    setLoading(false)
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  if (!summary) {
    return <div className="p-6">لا توجد بيانات</div>
  }

  const statusBadge = {
    up_to_date: { label: 'على ما يرام', className: 'bg-green-100 text-green-700' },
    partially_paid: { label: 'جزئي', className: 'bg-yellow-100 text-yellow-700' },
    overdue: { label: 'متأخر', className: 'bg-red-100 text-red-700' },
  }[summary.status]

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-indigo-600 hover:underline"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{summary.studentName}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">إجمالي المستحق</p>
            <p className="text-2xl font-bold"><Amount value={summary.totalDue} /></p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">إجمالي المدفوع</p>
            <p className="text-2xl font-bold text-green-600"><Amount value={summary.totalPaid} /></p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">المتبقي</p>
            <p className={`text-2xl font-bold ${summary.totalRemaining > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              <Amount value={summary.totalRemaining} />
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">تفاصيل حسب الخدمة</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخدمة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستحق</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.services.map((service, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.serviceName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Amount value={service.due} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><Amount value={service.paid} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"><Amount value={service.remaining} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}