// lib/email.ts
// ═══════════════════════════════════════════════════════════════════════
// 📧 Email — Resend SDK (بديل nodemailer / SMTP)
// ═══════════════════════════════════════════════════════════════════════
import { Resend } from 'resend'
import { createAdminClient } from './supabase-admin'

// ─────────────────────────────────────────────────────────
// Types (IDENTIQUES — لـ backward compatibility)
// ─────────────────────────────────────────────────────────
export type EmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string | null
  establishmentId?: string
  template?: string
  metadata?: Record<string, any>
}

export type SendEmailResult = {
  ok: boolean
  error?: string
  messageId?: string
}

// ─────────────────────────────────────────────────────────
// Configuration Resend
// ─────────────────────────────────────────────────────────
type ResendConfig = {
  apiKey: string
  fromName: string
  fromEmail: string
}

function getResendConfig(): ResendConfig | null {
  const { RESEND_API_KEY, SMTP_FROM_NAME, SMTP_FROM_EMAIL } = process.env
  if (!RESEND_API_KEY) return null

  return {
    apiKey: RESEND_API_KEY,
    fromName: SMTP_FROM_NAME || 'Madrasti',
    fromEmail: SMTP_FROM_EMAIL || 'noreply@madrasti.win',
  }
}

// ─────────────────────────────────────────────────────────
// Client Resend — cached
// ─────────────────────────────────────────────────────────
let cachedResend: Resend | null = null
let cachedKey = ''

function getResend(config: ResendConfig): Resend {
  if (cachedResend && cachedKey === config.apiKey) return cachedResend
  cachedResend = new Resend(config.apiKey)
  cachedKey = config.apiKey
  return cachedResend
}

// ─────────────────────────────────────────────────────────
// Log helper (SUPABASE email_log — identique)
// ─────────────────────────────────────────────────────────
async function logEmail(args: {
  establishmentId?: string | null
  recipient: string
  subject: string
  template?: string | null
  status: 'sent' | 'failed'
  errorMessage?: string | null
  metadata?: Record<string, any> | null
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('email_log').insert({
      establishment_id: args.establishmentId || null,
      recipient: args.recipient,
      subject: args.subject,
      template: args.template || null,
      status: args.status,
      error_message: args.errorMessage || null,
      metadata: args.metadata || null,
    })
  } catch (e) {
    console.error('[email_log] insert failed', e)
  }
}

// ─────────────────────────────────────────────────────────
// sendEmail — الدالة الرئيسية (via Resend)
// ─────────────────────────────────────────────────────────
export async function sendEmail(
  options: EmailOptions,
): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to)
    ? options.to
    : [options.to]
  const recipientsStr = recipients.join(', ')

  const config = getResendConfig()

  if (!config) {
    const err =
      'Resend غير مهيأ (RESEND_API_KEY مفقود فـ env)'
    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipientsStr,
      subject: options.subject,
      template: options.template,
      status: 'failed',
      errorMessage: err,
      metadata: options.metadata,
    })
    return { ok: false, error: err }
  }

  try {
    const resend = getResend(config)

    const { data, error } = await resend.emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: recipients,
      replyTo: options.replyTo || undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
    })

    if (error) {
      const errorMsg =
        (error as any)?.message || JSON.stringify(error) || 'Resend error'

      await logEmail({
        establishmentId: options.establishmentId,
        recipient: recipientsStr,
        subject: options.subject,
        template: options.template,
        status: 'failed',
        errorMessage: errorMsg,
        metadata: options.metadata,
      })

      return { ok: false, error: errorMsg }
    }

    const messageId = data?.id

    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipientsStr,
      subject: options.subject,
      template: options.template,
      status: 'sent',
      metadata: {
        ...(options.metadata || {}),
        message_id: messageId,
        provider: 'resend',
      },
    })

    return { ok: true, messageId }
  } catch (err: any) {
    const errorMsg = err?.message || 'خطأ غير معروف'

    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipientsStr,
      subject: options.subject,
      template: options.template,
      status: 'failed',
      errorMessage: errorMsg,
      metadata: options.metadata,
    })

    return { ok: false, error: errorMsg }
  }
}

// ─────────────────────────────────────────────────────────
// testSmtp — اختبار Resend
// ─────────────────────────────────────────────────────────
export async function testSmtp(): Promise<SendEmailResult> {
  const config = getResendConfig()
  if (!config) {
    return { ok: false, error: 'RESEND_API_KEY مفقود فـ env' }
  }

  try {
    const resend = getResend(config)

    // نختبرو الـ API key بـ list domains
    const { data, error } = await (resend as any).domains.list()

    if (error) {
      return { ok: false, error: (error as any)?.message || 'فشل الاختبار' }
    }

    const domains = (data?.data || []) as any[]
    const hasDomain = domains.some(
      (d) => d.name === 'madrasti.win' && d.status === 'verified',
    )

    if (!hasDomain) {
      return {
        ok: false,
        error: 'madrasti.win ماشي verified فـ Resend',
      }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'فشل الاتصال' }
  }
}