// app/api/establishment/update-user/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
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
      .single()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    const roleName = ((profile.roles as any)?.name || '').toLowerCase()
    if (!roleName.includes('directeur') && !roleName.includes('مدير')) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, full_name, email, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // تأكد أن المستخدم من نفس المدرسة
    const { data: target } = await adminClient
      .from('user_profiles')
      .select('user_id, establishment_id, full_name')
      .eq('user_id', userId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // 1) حدّث full_name فـ user_profiles
    if (full_name && full_name !== target.full_name) {
      await adminClient
        .from('user_profiles')
        .update({ full_name })
        .eq('user_id', userId)
    }

    // 2) حدّث email + password فـ auth
    const authUpdates: any = {}
    if (email) authUpdates.email = email
    if (newPassword && newPassword.length >= 6) authUpdates.password = newPassword

    const warnings: string[] = []

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await adminClient.auth.admin.updateUserById(
        userId,
        { ...authUpdates, email_confirm: true },
      )
      if (authErr) warnings.push(authErr.message)
    }

    // 3) sync full_name فـ staff/families
    // 3) Sync full_name فـ staff + families
if (full_name) {
  // staff
  await adminClient
    .from('staff')
    .update({ full_name })
    .eq('user_id', userId)
    .eq('establishment_id', profile.establishment_id)

  // families (father_name)
  await adminClient
    .from('families')
    .update({ father_name: full_name })
    .eq('parent_user_id', userId)
    .eq('establishment_id', profile.establishment_id)
}

    return NextResponse.json({
      success: true,
      warnings: warnings.length ? warnings : undefined,
      message: 'تم تحديث المستخدم',
    })
  } catch (err: any) {
    console.error('[update-user]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}