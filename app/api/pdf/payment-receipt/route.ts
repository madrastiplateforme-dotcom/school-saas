import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase-admin'
import PaymentReceiptPDF from '@/components/pdfs/PaymentReceiptPDF'
import { registerPdfFonts } from '@/lib/pdf-fonts'

// ✅ Enregistre les 4 variants Cairo (server + client safe)
registerPdfFonts()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const installmentId = searchParams.get('installmentId')

    if (!paymentId && !installmentId) {
      return NextResponse.json(
        { error: 'معرف الدفع أو القسط مطلوب' },
        { status: 400 },
      )
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
        return NextResponse.json(
          { error: 'لا توجد دفعة لهذا القسط' },
          { status: 404 },
        )
      }
      paymentIdToUse = payments[0].id
    }

    if (!paymentIdToUse) {
      return NextResponse.json(
        { error: 'معرف الدفع غير صالح' },
        { status: 400 },
      )
    }

    // 1. Fetch payment + student + establishment (SANS JOIN FK fragile)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentIdToUse)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'الدفع غير موجود' }, { status: 404 })
    }

    // 2. Student info (query séparée)
    let studentName = ''
    if (payment.student_id) {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('first_name, last_name')
        .eq('id', payment.student_id)
        .maybeSingle()

      if (student) {
        studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
      }
    }

    // 3. Establishment info (query séparée)
    let establishment: any = null
    if (payment.establishment_id) {
      const { data: est } = await supabaseAdmin
        .from('establishments')
        .select('name, logo_url, address, phone')
        .eq('id', payment.establishment_id)
        .maybeSingle()
      establishment = est
    }

    // 4. Cashier info (query séparée + role séparée)
    let cashierName = ''
    const cashierId = (payment as any).user_id
    if (cashierId) {
      const { data: cashierProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name, role_id')
        .eq('user_id', cashierId)
        .maybeSingle()

      if (cashierProfile) {
        let roleName = ''
        if (cashierProfile.role_id) {
          const { data: roleData } = await supabaseAdmin
            .from('roles')
            .select('name')
            .eq('id', cashierProfile.role_id)
            .maybeSingle()
          roleName = roleData?.name || ''
        }
        cashierName = `${cashierProfile.full_name || ''}${roleName ? ` (${roleName})` : ''}`
      }
    }

    // 5. Installment description (query séparée)
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
      studentName: studentName || '—',
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      method: payment.method,
      description: installmentDesc || payment.notes || 'دفعة دراسية',
      schoolName: establishment?.name || 'المؤسسة',
      schoolLogo: establishment?.logo_url || null,
      schoolAddress: establishment?.address || null,
      schoolPhone: establishment?.phone || null,
      cashierName,
      reference: payment.reference || null,
    }

    const pdfBuffer = await renderToBuffer(
      PaymentReceiptPDF({ data: receiptData } as any),
    )

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${paymentIdToUse.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'خطأ' },
      { status: 500 },
    )
  }
}