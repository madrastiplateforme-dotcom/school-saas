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

  if (
    !user &&
    (path.startsWith('/dashboard') ||
      path.startsWith('/admin') ||
      path.startsWith('/parent') ||
      path.startsWith('/teacher') ||
      path.startsWith('/pending'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

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
  const isDirecteur =
    roleName.includes('directeur') || roleName.includes('مدير')
  const isSecretaire = roleName.includes('secr')
  const isEnseignant =
    roleName.includes('enseignant') ||
    roleName.includes('teacher') ||
    roleName.includes('prof') ||
    roleName.includes('أستاذ')
  const isParent = roleName.includes('parent')

  let establishmentStatus: string | null = null
  if (profile?.establishment_id) {
    const { data: est } = await supabase
      .from('establishments')
      .select('status')
      .eq('id', profile.establishment_id)
      .maybeSingle()
    establishmentStatus = est?.status || null
  }

  if (isSuperAdmin) {
    if (path.startsWith('/parent') || path.startsWith('/teacher')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (establishmentStatus === 'pending' && !path.startsWith('/pending')) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending'
    return NextResponse.redirect(url)
  }

  if (path === '/pending' && establishmentStatus === 'active') {
    const url = request.nextUrl.clone()
    if (isParent) url.pathname = '/parent/dashboard'
    else if (isEnseignant) url.pathname = '/teacher/dashboard'
    else if (isSecretaire) url.pathname = '/dashboard/secretary'
    else url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

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
      '/dashboard/messages',
      '/dashboard/notifications',
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

  if (isEnseignant) {
    if (!path.startsWith('/teacher') && !path.startsWith('/pending')) {
      const url = request.nextUrl.clone()
      url.pathname = '/teacher/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (isParent) {
    if (!path.startsWith('/parent') && !path.startsWith('/pending')) {
      const url = request.nextUrl.clone()
      url.pathname = '/parent/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (path.startsWith('/pending')) {
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
  ],
}