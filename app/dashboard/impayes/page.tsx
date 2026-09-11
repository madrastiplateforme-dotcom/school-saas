'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import Amount from '@/components/Amount'
import { Search, RefreshCw } from 'lucide-react'

type UnpaidSummary = {
  student_id: string
  student_name: string
  family_name: string | null
  total_due: number
  total_paid: number
  total_remaining: number
  overdue_count: number
  oldest_due_date: string | null
  last_payment_date: string | null
}

export default function ImpayesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewPayments = hasPermission('payments', 'view')

  const [unpaidList, setUnpaidList] = useState<UnpaidSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!establishmentId) return
    fetchUnpaid(establishmentId)
  }, [establishmentId])

  const fetchUnpaid = async (sid: string) => {
    const supabase = createClient()

    // جلب الأقساط غير المدفوعة أو الجزئية مع التلميذ والعائلة
    const { data: installments, error } = await supabase
      .from('installments')
      .select(`
        id, amount, paid_amount, due_date, status,
        student_id,
        students (
          first_name, last_name,
          families (family_name, father_name)
        )
      `)
      .eq('establishment_id', sid)
      .in('status', ['pending', 'partially_paid'])
      .order('due_date', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // تجميع البيانات حسب التلميذ
    const summaryMap = new Map<string, UnpaidSummary>()

    installments?.forEach((inst: any) => {
      const student = inst.students
      if (!student) return

      const sid = inst.student_id
      if (!summaryMap.has(sid)) {
        summaryMap.set(sid, {
          student_id: sid,
          student_name: `${student.first_name} ${student.last_name}`,
          family_name: student.families?.family_name || student.families?.father_name || null,
          total_due: 0,
          total_paid: 0,
          total_remaining: 0,
          overdue_count: 0,
          oldest_due_date: null,
          last_payment_date: null,
        })
      }

      const summary = summaryMap.get(sid)!
      summary.total_due += Number(inst.amount)
      summary.total_paid += Number(inst.paid_amount || 0)
      summary.total_remaining += Number(inst.amount) - Number(inst.paid_amount || 0)
      if (inst.due_date < new Date().toISOString().split('T')[0]) {
        summary.overdue_count += 1
      }
      if (!summary.oldest_due_date || inst.due_date < summary.oldest_due_date) {
        summary.oldest_due_date = inst.due_date
      }
    })

    // جلب آخر تاريخ دفع لكل تلميذ
    const studentIds = Array.from(summaryMap.keys())
    if (studentIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('student_id, payment_date')
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false })

      payments?.forEach((p: any) => {
        const summary = summaryMap.get(p.student_id)
        if (summary && !summary.last_payment_date) {
          summary.last_payment_date = p.payment_date
        }
      })
    }

    setUnpaidList(Array.from(summaryMap.values()))
    setLoading(false)
  }

  const filteredList = unpaidList.filter((item) => {
    const matchesSearch =
      item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.family_name || '').toLowerCase().includes(searchTerm.toLowerCase())

    let matchesFilter = true
    if (filter === 'overdue') {
      matchesFilter = item.overdue_count > 0
    } else if (filter === 'up_to_date') {
      matchesFilter = item.total_remaining === 0
    } else if (filter === '30') {
      matchesFilter = item.oldest_due_date !== null && daysAgo(item.oldest_due_date) > 30
    } else if (filter === '60') {
      matchesFilter = item.oldest_due_date !== null && daysAgo(item.oldest_due_date) > 60
    } else if (filter === '90') {
      matchesFilter = item.oldest_due_date !== null && daysAgo(item.oldest_due_date) > 90
    }

    return matchesSearch && matchesFilter
  })

  function daysAgo(dateString: string): number {
    const today = new Date()
    const date = new Date(dateString)
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewPayments) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">المتأخرون عن الدفع</h1>
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
            placeholder="بحث بالاسم أو العائلة..."
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="all">الكل</option>
          <option value="overdue">متأخر</option>
          <option value="up_to_date">على ما يرام</option>
          <option value="30">تأخر 30+ يوم</option>
          <option value="60">تأخر 60+ يوم</option>
          <option value="90">تأخر 90+ يوم</option>
        </select>
        <button
          onClick={() => fetchUnpaid(establishmentId!)}
          className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">قائمة المتأخرين ({filteredList.length})</h2>
        {filteredList.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا يوجد بيانات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العائلة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي المستحق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد الأقساط المتأخرة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">أيام التأخير</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredList.map((item) => (
                  <tr key={item.student_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.family_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><Amount value={item.total_due} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><Amount value={item.total_paid} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600"><Amount value={item.total_remaining} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.overdue_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{item.oldest_due_date ? daysAgo(item.oldest_due_date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}