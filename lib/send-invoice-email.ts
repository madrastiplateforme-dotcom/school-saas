// lib/send-invoice-email.ts
// Helper: يجيب بيانات الفاتورة + المؤسسة + المدير، ومن بعد كيصيفط الإيميل

import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { invoiceEmail, monthLabelAR } from '@/lib/email-templates'

// ─────────────────────────────────────────────────────────
// 🔑 Rôle names acceptés (multi-langue, multi-casse) — même logique que send-payment-email
// ─────────────────────────────────────────────────────────
const DIRECTOR_ROLES = ['directeur', 'Directeur', 'DIRECTEUR', 'مدير', 'المدير', 'director']

function isDirectorRole(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.trim()
  return DIRECTOR_ROLES.includes(n) || n.toLowerCase().includes('direct')
}

// ─────────────────────────────────────────────────────────
// 🔑 Charge les rôles depuis table roles (id → name)
// ─────────────────────────────────────────────────────────
async function loadRoleMap(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, string>> {
  const { data } = await admin.from('roles').select('id, name')
  const map = new Map<string, string>()
  for (const r of data || []) {
    map.set(r.id, r.name)
  }
  return map
}

// ─────────────────────────────────────────────────────────
// 🔑 Récupère email via auth.admin (comme send-payment-email)
// ─────────────────────────────────────────────────────────
async function getUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch {
    return null
  }
}

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

  // 3) ✅ Directeur — via role_id + roleMap (bug fix)
  const roleMap = await loadRoleMap(admin)

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, full_name, role_id')
    .eq('establishment_id', invoice.establishment_id)

  let directorEmail: string | null = null
  let directorName: string | null = null

  for (const p of profiles || []) {
    const roleName = p.role_id ? roleMap.get(p.role_id) : null
    if (isDirectorRole(roleName)) {
      const email = await getUserEmail(admin, p.user_id)
      if (email) {
        directorEmail = email
        directorName = p.full_name || null
        break
      }
    }
  }

  // Fallback: establishments.email
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