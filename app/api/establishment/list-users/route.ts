// app/api/establishment/list-users/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
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
    if (
      !roleName.includes('directeur') &&
      !roleName.includes('مدير') &&
      !roleName.includes('secr')
    ) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // 1) كل profiles ديال المدرسة
    const { data: profiles, error: profErr } = await adminClient
      .from('user_profiles')
      .select('user_id, full_name, role_id, created_at, roles(id, name)')
      .eq('establishment_id', profile.establishment_id)
      .order('created_at', { ascending: false })

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 })
    }

    const userIds = (profiles || []).map((p) => p.user_id)
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // 2) emails من auth
    const emails: Record<string, string> = {}
    for (const uid of userIds) {
      try {
        const { data } = await adminClient.auth.admin.getUserById(uid)
        if (data?.user?.email) emails[uid] = data.user.email
      } catch (e) {
        console.error('[list-users] getUserById', uid, e)
      }
    }

    // 3) staff user_ids
    const { data: staffData } = await adminClient
      .from('staff')
      .select('user_id, type, custom_type')
      .eq('establishment_id', profile.establishment_id)
      .not('user_id', 'is', null)

    const staffMap = new Map<string, any>()
    ;(staffData || []).forEach((s) => {
      if (s.user_id) staffMap.set(s.user_id, s)
    })

    // 4) families
    const { data: famData } = await adminClient
      .from('families')
      .select('id, family_name, parent_user_id')
      .eq('establishment_id', profile.establishment_id)
      .not('parent_user_id', 'is', null)

    const familyMap = new Map<string, any>()
    ;(famData || []).forEach((f) => {
      if (f.parent_user_id) familyMap.set(f.parent_user_id, f)
    })

    // 5) شكل الرد
    const users = (profiles || []).map((p: any) => {
      const rn = ((p.roles as any)?.name || '').toLowerCase()
      let type: 'directeur' | 'secretaire' | 'parent' | 'other' = 'other'

      if (rn.includes('directeur') || rn.includes('مدير')) type = 'directeur'
      else if (rn.includes('secr')) type = 'secretaire'
      else if (rn.includes('parent')) type = 'parent'

      return {
        user_id: p.user_id,
        full_name: p.full_name || 'مستخدم',
        role_name: (p.roles as any)?.name || 'غير محدد',
        role_id: p.role_id,
        email: emails[p.user_id] || null,
        created_at: p.created_at,
        type,
        staff: staffMap.get(p.user_id) || null,
        family: familyMap.get(p.user_id) || null,
      }
    })

    return NextResponse.json({ users })
  } catch (err: any) {
    console.error('[list-users]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}