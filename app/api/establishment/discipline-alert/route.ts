// app/api/establishment/discipline-alert/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

    const { data: { user: authUser } } = await supabase.auth.getUser()
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
    const isDirecteur = roleName.includes('directeur') || roleName.includes('مدير')
    const isSecretaire = roleName.includes('secr')
    const isSuperAdmin = authUser.email === process.env.SUPER_ADMIN_EMAIL

    if (!isDirecteur && !isSecretaire && !isSuperAdmin) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    // ═══ 2) Input ═══
    const body = await request.json()
    const { disciplineId } = body

    if (!disciplineId) {
      return NextResponse.json({ error: 'disciplineId مطلوب' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ═══ 3) Fetch discipline + student + family ═══
    const { data: discipline, error: dErr } = await admin
      .from('disciplines')
      .select(`
        id, student_id, incident_date, category, severity, title, description,
        students (
          id, first_name, last_name, family_id,
          families ( id, family_name, parent_user_id )
        )
      `)
      .eq('id', disciplineId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (dErr || !discipline) {
      return NextResponse.json({ error: 'المخالفة غير موجودة' }, { status: 404 })
    }

    const student = (discipline as any).students
    const family = student?.families
    const parentUserId = family?.parent_user_id

    // ═══ 4) Check parent + email ═══
    if (!parentUserId) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'لا يوجد parent_user_id' })
    }

    // Check prefs
    const { data: parentProfile } = await admin
      .from('user_profiles')
      .select('notification_preferences')
      .eq('user_id', parentUserId)
      .maybeSingle()

    const prefs = parentProfile?.notification_preferences || {}
    const emailPrefs = prefs.email || {}
    if (emailPrefs.discipline === false) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'email.discipline = false' })
    }

    // Get parent email
    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const parentUser = (usersList?.users || []).find((u: any) => u.id === parentUserId)

    if (!parentUser?.email) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'لا يوجد إيميل' })
    }

    // ═══ 5) Establishment + class ═══
    const { data: establishment } = await admin
      .from('establishments')
      .select('name, email')
      .eq('id', profile.establishment_id)
      .single()

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('classes(name)')
      .eq('student_id', student.id)
      .eq('establishment_id', profile.establishment_id)
      .eq('status', 'active')
      .maybeSingle()

    const className = (enrollment as any)?.classes?.name || '—'
    const formattedDate = new Date(discipline.incident_date).toLocaleDateString('fr-FR')
    const parentName = family?.family_name || 'ولي الأمر'

    // ═══ 6) Send ═══
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
      to: parentUser.email,
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
    console.error('[discipline-alert]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}