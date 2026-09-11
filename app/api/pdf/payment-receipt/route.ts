import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase-admin'
import PaymentReceiptPDF from '@/components/pdfs/PaymentReceiptPDF'
import path from 'path'
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Regular.ttf') },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Bold.ttf'), fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const installmentId = searchParams.get('installmentId')

    if (!paymentId && !installmentId) {
      return NextResponse.json({ error: 'معرف الدفع أو القسط مطلوب' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    let paymentIdToUse = paymentId

    if (!paymentIdToUse && installmentId) {
      const { data: payments, error: payError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('installment_id', installmentId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (payError || !payments || payments.length === 0) {
        return NextResponse.json({ error: 'لا توجد دفعة لهذا القسط' }, { status: 404 })
      }
      paymentIdToUse = payments[0].id
    }

    if (!paymentIdToUse) {
      return NextResponse.json({ error: 'معرف الدفع غير صالح' }, { status: 400 })
    }

    // 1. Jib payment + student + establishment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        students (first_name, last_name),
        establishments (name, logo_url, address, phone)
      `)
      .eq('id', paymentIdToUse)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'الدفع غير موجود' }, { status: 404 })
    }

    // 2. ✅ Jib smiyt li dar paiement (created_by wla user_id)
    let cashierName = ''
    const cashierId = (payment as any).user_id
    if (cashierId) {
      const { data: cashierProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name, roles(name)')
        .eq('user_id', cashierId)
        .maybeSingle()

      if (cashierProfile) {
        const roleName = (cashierProfile.roles as any)?.name || ''
        cashierName = `${cashierProfile.full_name}${roleName ? ` (${roleName})` : ''}`
      }
    }

    // 3. Jib smiyt l'installment
    let installmentDesc = ''
    if (payment.installment_id) {
      const { data: inst } = await supabaseAdmin
        .from('installments')
        .select('description')
        .eq('id', payment.installment_id)
        .maybeSingle()
      installmentDesc = inst?.description || ''
    }

    const receiptData = {
      receiptNumber: payment.id.slice(0, 8).toUpperCase(),
      studentName: `${payment.students?.first_name || ''} ${payment.students?.last_name || ''}`.trim(),
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      method: payment.method,
      description: installmentDesc || payment.notes || 'دفعة دراسية',
      schoolName: payment.establishments?.name || 'المؤسسة',
      schoolLogo: payment.establishments?.logo_url || null,
      schoolAddress: (payment.establishments as any)?.address || null,
      schoolPhone: (payment.establishments as any)?.phone || null,
      cashierName,
      reference: payment.reference || null,
    }

    const pdfBuffer = await renderToBuffer(PaymentReceiptPDF({ data: receiptData } as any))

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${paymentIdToUse.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}