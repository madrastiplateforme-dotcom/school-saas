// app/api/establishment/update-staff/route.ts
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
    const {
      staffId,
      full_name,
      phone,
      salary_amount,
      hire_date,
      custom_type,
      email,
      newPassword,
    } = body

    if (!staffId) {
      return NextResponse.json({ error: 'staffId مطلوب' }, { status: 400 })
    }
    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // تأكد من نفس المدرسة
    const { data: staff } = await adminClient
      .from('staff')
      .select('id, full_name, user_id, establishment_id')
      .eq('id', staffId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (!staff) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
    }

    const warnings: string[] = []

    // 1) حدّث staff
    const { error: upErr } = await adminClient
      .from('staff')
      .update({
        full_name: full_name.trim(),
        phone: phone || null,
        salary_amount: Number(salary_amount) || 0,
        hire_date: hire_date || null,
        custom_type: custom_type || null,
      })
      .eq('id', staffId)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // 2) Sync user_profiles.full_name
    if (staff.user_id && full_name.trim() !== staff.full_name) {
      await adminClient
        .from('user_profiles')
        .update({ full_name: full_name.trim() })
        .eq('user_id', staff.user_id)
    }

    // 3) Sync auth (email + password)
    if (staff.user_id) {
      const authUpdates: any = {}
      if (email) authUpdates.email = email
      if (newPassword && newPassword.length >= 6) authUpdates.password = newPassword

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await adminClient.auth.admin.updateUserById(
          staff.user_id,
          { ...authUpdates, email_confirm: true },
        )
        if (authErr) warnings.push(authErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      warnings: warnings.length ? warnings : undefined,
      message: 'تم تحديث الموظف',
    })
  } catch (err: any) {
    console.error('[update-staff]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}