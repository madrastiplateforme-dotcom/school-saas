'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import DateInput from '@/components/DateInput'
import { Plus, Trash2, Search, Wallet, Lock, Users, User } from 'lucide-react'

type Expense = {
  id: string
  description: string
  amount: number
  expense_date: string
  category: string
  payment_method: string
  cash_register_id: string | null
  nature: string | null
  staff_id: string | null
  created_at: string
  cash_registers: { name: string } | null
  staff: { full_name: string } | null
}

type CashRegister = {
  id: string
  name: string
  type: string
  owner_user_id: string | null
}

type Staff = {
  id: string
  full_name: string
  type: string
  custom_type: string | null
  salary_amount: number
}

const NATURES = [
  { value: 'autre', label: 'مصروف عادي' },
  { value: 'salaire', label: 'راتب شهري' },
  { value: 'prime', label: 'منحة' },
  { value: 'heures_sup', label: 'ساعات إضافية' },
  { value: 'avance', label: 'سلفة' },
]

export default function ExpensesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()
  const canViewExpenses = hasPermission('expenses', 'view')
  const canCreateExpenses = hasPermission('expenses', 'create')

  const isSecretary = role === 'secretaire'
  const isDirector = role === 'directeur'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const [nature, setNature] = useState('autre')
  const [staffId, setStaffId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    fetchData(establishmentId, yearId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  useEffect(() => {
    if (nature === 'salaire' && staffId) {
      const s = staffList.find(x => x.id === staffId)
      if (s) {
        setDescription(`راتب - ${s.full_name}`)
        setAmount(String(s.salary_amount || ''))
        setCategory('رواتب')
      }
    } else if (nature === 'prime' && staffId) {
      const s = staffList.find(x => x.id === staffId)
      if (s) {
        setDescription(`منحة - ${s.full_name}`)
        setCategory('منح')
        if (!amount) setAmount('')
      }
    } else if (nature === 'heures_sup' && staffId) {
      const s = staffList.find(x => x.id === staffId)
      if (s) {
        setDescription(`ساعات إضافية - ${s.full_name}`)
        setCategory('ساعات إضافية')
        if (!amount) setAmount('')
      }
    } else if (nature === 'avance' && staffId) {
      const s = staffList.find(x => x.id === staffId)
      if (s) {
        setDescription(`سلفة - ${s.full_name}`)
        setCategory('سلف')
        if (!amount) setAmount('')
      }
    } else if (nature === 'autre') {
      setStaffId('')
      if (description.startsWith('راتب') || description.startsWith('منحة') || description.startsWith('ساعات') || description.startsWith('سلفة')) {
        setDescription('')
        setAmount('')
        setCategory('')
      }
    }
  }, [nature, staffId])

  const fetchData = async (sid: string, yid: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setCurrentUserId(user.id)

    // ✅ 1. Caisses dyal l'année active
    let caisseQuery = supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id')
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)

    if (isSecretary) {
      caisseQuery = caisseQuery.eq('owner_user_id', user.id)
    } else if (isDirector) {
      caisseQuery = caisseQuery.or('type.eq.central,type.eq.principal')
    }

    const { data: cashData, error: cashError } = await caisseQuery

    if (cashError) setError(cashError.message)
    else {
      setCashRegisters(cashData || [])
      if (cashData && cashData.length > 0) setCashRegisterId(cashData[0].id)
    }

    // 2. Staff (per-établissement, pas per-year)
    if (isDirector || isSecretary) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name, type, custom_type, salary_amount')
        .eq('establishment_id', sid)
        .eq('status', 'active')
        .order('full_name', { ascending: true })
      setStaffList(staffData || [])
    }

    // ✅ 3. Expenses — scopés via cash_register_id dyal l'année
    let expensesQuery = supabase
      .from('expenses')
      .select(`
        *,
        cash_registers (name)
      `)
      .eq('establishment_id', sid)

    if (cashData && cashData.length > 0) {
      expensesQuery = expensesQuery.in('cash_register_id', cashData.map(c => c.id))
    } else {
      // Aucune caisse dyal l'année → aucune dépense
      setExpenses([])
      setLoading(false)
      return
    }

    const { data: expensesData, error: expensesError } = await expensesQuery
      .order('expense_date', { ascending: false })

    if (expensesError) {
      setError(expensesError.message)
      setLoading(false)
      return
    }

    // 4. Merge staff b expenses
    if (expensesData && expensesData.length > 0) {
      const staffIds = [...new Set(expensesData.map((e: any) => e.staff_id).filter(Boolean))]

      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, full_name')
          .in('id', staffIds as string[])

        const staffMap = new Map((staffData || []).map((s: any) => [s.id, s]))

        const merged = expensesData.map((e: any) => ({
          ...e,
          staff: e.staff_id ? staffMap.get(e.staff_id) || null : null,
        }))
        setExpenses(merged)
      } else {
        setExpenses(expensesData)
      }
    } else {
      setExpenses([])
    }

    setLoading(false)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !description.trim() || !amount) return

    if (nature !== 'autre' && !staffId) {
      setError('يرجى اختيار الموظف')
      return
    }

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
        nature: nature,
        staff_id: nature !== 'autre' ? staffId : null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setNature('autre')
      setStaffId('')
      setDescription('')
      setAmount('')
      setCategory('')
      setExpenseDate(new Date().toISOString().split('T')[0])
      setPaymentMethod('cash')
      if (yearId) fetchData(establishmentId, yearId)
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
    else if (yearId) fetchData(establishmentId!, yearId)
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  const filteredExpenses = expenses.filter((exp) =>
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exp.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((exp.staff as any)?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || permissionsLoading || roleLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewExpenses) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  const canSelectCaisse = !isSecretary && !isDirector
  const isSalary = nature !== 'autre'

  const getNatureBadge = (nature: string | null) => {
    if (!nature || nature === 'autre') return null
    const n = NATURES.find(x => x.value === nature)
    const colors: Record<string, string> = {
      salaire: 'bg-blue-100 text-blue-700',
      prime: 'bg-purple-100 text-purple-700',
      heures_sup: 'bg-amber-100 text-amber-700',
      avance: 'bg-pink-100 text-pink-700',
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${colors[nature] || 'bg-gray-100 text-gray-700'}`}>
        {n?.label || nature}
      </span>
    )
  }

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

          <div className="mb-4 flex gap-2 flex-wrap">
            {NATURES.map((n) => (
              <button
                key={n.value}
                type="button"
                onClick={() => setNature(n.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  nature === n.value
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isSalary && (
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="inline h-4 w-4 mr-1" />
                  الموظف <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">-- اختر الموظف --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.type === 'teacher' ? 'أستاذ' : s.type === 'secretaire' ? 'سكرتيرة' : s.type === 'chauffeur' ? 'سائق' : s.type === 'femme_menage' ? 'عاملة نظافة' : s.type === 'admin' ? 'إداري' : (s.custom_type || s.type)}
                      {s.salary_amount > 0 ? ` (${s.salary_amount} DH)` : ''}
                    </option>
                  ))}
                </select>
                {staffList.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ لا يوجد موظفون. أضفهم من صفحة "الموظفون"
                  </p>
                )}
              </div>
            )}

            <div className={isSalary ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوصف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={isSalary ? 'يتم التعبئة تلقائياً' : 'مثال: شراء لوازم مكتبية'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="مثال: اللوازم، الرواتب..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <DateInput value={expenseDate} onChange={setExpenseDate} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">الصندوق</label>
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
                    <option key={cr.id} value={cr.id}>{cr.name}</option>
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
                {adding ? 'جارٍ الإضافة...' : `إضافة ${NATURES.find(n => n.value === nature)?.label}`}
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصندوق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {exp.description}
                      {(exp.staff as any)?.full_name && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <User className="inline h-3 w-3 mr-1" />
                          {(exp.staff as any).full_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getNatureBadge(exp.nature) || <span className="text-xs text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{exp.amount} DH</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.expense_date}</td>
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