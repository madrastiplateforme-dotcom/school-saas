// app/api/teacher/absence-alert/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendAbsenceEmails } from '@/lib/send-absence-email'

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

    // ═══ 3) Role check — enseignant / directeur / secrétaire / super admin ═══
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
    const { studentIds, date, note } = body

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, skipped: 0 })
    }
    if (!date) {
      return NextResponse.json({ error: 'date مطلوب' }, { status: 400 })
    }

    // ═══ 5) Call helper ═══
    const result = await sendAbsenceEmails({
      establishmentId: profile.establishment_id,
      studentIds,
      attendanceDate: date,
      note: note || null,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[teacher-absence-alert]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}