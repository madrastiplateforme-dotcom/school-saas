// ═══════════════════════════════════════════════════════════════════════
// 📱 WhatsApp Utility — wa.me click-to-chat links
// ═══════════════════════════════════════════════════════════════════════

/**
 * Normalize a Moroccan phone number to international format (sans +).
 * Handles:
 *   - "0612345678"    → "212612345678"
 *   - "+212612345678" → "212612345678"
 *   - "212612345678"  → "212612345678"
 *   - "612345678"     → "212612345678"
 * Returns null if invalid.
 */
export function normalizeMoroccanPhone(
  input: string | null | undefined,
): string | null {
  if (!input) return null
  let digits = input.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('212')) {
    return digits.length >= 12 ? digits : null
  }

  if (digits.startsWith('0')) {
    digits = '212' + digits.slice(1)
  } else if (digits.length === 9) {
    digits = '212' + digits
  }

  return digits.length >= 12 ? digits : null
}

/**
 * Build a wa.me URL with pre-filled message.
 * Opens WhatsApp Web (desktop) or WhatsApp App (mobile).
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizeMoroccanPhone(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

/**
 * Open WhatsApp in a new tab. Returns true if phone was valid.
 */
export function openWhatsApp(
  phone: string | null | undefined,
  message: string,
): boolean {
  const url = buildWhatsAppUrl(phone, message)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

// ═══════════════════════════════════════════════════════════════════════
// 📝 Message Templates (Arabic)
// ═══════════════════════════════════════════════════════════════════════

export function buildAbsenceMessage(args: {
  parentName?: string
  studentName: string
  date: string
  schoolName?: string
}): string {
  return [
    `السلام عليكم${args.parentName ? ' ' + args.parentName : ''}،`,
    ``,
    `نحيطكم علماً أن ابنكم/ابنتكم *${args.studentName}* غاب/ت يوم *${args.date}*.`,
    ``,
    `نرجو التواصل مع الإدارة لمعرفة السبب.`,
    ``,
    args.schoolName ? `— ${args.schoolName}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .trim()
}

export function buildPaymentMessage(args: {
  parentName?: string
  studentName: string
  amount: string
  date: string
  schoolName?: string
}): string {
  return [
    `السلام عليكم${args.parentName ? ' ' + args.parentName : ''}،`,
    ``,
    `توصلنا بدفعة بقيمة *${args.amount}* الخاصة بـ *${args.studentName}* بتاريخ *${args.date}*.`,
    ``,
    `شكراً لكم.`,
    ``,
    args.schoolName ? `— ${args.schoolName}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .trim()
}

export function buildImpayeMessage(args: {
  parentName?: string
  studentName: string
  amount: string
  dueDate: string
  schoolName?: string
}): string {
  return [
    `السلام عليكم${args.parentName ? ' ' + args.parentName : ''}،`,
    ``,
    `نذكركم بأن هناك مبلغاً مستحقاً بقيمة *${args.amount}* الخاص بـ *${args.studentName}*، تاريخ الاستحقاق: *${args.dueDate}*.`,
    ``,
    `نرجو التكرم بالأداء في أقرب وقت.`,
    ``,
    args.schoolName ? `— ${args.schoolName}` : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .trim()
}

export function buildCustomMessage(text: string): string {
  return text.trim()
}