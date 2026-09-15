// app/api/establishment/absence-alert/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'
import { absenceAlertEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // ═══ 1) Auth (Directeur/Secrétaire) ═══
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, roles(name)')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    const roleName = ((profile.roles as any)?.name || '').toLowerCase()
    const isDirecteur =
      roleName.includes('directeur') || roleName.includes('مدير')
    const isSecretaire = roleName.includes('secr')
    const isSuperAdmin = authUser.email === process.env.SUPER_ADMIN_EMAIL

    if (!isDirecteur && !isSecretaire && !isSuperAdmin) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    // ═══ 2) المدخلات ═══
    const body = await request.json()
    const { studentIds, date } = body

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { sent: 0, failed: 0, skipped: 0, message: 'لا يوجد تلاميذ' },
        { status: 200 },
      )
    }

    if (!date) {
      return NextResponse.json({ error: 'date مطلوب' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ═══ 3) اسم + إيميل المدرسة ═══
    const { data: establishment } = await admin
      .from('establishments')
      .select('name, email')
      .eq('id', profile.establishment_id)
      .single()

    const schoolName = establishment?.name || 'المؤسسة'
    const schoolEmail = establishment?.email || null

    // ═══ 4) جيب الطلبة + معلومات العائلة ═══
    const { data: students, error: stErr } = await admin
      .from('students')
      .select(`
        id, first_name, last_name,
        families (
          id,
          family_name,
          parent_user_id
        )
      `)
      .in('id', studentIds)
      .eq('establishment_id', profile.establishment_id)

    if (stErr) {
      console.error('[absence-alert] students error:', stErr)
      return NextResponse.json(
        { error: 'فشل جلب التلاميذ', details: stErr.message },
        { status: 500 },
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, skipped: 0 })
    }

    // ═══ 5) جيب أقسام التلاميذ (باش نضيفو اسم القسم فالإيميل) ═══
    const studentIdsList = students.map((s: any) => s.id)

    // نجيبو enrollments لتلاميذ هاد المؤسسة
    const { data: enrollments } = await admin
      .from('enrollments')
      .select('student_id, classes(name)')
      .in('student_id', studentIdsList)
      .eq('establishment_id', profile.establishment_id)
      .eq('status', 'active')

    const classByStudent: Record<string, string> = {}
    ;(enrollments || []).forEach((e: any) => {
      const className = e.classes?.name
      if (className && !classByStudent[e.student_id]) {
        classByStudent[e.student_id] = className
      }
    })

    // ═══ 6) جيب الإيميلات ديال الأولياء ═══
    const parentUserIds = (students || [])
      .map((s: any) => s.families?.parent_user_id)
      .filter(Boolean)

    const parentEmails: Record<string, string> = {}

    if (parentUserIds.length > 0) {
      // نجيبو كل auth.users اللي عندهم هاد الـ IDs
      // Supabase admin ما عندوش bulk getUserById — نستعملو listUsers
      const { data: usersList } = await admin.auth.admin.listUsers({
        perPage: 1000,
      })

      ;(usersList?.users || []).forEach((u: any) => {
        if (parentUserIds.includes(u.id) && u.email) {
          parentEmails[u.id] = u.email
        }
      })
    }

    // ═══ 7) صيفط الإيميلات ═══
    const formattedDate = new Date(date).toLocaleDateString('fr-FR')

    let sent = 0
    let failed = 0
    let skipped = 0
    const errors: any[] = []
     // ═══ 5.b) جيب الإعدادات ديال الأولياء ═══
const parentPrefs: Record<string, any> = {}

if (parentUserIds.length > 0) {
  const { data: profilesData } = await admin
    .from('user_profiles')
    .select('user_id, notification_preferences')
    .in('user_id', parentUserIds)

  ;(profilesData || []).forEach((p: any) => {
    parentPrefs[p.user_id] = p.notification_preferences || {}
  })
}
    for (const student of students as any[]) {
      const family = student.families
      const parentUserId = family?.parent_user_id

      // بلا parent_user_id → skipped
      if (!parentUserId) {
        skipped += 1
        continue
      }

      // بلا إيميل → skipped
      const parentEmail = parentEmails[parentUserId]
      if (!parentEmail) {
        skipped += 1
        continue
      }

      // اسم الوالد
      const parentName = family?.family_name || 'ولي الأمر'
      const studentFullName = `${student.first_name} ${student.last_name}`
      const className = classByStudent[student.id] || '—'

      // بناء الإيميل
      const emailContent = absenceAlertEmail({
        parentName,
        studentName: studentFullName,
        className,
        date: formattedDate,
        schoolName,
      })
// ✅ تحقق من الإعدادات
const prefs = parentPrefs[parentUserId] || {}
const emailPrefs = prefs.email || {}
// إلا كان الخيار موجود وكان false → skip
if (emailPrefs.absence === false) {
  skipped += 1
  continue
}
      // إرسال
      const result = await sendEmail({
        to: parentEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        replyTo: schoolEmail,
        establishmentId: profile.establishment_id,
        template: 'absence_alert',
        metadata: {
          student_id: student.id,
          student_name: studentFullName,
          parent_user_id: parentUserId,
          date,
        },
      })

      if (result.ok) {
        sent += 1
      } else {
        failed += 1
        errors.push({
          student_id: student.id,
          parent_email: parentEmail,
          error: result.error,
        })
      }
    }

    // ═══ 8) الرد ═══
    return NextResponse.json({
      sent,
      failed,
      skipped,
      total: students.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    console.error('[absence-alert]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}