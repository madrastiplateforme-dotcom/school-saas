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
// ─────────────────────────────────────────────────────────
// 6. DISCIPLINE ALERT — إشعار ولي الأمر بمخالفة
// ─────────────────────────────────────────────────────────
export function disciplineEmail(params: {
  parentName: string
  studentName: string
  className: string
  incidentDate: string
  category: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description?: string | null
  schoolName: string
}) {
  const {
    parentName, studentName, className, incidentDate,
    category, severity, title, description, schoolName,
  } = params

  const severityLabel = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
  }[severity]

  const severityColor = {
    low: '#059669',
    medium: '#d97706',
    high: '#dc2626',
  }[severity]

  const categoryLabels: Record<string, string> = {
    late: 'تأخير متكرر',
    absence: 'غياب متكرر',
    behavior: 'سلوك سيئ',
    disrespect: 'عدم احترام',
    violence: 'عنف',
    cheating: 'غش',
    other: 'أخرى',
  }
  const categoryLabel = categoryLabels[category] || category

  return {
    subject: `[${schoolName}] تنبيه سلوك — ${studentName}`,
    html: layout(
      `
        <h2 style="color:#dc2626;margin:0 0 12px;font-size:20px;">⚠️ تنبيه سلوك</h2>
        <p>عزيزي ${parentName}،</p>
        <p>نعلمكم أنه تم تسجيل مخالفة بحق ابنكم <strong>${studentName}</strong> (${className}).</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>التاريخ:</strong> ${incidentDate}</p>
          <p style="margin:0 0 8px;"><strong>الفئة:</strong> ${categoryLabel}</p>
          <p style="margin:0 0 8px;"><strong>الخطورة:</strong> <span style="color:${severityColor};font-weight:bold;">${severityLabel}</span></p>
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>الوصف:</strong> ${title}</p>
          ${description ? `<p style="margin:8px 0 0;color:#475569;font-size:13px;">${description}</p>` : ''}
        `, '#fef2f2')}
        <p>المرجو التواصل مع إدارة <strong>${schoolName}</strong> لمتابعة الموضوع.</p>
      `,
      `
        <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px;">⚠️ Alerte de discipline</h2>
        <p>Cher ${parentName},</p>
        <p>Une infraction a été enregistrée concernant <strong>${studentName}</strong> (${className}).</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Date :</strong> ${incidentDate}</p>
          <p style="margin:0 0 8px;"><strong>Catégorie :</strong> ${categoryLabel}</p>
          <p style="margin:0 0 8px;"><strong>Sévérité :</strong> <span style="color:${severityColor};font-weight:bold;">${severityLabel}</span></p>
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>Description :</strong> ${title}</p>
          ${description ? `<p style="margin:8px 0 0;color:#475569;font-size:13px;">${description}</p>` : ''}
        `, '#fef2f2')}
        <p>Merci de contacter l'administration de <strong>${schoolName}</strong> pour le suivi.</p>
      `,
      schoolName,
    ),
    text: `[${schoolName}] مخالفة: ${studentName} — ${title} (${incidentDate})`,
  }
}
// ─────────────────────────────────────────────────────────
// 7. MEETING CONFIRMATION — تأكيد حجز لقاء
// ─────────────────────────────────────────────────────────
export function meetingConfirmationEmail(params: {
  parentName: string
  studentName: string
  meetingTitle: string
  meetingDate: string
  startTime: string
  endTime: string
  location?: string | null
  teacherName?: string | null
  schoolName: string
}) {
  const {
    parentName, studentName, meetingTitle, meetingDate,
    startTime, endTime, location, teacherName, schoolName,
  } = params

  return {
    subject: `[${schoolName}] تأكيد موعد اللقاء — ${meetingDate}`,
    html: layout(
      `
        <h2 style="color:#059669;margin:0 0 12px;font-size:20px;">✅ تأكيد موعد اللقاء</h2>
        <p>عزيزي ${parentName}،</p>
        <p>تم تأكيد حجز موعدك مع الأستاذ(ة) بنجاح.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>📅 التاريخ:</strong> ${meetingDate}</p>
          <p style="margin:0 0 8px;"><strong>🕐 التوقيت:</strong> من ${startTime} إلى ${endTime}</p>
          ${teacherName ? `<p style="margin:0 0 8px;"><strong>👤 الأستاذ(ة):</strong> ${teacherName}</p>` : ''}
          ${location ? `<p style="margin:0 0 8px;"><strong>📍 المكان:</strong> ${location}</p>` : ''}
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>التلميذ(ة):</strong> ${studentName}</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">الموضوع: ${meetingTitle}</p>
        `, '#f0fdf4')}
        <p style="font-size:13px;color:#64748b;">⚠️ المرجو الحضور في الوقت المحدد. في حال عدم التمكن، المرجو إلغاء الحجز من التطبيق.</p>
      `,
      `
        <h2 style="color:#059669;margin:0 0 12px;font-size:18px;">✅ Confirmation de rendez-vous</h2>
        <p>Cher ${parentName},</p>
        <p>Votre rendez-vous avec l'enseignant(e) a été confirmé.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>📅 Date :</strong> ${meetingDate}</p>
          <p style="margin:0 0 8px;"><strong>🕐 Heure :</strong> de ${startTime} à ${endTime}</p>
          ${teacherName ? `<p style="margin:0 0 8px;"><strong>👤 Enseignant(e) :</strong> ${teacherName}</p>` : ''}
          ${location ? `<p style="margin:0 0 8px;"><strong>📍 Lieu :</strong> ${location}</p>` : ''}
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>Élève :</strong> ${studentName}</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Sujet : ${meetingTitle}</p>
        `, '#f0fdf4')}
        <p style="font-size:13px;color:#64748b;">⚠️ Merci d'être à l'heure. En cas d'empêchement, annulez depuis l'application.</p>
      `,
      schoolName,
    ),
    text: `[${schoolName}] موعد مؤكد: ${meetingDate} من ${startTime} إلى ${endTime} (${studentName})`,
  }
}

// ─────────────────────────────────────────────────────────
// 8. MEETING REMINDER — تذكير قبل 24 ساعة
// ─────────────────────────────────────────────────────────
export function meetingReminderEmail(params: {
  parentName: string
  studentName: string
  meetingTitle: string
  meetingDate: string
  startTime: string
  endTime: string
  location?: string | null
  teacherName?: string | null
  schoolName: string
}) {
  const {
    parentName, studentName, meetingTitle, meetingDate,
    startTime, endTime, location, teacherName, schoolName,
  } = params

  return {
    subject: `[${schoolName}] ⏰ تذكير: لقاء غدا — ${studentName}`,
    html: layout(
      `
        <h2 style="color:#d97706;margin:0 0 12px;font-size:20px;">⏰ تذكير: لقاء غدا</h2>
        <p>عزيزي ${parentName}،</p>
        <p>نذكركم بموعد اللقاء المقرر <strong>غدا</strong> مع الأستاذ(ة).</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>📅 التاريخ:</strong> ${meetingDate}</p>
          <p style="margin:0 0 8px;"><strong>🕐 التوقيت:</strong> من ${startTime} إلى ${endTime}</p>
          ${teacherName ? `<p style="margin:0 0 8px;"><strong>👤 الأستاذ(ة):</strong> ${teacherName}</p>` : ''}
          ${location ? `<p style="margin:0 0 8px;"><strong>📍 المكان:</strong> ${location}</p>` : ''}
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>التلميذ(ة):</strong> ${studentName}</p>
        `, '#fffbeb')}
        <p style="font-size:13px;color:#64748b;">المرجو الحضور في الوقت المحدد.</p>
      `,
      `
        <h2 style="color:#d97706;margin:0 0 12px;font-size:18px;">⏰ Rappel : rendez-vous demain</h2>
        <p>Cher ${parentName},</p>
        <p>Rappel : vous avez un rendez-vous <strong>demain</strong> avec l'enseignant(e).</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>📅 Date :</strong> ${meetingDate}</p>
          <p style="margin:0 0 8px;"><strong>🕐 Heure :</strong> de ${startTime} à ${endTime}</p>
          ${teacherName ? `<p style="margin:0 0 8px;"><strong>👤 Enseignant(e) :</strong> ${teacherName}</p>` : ''}
          ${location ? `<p style="margin:0 0 8px;"><strong>📍 Lieu :</strong> ${location}</p>` : ''}
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>Élève :</strong> ${studentName}</p>
        `, '#fffbeb')}
        <p style="font-size:13px;color:#64748b;">Merci d'être à l'heure.</p>
      `,
      schoolName,
    ),
    text: `[${schoolName}] ⏰ تذكير: لقاء غدا ${meetingDate} — ${studentName}`,
  }
}
// ─────────────────────────────────────────────────────────
// 9. PAYMENT RECEIVED — دفعة مستلمة
// ─────────────────────────────────────────────────────────
export function paymentReceivedEmail(params: {
  recipientRole: 'directeur' | 'secretaire' | 'parent'
  recipientName: string
  studentName: string
  amount: number
  installmentDesc: string
  paymentDate: string
  method: string
  reference?: string | null
  cashRegisterName?: string | null
  recordedByName: string
  schoolName: string
  link: string
}) {
  const {
    recipientRole, recipientName, studentName, amount, installmentDesc,
    paymentDate, method, reference, cashRegisterName, recordedByName,
    schoolName, link,
  } = params

  const methodLabels: Record<string, string> = {
    cash: 'نقداً', cheque: 'شيك', transfer: 'تحويل بنكي',
    card: 'بطاقة', other: 'أخرى',
  }
  const methodLabel = methodLabels[method] || method
  const amountStr = amount.toFixed(2)

  const titleAr =
    recipientRole === 'parent' ? '✅ تم استلام دفعتكم' :
    recipientRole === 'secretaire' ? '✅ تم تسجيل دفعة' :
    '💰 دفعة جديدة'
  const titleFr =
    recipientRole === 'parent' ? '✅ Paiement reçu' :
    recipientRole === 'secretaire' ? '✅ Paiement enregistré' :
    '💰 Nouveau paiement'

  const introAr =
    recipientRole === 'parent'
      ? `تم استلام دفعتكم بنجاح لصالح <strong>${studentName}</strong>.`
      : `تم تسجيل دفعة جديدة من طرف <strong>${recordedByName}</strong>.`
  const introFr =
    recipientRole === 'parent'
      ? `Votre paiement a été bien reçu pour <strong>${studentName}</strong>.`
      : `Un nouveau paiement a été enregistré par <strong>${recordedByName}</strong>.`

  const detailsAr = `
    <p style="margin:0 0 8px;"><strong>التلميذ:</strong> ${studentName}</p>
    <p style="margin:0 0 8px;"><strong>القسط:</strong> ${installmentDesc}</p>
    <p style="margin:0 0 8px;"><strong>المبلغ:</strong> <span dir="ltr" style="font-weight:bold;color:#059669;">${amountStr} DH</span></p>
    <p style="margin:0 0 8px;"><strong>التاريخ:</strong> ${paymentDate}</p>
    <p style="margin:0 0 8px;"><strong>الطريقة:</strong> ${methodLabel}</p>
    ${reference ? `<p style="margin:0 0 8px;"><strong>المرجع:</strong> <span dir="ltr">${reference}</span></p>` : ''}
    ${cashRegisterName ? `<p style="margin:0 0 8px;"><strong>الصندوق:</strong> ${cashRegisterName}</p>` : ''}
  `
  const detailsFr = `
    <p style="margin:0 0 8px;"><strong>Élève :</strong> ${studentName}</p>
    <p style="margin:0 0 8px;"><strong>Échéance :</strong> ${installmentDesc}</p>
    <p style="margin:0 0 8px;"><strong>Montant :</strong> <span dir="ltr" style="font-weight:bold;color:#059669;">${amountStr} DH</span></p>
    <p style="margin:0 0 8px;"><strong>Date :</strong> ${paymentDate}</p>
    <p style="margin:0 0 8px;"><strong>Méthode :</strong> ${methodLabel}</p>
    ${reference ? `<p style="margin:0 0 8px;"><strong>Référence :</strong> <span dir="ltr">${reference}</span></p>` : ''}
    ${cashRegisterName ? `<p style="margin:0 0 8px;"><strong>Caisse :</strong> ${cashRegisterName}</p>` : ''}
  `

  return {
    subject:
      recipientRole === 'parent'
        ? `[${schoolName}] ✅ تم استلام دفعتكم — ${studentName}`
        : `[${schoolName}] 💰 دفعة جديدة — ${studentName} (${amountStr} DH)`,
    html: layout(
      `
        <h2 style="color:#059669;margin:0 0 12px;font-size:20px;">${titleAr}</h2>
        <p>عزيزي ${recipientName}،</p>
        <p>${introAr}</p>
        ${infoBox(detailsAr, '#f0fdf4')}
        ${ctaButton('عرض التفاصيل', link)}
      `,
      `
        <h2 style="color:#059669;margin:0 0 12px;font-size:18px;">${titleFr}</h2>
        <p>Cher ${recipientName},</p>
        <p>${introFr}</p>
        ${infoBox(detailsFr, '#f0fdf4')}
        ${ctaButton('Voir les détails', link)}
      `,
      schoolName,
    ),
    text: `[${schoolName}] دفعة ${amountStr} DH — ${studentName} (${installmentDesc}) le ${paymentDate}`,
  }
}

// ─────────────────────────────────────────────────────────
// 10. PAYMENT CANCELLED — دفعة مؤرشفة (للمدير + السكرتيرة صاحبة الدفعة + الوالد)
// ─────────────────────────────────────────────────────────
export function paymentCancelledEmail(params: {
  recipientRole: 'directeur' | 'secretaire' | 'parent'
  recipientName: string
  studentName: string
  amount: number
  installmentDesc: string
  paymentDate: string
  cancelledByName: string
  reason: string
  recordedByName: string
  schoolName: string
  link: string
}) {
  const {
    recipientRole, recipientName, studentName, amount, installmentDesc,
    paymentDate, cancelledByName, reason, recordedByName, schoolName, link,
  } = params

  const amountStr = amount.toFixed(2)

  const introAr =
  recipientRole === 'parent'
    ? `نعلمكم أنه تم <strong>حذف</strong> دفعة سابقة لصالح <strong>${studentName}</strong>.`
    : `تم <strong>حذف</strong> دفعة من طرف <strong>${cancelledByName}</strong>.`
  const introFr =
  recipientRole === 'parent'
    ? `Une paiement précédent pour <strong>${studentName}</strong> a été <strong>supprimé</strong>.`
    : `Un paiement a été <strong>supprimé</strong> par <strong>${cancelledByName}</strong>.`
 const detailsAr = `
  <p style="margin:0 0 8px;"><strong>التلميذ:</strong> ${studentName}</p>
  <p style="margin:0 0 8px;"><strong>القسط:</strong> ${installmentDesc}</p>
  <p style="margin:0 0 8px;"><strong>المبلغ:</strong> <span dir="ltr" style="font-weight:bold;color:#dc2626;">${amountStr} DH</span></p>
  <p style="margin:0 0 8px;"><strong>تاريخ الدفعة الأصلية:</strong> ${paymentDate}</p>
  <p style="margin:0 0 8px;"><strong>سُجّلت من طرف:</strong> ${recordedByName}</p>
  <p style="margin:0 0 8px;"><strong>حُذفت من طرف:</strong> ${cancelledByName}</p>
  <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>السبب:</strong> ${reason}</p>
`

 const detailsFr = `
  <p style="margin:0 0 8px;"><strong>Élève :</strong> ${studentName}</p>
  <p style="margin:0 0 8px;"><strong>Échéance :</strong> ${installmentDesc}</p>
  <p style="margin:0 0 8px;"><strong>Montant :</strong> <span dir="ltr" style="font-weight:bold;color:#dc2626;">${amountStr} DH</span></p>
  <p style="margin:0 0 8px;"><strong>Date du paiement :</strong> ${paymentDate}</p>
  <p style="margin:0 0 8px;"><strong>Enregistré par :</strong> ${recordedByName}</p>
  <p style="margin:0 0 8px;"><strong>Supprimé par :</strong> ${cancelledByName}</p>
  <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>Raison :</strong> ${reason}</p>
`

  return {
    subject:
  recipientRole === 'parent'
    ? `[${schoolName}] ⚠️ تم حذف دفعة — ${studentName}`
    : `[${schoolName}] 🗑️ دفعة محذوفة — ${studentName} (${amountStr} DH)`,
    html: layout(
      `
       <h2 style="color:#dc2626;margin:0 0 12px;font-size:20px;">🗑️ دفعة محذوفة</h2>
        <p>عزيزي ${recipientName}،</p>
        <p>${introAr}</p>
        ${infoBox(detailsAr, '#fef2f2')}
        <p style="font-size:13px;color:#64748b;">القسط المرتبط تم إرجاعه إلى حالته السابقة في النظام.</p>
        ${ctaButton('عرض التفاصيل', link)}
      `,
      `
        <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px;">🗑️ Paiement supprimé</h2>
        <p>Cher ${recipientName},</p>
        <p>${introFr}</p>
        ${infoBox(detailsFr, '#fef2f2')}
        <p style="font-size:13px;color:#64748b;">L'échéance liée a été restaurée à son état précédent.</p>
        ${ctaButton('Voir les détails', link)}
      `,
      schoolName,
    ),
    text: `[${schoolName}] دفعة محذوفة ${amountStr} DH — ${studentName}. السبب: ${reason}`,
  }
}

// ─────────────────────────────────────────────────────────
// 11. PAYMENT CANCELLED TO RECORDER — إشعار خاص للذي سجّل الدفعة
// ─────────────────────────────────────────────────────────
export function paymentCancelledToRecorderEmail(params: {
  recorderName: string
  cancelledByName: string
  studentName: string
  amount: number
  installmentDesc: string
  paymentDate: string
  reason: string
  schoolName: string
  link: string
}) {
  const {
    recorderName, cancelledByName, studentName, amount, installmentDesc,
    paymentDate, reason, schoolName, link,
  } = params

  const amountStr = amount.toFixed(2)

  return {
   subject: `[${schoolName}] ⚠️ تنبيه: تم حذف دفعة سجلتها — ${studentName}`,
    html: layout(
      `
      <h2 style="color:#dc2626;margin:0 0 12px;font-size:20px;">⚠️ تنبيه: تم حذف دفعة سجلتها</h2>
<p>عزيزي ${recorderName}،</p>
<p>نحيطكم علماً أنه تم <strong style="color:#dc2626;">حذف دفعة</strong> كنتم قد سجلتموها سابقاً.</p>
        ${infoBox(`
         <p style="margin:0 0 8px;"><strong>من قام بالحذف:</strong> ...
          <p style="margin:0 0 8px;"><strong>التلميذ:</strong> ${studentName}</p>
          <p style="margin:0 0 8px;"><strong>القسط:</strong> ${installmentDesc}</p>
          <p style="margin:0 0 8px;"><strong>المبلغ:</strong> <span dir="ltr" style="font-weight:bold;">${amountStr} DH</span></p>
          <p style="margin:0 0 8px;"><strong>تاريخ الدفعة الأصلية:</strong> ${paymentDate}</p>
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>السبب:</strong> ${reason}</p>
        `, '#fef2f2')}
        <p style="font-size:13px;color:#64748b;">في حال كان لديكم أي استفسار، المرجو التواصل مع الإدارة.</p>
        ${ctaButton('عرض المدفوعات', link)}
      `,
      `
        <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px;">⚠️ Un paiement que vous avez enregistré a été supprimé</h2>
<p>Cher ${recorderName},</p>
<p>Un paiement que vous avez enregistré a été <strong style="color:#dc2626;">supprimé</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Supprimé par :</strong> ...
          <p style="margin:0 0 8px;"><strong>Élève :</strong> ${studentName}</p>
          <p style="margin:0 0 8px;"><strong>Échéance :</strong> ${installmentDesc}</p>
          <p style="margin:0 0 8px;"><strong>Montant :</strong> <span dir="ltr" style="font-weight:bold;">${amountStr} DH</span></p>
          <p style="margin:0 0 8px;"><strong>Date du paiement :</strong> ${paymentDate}</p>
          <p style="margin:8px 0 0;border-top:1px dashed #cbd5e1;padding-top:8px;"><strong>Raison :</strong> ${reason}</p>
        `, '#fef2f2')}
        <p style="font-size:13px;color:#64748b;">Pour toute question, contactez l'administration.</p>
        ${ctaButton('Voir les paiements', link)}
      `,
      schoolName,
    ),
   text: `[${schoolName}] تنبيه: ${cancelledByName} حذف دفعة سجلتها (${studentName} — ${amountStr} DH). السبب: ${reason}`,
  }
}
// ─────────────────────────────────────────────────────────
// 12. DAILY CAISSE BALANCE — الرصيد اليومي للصناديق
// ─────────────────────────────────────────────────────────
export type CaisseRow = {
  name: string
  type: string
  balance: number
  inCount: number   // عدد الدفعات اليوم
  outCount: number  // عدد المصاريف اليوم
}

export function dailyCaisseBalanceEmail(params: {
  recipientRole: 'directeur' | 'secretaire'
  recipientName: string
  caisses: CaisseRow[]
  totalBalance: number
  schoolName: string
  date: string
}) {
  const {
    recipientRole, recipientName, caisses, totalBalance, schoolName, date,
  } = params

  const isDirector = recipientRole === 'directeur'

  const titleAr = isDirector
    ? '📊 الرصيد اليومي لجميع الصناديق'
    : '📊 رصيد صندوقك'
  const titleFr = isDirector
    ? '📊 Solde quotidien de toutes les caisses'
    : '📊 Solde de votre caisse'

  // Lignes du tableau
  const tableRowsAr = caisses
    .map((c) => {
      const balanceColor = c.balance >= 0 ? '#059669' : '#dc2626'
      const typeLabel =
        c.type === 'central' || c.type === 'principal'
          ? 'مركزي'
          : c.type === 'secretary'
            ? 'سكرتيرة'
            : 'خدمة'

      return `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px;font-weight:bold;color:#1e293b;">${c.name}</td>
          <td style="padding:10px 8px;color:#64748b;font-size:12px;">${typeLabel}</td>
          <td style="padding:10px 8px;text-align:right;">
            <span style="font-family:monospace;font-weight:bold;color:${balanceColor};" dir="ltr">
              ${c.balance.toFixed(2)} DH
            </span>
          </td>
          <td style="padding:10px 8px;text-align:center;font-size:12px;color:#64748b;" dir="ltr">
            +${c.inCount} / -${c.outCount}
          </td>
        </tr>`
    })
    .join('')

  const tableRowsFr = tableRowsAr // même contenu, direction différente

  const tableAr = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:#1e293b;color:#ffffff;">
          <th style="padding:10px 8px;text-align:right;font-size:12px;">الصندوق</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;">النوع</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;">الرصيد</th>
          <th style="padding:10px 8px;text-align:center;font-size:12px;">حركات</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsAr}
        ${
          isDirector
            ? `
          <tr style="background:#fef3c7;font-weight:bold;">
            <td colspan="2" style="padding:12px 8px;">المجموع العام</td>
            <td style="padding:12px 8px;text-align:right;">
              <span style="font-family:monospace;color:#d97706;font-size:16px;" dir="ltr">
                ${totalBalance.toFixed(2)} DH
              </span>
            </td>
            <td></td>
          </tr>`
            : ''
        }
      </tbody>
    </table>
  `

  return {
    subject: isDirector
      ? `[${schoolName}] 📊 الرصيد اليومي — ${totalBalance.toFixed(2)} DH`
      : `[${schoolName}] 📊 رصيد صندوقك — ${caisses[0]?.balance.toFixed(2) || '0.00'} DH`,
    html: layout(
      `
        <h2 style="color:#1e3a5f;margin:0 0 12px;font-size:20px;">${titleAr}</h2>
        <p>مرحباً ${recipientName}،</p>
        <p>في ما يلي رصيد ${isDirector ? 'جميع الصناديق' : 'صندوقك'} بتاريخ <strong>${date}</strong>:</p>
        ${tableAr}
        ${isDirector
          ? `<p style="font-size:13px;color:#64748b;">عدد الصناديق: <strong dir="ltr">${caisses.length}</strong></p>`
          : ''}
        <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
          🔔 يتم إرسال هذا التقرير تلقائياً كل يوم على الساعة <span dir="ltr">00:00</span>.
        </p>
      `,
      `
        <h2 style="color:#1e3a5f;margin:0 0 12px;font-size:18px;">${titleFr}</h2>
        <p>Bonjour ${recipientName},</p>
        <p>Voici le solde ${isDirector ? 'de toutes les caisses' : 'de votre caisse'} au <strong>${date}</strong> :</p>
        ${tableAr}
        <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
          🔔 Ce rapport est envoyé automatiquement chaque jour à <span dir="ltr">00:00</span>.
        </p>
      `,
      schoolName,
    ),
    text: isDirector
      ? `[${schoolName}] الرصيد اليومي — ${date}\n${caisses.map((c) => `${c.name}: ${c.balance.toFixed(2)} DH`).join('\n')}\nالمجموع: ${totalBalance.toFixed(2)} DH`
      : `[${schoolName}] رصيد ${caisses[0]?.name} — ${date}: ${caisses[0]?.balance.toFixed(2) || '0.00'} DH`,
  }
}