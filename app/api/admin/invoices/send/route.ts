// app/api/admin/invoices/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceEmailById } from '@/lib/send-invoice-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const invoiceId = body?.invoiceId

    if (!invoiceId) {
      return NextResponse.json(
        { ok: false, error: 'invoiceId مطلوب' },
        { status: 400 },
      )
    }

    const result = await sendInvoiceEmailById(invoiceId)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[invoices-send]', e)
    return NextResponse.json(
      { ok: false, error: e.message || 'خطأ' },
      { status: 500 },
    )
  }
}