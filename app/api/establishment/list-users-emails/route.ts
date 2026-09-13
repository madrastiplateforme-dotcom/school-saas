import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
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
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, roles(name)')
      .eq('user_id', user.id)
      .single()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    const roleName = ((profile.roles as any)?.name || '').toLowerCase()
    if (!roleName.includes('directeur') && !roleName.includes('مدير')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { userIds } = await request.json()
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const emails: Record<string, string> = {}

    // Jib emails wa7ed b wa7ed
    for (const userId of userIds) {
      const { data } = await adminClient.auth.admin.getUserById(userId)
      if (data?.user?.email) {
        emails[userId] = data.user.email
      }
    }

    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error('List emails error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}