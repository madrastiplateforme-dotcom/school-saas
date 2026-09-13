import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase-admin'
import ContractPDF from '@/components/pdfs/ContractPDF'
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
    const contractId = searchParams.get('contractId')
    if (!contractId) return NextResponse.json({ error: 'معرف العقد مطلوب' }, { status: 400 })

    const supabase = createAdminClient()

    // 1. Contract + student + academic year + establishment
    const { data: contract } = await supabase
      .from('contracts')
      .select(`
        *,
        students (first_name, last_name, massar_code, birth_date, gender),
        academic_years (name),
        establishments (name, logo_url, address, phone, email)
      `)
      .eq('id', contractId)
      .single()

    if (!contract) return NextResponse.json({ error: 'العقد غير موجود' }, { status: 404 })

    // 2. Jib les classes
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('classes(name), levels(name)')
      .eq('student_id', contract.student_id)
      .eq('academic_year_id', contract.academic_year_id)
      .maybeSingle()

    // 3. Contract items
    const { data: items } = await supabase
      .from('contract_items')
      .select('*, services(name, type)')
      .eq('contract_id', contractId)

    // 4. Installments
    const { data: installments } = await supabase
      .from('installments')
      .select('id, description, amount, paid_amount, due_date, status')
      .eq('contract_id', contractId)
      .order('due_date', { ascending: true })

    // 5. Total
    // ✅ Prix mensuel dyal services (chhal f chher)
const servicesTotal = (items || []).reduce((s: number, i: any) => s + Number(i.final_price), 0)

// ✅ Total à payer (sum dyal GA3 les échéances = prix × nb chhour)
const grandTotal = (installments || []).reduce((s: number, i: any) => s + Number(i.amount), 0)

// ✅ Mدفوع
const totalPaid = (installments || []).reduce((s: number, i: any) => s + Number(i.paid_amount), 0)

// ✅ المتبقي
const totalRemaining = grandTotal - totalPaid 
    const pdfBuffer = await renderToBuffer(
      ContractPDF({
        data: {
          contractNumber: contract.id.slice(0, 8).toUpperCase(),
          contractStatus: contract.status,
          schoolName: (contract.establishments as any)?.name || 'المؤسسة',
          schoolLogo: (contract.establishments as any)?.logo_url || null,
          schoolAddress: (contract.establishments as any)?.address || null,
          schoolPhone: (contract.establishments as any)?.phone || null,
          studentName: `${(contract.students as any)?.first_name || ''} ${(contract.students as any)?.last_name || ''}`.trim(),
          massarCode: (contract.students as any)?.massar_code || null,
          gender: (contract.students as any)?.gender || null,
          birthDate: (contract.students as any)?.birth_date || null,
          academicYear: (contract.academic_years as any)?.name || '-',
          className: (enrollment as any)?.classes?.name || '-',
          levelName: (enrollment as any)?.levels?.name || '-',
          startDate: contract.start_date,
          endDate: contract.end_date,
          notes: contract.notes,
          items: (items || []).map((i: any) => ({
            name: i.services?.name || '-',
            type: i.services?.type || '-',
            price: Number(i.price),
            discount: Number(i.discount_amount),
            finalPrice: Number(i.final_price),
          })),
          installments: (installments || []).map((i: any) => ({
            description: i.description,
            dueDate: i.due_date,
            amount: Number(i.amount),
            paidAmount: Number(i.paid_amount),
            status: i.status,
          })),
           servicesTotal,     // 🆕
           grandTotal,        // 🆕
           totalPaid,
           totalRemaining,
        },
      } as any)
    )

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract-${contractId.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Contract PDF error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}