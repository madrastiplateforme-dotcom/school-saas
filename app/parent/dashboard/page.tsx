'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogOut, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function ParentDashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 1. Profile dyal parent
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, full_name, establishments(name)')
      .eq('user_id', user.id)
      .single()

    setUserName(profile?.full_name || '')
    setSchoolName((profile?.establishments as any)?.name || '')

    // 2. Famille li parent_user_id = user.id
    const { data: family } = await supabase
      .from('families')
      .select('id, family_name')
      .eq('parent_user_id', user.id)
      .maybeSingle()

    if (!family) {
      setLoading(false)
      return
    }

    // 3. Élèves dyal dik famille + installments
    const { data: students } = await supabase
      .from('students')
      .select(`
        id, first_name, last_name,
        enrollments(classes(name), levels(name)),
        installments(id, description, amount, paid_amount, due_date, status)
      `)
      .eq('family_id', family.id)
      .eq('establishment_id', profile?.establishment_id)

    const formatted = (students || []).map((s: any) => {
      const installments = s.installments || []
      const total = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0)
      const paid = installments.reduce((sum: number, i: any) => sum + Number(i.paid_amount), 0)
      return {
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        class_name: s.enrollments?.[0]?.classes?.name || '-',
        level_name: s.enrollments?.[0]?.levels?.name || '-',
        total_amount: total,
        paid_amount: paid,
        remaining: total - paid,
        installments,
      }
    })

    setChildren(formatted)
    setLoading(false)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) return <div className="p-6 text-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{schoolName}</h1>
          <p className="text-sm text-slate-500">Espace Parent • {userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h2 className="text-lg font-bold text-slate-800">Mes enfants</h2>

        {children.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-400">
            Aucun enfant inscrit
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {child.first_name} {child.last_name}
                </h3>
                <p className="text-sm text-slate-500">
                  {child.level_name} • {child.class_name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-bold text-slate-800">{child.total_amount.toFixed(2)} DH</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-600">Payé</p>
                  <p className="font-bold text-emerald-700">{child.paid_amount.toFixed(2)} DH</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${child.remaining > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${child.remaining > 0 ? 'text-red-600' : 'text-slate-500'}`}>Reste</p>
                  <p className={`font-bold ${child.remaining > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                    {child.remaining.toFixed(2)} DH
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Détail des échéances</p>
                <div className="space-y-1">
                  {child.installments.map((inst: any) => {
                    const isPaid = inst.paid_amount >= inst.amount
                    const isLate = !isPaid && new Date(inst.due_date) < new Date()
                    return (
                      <div key={inst.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : isLate ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-slate-700">{inst.description}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-800">{inst.amount} DH</p>
                          <p className="text-xs text-slate-500">{inst.due_date}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}