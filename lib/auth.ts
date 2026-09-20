import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

export async function getCurrentUser() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const supabase = await getSupabaseServer()
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('establishment_id, role_id, roles(name)')
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data
}

export async function requireRole(roleName: string) {
  const profile = await getCurrentProfile()
  // ✅ FIX : Supabase retourne roles comme array → cast
  const profileRoleName = (profile?.roles as any)?.name
  if (!profile || profileRoleName !== roleName) {
    throw new Error('غير مصرح')
  }
  return profile
}

export async function requirePermission(module: string, action: string) {
  const profile = await getCurrentProfile()
  if (!profile || !profile.role_id) throw new Error('غير مصرح')

  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', profile.role_id)

  if (error) throw new Error('خطأ في التحقق من الصلاحيات')

  const permissionIds = data?.map((item) => item.permission_id) || []

  const { data: permissionData } = await supabase
    .from('permissions')
    .select('id')
    .eq('module', module)
    .eq('action', action)
    .single()

  if (!permissionData || !permissionIds.includes(permissionData.id)) {
    throw new Error('غير مصرح')
  }

  return profile
}