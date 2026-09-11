import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateSystemEmail, generatePassword } from '@/lib/generate-credentials'

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

    const body = await request.json()
    const {
      full_name, role_type,
      custom_type, phone, salary_amount, hire_date,
      family_id,
    } = body

    if (!full_name || !role_type) {
      return NextResponse.json({ error: 'الاسم والنوع مطلوبان' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // ============================================
    // 1. Staff akhor (Enseignant, Chauffeur...) → bla compte
    // ============================================
    if (role_type !== 'secretaire' && role_type !== 'parent') {
      const { error: staffError } = await adminClient.from('staff').insert({
        establishment_id: profile.establishment_id,
        full_name,
        type: role_type,
        custom_type: custom_type || null,
        phone: phone || null,
        salary_amount: salary_amount || 0,
        hire_date: hire_date || null,
      })

      if (staffError) {
        return NextResponse.json({ error: staffError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        hasAccount: false,
        message: 'تمت إضافة الموظف',
      })
    }

    // ============================================
    // 2. Secrétaire wla Parent → compte AUTO
    // ============================================
    const finalEmail = generateSystemEmail(full_name, role_type)
    const finalPassword = generatePassword()

    // Créer auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: finalEmail,
      password: finalPassword,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'فشل إنشاء الحساب' },
        { status: 400 }
      )
    }

    const newUserId = authData.user.id

    // Rôle système
    const systemRoleName = role_type === 'secretaire' ? 'Secrétaire' : 'Parent'
    const { data: roleData, error: roleError } = await adminClient.rpc('get_or_create_role', {
      p_establishment_id: profile.establishment_id,
      p_role_name: systemRoleName,
    })

    if (roleError) console.error('Role error:', roleError)

    // User profile
    const { error: profileError } = await adminClient.from('user_profiles').insert({
      user_id: newUserId,
      establishment_id: profile.establishment_id,
      role_id: roleData || null,
      full_name,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Secrétaire → caisse + staff
    if (role_type === 'secretaire') {
      await adminClient.from('cash_registers').insert({
        establishment_id: profile.establishment_id,
        name: `Caisse ${full_name}`,
        type: 'secretary',
        owner_user_id: newUserId,
        initial_balance: 0,
      })

      await adminClient.from('staff').insert({
        establishment_id: profile.establishment_id,
        full_name,
        type: 'admin',
        custom_type: 'Secrétaire',
        phone: phone || null,
        salary_amount: salary_amount || 0,
        hire_date: hire_date || null,
      })
    }

    // Parent → link famille
    if (role_type === 'parent' && family_id) {
      await adminClient
        .from('families')
        .update({ parent_user_id: newUserId })
        .eq('id', family_id)
        .eq('establishment_id', profile.establishment_id)
    }

    // ✅ Rajje3 credentials (ghir had l'mrra!)
    return NextResponse.json({
      success: true,
      hasAccount: true,
      userId: newUserId,
      email: finalEmail,
      password: finalPassword,
      message: 'تم إنشاء الحساب',
    })
  } catch (error: any) {
    console.error('Create staff error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}