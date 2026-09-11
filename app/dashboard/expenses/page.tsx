'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import DateInput from '@/components/DateInput'
import { Plus, Trash2, Search, Wallet, Lock } from 'lucide-react'

type Expense = {
  id: string
  description: string
  amount: number
  expense_date: string
  category: string
  payment_method: string
  cash_register_id: string | null
  created_at: string
  cash_registers: {
    name: string
  } | null
}

type CashRegister = {
  id: string
  name: string
  type: string
  owner_user_id: string | null
}

export default function ExpensesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { role, loading: roleLoading } = useUserRole()
  const canViewExpenses = hasPermission('expenses', 'view')
  const canCreateExpenses = hasPermission('expenses', 'create')

  const isSecretary = role === 'secretaire'
  const isDirector = role === 'directeur'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role) return
    fetchData(establishmentId)
  }, [establishmentId, role])

  const fetchData = async (sid: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // 1. Jib ga3 les caisses
    const { data: allCaisses } = await supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id')
      .eq('establishment_id', sid)

    // 2. Filter caisses l'INSERT (dropdown / info box)
    let myCaisses: CashRegister[] = []
    if (isSecretary) {
      myCaisses = (allCaisses || []).filter(c => c.owner_user_id === user.id)
    } else if (isDirector) {
      myCaisses = (allCaisses || []).filter(c => c.type === 'central' || c.type === 'principal')
    } else {
      myCaisses = allCaisses || []
    }

    setCashRegisters(myCaisses)
    if (myCaisses.length > 0) setCashRegisterId(myCaisses[0].id)

    // 3. Jib les dépenses
    let expensesQuery = supabase
      .from('expenses')
      .select(`
        *,
        cash_registers (name)
      `)
      .eq('establishment_id', sid)

    // - Secrétaire : ghir dyalha
    // - Directeur : KOULCHI
    if (isSecretary) {
      const myCaisseIds = (allCaisses || [])
        .filter(c => c.owner_user_id === user.id)
        .map(c => c.id)
      
      if (myCaisseIds.length > 0) {
        expensesQuery = expensesQuery.in('cash_register_id', myCaisseIds)
      } else {
        setExpenses([])
        setLoading(false)
        return
      }
    }

    const { data: expensesData, error: expensesError } = await expensesQuery
      .order('expense_date', { ascending: false })

    if (expensesError) setError(expensesError.message)
    else setExpenses(expensesData || [])

    setLoading(false)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !description.trim() || !amount) return
    setAdding(true)
    setError('')

    const finalCaisseId = (isSecretary || isDirector)
      ? cashRegisters[0]?.id
      : cashRegisterId

    if (!finalCaisseId) {
      setError('لا يوجد صندوق متاح')
      setAdding(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('expenses')
      .insert({
        establishment_id: establishmentId,
        description: description.trim(),
        amount: Number(amount),
        expense_date: expenseDate,
        category: category || null,
        payment_method: paymentMethod,
        cash_register_id: finalCaisseId,
        user_id: currentUserId,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setDescription('')
      setAmount('')
      setCategory('')
      setExpenseDate(new Date().toISOString().split('T')[0])
      setPaymentMethod('cash')
      fetchData(establishmentId)
    }
    setAdding(false)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette dépense ?')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) setError(error.message)
    else fetchData(establishmentId!)
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  const filteredExpenses = expenses.filter((exp) =>
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exp.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || permissionsLoading || roleLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewExpenses) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  const canSelectCaisse = !isSecretary && !isDirector

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-red-600" />
          {isSecretary ? 'مصاريفي' : isDirector ? 'مصاريف المؤسسة' : 'Dépenses'}
        </h1>
        <p className="text-gray-600">
          {isSecretary
            ? 'جميع المصاريف المسجلة في صندوقك'
            : isDirector
            ? 'جميع مصاريف المؤسسة (كل الصناديق)'
            : 'Gérez les dépenses de votre établissement'}
        </p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {canCreateExpenses ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">إضافة مصروف جديد</h2>
          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوصف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="مثال: شراء لوازم مكتبية"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المبلغ (درهم) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الفئة
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="مثال: اللوازم، الرواتب..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                التاريخ
              </label>
              <DateInput value={expenseDate} onChange={setExpenseDate} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                الصندوق
              </label>
              {!canSelectCaisse ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      {cashRegisters[0]?.name || 'صندوقك'}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {isSecretary ? 'الصندوق الخاص بك (تلقائي)' : 'الصندوق المركزي (تلقائي)'}
                    </p>
                  </div>
                </div>
              ) : (
                <select
                  value={cashRegisterId}
                  onChange={(e) => setCashRegisterId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {cashRegisters.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={adding}
                className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {adding ? 'جارٍ الإضافة...' : 'إضافة المصروف'}
              </button>
            </div>
          </form>
          {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء المصاريف.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isSecretary
              ? 'سجل مصاريفي'
              : isDirector
              ? 'سجل مصاريف المؤسسة'
              : `Liste des dépenses`}{' '}
            ({filteredExpenses.length})
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Rechercher..."
            />
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune dépense.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطريقة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصندوق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.amount} DH</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.expense_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.payment_method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.cash_registers?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-left font-semibold">
              Total : {totalAmount} DH
            </div>
          </div>
        )}
      </div>
    </div>
  )
}