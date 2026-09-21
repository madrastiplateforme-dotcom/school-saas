'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import Link from 'next/link'
import { useUserRole } from '@/lib/useUserRole'
import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Search, Building2, User as UserIcon, Filter, Send } from 'lucide-react'

type CashRegister = {
  id: string
  name: string
  type: string
  owner_user_id: string | null
  initial_balance: number
}

type Movement = {
  id: string
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
  type: string
  cashRegisterId: string
  cashRegisterName: string
  relatedTo: string
  icon: any
  color: string
}

export default function CaissePage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()

  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('all')
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    loadData(establishmentId, yearId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  const loadData = async (sid: string, yid: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ✅ Caisses filtrées par année active
    let query = supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id, initial_balance')
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)

    if (isSecretary) {
      query = query.eq('owner_user_id', user.id)
    }

    const { data: cashData, error: cashError } = await query.order('type', { ascending: true })

    if (cashError) { setError(cashError.message); setLoading(false); return }
    setRegisters(cashData || [])

    const registerIds = (cashData || []).map((c) => c.id)
    if (registerIds.length === 0) { setLoading(false); return }

    const allMovements: Movement[] = []

    // ═════════════════════════════════════════════════════════════
    // 1. Payments (filtrés par année active + par caisse)
    // ═════════════════════════════════════════════════════════════
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_date, cash_register_id, student_id, is_refunded')
      .eq('academic_year_id', yid)
      .in('cash_register_id', registerIds)
      .is('deleted_at', null)

    // Noms des étudiants séparément (R1)
    const studentIds = Array.from(
      new Set((payments || []).map((p: any) => p.student_id).filter(Boolean))
    )
    const studentMap = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .in('id', studentIds)
      ;(studentsData || []).forEach((s: any) => {
        studentMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim())
      })
    }

    ;(payments || []).forEach((p: any) => {
      const reg = (cashData || []).find((c) => c.id === p.cash_register_id)
      const studentName = p.student_id ? (studentMap.get(p.student_id) || '') : ''
      const refundedFlag = p.is_refunded ? ' ⚠️' : ''

      allMovements.push({
        id: `pay-${p.id}`,
        date: p.payment_date,
        description: `دفعة - ${studentName}${refundedFlag}`.trim(),
        amount: Number(p.amount),
        direction: 'in',
        type: p.is_refunded ? 'Paiement (remboursé)' : 'Paiement',
        cashRegisterId: p.cash_register_id,
        cashRegisterName: reg?.name || '-',
        relatedTo: studentName || '-',
        icon: ArrowDownLeft,
        color: p.is_refunded
          ? 'text-orange-600 bg-orange-50'
          : 'text-emerald-600 bg-emerald-50',
      })
    })

    // ═════════════════════════════════════════════════════════════
    // 2. Expenses (via cash_registers → déjà per-year)
    // ═════════════════════════════════════════════════════════════
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, cash_register_id, description, nature, category')
      .in('cash_register_id', registerIds)

    ;(expenses || []).forEach((e: any) => {
      const reg = (cashData || []).find((c) => c.id === e.cash_register_id)
      const isSalaire = e.nature === 'salaire'
      const isRefund = e.nature === 'refund' || e.category === 'refund'

      allMovements.push({
        id: `exp-${e.id}`,
        date: e.expense_date,
        description: e.description || (isSalaire ? 'راتب' : isRefund ? 'إرجاع دفعة' : 'مصروف'),
        amount: Number(e.amount),
        direction: 'out',
        type: isSalaire ? 'Salaire' : isRefund ? 'Remboursement' : 'Dépense',
        cashRegisterId: e.cash_register_id,
        cashRegisterName: reg?.name || '-',
        relatedTo: e.category || '-',
        icon: isSalaire ? UserIcon : TrendingDown,
        color: isSalaire
          ? 'text-purple-600 bg-purple-50'
          : isRefund
            ? 'text-orange-600 bg-orange-50'
            : 'text-red-600 bg-red-50',
      })
    })

    // ═════════════════════════════════════════════════════════════
    // 3. Transfers — 2 queries séparées (évite .or() + .in())
    //    + filtrés via cash_registers (per-year)
    // ═════════════════════════════════════════════════════════════

    // 3a. Transfers SORTANTS
    const { data: transfersOut } = await supabase
      .from('cash_transfers')
      .select('id, amount, transfer_date, from_cash_register_id, to_cash_register_id, note, status')
      .eq('status', 'accepted')
      .in('from_cash_register_id', registerIds)

    // 3b. Transfers ENTRANTS
    const { data: transfersIn } = await supabase
      .from('cash_transfers')
      .select('id, amount, transfer_date, from_cash_register_id, to_cash_register_id, note, status')
      .eq('status', 'accepted')
      .in('to_cash_register_id', registerIds)

    // Noms des caisses liées
    const linkedCaisseIds = new Set<string>()
    ;(transfersOut || []).forEach((t: any) => {
      linkedCaisseIds.add(t.from_cash_register_id)
      linkedCaisseIds.add(t.to_cash_register_id)
    })
    ;(transfersIn || []).forEach((t: any) => {
      linkedCaisseIds.add(t.from_cash_register_id)
      linkedCaisseIds.add(t.to_cash_register_id)
    })

    const linkedCaisseMap = new Map<string, string>()
    if (linkedCaisseIds.size > 0) {
      const { data: names } = await supabase
        .from('cash_registers')
        .select('id, name')
        .in('id', Array.from(linkedCaisseIds))
      ;(names || []).forEach((n: any) => linkedCaisseMap.set(n.id, n.name))
    }

    // 3c. Push transferts sortants
    ;(transfersOut || []).forEach((t: any) => {
      const fromReg = (cashData || []).find((c) => c.id === t.from_cash_register_id)
      allMovements.push({
        id: `tr-out-${t.id}`,
        date: t.transfer_date,
        description: t.note || 'تحويل صادر',
        amount: Number(t.amount),
        direction: 'out',
        type: 'Transfert sortant',
        cashRegisterId: t.from_cash_register_id,
        cashRegisterName: fromReg?.name || linkedCaisseMap.get(t.from_cash_register_id) || '-',
        relatedTo: linkedCaisseMap.get(t.to_cash_register_id) || '-',
        icon: ArrowUpRight,
        color: 'text-amber-600 bg-amber-50',
      })
    })

    // 3d. Push transferts entrants
    ;(transfersIn || []).forEach((t: any) => {
      const toReg = (cashData || []).find((c) => c.id === t.to_cash_register_id)
      allMovements.push({
        id: `tr-in-${t.id}`,
        date: t.transfer_date,
        description: t.note || 'تحويل وارد',
        amount: Number(t.amount),
        direction: 'in',
        type: 'Transfert entrant',
        cashRegisterId: t.to_cash_register_id,
        cashRegisterName: toReg?.name || linkedCaisseMap.get(t.to_cash_register_id) || '-',
        relatedTo: linkedCaisseMap.get(t.from_cash_register_id) || '-',
        icon: ArrowDownLeft,
        color: 'text-blue-600 bg-blue-50',
      })
    })

    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setMovements(allMovements)
    setLoading(false)
  }

  const getRegisterBalance = (regId: string): number => {
    const reg = registers.find((r) => r.id === regId)
    if (!reg) return 0
    let balance = Number(reg.initial_balance || 0)
    movements
      .filter((m) => m.cashRegisterId === regId)
      .forEach((m) => {
        balance += m.direction === 'in' ? m.amount : -m.amount
      })
    return balance
  }

  const getTotalBalance = () => registers.reduce((sum, r) => sum + getRegisterBalance(r.id), 0)

  const thisMonth = new Date().toISOString().slice(0, 7)

  const totalIn = movements
    .filter((m) => m.direction === 'in' && m.date.startsWith(thisMonth) && !m.type.includes('Transfert'))
    .reduce((s, m) => s + m.amount, 0)

  const totalOut = movements
    .filter((m) => m.direction === 'out' && m.date.startsWith(thisMonth) && !m.type.includes('Transfert'))
    .reduce((s, m) => s + m.amount, 0)

  const filteredMovements = movements.filter((m) => {
    if (selectedRegisterId !== 'all' && m.cashRegisterId !== selectedRegisterId) return false
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (searchTerm && !m.description.toLowerCase().includes(searchTerm.toLowerCase()) && !m.relatedTo.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const movementTypes = Array.from(new Set(movements.map((m) => m.type)))

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            الصندوق
          </h1>
          <p className="text-gray-600">
            {isDirector ? 'جميع الصناديق والمبالغ' : 'صندوقك الخاص'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/caisse/transfers')}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition"
        >
          <Send className="h-4 w-4" /> التحويلات
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">{isDirector ? 'إجمالي الأرصدة' : 'رصيدك'}</span>
          </div>
          <p className="text-3xl font-bold">{getTotalBalance().toFixed(2)} DH</p>
          <p className="text-xs opacity-75 mt-1">{registers.length} صندوق</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">مداخيل هذا الشهر</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalIn.toFixed(2)} DH</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm font-medium">مصاريف هذا الشهر</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalOut.toFixed(2)} DH</p>
        </div>
      </div>

      {/* Caisses Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registers.map((reg) => {
          const balance = getRegisterBalance(reg.id)
          const isCentral = reg.type === 'central' || reg.type === 'principal'
          const isSecretaryReg = reg.type === 'secretary'

          return (
            <Link
              key={reg.id}
              href={`/dashboard/caisse/${reg.id}`}
              className="text-left bg-white rounded-xl p-5 border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md transition block"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCentral ? 'bg-indigo-100 text-indigo-600' :
                  isSecretaryReg ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {isCentral ? <Building2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{reg.name}</p>
                  <p className="text-xs text-slate-400">
                    {isCentral ? 'صندوق مركزي' : isSecretaryReg ? 'صندوق سكرتيرة' : 'صندوق خدمة'}
                  </p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {balance.toFixed(2)} DH
              </p>
            </Link>
          )
        })}
      </div>

      {/* Mouvements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            الحركات المالية ({filteredMovements.length})
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث..."
                className="w-full sm:w-48 pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">جميع الأنواع</option>
              {movementTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <p className="text-center text-gray-400 py-12">لا توجد حركات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصندوق</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.map((m) => {
                  const Icon = m.icon
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{m.date}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${m.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {m.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        <p className="font-medium">{m.description}</p>
                        {m.relatedTo && m.relatedTo !== '-' && (
                          <p className="text-xs text-slate-400">{m.relatedTo}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{m.cashRegisterName}</td>
                      <td className={`px-5 py-4 text-sm font-bold whitespace-nowrap ${
                        m.direction === 'in' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {m.direction === 'in' ? '+' : '-'} {m.amount.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}