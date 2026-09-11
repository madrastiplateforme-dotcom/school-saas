import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { establishmentId, amount, periodStart, periodEnd, notes } = body

    if (!establishmentId || !amount) {
      return NextResponse.json({ error: 'المعرف والمبلغ مطلوبان' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        establishment_id: establishmentId,
        amount: Number(amount),
        period_start: periodStart || null,
        period_end: periodEnd || null,
        notes: notes || null,
      })

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('establishments')
      .update({ subscription_status: 'paid' })
      .eq('id', establishmentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}