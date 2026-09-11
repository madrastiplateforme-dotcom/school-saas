import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generatePassword } from '@/lib/generate-credentials'

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
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Vérifier que l'user kayn f nafs l'établissement
    const { data: targetProfile } = await adminClient
      .from('user_profiles')
      .select('establishment_id, full_name')
      .eq('user_id', userId)
      .single()

    if (targetProfile?.establishment_id !== profile.establishment_id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const newPassword = generatePassword()

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      password: newPassword,
      fullName: targetProfile?.full_name,
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}