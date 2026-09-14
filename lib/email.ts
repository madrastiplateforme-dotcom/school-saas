// lib/email.ts
import nodemailer from 'nodemailer'
import { createAdminClient } from './supabase-admin'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type EmailOptions = {
  to: string | string[]
  subject: string
  html: string
  text?: string

  // reply-to = إيميل المدرسة باش الردود ترجع ليها
  replyTo?: string | null

  // للـ logging فقط
  establishmentId?: string
  template?: string
  metadata?: Record<string, any>
}

export type SendEmailResult = {
  ok: boolean
  error?: string
  messageId?: string
}

type SMTPConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  fromEmail: string
}

// ─────────────────────────────────────────────────────────
// SMTP ديال SaaS — من env فقط
// ─────────────────────────────────────────────────────────
function getSaaSSmtpConfig(): SMTPConfig | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null

  return {
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: SMTP_USER,
    password: SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME || 'Madrasti',
    fromEmail: process.env.SMTP_FROM_EMAIL || SMTP_USER,
  }
}

// ─────────────────────────────────────────────────────────
// Transporter — cached
// ─────────────────────────────────────────────────────────
let cachedTransporter: nodemailer.Transporter | null = null
let cachedKey = ''

function getTransporter(config: SMTPConfig): nodemailer.Transporter {
  const key = `${config.host}:${config.port}:${config.user}`
  if (cachedTransporter && cachedKey === key) return cachedTransporter

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10000,
  })
  cachedKey = key
  return cachedTransporter
}

// ─────────────────────────────────────────────────────────
// Log helper
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
// sendEmail — الدالة الرئيسية
// ─────────────────────────────────────────────────────────
export async function sendEmail(
  options: EmailOptions,
): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to)
    ? options.to.join(', ')
    : options.to

  const config = getSaaSSmtpConfig()

  if (!config) {
    const err = 'SMTP ديال SaaS غير مهيأ (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)'
    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipients,
      subject: options.subject,
      template: options.template,
      status: 'failed',
      errorMessage: err,
      metadata: options.metadata,
    })
    return { ok: false, error: err }
  }

  try {
    const transporter = getTransporter(config)

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients,
      replyTo: options.replyTo || undefined,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipients,
      subject: options.subject,
      template: options.template,
      status: 'sent',
      metadata: {
        ...(options.metadata || {}),
        message_id: info.messageId,
      },
    })

    return { ok: true, messageId: info.messageId }
  } catch (err: any) {
    const errorMsg = err?.message || 'خطأ غير معروف'

    await logEmail({
      establishmentId: options.establishmentId,
      recipient: recipients,
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
// testSmtp — اختبار SMTP ديال SaaS
// ─────────────────────────────────────────────────────────
export async function testSmtp(): Promise<SendEmailResult> {
  const config = getSaaSSmtpConfig()
  if (!config) {
    return { ok: false, error: 'SMTP غير مهيأ فـ env' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10000,
    })
    await transporter.verify()
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'فشل الاتصال' }
  }
}