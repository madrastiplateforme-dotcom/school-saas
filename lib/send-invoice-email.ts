// lib/send-invoice-email.ts
import { createAdminClient } from './supabase-admin'
import { sendEmail } from './email'
import { invoiceEmail, monthLabelAR } from './email-templates'

export type SendInvoiceResult = {
  success: boolean
  skipped?: boolean
  reason?: string
  error?: string
}

export async function sendInvoiceEmailById(invoiceId: string) {
  const supabaseAdmin = createAdminClient()
  // 1) الفاتورة
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('subscription_invoices')
    .select(
      'id, establishment_id, invoice_number, period_month, period_year, students_count, amount, due_date, status',
    )
    .eq('id', invoiceId)
    .single()

  if (invErr || !invoice) {
    throw new Error('الفاتورة غير موجودة')
  }

  // 2) المدرسة
  const { data: est, error: estErr } = await supabaseAdmin
    .from('establishments')
    .select('id, name, email, director_email, logo_url')
    .eq('id', invoice.establishment_id)
    .single()

  if (estErr || !est) {
    throw new Error('المدرسة غير موجودة')
  }

  const to = est.director_email || est.email
  if (!to) {
    throw new Error('لا يوجد بريد إلكتروني مسجل للمدرسة')
  }

  // 3) بناء الـ template
  const periodLabel = monthLabelAR(invoice.period_month ?? 1, invoice.period_year)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const tpl = invoiceEmail({
    schoolName: est.name,
    invoiceNumber: invoice.invoice_number,
    periodLabel,
    studentsCount: invoice.students_count,
    amount: Number(invoice.amount),
    dueDate: invoice.due_date ?? null,
    billingUrl: `${siteUrl}/dashboard/billing`,
    logoUrl: est.logo_url ?? null,
  })

  // 4) الإرسال (sendEmail كتسجل بوحدها فـ email_log)
  const result = await sendEmail({
    to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    replyTo: est.email ?? null,
    establishmentId: est.id,
    template: 'invoice',
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
    },
  })

  // 5) بدل الحالة من draft → sent
  if (result.ok && invoice.status === 'draft') {
    await supabaseAdmin
      .from('subscription_invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
  }

  return { success: result.ok, error: result.error }
}