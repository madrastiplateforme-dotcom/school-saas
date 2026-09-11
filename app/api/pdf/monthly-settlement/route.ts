import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase-admin'
import path from 'path'
import { Font } from '@react-pdf/renderer'
import MonthlySettlementPDF from '@/components/pdfs/MonthlySettlementPDF'

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
    const caisseId = searchParams.get('caisseId')
    if (!caisseId) return NextResponse.json({ error: 'معرف الصندوق مطلوب' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: caisse } = await supabase
      .from('cash_registers')
      .select('*, establishments(name)')
      .eq('id', caisseId)
      .single()

    if (!caisse) return NextResponse.json({ error: 'الصندوق غير موجود' }, { status: 404 })

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date, students(first_name, last_name)')
      .eq('cash_register_id', caisseId)
      .order('payment_date', { ascending: true })

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date, description, nature, staff(full_name)')
      .eq('cash_register_id', caisseId)
      .order('expense_date', { ascending: true })

    const { data: transfersIn } = await supabase
      .from('cash_transfers')
      .select('amount, transfer_date, note')
      .eq('to_cash_register_id', caisseId)
      .eq('status', 'accepted')
      .order('transfer_date', { ascending: true })

    const { data: transfersOut } = await supabase
      .from('cash_transfers')
      .select('amount, transfer_date, note')
      .eq('from_cash_register_id', caisseId)
      .eq('status', 'accepted')
      .order('transfer_date', { ascending: true })
     // ✅ Encaissements réels (paiements ghir)
const totalIn = (payments || []).reduce((s, p: any) => s + Number(p.amount), 0)

// ✅ Dépenses réelles (dépenses ghir)
const totalOut = (expenses || []).reduce((s, e: any) => s + Number(e.amount), 0)

// ✅ Transferts (séparés)
const totalTransfersIn = (transfersIn || []).reduce((s, t: any) => s + Number(t.amount), 0)
const totalTransfersOut = (transfersOut || []).reduce((s, t: any) => s + Number(t.amount), 0)
    const initialBalance = Number(caisse.initial_balance || 0)
    const balance = initialBalance + totalIn - totalOut

    const pdfBuffer = await renderToBuffer(
      MonthlySettlementPDF({
        data: {
          caisseName: caisse.name,
          schoolName: (caisse.establishments as any)?.name || '-',
          period: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          initialBalance,
          payments: (payments || []).map((p: any) => ({
            description: `دفعة - ${p.students?.first_name || ''} ${p.students?.last_name || ''}`.trim(),
            date: p.payment_date,
            amount: Number(p.amount),
          })),
          expenses: (expenses || []).map((e: any) => ({
            description: e.description || (e.nature === 'salaire' ? `راتب - ${e.staff?.full_name || ''}` : 'مصروف'),
            date: e.expense_date,
            amount: Number(e.amount),
          })),
          transfersIn: (transfersIn || []).map((t: any) => ({
            description: t.note || 'تحويل وارد',
            date: t.transfer_date,
            amount: Number(t.amount),
          })),
          transfersOut: (transfersOut || []).map((t: any) => ({
            description: t.note || 'تحويل صادر',
            date: t.transfer_date,
            amount: Number(t.amount),
          })),
          totalIn,
          totalOut,
          balance,
        },
      } as any)
    )

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="settlement-${caisseId.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Settlement PDF error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}