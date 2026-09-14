// app/api/establishment/delete-staff/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // 1) تحقق من المدير
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
      .single()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    const roleName = ((profile.roles as any)?.name || '').toLowerCase()
    if (!roleName.includes('directeur') && !roleName.includes('مدير')) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    // 2) المدخلات
    const body = await request.json()
    const { staffId } = body
    if (!staffId) {
      return NextResponse.json({ error: 'staffId مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 3) جيب الـ staff + تأكد من نفس المدرسة
    const { data: staff, error: stErr } = await adminClient
      .from('staff')
      .select('id, full_name, user_id, establishment_id, type, custom_type')
      .eq('id', staffId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (stErr || !staff) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 })
    }

    // 4) إلا كان عندو حساب → حيدو
    if (staff.user_id) {
      // 4.a حيد user_profile
      await adminClient
        .from('user_profiles')
        .delete()
        .eq('user_id', staff.user_id)

      // 4.b حيد cash_registers (إلا كان secrétaire)
      await adminClient
        .from('cash_registers')
        .delete()
        .eq('owner_user_id', staff.user_id)
        .eq('establishment_id', profile.establishment_id)

      // 4.c حيد من auth.users
      const { error: authDelErr } = await adminClient.auth.admin.deleteUser(
        staff.user_id,
      )

      if (authDelErr) {
        console.warn('[delete-staff] auth delete failed:', authDelErr.message)
        // ما نوقفوش العملية — نكملو
      }
    }

    // 5) حيد staff
    const { error: delErr } = await adminClient
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `تم حذف ${staff.full_name}${staff.user_id ? ' وحسابو' : ''}`,
    })
  } catch (err: any) {
    console.error('[delete-staff]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}