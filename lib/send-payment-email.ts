// lib/send-payment-email.ts
import { createAdminClient } from './supabase-admin'
import { sendEmail } from './email'
import {
  paymentReceivedEmail,
  paymentCancelledEmail,
  paymentCancelledToRecorderEmail,
} from './email-templates'

// ─────────────────────────────────────────────────────────
// 🔑 Rôle names acceptés (multi-langue, multi-casse)
// ─────────────────────────────────────────────────────────
const DIRECTOR_ROLES = ['directeur', 'Directeur', 'DIRECTEUR', 'مدير', 'المدير', 'director']
const SECRETARY_ROLES = ['secretaire', 'Secrétaire', 'SECRETAIRE', 'سكرتيرة', 'السكرتيرة', 'secretary']

function isDirectorRole(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.trim()
  return DIRECTOR_ROLES.includes(n) || n.toLowerCase().includes('direct')
}

function isSecretaryRole(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.trim()
  return SECRETARY_ROLES.includes(n) || n.toLowerCase().includes('secr')
}

// ─────────────────────────────────────────────────────────
// 🔑 Charge les rôles une seule fois (cache par establishment)
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
// 🔑 getUserInfo — sans JOIN auth_users, avec role_name
// ─────────────────────────────────────────────────────────
async function getUserInfo(
  admin: ReturnType<typeof createAdminClient>,
  userId: string | null,
  roleMap: Map<string, string>,
): Promise<{ email: string | null; name: string | null; roleName: string | null }> {
  if (!userId) return { email: null, name: null, roleName: null }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, role_id')
    .eq('user_id', userId)
    .maybeSingle()

  let email: string | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    email = data?.user?.email || null
  } catch {
    email = null
  }

  const roleName = profile?.role_id ? roleMap.get(profile.role_id) || null : null

  return {
    email,
    name: profile?.full_name || null,
    roleName,
  }
}

// ─────────────────────────────────────────────────────────
// 🔑 getUsersByRole — remplace .eq('role', 'directeur')
// ─────────────────────────────────────────────────────────
async function getUsersByRole(
  admin: ReturnType<typeof createAdminClient>,
  establishmentId: string,
  roleMap: Map<string, string>,
  match: (name: string) => boolean,
): Promise<Array<{ user_id: string; full_name: string | null; roleName: string }>> {
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, full_name, role_id')
    .eq('establishment_id', establishmentId)

  const result: Array<{ user_id: string; full_name: string | null; roleName: string }> = []
  for (const p of profiles || []) {
    const roleName = p.role_id ? roleMap.get(p.role_id) : null
    if (roleName && match(roleName)) {
      result.push({ user_id: p.user_id, full_name: p.full_name, roleName })
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────
// 1. PAIEMENT CRÉÉ
// ─────────────────────────────────────────────────────────
export async function sendPaymentReceivedEmails(paymentId: string) {
  const admin = createAdminClient()
  const errors: string[] = []
  let sent = 0
  let skipped = 0

  try {
    const { data: payment, error } = await admin
      .from('payments')
      .select(`
        id, amount, payment_date, method, reference, student_id,
        installment_id, cash_register_id, user_id, establishment_id,
        students (first_name, last_name, family_id),
        installments (description),
        cash_registers (name)
      `)
      .eq('id', paymentId)
      .maybeSingle()

    if (error || !payment) {
      return { success: false, sent: 0, skipped: 0, errors: ['payment not found'] }
    }

    const establishmentId = (payment as any).establishment_id
    const studentRow = (payment as any).students

    const { data: establishment } = await admin
      .from('establishments')
      .select('id, name, email')
      .eq('id', establishmentId)
      .maybeSingle()

    const schoolName = establishment?.name || 'Madrasti'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const amount = Number(payment.amount)
    const paymentDate = payment.payment_date
    const studentName = studentRow
      ? `${studentRow.first_name} ${studentRow.last_name}`
      : '-'
    const installmentDesc = (payment as any).installments?.description || '-'
    const cashRegisterName = (payment as any).cash_registers?.name || null

    // 🔑 Charge role map
    const roleMap = await loadRoleMap(admin)

    const recorder = await getUserInfo(admin, payment.user_id, roleMap)
    const recorderName = recorder.name || '—'

    // ─── Directeurs ───
    const directors = await getUsersByRole(
      admin,
      establishmentId,
      roleMap,
      isDirectorRole,
    )

    for (const d of directors) {
      const info = await getUserInfo(admin, d.user_id, roleMap)
      if (!info.email) { skipped++; continue }

      const content = paymentReceivedEmail({
        recipientRole: 'directeur',
        recipientName: d.full_name || 'المدير',
        studentName, amount, installmentDesc, paymentDate,
        method: payment.method,
        reference: payment.reference,
        cashRegisterName,
        recordedByName: recorderName,
        schoolName,
        link: `${siteUrl}/dashboard/payments`,
      })

      const res = await sendEmail({
        to: info.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: establishment?.email || undefined,
        establishmentId,
        template: 'payment_received_directeur',
        metadata: { paymentId, role: 'directeur' },
      })
      if (res.ok) sent++; else errors.push(res.error || 'send failed')
    }

    // ─── Secrétaire créatrice ───
    if (isSecretaryRole(recorder.roleName) && recorder.email) {
      const content = paymentReceivedEmail({
        recipientRole: 'secretaire',
        recipientName: recorder.name || 'السكرتيرة',
        studentName, amount, installmentDesc, paymentDate,
        method: payment.method,
        reference: payment.reference,
        cashRegisterName,
        recordedByName: recorderName,
        schoolName,
        link: `${siteUrl}/dashboard/payments`,
      })

      const res = await sendEmail({
        to: recorder.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: establishment?.email || undefined,
        establishmentId,
        template: 'payment_received_secretaire',
        metadata: { paymentId, role: 'secretaire' },
      })
      if (res.ok) sent++; else errors.push(res.error || 'send failed')
    }

    // ─── Parent ───
    if (studentRow?.family_id) {
      const { data: fam } = await admin
        .from('families')
        .select('parent_user_id')
        .eq('id', studentRow.family_id)
        .maybeSingle()

      if (fam?.parent_user_id) {
        const info = await getUserInfo(admin, fam.parent_user_id, roleMap)
        if (!info.email) {
          skipped++
        } else {
          const content = paymentReceivedEmail({
            recipientRole: 'parent',
            recipientName: info.name || 'ولي الأمر',
            studentName, amount, installmentDesc, paymentDate,
            method: payment.method,
            reference: payment.reference,
            cashRegisterName: null,
            recordedByName: recorderName,
            schoolName,
            link: `${siteUrl}/parent/dashboard/payments`,
          })

          const res = await sendEmail({
            to: info.email,
            subject: content.subject,
            html: content.html,
            text: content.text,
            replyTo: establishment?.email || undefined,
            establishmentId,
            template: 'payment_received_parent',
            metadata: { paymentId, role: 'parent' },
          })
          if (res.ok) sent++; else errors.push(res.error || 'send failed')
        }
      }
    }

    return { success: true, sent, skipped, errors }
  } catch (err: any) {
    console.error('[sendPaymentReceivedEmails]', err?.message || err)
    return { success: false, sent, skipped, errors: [err?.message || 'unknown'] }
  }
}

// ─────────────────────────────────────────────────────────
// 2. PAIEMENT ARCHIVÉ
// ─────────────────────────────────────────────────────────
export async function sendPaymentCancelledEmails(args: {
  paymentId: string
  cancelledByUserId: string
  cancelReason: string
}) {
  const admin = createAdminClient()
  const errors: string[] = []
  let sent = 0
  let skipped = 0

  try {
    const { data: payment, error } = await admin
      .from('payments')
      .select(`
        id, amount, payment_date, method, reference, student_id,
        installment_id, user_id, establishment_id,
        students (first_name, last_name, family_id),
        installments (description)
      `)
      .eq('id', args.paymentId)
      .maybeSingle()

    if (error || !payment) {
      return { success: false, sent: 0, skipped: 0, errors: ['payment not found'] }
    }

    const establishmentId = (payment as any).establishment_id
    const studentRow = (payment as any).students

    const { data: establishment } = await admin
      .from('establishments')
      .select('id, name, email')
      .eq('id', establishmentId)
      .maybeSingle()

    const schoolName = establishment?.name || 'Madrasti'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const amount = Number(payment.amount)
    const paymentDate = payment.payment_date
    const reason = args.cancelReason || 'غير محدد'
    const studentName = studentRow
      ? `${studentRow.first_name} ${studentRow.last_name}`
      : '-'
    const installmentDesc = (payment as any).installments?.description || '-'

    const roleMap = await loadRoleMap(admin)

    const canceller = await getUserInfo(admin, args.cancelledByUserId, roleMap)
    const cancelledByName = canceller.name || '—'

    const recorder = await getUserInfo(admin, payment.user_id, roleMap)
    const recorderName = recorder.name || '—'

    // ─── Directeurs ───
    const directors = await getUsersByRole(
      admin,
      establishmentId,
      roleMap,
      isDirectorRole,
    )

    for (const d of directors) {
      const info = await getUserInfo(admin, d.user_id, roleMap)
      if (!info.email) { skipped++; continue }

      const content = paymentCancelledEmail({
        recipientRole: 'directeur',
        recipientName: d.full_name || 'المدير',
        studentName, amount, installmentDesc, paymentDate,
        cancelledByName, reason,
        recordedByName: recorderName,
        schoolName,
        link: `${siteUrl}/dashboard/payments`,
      })

      const res = await sendEmail({
        to: info.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: establishment?.email || undefined,
        establishmentId,
        template: 'payment_cancelled_directeur',
        metadata: { paymentId: args.paymentId, role: 'directeur' },
      })
      if (res.ok) sent++; else errors.push(res.error || 'send failed')
    }

    // ─── Secrétaire créatrice ───
    if (isSecretaryRole(recorder.roleName) && recorder.email) {
      const content = paymentCancelledEmail({
        recipientRole: 'secretaire',
        recipientName: recorder.name || 'السكرتيرة',
        studentName, amount, installmentDesc, paymentDate,
        cancelledByName, reason,
        recordedByName: recorderName,
        schoolName,
        link: `${siteUrl}/dashboard/payments`,
      })

      const res = await sendEmail({
        to: recorder.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: establishment?.email || undefined,
        establishmentId,
        template: 'payment_cancelled_secretaire',
        metadata: { paymentId: args.paymentId, role: 'secretaire' },
      })
      if (res.ok) sent++; else errors.push(res.error || 'send failed')
    }

    // ─── Parent ───
    if (studentRow?.family_id) {
      const { data: fam } = await admin
        .from('families')
        .select('parent_user_id')
        .eq('id', studentRow.family_id)
        .maybeSingle()

      if (fam?.parent_user_id) {
        const info = await getUserInfo(admin, fam.parent_user_id, roleMap)
        if (!info.email) {
          skipped++
        } else {
          const content = paymentCancelledEmail({
            recipientRole: 'parent',
            recipientName: info.name || 'ولي الأمر',
            studentName, amount, installmentDesc, paymentDate,
            cancelledByName, reason,
            recordedByName: recorderName,
            schoolName,
            link: `${siteUrl}/parent/dashboard/payments`,
          })

          const res = await sendEmail({
            to: info.email,
            subject: content.subject,
            html: content.html,
            text: content.text,
            replyTo: establishment?.email || undefined,
            establishmentId,
            template: 'payment_cancelled_parent',
            metadata: { paymentId: args.paymentId, role: 'parent' },
          })
          if (res.ok) sent++; else errors.push(res.error || 'send failed')
        }
      }
    }

    // ─── Recorder alert ───
    if (
      payment.user_id &&
      payment.user_id !== args.cancelledByUserId &&
      !isDirectorRole(recorder.roleName) &&
      recorder.email
    ) {
      const content = paymentCancelledToRecorderEmail({
        recorderName: recorder.name || '—',
        cancelledByName,
        studentName, amount, installmentDesc, paymentDate,
        reason,
        schoolName,
        link: `${siteUrl}/dashboard/payments`,
      })

      const res = await sendEmail({
        to: recorder.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: establishment?.email || undefined,
        establishmentId,
        template: 'payment_cancelled_to_recorder',
        metadata: { paymentId: args.paymentId, role: 'recorder' },
      })
      if (res.ok) sent++; else errors.push(res.error || 'send failed')
    }

    return { success: true, sent, skipped, errors }
  } catch (err: any) {
    console.error('[sendPaymentCancelledEmails]', err?.message || err)
    return { success: false, sent, skipped, errors: [err?.message || 'unknown'] }
  }
}