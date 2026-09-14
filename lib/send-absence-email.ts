// lib/send-absence-email.ts
import { createAdminClient } from './supabase-admin'
import { sendEmail } from './email'
import { absenceAlertEmail } from './email-templates'

export type SendAbsenceResult = {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

function formatArabicDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر']
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return iso
  }
}

export async function sendAbsenceEmails(args: {
  establishmentId: string
  studentIds: string[]
  attendanceDate: string
  note?: string | null
}): Promise<SendAbsenceResult> {
  // ✅ هنا نخلقو الـ client
  const supabaseAdmin = createAdminClient()

  const result: SendAbsenceResult = {
    success: true,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  if (args.studentIds.length === 0) return result

  // 1) جيب التلاميذ + العائلات
  const { data: students, error: stErr } = await supabaseAdmin
    .from('students')
    .select('id, first_name, last_name, family_id, families(family_name, parent_user_id)')
    .in('id', args.studentIds)
    .eq('establishment_id', args.establishmentId)

  if (stErr || !students) {
    result.success = false
    result.errors.push(stErr?.message || 'فشل جلب التلاميذ')
    return result
  }

  // 2) جيب القسم لكل تلميذ من enrollments
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('student_id, classes(name)')
    .in('student_id', args.studentIds)
    .eq('establishment_id', args.establishmentId)
    .eq('status', 'active')

  const classByStudent = new Map<string, string>()
  ;(enrollments || []).forEach((e: any) => {
    const cname = e.classes?.name
    if (cname && !classByStudent.has(e.student_id)) {
      classByStudent.set(e.student_id, cname)
    }
  })

  // 3) جيب إيميلات الأولياء من auth
  const parentUserIds = Array.from(
    new Set(
      (students as any[])
        .map((s) => s.families?.parent_user_id)
        .filter(Boolean),
    ),
  )

  const parentEmails = new Map<string, string>()
  for (const uid of parentUserIds) {
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (authData?.user?.email) {
        parentEmails.set(uid, authData.user.email)
      }
    } catch (e) {
      console.error('[absence-email] getUserById failed', uid, e)
    }
  }

  // 4) اسم + إيميل المدرسة
  const { data: est } = await supabaseAdmin
    .from('establishments')
    .select('name, email')
    .eq('id', args.establishmentId)
    .single()

  const schoolName = est?.name || 'المؤسسة'
  const schoolEmail = est?.email || null
  const dateLabel = formatArabicDate(args.attendanceDate)

  // 5) صيفط لكل تلميذ
  for (const student of students as any[]) {
    const family = student.families
    if (!family?.parent_user_id) {
      result.skipped++
      continue
    }

    const parentEmail = parentEmails.get(family.parent_user_id)
    if (!parentEmail) {
      result.skipped++
      result.errors.push(`${student.first_name}: لا يوجد إيميل مسجل`)
      continue
    }

    const studentName = `${student.first_name} ${student.last_name}`
    const className = classByStudent.get(student.id) || '-'

    const emailContent = absenceAlertEmail({
      parentName: family.family_name || 'ولي الأمر',
      studentName,
      className,
      date: dateLabel,
      reason: args.note || undefined,
      schoolName,
    })

    const emailResult = await sendEmail({
      to: parentEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      replyTo: schoolEmail,
      establishmentId: args.establishmentId,
      template: 'absence_alert',
      metadata: {
        student_id: student.id,
        student_name: studentName,
        date: args.attendanceDate,
        class_name: className,
      },
    })

    if (emailResult.ok) {
      result.sent++
    } else {
      result.failed++
      result.errors.push(`${studentName}: ${emailResult.error}`)
    }
  }

  return result
}