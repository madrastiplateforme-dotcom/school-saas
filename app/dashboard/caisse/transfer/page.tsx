'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import DateInput from '@/components/DateInput'
import { ArrowLeft, Send, Loader2, Lock } from 'lucide-react'

type CashRegister = {
  id: string
  name: string
  type: string
  owner_user_id: string | null
  initial_balance: number
}

export default function TransferPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Jib smiyt user
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()
    setCurrentUserName(profile?.full_name || 'مستخدم')

    const { data: cashData } = await supabase
      .from('cash_registers')
      .select('id, name, type, owner_user_id, initial_balance')
      .eq('establishment_id', establishmentId)
      .order('type', { ascending: true })

    const allRegs = cashData || []
    setRegisters(allRegs)

    if (isDirector) {
      const myCaisse = allRegs.find((r) => r.type === 'central' || r.type === 'principal')
      if (myCaisse) setFromId(myCaisse.id)
    } else if (isSecretary) {
      const myCaisse = allRegs.find((r) => r.owner_user_id === user.id)
      if (myCaisse) setFromId(myCaisse.id)
    }

    setLoading(false)
  }

  const mySourceRegister = (() => {
    if (isDirector) return registers.find((r) => r.type === 'central' || r.type === 'principal')
    if (isSecretary) return registers.find((r) => r.owner_user_id === currentUserId)
    return null
  })()

  const availableToRegisters = registers.filter((r) => r.id !== mySourceRegister?.id)

  const getCurrentBalance = async (regId: string): Promise<number> => {
    const supabase = createClient()
    const reg = registers.find((r) => r.id === regId)
    const initial = Number(reg?.initial_balance || 0)

    const { data: payments } = await supabase.from('payments').select('amount').eq('cash_register_id', regId)
    const { data: expenses } = await supabase.from('expenses').select('amount').eq('cash_register_id', regId)
    const { data: tIn } = await supabase.from('cash_transfers').select('amount').eq('to_cash_register_id', regId).eq('status', 'accepted')
    const { data: tOut } = await supabase.from('cash_transfers').select('amount').eq('from_cash_register_id', regId).eq('status', 'accepted')

    const totalIn = (payments?.reduce((s, p: any) => s + Number(p.amount), 0) || 0) + (tIn?.reduce((s, t: any) => s + Number(t.amount), 0) || 0)
    const totalOut = (expenses?.reduce((s, e: any) => s + Number(e.amount), 0) || 0) + (tOut?.reduce((s, t: any) => s + Number(t.amount), 0) || 0)

    return initial + totalIn - totalOut
  }
const getRecipientUserId = async (toReg: CashRegister | undefined): Promise<string | null> => {
  if (!toReg) return null
  if (toReg.owner_user_id) return toReg.owner_user_id
  return null
}  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!fromId || !toId) { setError('يرجى اختيار الصندوق المستلم'); return }
    if (!amount || Number(amount) <= 0) { setError('المبلغ يجب أن يكون أكبر من صفر'); return }

    const numAmount = Number(amount)
    const supabase = createClient()
    setSaving(true)

    try {
      const currentBalance = await getCurrentBalance(fromId)
      if (numAmount > currentBalance) {
        setError(`❌ المبلغ غير كافٍ. رصيدك: ${currentBalance.toFixed(2)} DH فقط.`)
        setSaving(false)
        return
      }

      // 1. Insert transfer
      const { data: transfer, error: tError } = await supabase
        .from('cash_transfers')
        .insert({
          establishment_id: establishmentId,
          from_cash_register_id: fromId,
          to_cash_register_id: toId,
          amount: numAmount,
          transfer_date: transferDate,
          note: note.trim() || null,
          status: 'pending',
          created_by: currentUserId,
        })
        .select()
        .single()

      if (tError) throw tError

      // 2. ✅ Notification l destinataire
      const toCaisse = registers.find((r) => r.id === toId)
      const recipientId = await getRecipientUserId(toCaisse)

      if (recipientId && recipientId !== currentUserId) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: recipientId,
            establishment_id: establishmentId,
            type: 'transfer_request',
            title: '💰 طلب تحويل جديد',
            message: `${currentUserName} (${mySourceRegister?.name}) يطلب تحويل ${numAmount} DH إلى ${toCaisse?.name}`,
            link: '/dashboard/caisse/transfers',
            metadata: { transfer_id: transfer.id, amount: numAmount },
          })

        if (notifError) console.error('❌ Notification error:', notifError)
      }

      setSuccess('✅ تم إنشاء طلب التحويل. في انتظار الموافقة.')
      setTimeout(() => router.push('/dashboard/caisse/transfers'), 2000)
    } catch (err: any) {
      console.error('❌ Submit error:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  if (!mySourceRegister) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" /> رجوع
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold">ليس لديك صندوق مخصص</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm">
        <ArrowLeft className="h-4 w-4" /> رجوع
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Send className="h-6 w-6 text-indigo-600" />
          تحويل مالي
        </h1>
        <p className="text-gray-600">أرسل مبلغاً من صندوقك إلى صندوق آخر</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            من صندوقك (ثابت)
          </label>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-3">
            <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">{mySourceRegister.name}</p>
              <p className="text-xs text-emerald-600">لا يمكن التحويل إلا من صندوقك الخاص</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            إلى الصندوق <span className="text-red-500">*</span>
          </label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">-- اختر الصندوق المستلم --</option>
            {availableToRegisters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type === 'central' || r.type === 'principal' ? 'المدير' : r.type === 'secretary' ? 'سكرتيرة' : 'خدمة'})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            💡 الطرف المستلم هو من سيوافق على التحويل
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المبلغ (DH) <span className="text-red-500">*</span>
          </label>
          <input
            type="number" min="1" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.00" required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التحويل</label>
          <DateInput value={transferDate} onChange={setTransferDate} className="h-11" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظة (اختياري)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: رصيد شهر شتنبر" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

        <div className="flex gap-2 justify-end pt-4 border-t">
          <button type="submit" disabled={saving}
            className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}