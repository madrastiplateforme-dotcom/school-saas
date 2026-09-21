'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import { ArrowLeft, Check, X, Clock, ArrowRight, Wallet, Plus, Send } from 'lucide-react'

type Transfer = {
  id: string
  amount: number
  transfer_date: string
  note: string | null
  status: string
  from_cash_register_id: string
  to_cash_register_id: string
  created_by: string
  created_at: string
  from_caisse?: { name: string; owner_user_id: string | null; type: string }
  to_caisse?: { name: string; owner_user_id: string | null; type: string }
}

export default function TransfersPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [filter, setFilter] = useState('all')

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  const loadData = async () => {
    if (!yearId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()
    setCurrentUserName(profile?.full_name || 'مستخدم')

    // ✅ 1. Caisses dyal l'année active
    const { data: yearCaisses, error: caisseErr } = await supabase
      .from('cash_registers')
      .select('id, name, owner_user_id, type')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)

    if (caisseErr) {
      setError(caisseErr.message)
      setLoading(false)
      return
    }

    const caisseMap = new Map<string, any>(
      (yearCaisses || []).map((c: any) => [c.id, c])
    )
    const yearCaisseIds = new Set(caisseMap.keys())

    // ✅ 2. Charge les transfers de l'établissement (broad)
    const { data: transfersData, error: tError } = await supabase
      .from('cash_transfers')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })

    if (tError) { setError(tError.message); setLoading(false); return }

    // ✅ 3. Filtrer côté JS: garder ghir li kayn f caisses dyal l'année
    const relevant = (transfersData || []).filter(
      (t: any) =>
        yearCaisseIds.has(t.from_cash_register_id) ||
        yearCaisseIds.has(t.to_cash_register_id)
    )

    // ✅ 4. Charger les noms dyal caisses liées (li momkin ma kayninch f yearCaisses)
    const linkedIds = new Set<string>()
    relevant.forEach((t: any) => {
      linkedIds.add(t.from_cash_register_id)
      linkedIds.add(t.to_cash_register_id)
    })

    const fullCaisseMap = new Map(caisseMap)
    const missingIds = Array.from(linkedIds).filter((id) => !fullCaisseMap.has(id))
    if (missingIds.length > 0) {
      const { data: extraCaisses } = await supabase
        .from('cash_registers')
        .select('id, name, owner_user_id, type')
        .in('id', missingIds)
      ;(extraCaisses || []).forEach((c: any) => fullCaisseMap.set(c.id, c))
    }

    const formatted: Transfer[] = relevant.map((t: any) => ({
      ...t,
      amount: Number(t.amount),
      from_caisse: fullCaisseMap.get(t.from_cash_register_id) as any,
      to_caisse: fullCaisseMap.get(t.to_cash_register_id) as any,
    }))

    setTransfers(formatted)
    setLoading(false)
  }

  const canValidate = (t: Transfer): boolean => {
    if (t.status !== 'pending') return false
    if (!t.to_caisse) return false
    if (t.to_caisse.owner_user_id) {
      return t.to_caisse.owner_user_id === currentUserId
    }
    return false
  }

  const handleAccept = async (transfer: Transfer) => {
    if (!confirm('هل تريد قبول هذا التحويل؟')) return
    const supabase = createClient()

    const { error } = await supabase
      .from('cash_transfers')
      .update({
        status: 'accepted',
        accepted_by: currentUserId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', transfer.id)

    if (error) { setError(error.message); return }

    if (transfer.created_by && transfer.created_by !== currentUserId) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: transfer.created_by,
          establishment_id: establishmentId,
          type: 'transfer_accepted',
          title: '✅ تم قبول التحويل',
          message: `${currentUserName} وافق على تحويل ${transfer.amount} DH من ${transfer.from_caisse?.name} إلى ${transfer.to_caisse?.name}`,
          link: '/dashboard/caisse/transfers',
          metadata: { transfer_id: transfer.id, amount: transfer.amount },
        })

      if (notifError) console.error('❌ Notification error:', notifError)
    }

    loadData()
  }

  const handleReject = async (transfer: Transfer) => {
    if (!confirm('هل تريد رفض هذا التحويل؟')) return
    const supabase = createClient()

    const { error } = await supabase
      .from('cash_transfers')
      .update({
        status: 'rejected',
        accepted_by: currentUserId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', transfer.id)

    if (error) { setError(error.message); return }

    if (transfer.created_by && transfer.created_by !== currentUserId) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: transfer.created_by,
          establishment_id: establishmentId,
          type: 'transfer_rejected',
          title: '❌ تم رفض التحويل',
          message: `${currentUserName} رفض تحويل ${transfer.amount} DH`,
          link: '/dashboard/caisse/transfers',
          metadata: { transfer_id: transfer.id, amount: transfer.amount },
        })

      if (notifError) console.error('❌ Notification error:', notifError)
    }

    loadData()
  }

  const filtered = transfers.filter((t) => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'accepted') return t.status === 'accepted'
    if (filter === 'rejected') return t.status === 'rejected'
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium"><Check className="h-3.5 w-3.5" /> مقبول</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-medium"><X className="h-3.5 w-3.5" /> مرفوض</span>
      default:
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium"><Clock className="h-3.5 w-3.5" /> في الانتظار</span>
    }
  }

  const pendingCount = transfers.filter((t) => t.status === 'pending' && canValidate(t)).length

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push('/dashboard/caisse')}
            className="mb-3 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm">
            <ArrowLeft className="h-4 w-4" /> رجوع إلى الصناديق
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-indigo-600" />
            التحويلات المالية
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-amber-900 text-sm font-bold px-3 py-1 rounded-full">
                {pendingCount} في الانتظار
              </span>
            )}
          </h1>
          <p className="text-gray-600">التحويلات بين الصناديق</p>
        </div>
        <button onClick={() => router.push('/dashboard/caisse/transfer')}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="h-4 w-4" /> تحويل جديد
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'pending', label: 'في الانتظار' },
          { key: 'accepted', label: 'مقبولة' },
          { key: 'rejected', label: 'مرفوضة' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border">
          <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد تحويلات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isPending = t.status === 'pending'
            const canAccept = canValidate(t)

            return (
              <div key={t.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm ${
                  canAccept ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'
                }`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <Wallet className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">{t.from_caisse?.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">{t.to_caisse?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">{t.amount.toFixed(2)} DH</p>
                    <p className="text-xs text-slate-400">{t.transfer_date}</p>
                  </div>
                </div>

                {t.note && (
                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{t.note}</p>
                )}

                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                  {getStatusBadge(t.status)}

                  {canAccept && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(t)}
                        className="inline-flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
                        <Check className="h-4 w-4" /> قبول
                      </button>
                      <button onClick={() => handleReject(t)}
                        className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium">
                        <X className="h-4 w-4" /> رفض
                      </button>
                    </div>
                  )}

                  {isPending && !canAccept && (
                    <span className="text-xs text-slate-400">
                      ⏳ في انتظار موافقة الطرف المستلم
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}