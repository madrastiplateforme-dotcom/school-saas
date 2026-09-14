// lib/email-templates.ts
// قوالب الإيميلات (AR + FR)

const BRAND = 'Madrasti'
const PRIMARY = '#0b4c42'
const ACCENT = '#10b981'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','ماي','يونيو',
  'يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر',
]

export function monthLabelAR(month: number, year: number) {
  return `${MONTHS_AR[Math.max(0, Math.min(11, month - 1))]} ${year}`
}

function layout(bodyAr: string, bodyFr: string, schoolName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:${PRIMARY};padding:28px 32px;">
              <div style="color:${ACCENT};font-size:22px;font-weight:900;letter-spacing:-0.5px;">${BRAND}</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;">
                ${schoolName ? `بالنيابة عن <strong style="color:#fff;">${schoolName}</strong>` : 'منصة تسيير المدارس الخاصة'}
              </div>
            </td>
          </tr>

          <!-- Body AR -->
          <tr>
            <td dir="rtl" style="padding:32px;color:#334155;font-size:15px;line-height:1.7;">
              ${bodyAr}
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px dashed #e2e8f0;margin:0;">
            </td>
          </tr>

          <!-- Body FR -->
          <tr>
            <td dir="ltr" style="padding:32px;color:#334155;font-size:14px;line-height:1.7;">
              ${bodyFr}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;color:#94a3b8;font-size:11px;">
              <p style="margin:0 0 4px;">© ${new Date().getFullYear()} ${BRAND} — جميع الحقوق محفوظة</p>
              <p style="margin:0;">هذا إيميل آلي، المرجو عدم الرد عليه مباشرة${schoolName ? ` — للتواصل: إدارة ${schoolName}` : ''}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="background:${PRIMARY};border-radius:10px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">${text}</a>
        </td>
      </tr>
    </table>
  `
}

function infoBox(content: string, color = '#eef2ff'): string {
  return `
    <div style="background:${color};border-radius:10px;padding:16px 20px;margin:16px 0;">
      ${content}
    </div>
  `
}

// ─────────────────────────────────────────────────────────
// 1. WELCOME — مدرسة جديدة
// ─────────────────────────────────────────────────────────
export function welcomeEmail(params: {
  directorName: string
  schoolName: string
  email: string
  password: string
  loginUrl: string
}) {
  const { directorName, schoolName, email, password, loginUrl } = params

  return {
    subject: `[${schoolName}] مرحباً بكم في Madrasti — بيانات الدخول`,
    html: layout(
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">مرحباً ${directorName} 👋</h2>
        <p>تم إنشاء حساب مؤسستكم <strong>${schoolName}</strong> على منصة Madrasti بنجاح.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔐 معلومات الدخول:</p>
          <p style="margin:0;font-family:monospace;font-size:13px;"><strong>البريد:</strong> ${email}</p>
          <p style="margin:4px 0 0;font-family:monospace;font-size:13px;"><strong>كلمة المرور:</strong> ${password}</p>
        `)}
        <p>⚠️ <strong>مهم:</strong> غير كلمة المرور بعد أول دخول من الإعدادات.</p>
        ${ctaButton('الدخول للمنصة', loginUrl)}
      `,
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;">Bienvenue ${directorName} 👋</h2>
        <p>Votre établissement <strong>${schoolName}</strong> a été créé sur Madrasti.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔐 Identifiants :</p>
          <p style="margin:0;font-family:monospace;font-size:13px;"><strong>Email :</strong> ${email}</p>
          <p style="margin:4px 0 0;font-family:monospace;font-size:13px;"><strong>Mot de passe :</strong> ${password}</p>
        `)}
        <p>⚠️ <strong>Important :</strong> changez votre mot de passe après la première connexion.</p>
        ${ctaButton('Accéder à la plateforme', loginUrl)}
      `,
      schoolName,
    ),
    text: `[${schoolName}] مرحباً ${directorName}, حسابك على Madrasti جاهز.\nالدخول: ${loginUrl}\nالبريد: ${email}\nكلمة المرور: ${password}`,
  }
}

// ─────────────────────────────────────────────────────────
// 2. CREDENTIALS — موظف جديد
// ─────────────────────────────────────────────────────────
export function credentialsEmail(params: {
  fullName: string
  role: string
  schoolName: string
  email: string
  password: string
  loginUrl: string
}) {
  const { fullName, role, schoolName, email, password, loginUrl } = params

  return {
    subject: `[${schoolName}] حسابك على Madrasti — ${role}`,
    html: layout(
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">مرحباً ${fullName}</h2>
        <p>تم إنشاء حسابك على منصة Madrasti كمستخدم في مؤسسة <strong>${schoolName}</strong> بصفة: <strong>${role}</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔐 معلومات الدخول:</p>
          <p style="margin:0;font-family:monospace;font-size:13px;"><strong>البريد:</strong> ${email}</p>
          <p style="margin:4px 0 0;font-family:monospace;font-size:13px;"><strong>كلمة المرور:</strong> ${password}</p>
        `)}
        ${ctaButton('الدخول للمنصة', loginUrl)}
      `,
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;">Bonjour ${fullName}</h2>
        <p>Votre compte Madrasti a été créé pour <strong>${schoolName}</strong> en tant que : <strong>${role}</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔐 Identifiants :</p>
          <p style="margin:0;font-family:monospace;font-size:13px;"><strong>Email :</strong> ${email}</p>
          <p style="margin:4px 0 0;font-family:monospace;font-size:13px;"><strong>Mot de passe :</strong> ${password}</p>
        `)}
        ${ctaButton('Accéder à la plateforme', loginUrl)}
      `,
      schoolName,
    ),
    text: `[${schoolName}] مرحباً ${fullName}, حسابك جاهز.\nالبريد: ${email}\nكلمة المرور: ${password}\nالدخول: ${loginUrl}`,
  }
}

// ─────────────────────────────────────────────────────────
// 3. INVOICE — فاتورة الاشتراك (من SaaS للمدير)
// ─────────────────────────────────────────────────────────
export type InvoiceEmailParams = {
  schoolName: string
  directorName?: string | null
  invoiceNumber: string
  periodLabel: string
  studentsCount: number
  amount: number
  dueDate?: string | null
  billingUrl?: string | null
  logoUrl?: string | null
}

export function invoiceEmail(p: InvoiceEmailParams) {
  const {
    schoolName, directorName, invoiceNumber, periodLabel,
    studentsCount, amount, dueDate, billingUrl, logoUrl,
  } = p

  const greeting = directorName
    ? `السلام عليكم ${directorName}،`
    : 'السلام عليكم،'
  const amountStr = amount.toFixed(2)

  const subject = `[${schoolName}] فاتورة الاشتراك — ${periodLabel} (${invoiceNumber})`

  const ctaButtonHtml = billingUrl
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${billingUrl}" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
           عرض الفاتورة وتأكيد الدفع
         </a>
       </div>`
    : ''

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">

    <!-- 🔑 Header: Madrasti + اسم المدرسة -->
    <div style="background:${PRIMARY};color:#fff;padding:24px;text-align:center">
      <div style="font-size:11px;letter-spacing:2px;opacity:.85;margin-bottom:8px">MADRASTI</div>
      ${logoUrl ? `<img src="${logoUrl}" alt="${schoolName}" style="height:40px;margin-bottom:8px">` : ''}
      <h1 style="margin:0;font-size:22px;font-weight:700">${schoolName}</h1>
      <p style="margin:6px 0 0;opacity:.9;font-size:13px">فاتورة الاشتراك الشهري</p>
    </div>

    <div style="padding:24px;color:#111827;line-height:1.8">
      <p>${greeting}</p>
      <p>نرفق لكم تفاصيل فاتورة الاشتراك الخاصة بمؤسسة <strong>${schoolName}</strong> لشهر <strong>${periodLabel}</strong>:</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:10px 14px;color:#6b7280">رقم الفاتورة</td>
          <td style="padding:10px 14px;font-weight:600" dir="ltr">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">المؤسسة</td>
          <td style="padding:10px 14px;font-weight:600">${schoolName}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">الفترة</td>
          <td style="padding:10px 14px;font-weight:600">${periodLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">عدد التلاميذ</td>
          <td style="padding:10px 14px;font-weight:600"><span dir="ltr">${studentsCount}</span></td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280">المبلغ الإجمالي</td>
          <td style="padding:10px 14px;font-weight:700;color:${PRIMARY}">
            <span dir="ltr">${amountStr}</span> د.م
          </td>
        </tr>
        ${dueDate ? `<tr>
          <td style="padding:10px 14px;color:#6b7280">تاريخ الاستحقاق</td>
          <td style="padding:10px 14px;font-weight:600">${dueDate}</td>
        </tr>` : ''}
      </table>

      <p style="font-size:13px;color:#6b7280">
        طريقة الدفع: <strong>تحويل بنكي</strong>. بعد إتمام التحويل، المرجو تأكيد الدفع من لوحة التحكم.
      </p>

      ${ctaButtonHtml}

      <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center">
        هذه رسالة آلية من منصة <strong>Madrasti</strong> بالنيابة عن <strong>${schoolName}</strong>.<br>
        للرد، المرجو التواصل مباشرة مع إدارة المدرسة.
      </p>
    </div>
  </div>
</body>
</html>`

  const text = `[${schoolName}] فاتورة الاشتراك — ${periodLabel}

${greeting}

المؤسسة: ${schoolName}
رقم الفاتورة: ${invoiceNumber}
عدد التلاميذ: ${studentsCount}
المبلغ الإجمالي: ${amountStr} د.م
${dueDate ? `تاريخ الاستحقاق: ${dueDate}\n` : ''}
طريقة الدفع: تحويل بنكي.
${billingUrl ? `رابط الفاتورة: ${billingUrl}\n` : ''}
— منصة Madrasti`

  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────
// 4. ABSENCE ALERT — للأب
// ─────────────────────────────────────────────────────────
export function absenceAlertEmail(params: {
  parentName: string
  studentName: string
  className: string
  date: string
  reason?: string
  schoolName: string
}) {
  const { parentName, studentName, className, date, reason, schoolName } = params

  return {
    subject: `[${schoolName}] تنبيه غياب — ${studentName}`,
    html: layout(
      `
        <h2 style="color:#e11d48;margin:0 0 12px;font-size:20px;">⚠️ تنبيه غياب</h2>
        <p>عزيزي ${parentName}،</p>
        <p>نعلمكم أن ابنكم <strong>${studentName}</strong> (${className}) كان <strong style="color:#e11d48;">غائباً</strong> بتاريخ <strong>${date}</strong>.</p>
        ${reason ? infoBox(`<strong>ملاحظة:</strong> ${reason}`, '#fef3c7') : ''}
        <p>المرجو التواصل مع إدارة <strong>${schoolName}</strong> في حال وجود أي استفسار.</p>
      `,
      `
        <h2 style="color:#e11d48;margin:0 0 12px;font-size:18px;">⚠️ Alerte d'absence</h2>
        <p>Cher ${parentName},</p>
        <p>Nous vous informons que <strong>${studentName}</strong> (${className}) était <strong style="color:#e11d48;">absent(e)</strong> le <strong>${date}</strong>.</p>
        ${reason ? infoBox(`<strong>Note :</strong> ${reason}`, '#fef3c7') : ''}
        <p>Merci de contacter l'administration de <strong>${schoolName}</strong> pour toute question.</p>
      `,
      schoolName,
    ),
    text: `[${schoolName}] غياب ${studentName} بتاريخ ${date}`,
  }
}

// ─────────────────────────────────────────────────────────
// 5. PASSWORD RESET — A4
// ─────────────────────────────────────────────────────────
export function passwordResetEmail(params: {
  fullName: string
  newPassword: string
  loginUrl: string
  schoolName: string
}) {
  const { fullName, newPassword, loginUrl, schoolName } = params

  return {
    subject: `[${schoolName}] إعادة تعيين كلمة المرور — Madrasti`,
    html: layout(
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:20px;">إعادة تعيين كلمة المرور</h2>
        <p>مرحباً ${fullName}،</p>
        <p>تم إعادة تعيين كلمة مرورك من قبل إدارة <strong>${schoolName}</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔑 كلمة المرور الجديدة:</p>
          <p style="margin:0;font-family:monospace;font-size:16px;font-weight:bold;">${newPassword}</p>
        `)}
        <p>⚠️ المرجو تغييرها بعد أول دخول.</p>
        ${ctaButton('الدخول للمنصة', loginUrl)}
      `,
      `
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${fullName},</p>
        <p>Votre mot de passe a été réinitialisé par l'administration de <strong>${schoolName}</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-weight:bold;">🔑 Nouveau mot de passe :</p>
          <p style="margin:0;font-family:monospace;font-size:16px;font-weight:bold;">${newPassword}</p>
        `)}
        <p>⚠️ Merci de le changer après la première connexion.</p>
        ${ctaButton('Accéder à la plateforme', loginUrl)}
      `,
      schoolName,
    ),
    text: `[${schoolName}] كلمة مرورك الجديدة: ${newPassword}\nالدخول: ${loginUrl}`,
  }
}