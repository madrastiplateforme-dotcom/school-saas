// app/api/establishment/create-staff/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateSystemEmail, generatePassword } from '@/lib/generate-credentials'
import { sendEmail } from '@/lib/email'
import { credentialsEmail } from '@/lib/email-templates'

const ROLE_LABEL_AR: Record<string, string> = {
  secretaire: 'السكرتيرة',
  parent: 'ولي الأمر',
  teacher: 'أستاذ',
  admin: 'إداري',
}

const ROLE_LABEL_FR: Record<string, string> = {
  secretaire: 'Secrétaire',
  parent: 'Parent',
  teacher: 'Enseignant',
  admin: 'Administratif',
}

export async function POST(request: Request) {
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      full_name,
      role_type,
      custom_type,
      phone,
      salary_amount,
      hire_date,
      family_id,
      personal_email,
      email: emailLegacy,
      password: customPassword,
    } = body

    if (!full_name || !role_type) {
      return NextResponse.json(
        { error: 'الاسم والنوع مطلوبان' },
        { status: 400 },
      )
    }

    const adminClient = createAdminClient()

    // 🔑 اسم + إيميل المدرسة
    const { data: establishment } = await adminClient
      .from('establishments')
      .select('name, email')
      .eq('id', profile.establishment_id)
      .single()

    const schoolName = establishment?.name || 'المؤسسة'
    const schoolEmail = establishment?.email || null

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
    const emailInput = personal_email || emailLegacy
    const isRealEmail = !!emailInput && emailInput.includes('@')
    const finalEmail = isRealEmail
      ? emailInput.trim().toLowerCase()
      : generateSystemEmail(full_name, role_type)

    const finalPassword =
      customPassword && customPassword.length >= 6
        ? customPassword
        : generatePassword()

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: finalEmail,
        password: finalPassword,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'فشل إنشاء الحساب' },
        { status: 400 },
      )
    }

    const newUserId = authData.user.id

    const systemRoleName = role_type === 'secretaire' ? 'Secrétaire' : 'Parent'
    const { data: roleData, error: roleError } = await adminClient.rpc(
      'get_or_create_role',
      {
        p_establishment_id: profile.establishment_id,
        p_role_name: systemRoleName,
      },
    )

    if (roleError) console.error('Role error:', roleError?.message || roleError)

    // ═══════════════════════════════════════════════════════════
    // 🛡️ FONCTION HELPER : rollback complet
    // ═══════════════════════════════════════════════════════════
    const rollback = async (reason: string) => {
      try {
        await adminClient.from('user_profiles').delete().eq('user_id', newUserId)
        await adminClient.from('staff').delete().eq('user_id', newUserId)
        await adminClient.auth.admin.deleteUser(newUserId)
      } catch (e: any) {
        console.error('⚠️ Rollback failed:', e?.message || e)
      }
      return NextResponse.json(
        { error: reason, code: 'ROLLBACK_DONE' },
        { status: 400 },
      )
    }

    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        user_id: newUserId,
        establishment_id: profile.establishment_id,
        role_id: roleData || null,
        full_name,
      })

    if (profileError) {
      return await rollback(profileError.message)
    }

    // ═══════════════════════════════════════════════════════════
    // 🆕 SECRÉTAIRE : créer caisse + staff
    // 🛡️ Avec vérification UNIQUE name + rollback
    // ═══════════════════════════════════════════════════════════
    if (role_type === 'secretaire') {
      const cashRegisterName = `Caisse ${full_name}`

      // 1️⃣ Vérifier si un cash_register avec le même nom existe déjà
      const { data: existingCaisse } = await adminClient
        .from('cash_registers')
        .select('id, name')
        .eq('establishment_id', profile.establishment_id)
        .eq('name', cashRegisterName)
        .maybeSingle()

      if (existingCaisse) {
        return await rollback(
          `⚠️ يوجد صندوق بنفس الاسم "${cashRegisterName}" في هذه المؤسسة. المرجو إضافة اسم عائلي أو تغيير الاسم.`,
        )
      }

      // 2️⃣ Insert cash_register
      const { error: cashError } = await adminClient
        .from('cash_registers')
        .insert({
          establishment_id: profile.establishment_id,
          name: cashRegisterName,
          type: 'secretary',
          owner_user_id: newUserId,
          initial_balance: 0,
        })

      if (cashError) {
        // 23505 = unique_violation (race condition)
        if (cashError.code === '23505') {
          return await rollback(
            `⚠️ يوجد صندوق بنفس الاسم "${cashRegisterName}". المرجو إضافة اسم عائلي أو تغيير الاسم.`,
          )
        }
        return await rollback(
          `فشل إنشاء الصندوق: ${cashError.message}`,
        )
      }

      // 3️⃣ Insert staff
      const { error: staffError } = await adminClient.from('staff').insert({
        establishment_id: profile.establishment_id,
        full_name,
        type: 'admin',
        custom_type: 'Secrétaire',
        phone: phone || null,
        salary_amount: salary_amount || 0,
        hire_date: hire_date || null,
        user_id: newUserId,
      })

      if (staffError) {
        // Rollback cash_register + user
        await adminClient
          .from('cash_registers')
          .delete()
          .eq('owner_user_id', newUserId)
        return await rollback(staffError.message)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Parent → link famille
    // ═══════════════════════════════════════════════════════════
    if (role_type === 'parent' && family_id) {
      await adminClient
        .from('families')
        .update({ parent_user_id: newUserId })
        .eq('id', family_id)
        .eq('establishment_id', profile.establishment_id)
    }

    // ============================================
    // 4. ✅ إرسال إيميل
    // ============================================
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000'

    const loginUrl = `${siteUrl}/login`
    const roleLabelAr = ROLE_LABEL_AR[role_type] || role_type
    const roleLabelFr = ROLE_LABEL_FR[role_type] || role_type

    const emailContent = credentialsEmail({
      fullName: full_name,
      role: `${roleLabelAr} / ${roleLabelFr}`,
      schoolName,
      email: finalEmail,
      password: finalPassword,
      loginUrl,
    })

    let emailSent = false
    if (isRealEmail) {
      const emailResult = await sendEmail({
        to: finalEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        replyTo: schoolEmail,
        establishmentId: profile.establishment_id,
        template: 'credentials',
        metadata: {
          newUserId,
          role: role_type,
          fullName: full_name,
          schoolName,
        },
      })

      emailSent = emailResult.ok
      if (!emailResult.ok) {
        console.warn('⚠️ فشل إرسال إيميل البيانات:', emailResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      hasAccount: true,
      userId: newUserId,
      email: finalEmail,
      password: finalPassword,
      isRealEmail,
      emailSent,
      message: 'تم إنشاء الحساب',
    })
  } catch (error: any) {
    console.error('Create staff error:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'خطأ داخلي' },
      { status: 500 },
    )
  }
}