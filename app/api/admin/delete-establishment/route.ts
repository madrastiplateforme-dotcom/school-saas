import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { establishmentId } = body

    if (!establishmentId) {
      return NextResponse.json({ error: 'معرف المؤسسة مطلوب' }, { status: 400 })
    }

    // التحقق من أن المستخدم الحالي سوبر أدمن
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
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminData) {
      return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. جلب جميع المستخدمين المرتبطين بالمؤسسة
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('establishment_id', establishmentId)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // 2. حذف المستخدمين من auth.users (اختياري، يمكن تركه)
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.user_id)
      }
    }

    // 3. حذف المؤسسة (سيحذف كل البيانات المرتبطة عبر ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('establishments')
      .delete()
      .eq('id', establishmentId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}