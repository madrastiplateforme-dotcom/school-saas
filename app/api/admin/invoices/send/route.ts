// app/api/admin/invoices/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendInvoiceEmailById } from '@/lib/send-invoice-email';
'use client';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ⚠️ TODO: تحقق من Super Admin
    // (نفس الطريقة المستعملة فـ create-establishment)

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId مطلوب' }, { status: 400 });
    }

    const result = await sendInvoiceEmailById(invoiceId);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[api/admin/invoices/send]', e);
    return NextResponse.json(
      { error: e?.message || 'خطأ غير متوقع' },
      { status: 500 },
    );
  }
}