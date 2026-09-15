// lib/send-invoice-email.ts
// Helper: يجيب بيانات الفاتورة + المؤسسة + المدير، ومن بعد كيصيفط الإيميل

import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { invoiceEmail, monthLabelAR } from '@/lib/email-templates'

export async function sendInvoiceEmailById(invoiceId: string) {
  const admin = createAdminClient()

  // 1) الفاتورة
  const { data: invoice, error: invErr } = await admin
    .from('subscription_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invErr || !invoice) {
    console.warn('[send-invoice-email] invoice not found', invoiceId, invErr?.message)
    return { ok: false, error: 'الفاتورة غير موجودة' }
  }

  // 2) المؤسسة
  const { data: establishment } = await admin
    .from('establishments')
    .select('id, name, email, logo_url')
    .eq('id', invoice.establishment_id)
    .maybeSingle()

  if (!establishment) {
    return { ok: false, error: 'المؤسسة غير موجودة' }
  }

  // 3) المدير — أول user_profiles بعلاقة roles(name) = directeur فهاد المؤسسة
  const { data: director } = await admin
    .from('user_profiles')
    .select('full_name, user_id, roles(name), auth_users:user_id(email)')
    .eq('establishment_id', invoice.establishment_id)
    .eq('roles.name', 'Directeur')
    .limit(1)
    .maybeSingle()

  // Fallback: جيب أي user_profiles من هاد المؤسسة مع الدور
  let directorEmail: string | null = null
  let directorName: string | null = null

  if (director) {
    directorName = director.full_name || null
    directorEmail = (director as any).auth_users?.email || null
  }

  // إلا ما لقيناش الإيميل، جربو من establishments.email
  if (!directorEmail) {
    directorEmail = establishment.email || null
  }

  if (!directorEmail) {
    return { ok: false, error: 'لا يوجد إيميل للمدير' }
  }

  // 4) بناء الإيميل
  const periodLabel = monthLabelAR(
    invoice.period_month,
    invoice.period_year,
  )

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const emailContent = invoiceEmail({
    schoolName: establishment.name,
    directorName,
    invoiceNumber: invoice.invoice_number,
    periodLabel,
    studentsCount: invoice.students_count,
    amount: Number(invoice.amount),
    dueDate: invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
      : null,
    billingUrl: `${siteUrl}/dashboard/billing`,
    logoUrl: establishment.logo_url || null,
  })

  // 5) صيفط
  const result = await sendEmail({
    to: directorEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    replyTo: establishment.email || undefined,
    establishmentId: establishment.id,
    template: 'invoice',
    metadata: {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      establishmentId: establishment.id,
      amount: invoice.amount,
    },
  })

  return result
}