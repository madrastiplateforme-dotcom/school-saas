'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Wallet, Plus, TrendingUp, TrendingDown, LogOut, Send } from 'lucide-react'

export default function SecretaryDashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [caisseId, setCaisseId] = useState<string | null>(null)
  const [caisseName, setCaisseName] = useState('')
  const [balance, setBalance] = useState(0)
  const [totalIn, setTotalIn] = useState(0)
  const [totalOut, setTotalOut] = useState(0)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [recentExpenses, setRecentExpenses] = useState<any[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, full_name, establishments(name)')
      .eq('user_id', user.id)
      .single()

    setUserName(profile?.full_name || '')
    setSchoolName((profile?.establishments as any)?.name || '')

    const { data: caisse } = await supabase
      .from('cash_registers')
      .select('id, name')
      .eq('owner_user_id', user.id)
      .single()

    if (!caisse) { setLoading(false); return }
    setCaisseId(caisse.id)
    setCaisseName(caisse.name)

    // Payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_date, students(first_name, last_name)')
      .eq('cash_register_id', caisse.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentPayments(payments || [])
    const totalP = (payments || []).reduce((s, p) => s + Number(p.amount), 0)
    setTotalIn(totalP)

    // Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description, amount, expense_date')
      .eq('cash_register_id', caisse.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentExpenses(expenses || [])
    const totalE = (expenses || []).reduce((s, e) => s + Number(e.amount), 0)
    setTotalOut(totalE)

    setBalance(totalP - totalE)

    // ✅ Pending transfers (li wselو liha)
    const { count } = await supabase
      .from('cash_transfers')
      .select('*', { count: 'exact', head: true })
      .eq('to_cash_register_id', caisse.id)
      .eq('status', 'pending')

    setPendingCount(count || 0)

    setLoading(false)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) return <div className="p-6">Chargement...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{schoolName}</h1>
          <p className="text-sm text-slate-500">Espace Secrétaire • {userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Caisse Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-6 w-6" />
            <span className="text-sm opacity-90">{caisseName}</span>
          </div>
          <p className="text-4xl font-bold">{balance.toFixed(2)} DH</p>
          <p className="text-sm opacity-80 mt-1">Solde actuel</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Encaissements</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalIn.toFixed(2)} DH</p>
          </div>
          <div className="bg-white rounded-xl p-5 border">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">Dépenses</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalOut.toFixed(2)} DH</p>
          </div>
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/dashboard/payments/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-5 flex items-center justify-center gap-2 font-semibold transition"
          >
            <Plus className="h-5 w-5" /> تسجيل دفعة
          </button>
          <button
            onClick={() => router.push('/dashboard/expenses')}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl p-5 flex items-center justify-center gap-2 font-semibold transition"
          >
            <Plus className="h-5 w-5" /> تسجيل مصروف
          </button>
        </div>

        {/* Bouton التحويلات */}
        <button
          onClick={() => router.push('/dashboard/caisse/transfers')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-4 flex items-center justify-center gap-3 font-semibold transition relative"
        >
          <Send className="h-5 w-5" />
          التحويلات
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
              {pendingCount} جديد
            </span>
          )}
        </button>

        {/* Bouton الصندوق */}
        <button
          onClick={() => router.push('/dashboard/caisse')}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl p-4 flex items-center justify-center gap-3 font-semibold transition"
        >
          <Wallet className="h-5 w-5" />
          الصندوق الكامل
        </button>

        {/* Recent payments */}
        <div className="bg-white rounded-xl p-6 border">
          <h2 className="font-bold text-slate-800 mb-4">Derniers paiements</h2>
          {recentPayments.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun paiement</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {p.students?.first_name} {p.students?.last_name}
                    </p>
                    <p className="text-xs text-slate-400">{p.payment_date}</p>
                  </div>
                  <span className="text-emerald-600 font-bold">+ {p.amount} DH</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="bg-white rounded-xl p-6 border">
          <h2 className="font-bold text-slate-800 mb-4">Dernières dépenses</h2>
          {recentExpenses.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune dépense</p>
          ) : (
            <div className="space-y-2">
              {recentExpenses.map((e) => (
                <div key={e.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{e.description}</p>
                    <p className="text-xs text-slate-400">{e.expense_date}</p>
                  </div>
                  <span className="text-red-600 font-bold">- {e.amount} DH</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}