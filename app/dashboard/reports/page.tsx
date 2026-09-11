'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import Amount from '@/components/Amount'
import { Search, Printer, FileText } from 'lucide-react'

type ReportType = 'payments' | 'expenses' | 'students'

type PaymentRow = {
  id: string
  amount: number
  payment_date: string
  method: string
  students: { first_name: string; last_name: string } | null
}

type ExpenseRow = {
  id: string
  description: string
  amount: number
  expense_date: string
  category: string
}

type StudentRow = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  gender: string
  families: { family_name: string; father_name: string } | null
}

export default function ReportsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewReports = hasPermission('reports', 'view')

  const [reportType, setReportType] = useState<ReportType>('payments')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])

  useEffect(() => {
    if (!establishmentId) return
    fetchReport()
  }, [reportType, establishmentId])

  const fetchReport = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    let query: any

    if (reportType === 'payments') {
      query = supabase
        .from('payments')
        .select(`
          id, amount, payment_date, method,
          students (first_name, last_name)
        `)
        .eq('establishment_id', establishmentId)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false })

      if (startDate) query = query.gte('payment_date', startDate)
      if (endDate) query = query.lte('payment_date', endDate)
    } else if (reportType === 'expenses') {
      query = supabase
        .from('expenses')
        .select('*')
        .eq('establishment_id', establishmentId)
        .order('expense_date', { ascending: false })

      if (startDate) query = query.gte('expense_date', startDate)
      if (endDate) query = query.lte('expense_date', endDate)
    } else if (reportType === 'students') {
      query = supabase
        .from('students')
        .select(`
          id, first_name, last_name, massar_code, gender,
          families (family_name, father_name)
        `)
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      if (reportType === 'payments') setPayments(data || [])
      if (reportType === 'expenses') setExpenses(data || [])
      if (reportType === 'students') setStudents(data || [])
    }

    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const filteredPayments = payments.filter((p) =>
    `${p.students?.first_name || ''} ${p.students?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredExpenses = expenses.filter((e) =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.massar_code || '').includes(searchTerm)
  )

  const totalPayments = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewReports) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6 print:bg-white">
      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" />
          Rapports
        </h1>
        <p className="text-gray-600">Générez et imprimez des rapports</p>
      </header>

      {/* أدوات التقرير */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type de rapport</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="payments">Paiements</option>
              <option value="expenses">Dépenses</option>
              <option value="students">Élèves</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Recherche</label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Filtrer..."
              />
            </div>
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button
              onClick={fetchReport}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Générer
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* عرض النتائج */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {reportType === 'payments' && `Paiements (${filteredPayments.length}) - Total: `}
            {reportType === 'expenses' && `Dépenses (${filteredExpenses.length}) - Total: `}
            {reportType === 'students' && `Élèves (${filteredStudents.length})`}
            {reportType === 'payments' && <Amount value={totalPayments} />}
            {reportType === 'expenses' && <Amount value={totalExpenses} />}
          </h2>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-600 py-8">{error}</p>
        ) : reportType === 'payments' && filteredPayments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun paiement.</p>
        ) : reportType === 'expenses' && filteredExpenses.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune dépense.</p>
        ) : reportType === 'students' && filteredStudents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun élève.</p>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'payments' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Élève</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Méthode</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.students ? `${p.students.first_name} ${p.students.last_name}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.payment_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.method}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Amount value={p.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'expenses' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.expense_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{e.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Amount value={e.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'students' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nom complet</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Massar</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sexe</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Famille</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.massar_code || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {s.families?.family_name || s.families?.father_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}