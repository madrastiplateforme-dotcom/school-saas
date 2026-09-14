// app/api/establishment/update-family/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // 1) تحقق من المدير
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, roles(name)')
      .eq('user_id', authUser.id)
      .single()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    const roleName = ((profile.roles as any)?.name || '').toLowerCase()
    if (!roleName.includes('directeur') && !roleName.includes('مدير')) {
      return NextResponse.json({ error: 'غير مصرح لك' }, { status: 403 })
    }

    // 2) المدخلات
    const body = await request.json()
    const {
      familyId,
      family_name,
      father_name,
      mother_name,
      phone,
      email,
      address,
      city,
      // اختياري: تحديث حساب الوالد
      updateParentAuth,   // true/false
      parentPassword,     // إلا بغيتي تبدل password
    } = body

    if (!familyId) {
      return NextResponse.json({ error: 'familyId مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 3) جيب العائلة + تأكد
    const { data: family, error: fErr } = await adminClient
      .from('families')
      .select('id, parent_user_id, email, establishment_id')
      .eq('id', familyId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (fErr || !family) {
      return NextResponse.json({ error: 'العائلة غير موجودة' }, { status: 404 })
    }

    // 4) حدّث families
    const { error: upErr } = await adminClient
      .from('families')
      .update({
        family_name,
        father_name: father_name || null,
        mother_name: mother_name || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
    
      })
      .eq('id', familyId)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 })
    }

    // 5) Sync email فـ auth.users
    const warnings: string[] = []

    if (family.parent_user_id && updateParentAuth) {
      // 5.a بدل email فـ auth
      if (email && email !== family.email) {
        const { error: authEmailErr } = await adminClient.auth.admin.updateUserById(
          family.parent_user_id,
          { email, email_confirm: true },
        )
        if (authEmailErr) {
          warnings.push(`فشل تحديث إيميل الحساب: ${authEmailErr.message}`)
        }
      }

      // 5.b بدل password إلا تعطى
      if (parentPassword && parentPassword.length >= 6) {
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(
          family.parent_user_id,
          { password: parentPassword },
        )
        if (pwdErr) {
          warnings.push(`فشل تحديث كلمة المرور: ${pwdErr.message}`)
        }
      }

      // 5.c حدّث full_name فـ user_profiles
      if (father_name) {
        await adminClient
          .from('user_profiles')
          .update({ full_name: father_name })
          .eq('user_id', family.parent_user_id)
      }
    }

    return NextResponse.json({
      success: true,
      warnings: warnings.length ? warnings : undefined,
      message: 'تم تحديث العائلة' + (warnings.length ? ' (مع تحذيرات)' : ''),
    })
  } catch (err: any) {
    console.error('[update-family]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}