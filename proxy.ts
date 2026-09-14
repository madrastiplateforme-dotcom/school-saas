import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // ===== 1. Protection générale =====
  if (
    !user &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/parent') ||
      path.startsWith('/pending'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

  // ===== 2. Jib role + establishment =====
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isSuperAdmin = !!adminData

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('establishment_id, roles(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  const roleName = ((profile?.roles as any)?.name || '').toLowerCase()
  const isDirecteur = roleName.includes('directeur') || roleName.includes('مدير')
  const isSecretaire = roleName.includes('secr')
  const isParent = roleName.includes('parent')

  // ===== 3. Check status dyal establishment (pending/active) =====
  let establishmentStatus: string | null = null
  if (profile?.establishment_id) {
    const { data: est } = await supabase
      .from('establishments')
      .select('status')
      .eq('id', profile.establishment_id)
      .maybeSingle()
    establishmentStatus = est?.status || null
  }

  // ===== 4. Super Admin =====
  if (isSuperAdmin) {
    if (path.startsWith('/parent')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ===== 5. Ila establishment pending → redirect l /pending =====
  if (establishmentStatus === 'pending' && !path.startsWith('/pending')) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  // ===== 6. Ila active w kaydir /pending → redirect l /dashboard =====
  if (path === '/pending' && establishmentStatus === 'active') {
    const url = request.nextUrl.clone()
    url.pathname = isParent ? '/parent/dashboard' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // ===== 7. Directeur =====
  if (isDirecteur) {
    if (path.startsWith('/parent') || path.startsWith('/dashboard/secretary') || path.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ===== 8. Secrétaire =====
  // ===== 8. Secrétaire =====
// ===== 8. Secrétaire =====
if (isSecretaire) {
  const allowedPaths = [
    '/dashboard/secretary',
    '/dashboard/payments',
    '/dashboard/expenses',
    '/dashboard/students',
    '/dashboard/families',
    '/dashboard/installments',
    '/dashboard/caisse',
    '/dashboard/caisse/transfers',
    '/dashboard/caisse/transfer',
    '/dashboard/messages',    // 🆕 الرسائل
    '/dashboard/notifications', // 🆕 الإشعارات
    '/dashboard/profile',
    '/pending',
  ]
  const isAllowed = allowedPaths.some((p) => path.startsWith(p))

  if (!isAllowed) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/secretary'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}

  // ===== 9. Parent =====
  if (isParent) {
    if (!path.startsWith('/parent') && !path.startsWith('/pending')) {
      const url = request.nextUrl.clone()
      url.pathname = '/parent/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ===== 10. Fallback =====
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/parent/:path*', '/pending'],
}