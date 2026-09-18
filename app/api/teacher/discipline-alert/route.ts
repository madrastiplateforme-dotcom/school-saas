// app/api/teacher/discipline-alert/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { disciplineEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // ═══ 1) Auth ═══
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // ═══ 2) Profile ═══
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, role_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    // ═══ 3) Role check ═══
    let roleName = ''
    if (profile.role_id) {
      const { data: roleRow } = await supabase
        .from('roles').select('name').eq('id', profile.role_id).maybeSingle()
      roleName = (roleRow?.name || '').toLowerCase()
    }

    const isDirecteur = roleName.includes('directeur') || roleName.includes('مدير')
    const isSecretaire = roleName.includes('secr')
    const isEnseignant =
      roleName.includes('enseignant') ||
      roleName.includes('teacher') ||
      roleName.includes('أستاذ')
    const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL

    if (!isDirecteur && !isSecretaire && !isEnseignant && !isSuperAdmin) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    // ═══ 4) Input ═══
    const body = await request.json()
    const { disciplineId } = body

    if (!disciplineId) {
      return NextResponse.json({ error: 'disciplineId مطلوب' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ═══ 5) جيب المخالفة (بلا JOIN) ═══
    const { data: discipline } = await admin
      .from('disciplines')
      .select('id, student_id, incident_date, category, severity, title, description')
      .eq('id', disciplineId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (!discipline) {
      return NextResponse.json({ error: 'المخالفة غير موجودة' }, { status: 404 })
    }

    // ═══ 6) جيب التلميذ ═══
    const { data: student } = await admin
      .from('students')
      .select('id, first_name, last_name, family_id')
      .eq('id', discipline.student_id)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'student not found' })
    }

    // ═══ 7) جيب العائلة ═══
    let family: any = null
    if (student.family_id) {
      const { data: fam } = await admin
        .from('families')
        .select('id, family_name, parent_user_id')
        .eq('id', student.family_id)
        .maybeSingle()
      family = fam
    }

    const parentUserId = family?.parent_user_id
    if (!parentUserId) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'لا يوجد parent_user_id' })
    }

    // ═══ 8) Check prefs ═══
    const { data: parentProfile } = await admin
      .from('user_profiles')
      .select('notification_preferences')
      .eq('user_id', parentUserId)
      .maybeSingle()

    const prefs = parentProfile?.notification_preferences || {}
    if (prefs.email?.discipline === false) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'email.discipline = false' })
    }

    // ═══ 9) جيب إيميل الوالد ═══
    const { data: authUser } = await admin.auth.admin.getUserById(parentUserId)
    const parentEmail = authUser?.user?.email

    if (!parentEmail) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'لا يوجد إيميل' })
    }

    // ═══ 10) Establishment + Class ═══
    const { data: establishment } = await admin
      .from('establishments')
      .select('name, email')
      .eq('id', profile.establishment_id)
      .maybeSingle()

    let className = '—'
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', student.id)
      .eq('status', 'active')
      .maybeSingle()

    if (enrollment?.class_id) {
      const { data: cls } = await admin
        .from('classes').select('name').eq('id', enrollment.class_id).maybeSingle()
      className = cls?.name || '—'
    }

    const formattedDate = new Date(discipline.incident_date).toLocaleDateString('fr-FR')
    const parentName = family?.family_name || 'ولي الأمر'

    // ═══ 11) Send ═══
    const emailContent = disciplineEmail({
      parentName,
      studentName: `${student.first_name} ${student.last_name}`,
      className,
      incidentDate: formattedDate,
      category: discipline.category,
      severity: discipline.severity,
      title: discipline.title,
      description: discipline.description,
      schoolName: establishment?.name || 'المؤسسة',
    })

    const result = await sendEmail({
      to: parentEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      replyTo: establishment?.email || undefined,
      establishmentId: profile.establishment_id,
      template: 'discipline_alert',
      metadata: {
        discipline_id: disciplineId,
        student_id: student.id,
        parent_user_id: parentUserId,
      },
    })

    return NextResponse.json({
      sent: result.ok,
      failed: !result.ok,
      error: result.ok ? undefined : result.error,
    })
  } catch (err: any) {
    console.error('[teacher-discipline-alert]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}