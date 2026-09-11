'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useUserRole } from '@/lib/useUserRole'
import {
  ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight,
  Plus, Send, User as UserIcon, Building2, Search, FileText,
} from 'lucide-react'

type Movement = {
  id: string
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
  type: string
  relatedTo: string
  icon: any
  color: string
}

export default function CaisseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const registerId = params.id as string
  const { role, loading: roleLoading } = useUserRole()

  const [register, setRegister] = useState<any>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!registerId || !role) return
    loadData()
  }, [registerId, role])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Caisse
    const { data: reg, error: regError } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('id', registerId)
      .single()

    if (regError || !reg) {
      setError('الصندوق غير موجود')
      setLoading(false)
      return
    }

    if (isSecretary && reg.owner_user_id !== user.id) {
      setError('ليس لديك صلاحية')
      setLoading(false)
      return
    }

    setRegister(reg)

    const allMovements: Movement[] = []

    // 2. Payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, amount, payment_date, students(first_name, last_name)')
      .eq('cash_register_id', registerId)

    if (payError) console.error('Payments error:', payError)

    ;(payments || []).forEach((p: any) => {
      allMovements.push({
        id: `pay-${p.id}`,
        date: p.payment_date,
        description: `دفعة - ${p.students?.first_name || ''} ${p.students?.last_name || ''}`.trim(),
        amount: Number(p.amount),
        direction: 'in',
        type: 'Paiement',
        relatedTo: p.students ? `${p.students.first_name} ${p.students.last_name}` : '-',
        icon: ArrowDownLeft,
        color: 'text-emerald-600 bg-emerald-50',
      })
    })

    // 3. Expenses (BLA staff join)
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, description, nature, category')
      .eq('cash_register_id', registerId)

    if (expError) console.error('Expenses error:', expError)

    ;(expenses || []).forEach((e: any) => {
      const isSalaire = e.nature === 'salaire'
      allMovements.push({
        id: `exp-${e.id}`,
        date: e.expense_date,
        description: e.description || (isSalaire ? 'راتب' : 'مصروف'),
        amount: Number(e.amount),
        direction: 'out',
        type: isSalaire ? 'Salaire' : 'Dépense',
        relatedTo: e.category || '-',
        icon: isSalaire ? UserIcon : TrendingDown,
        color: isSalaire ? 'text-purple-600 bg-purple-50' : 'text-red-600 bg-red-50',
      })
    })

    // 4. Transfers out
    const { data: transfersOut, error: tOutError } = await supabase
      .from('cash_transfers')
      .select('id, amount, transfer_date, to_cash_register_id, note, status')
      .eq('from_cash_register_id', registerId)
      .eq('status', 'accepted')

    if (tOutError) console.error('Transfers out error:', tOutError)

    // Jib smiyt caisses destination
    const tOutTargets = (transfersOut || []).map(t => t.to_cash_register_id)
    let caisseNames: Record<string, string> = {}
    if (tOutTargets.length > 0) {
      const { data: names } = await supabase
        .from('cash_registers')
        .select('id, name')
        .in('id', tOutTargets)
      ;(names || []).forEach(n => { caisseNames[n.id] = n.name })
    }

    ;(transfersOut || []).forEach((t: any) => {
      allMovements.push({
        id: `tr-out-${t.id}`,
        date: t.transfer_date,
        description: t.note || 'تحويل صادر',
        amount: Number(t.amount),
        direction: 'out',
        type: 'Transfert sortant',
        relatedTo: caisseNames[t.to_cash_register_id] || '-',
        icon: ArrowUpRight,
        color: 'text-amber-600 bg-amber-50',
      })
    })

    // 5. Transfers in
    const { data: transfersIn, error: tInError } = await supabase
      .from('cash_transfers')
      .select('id, amount, transfer_date, from_cash_register_id, note, status')
      .eq('to_cash_register_id', registerId)
      .eq('status', 'accepted')

    if (tInError) console.error('Transfers in error:', tInError)

    // Jib smiyt caisses source
    const tInSources = (transfersIn || []).map(t => t.from_cash_register_id)
    let caisseSources: Record<string, string> = {}
    if (tInSources.length > 0) {
      const { data: names } = await supabase
        .from('cash_registers')
        .select('id, name')
        .in('id', tInSources)
      ;(names || []).forEach(n => { caisseSources[n.id] = n.name })
    }

    ;(transfersIn || []).forEach((t: any) => {
      allMovements.push({
        id: `tr-in-${t.id}`,
        date: t.transfer_date,
        description: t.note || 'تحويل وارد',
        amount: Number(t.amount),
        direction: 'in',
        type: 'Transfert entrant',
        relatedTo: caisseSources[t.from_cash_register_id] || '-',
        icon: ArrowDownLeft,
        color: 'text-blue-600 bg-blue-50',
      })
    })

    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setMovements(allMovements)
    setLoading(false)
  }

  const balance = (() => {
    if (!register) return 0
    let b = Number(register.initial_balance || 0)
    movements.forEach((m) => { b += m.direction === 'in' ? m.amount : -m.amount })
    return b
  })()

  const thisMonth = new Date().toISOString().slice(0, 7)

  // Total In/Out — EXCLU les transferts
  const totalIn = movements
    .filter((m) => m.direction === 'in' && m.date.startsWith(thisMonth) && !m.type.includes('Transfert'))
    .reduce((s, m) => s + m.amount, 0)

  const totalOut = movements
    .filter((m) => m.direction === 'out' && m.date.startsWith(thisMonth) && !m.type.includes('Transfert'))
    .reduce((s, m) => s + m.amount, 0)

  const filtered = movements.filter((m) =>
    !searchTerm || m.description.toLowerCase().includes(searchTerm.toLowerCase()) || m.relatedTo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  const isCentral = register?.type === 'central' || register?.type === 'principal'
  const isSecretaryReg = register?.type === 'secretary'

  return (
    <div className="p-6 space-y-6">
      <div>
        <button
          onClick={() => router.push('/dashboard/caisse')}
          className="mb-4 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> رجوع إلى الصناديق
        </button>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isCentral ? 'bg-indigo-100 text-indigo-600' :
            isSecretaryReg ? 'bg-emerald-100 text-emerald-600' :
            'bg-amber-100 text-amber-600'
          }`}>
            {isCentral ? <Building2 className="h-7 w-7" /> : <UserIcon className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{register?.name}</h1>
            <p className="text-sm text-gray-500">
              {isCentral ? 'صندوق مركزي' : isSecretaryReg ? 'صندوق سكرتيرة' : 'صندوق خدمة'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 text-white shadow-lg ${
          balance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'
        }`}>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">الرصيد الحالي</span>
          </div>
          <p className="text-3xl font-bold">{balance.toFixed(2)} DH</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => router.push('/dashboard/payments/new')}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold transition"
        >
          <Plus className="h-5 w-5" /> تسجيل دفعة
        </button>
        <button
          onClick={() => router.push('/dashboard/expenses')}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold transition"
        >
          <Plus className="h-5 w-5" /> تسجيل مصروف
        </button>
        <button
          onClick={() => router.push('/dashboard/caisse/transfer')}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold transition"
        >
          <Send className="h-5 w-5" /> تحويل
        </button>
      </div>

      {isDirector && isSecretaryReg && (
        <button
          onClick={() => window.open(`/api/pdf/monthly-settlement?caisseId=${registerId}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold transition"
        >
          <FileText className="h-5 w-5" /> تقفيل الشهر / Régularisation mensuelle
        </button>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <h2 className="font-bold text-slate-800">
            الحركات المالية ({filtered.length})
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث..."
              className="w-full sm:w-56 pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">لا توجد حركات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => {
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
                      <td className={`px-5 py-4 text-sm font-bold whitespace-nowrap ${
                        m.direction === 'in' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {m.direction === 'in' ? '+' : '-'} {m.amount.toFixed(2)} DH
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