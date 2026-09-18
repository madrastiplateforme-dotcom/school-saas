import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════
// 🔑 Détection de rôle (inline — proxy.ts ne peut pas importer de client code)
// ═══════════════════════════════════════════════════════════════════════
const ROLE_VARIANTS: Record<string, string[]> = {
  directeur: ['directeur', 'director', 'مدير'],
  secretaire: ['secrétaire', 'secretaire', 'secretary', 'سكرتيرة'],
  enseignant: ['enseignant', 'teacher', 'prof', 'أستاذ'],
  parent: ['parent', 'ولي'],
}

function detectRole(roleName: string | null | undefined): string | null {
  if (!roleName) return null
  const n = roleName.toLowerCase().trim()
  for (const [role, variants] of Object.entries(ROLE_VARIANTS)) {
    if (variants.some((v) => n === v || n.includes(v))) return role
  }
  return null
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // ═══ 1) Protection générale ═══
  const protectedPrefixes = [
    '/dashboard',
    '/admin',
    '/parent',
    '/teacher',
    '/pending',
    '/suspended',
  ]

  if (!user && protectedPrefixes.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

  // ═══ 2) Super Admin (admin_users) ═══
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isSuperAdmin =
    !!adminData || user.email === process.env.SUPER_ADMIN_EMAIL

  // ═══ 3) Profile — 2 queries (R1: pas de JOIN roles) ═══
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('establishment_id, role_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let roleName = ''
  if (profile?.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', profile.role_id)
      .maybeSingle()
    roleName = roleData?.name || ''
  }

  const role = detectRole(roleName)
  const isDirecteur = role === 'directeur'
  const isSecretaire = role === 'secretaire'
  const isEnseignant = role === 'enseignant'
  const isParent = role === 'parent'

  // ═══ 4) Establishment status ═══
  let establishmentStatus: string | null = null
  if (profile?.establishment_id) {
    const { data: est } = await supabase
      .from('establishments')
      .select('status')
      .eq('id', profile.establishment_id)
      .maybeSingle()
    establishmentStatus = est?.status || null
  }

  // ═══ 5) Super Admin ═══
  if (isSuperAdmin) {
    if (path.startsWith('/parent') || path.startsWith('/teacher')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ═══ 6) Pending / Suspended ═══
  if (establishmentStatus === 'pending' && !path.startsWith('/pending')) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  if (establishmentStatus === 'suspended' && !path.startsWith('/suspended')) {
    const url = request.nextUrl.clone()
    url.pathname = '/suspended'
    return NextResponse.redirect(url)
  }

  if (
    (path === '/pending' || path === '/suspended') &&
    establishmentStatus === 'active'
  ) {
    const url = request.nextUrl.clone()
    if (isParent) url.pathname = '/parent/dashboard'
    else if (isEnseignant) url.pathname = '/teacher/dashboard'
    else if (isSecretaire) url.pathname = '/dashboard/secretary'
    else url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ═══ 7) Directeur ═══
  if (isDirecteur) {
    if (
      path.startsWith('/parent') ||
      path.startsWith('/dashboard/secretary') ||
      path.startsWith('/admin') ||
      path.startsWith('/teacher')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ═══ 8) Secrétaire ═══
  if (isSecretaire) {
    const allowedPaths = [
      '/dashboard/secretary',
      '/dashboard/enroll',
      '/dashboard/students',
      '/dashboard/families',
      '/dashboard/attendance',
      '/dashboard/discipline',
      '/dashboard/meetings',
      '/dashboard/evaluations',
      '/dashboard/bulletins',
      '/dashboard/timetable',
      '/dashboard/contracts',
      '/dashboard/installments',
      '/dashboard/payments',
      '/dashboard/impayes',
      '/dashboard/expenses',
      '/dashboard/caisse',
      '/dashboard/messages',
      '/dashboard/notifications',
      '/dashboard/profile',
      '/pending',
      '/suspended',
    ]

    if (!allowedPaths.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/secretary'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ═══ 9) Enseignant ═══
  if (isEnseignant) {
    if (
      !path.startsWith('/teacher') &&
      !path.startsWith('/pending') &&
      !path.startsWith('/suspended')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/teacher/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ═══ 10) Parent ═══
  if (isParent) {
    if (
      !path.startsWith('/parent') &&
      !path.startsWith('/pending') &&
      !path.startsWith('/suspended')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/parent/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ═══ 11) Fallback ═══
  if (path.startsWith('/pending') || path.startsWith('/suspended')) {
    return supabaseResponse
  }
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/parent/:path*',
    '/teacher/:path*',
    '/pending',
    '/suspended',
  ],
}