// app/api/establishment/delete-user/route.ts
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
    const { userId } = body
    if (!userId) {
      return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })
    }

    // ما تخليش المدير يحيد راسو
    if (userId === authUser.id) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    // تأكد من نفس المدرسة
    const { data: target } = await adminClient
      .from('user_profiles')
      .select('user_id, full_name, establishment_id')
      .eq('user_id', userId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    const warnings: string[] = []

    // 1) unlink من families
    await adminClient
      .from('families')
      .update({ parent_user_id: null })
      .eq('parent_user_id', userId)

    // 2) حيد cash_registers
    await adminClient
      .from('cash_registers')
      .delete()
      .eq('owner_user_id', userId)
      .eq('establishment_id', profile.establishment_id)

    // 3) حيد staff row (إلا كان)
    await adminClient
      .from('staff')
      .delete()
      .eq('user_id', userId)
      .eq('establishment_id', profile.establishment_id)

    // 4) حيد user_profile
    await adminClient
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    // 5) حيد auth
    const { error: authDelErr } = await adminClient.auth.admin.deleteUser(userId)
    if (authDelErr) warnings.push(authDelErr.message)

    return NextResponse.json({
      success: true,
      warnings: warnings.length ? warnings : undefined,
      message: `تم حذف ${target.full_name}`,
    })
  } catch (err: any) {
    console.error('[delete-user]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}