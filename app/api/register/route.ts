import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// 🔧 Génère un code unique pour l'établissement
function generateEstablishmentCode(name: string): string {
  const slug = name
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3) || 'ECO'
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${slug}${random}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { schoolName, schoolPhone, email, password, directorName } = body

    if (!schoolName || !email || !password) {
      return NextResponse.json(
        { error: 'اسم المؤسسة والبريد وكلمة المرور مطلوبة' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()

    // 1. Vérifier email mawjoud
    const { data: usersList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (existing) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مستخدم مسبقاً' },
        { status: 400 }
      )
    }

    // 2. Créer auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'فشل إنشاء الحساب' },
        { status: 400 }
      )
    }

    const directorId = authData.user.id

    // 3. Créer établissement (pending) — m3a CODE
    const { data: establishment, error: estError } = await adminClient
      .from('establishments')
      .insert({
        name: schoolName,
        code: generateEstablishmentCode(schoolName),   // 🔧 ZEDNA CODE
        email: normalizedEmail,
        phone: schoolPhone || null,
        status: 'pending',
        subscription_status: 'pending',
      })
      .select()
      .single()

    if (estError || !establishment) {
      await adminClient.auth.admin.deleteUser(directorId)
      return NextResponse.json(
        { error: estError?.message || 'فشل إنشاء المؤسسة' },
        { status: 400 }
      )
    }

    // 4. Créer rôle
    const { data: roleData, error: roleError } = await adminClient
      .from('roles')
      .insert({
        establishment_id: establishment.id,
        name: 'Directeur',
        is_system: true,
      })
      .select()
      .single()

    if (roleError) {
      await adminClient.auth.admin.deleteUser(directorId)
      await adminClient.from('establishments').delete().eq('id', establishment.id)
      return NextResponse.json({ error: roleError.message }, { status: 400 })
    }

    // 5. Créer user_profile
    const { error: profileError } = await adminClient.from('user_profiles').insert({
      user_id: directorId,
      establishment_id: establishment.id,
      role_id: roleData.id,
      full_name: directorName || schoolName,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(directorId)
      await adminClient.from('establishments').delete().eq('id', establishment.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 6. Caisse Centrale
    await adminClient.from('cash_registers').insert({
      establishment_id: establishment.id,
      name: 'Caisse Centrale',
      type: 'central',
      initial_balance: 0,
    })

    // 7. Notification Super Admin
    const { data: admins } = await adminClient.from('admin_users').select('user_id')
    if (admins && admins.length > 0) {
      const notifs = admins.map((a) => ({
        user_id: a.user_id,
        establishment_id: establishment.id,
        type: 'new_establishment',
        title: '🏫 طلب انضمام جديد',
        message: `المؤسسة "${schoolName}" تطلب الانضمام`,
        link: '/admin/establishments',
      }))
      await adminClient.from('notifications').insert(notifs)
    }

    return NextResponse.json({
      success: true,
      establishmentId: establishment.id,
    })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}