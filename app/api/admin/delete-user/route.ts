// app/api/admin/delete-user/route.ts
// ═══════════════════════════════════════════════════════════════════════
// 🗑️ Suppression d'un utilisateur (auth.users)
// Le trigger auth.users validera automatiquement (caisse vide requise)
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────────
    // 1. AUTH — vérifier que l'appelant est Directeur ou Super Admin
    // ─────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 },
      )
    }

    // Rôle
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role_id, establishment_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let roleName: string | null = null
    if (profile?.role_id) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', profile.role_id)
        .maybeSingle()
      roleName = roleData?.name || null
    }

    const isDirecteur =
      roleName === 'Directeur' ||
      roleName === 'directeur' ||
      (roleName || '').toLowerCase().includes('direct')

    const isSuperAdmin =
      process.env.SUPER_ADMIN_EMAIL &&
      user.email === process.env.SUPER_ADMIN_EMAIL

    if (!isDirecteur && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية' },
        { status: 403 },
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 2. BODY
    // ─────────────────────────────────────────────────────────────
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId مطلوب' },
        { status: 400 },
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Vérifier que le user cible est du même établissement
    //    (sauf Super Admin)
    // ─────────────────────────────────────────────────────────────
    const admin = createAdminClient()

    const { data: targetProfile } = await admin
      .from('user_profiles')
      .select('establishment_id, full_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (!targetProfile) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 },
      )
    }

    if (
      !isSuperAdmin &&
      targetProfile.establishment_id !== profile?.establishment_id
    ) {
      return NextResponse.json(
        { success: false, error: 'مستخدم من مؤسسة أخرى' },
        { status: 403 },
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Vérification caisse (avant suppression)
    // ─────────────────────────────────────────────────────────────
    const { data: check, error: checkErr } = await admin.rpc(
      'fn_can_delete_user',
      { p_user_id: userId },
    )

    if (checkErr) {
      return NextResponse.json(
        { success: false, error: checkErr.message },
        { status: 500 },
      )
    }

    if (check && !check.can_delete) {
      return NextResponse.json(
        { success: false, error: check.message, code: 'CASH_NOT_EMPTY' },
        { status: 400 },
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Cascade : cash_register + staff + user_profiles
    // ─────────────────────────────────────────────────────────────
    const { error: cascadeErr } = await admin.rpc('fn_delete_user_cascade', {
      p_user_id: userId,
    })

    if (cascadeErr) {
      return NextResponse.json(
        { success: false, error: cascadeErr.message },
        { status: 500 },
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Suppression auth.users (le trigger validera à nouveau)
    // ─────────────────────────────────────────────────────────────
    const { error: authErr } = await admin.auth.admin.deleteUser(userId)

    if (authErr) {
      return NextResponse.json(
        {
          success: false,
          error: 'تم حذف البيانات لكن فشل حذف الحساب: ' + authErr.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, userId })
  } catch (err: any) {
    console.error('[api/admin/delete-user]', err?.message || err)
    return NextResponse.json(
      { success: false, error: err?.message || 'خطأ داخلي' },
      { status: 500 },
    )
  }
}