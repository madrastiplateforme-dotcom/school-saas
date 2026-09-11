import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { establishmentName, establishmentEmail, directorEmail, directorPassword, directorName, establishmentPhone } = body

    if (!establishmentName || !establishmentEmail || !directorEmail || !directorPassword) {
      return NextResponse.json({ error: 'جميع الحقول الإجبارية مطلوبة' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. إنشاء مستخدم المدير (مع تأكيد تلقائي)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: directorEmail,
      password: directorPassword,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      // نتحقق إذا كان الخطأ بسبب بريد موجود مسبقاً
      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json({ error: 'هذا البريد الإلكتروني مستعمل بالفعل، استعمل بريدًا آخر' }, { status: 400 })
      }
      return NextResponse.json({ error: authError?.message || 'فشل إنشاء حساب المدير' }, { status: 400 })
    }

    const directorId = authData.user.id

    // 2. إنشاء المؤسسة
    const { data: establishmentData, error: establishmentError } = await supabaseAdmin
      .from('establishments')
      .insert({
        name: establishmentName,
        email: establishmentEmail,
        phone: establishmentPhone,
        status: 'active',
        code: `EST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      })
      .select()
      .single()

    if (establishmentError || !establishmentData) {
      // حذف المستخدم إذا فشل إنشاء المؤسسة
      await supabaseAdmin.auth.admin.deleteUser(directorId)
      return NextResponse.json({ error: establishmentError?.message || 'فشل إنشاء المؤسسة' }, { status: 400 })
    }

    // 3. إنشاء دور افتراضي "Directeur"
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .insert({
        establishment_id: establishmentData.id,
        name: 'Directeur',
        description: 'Directeur principal',
        is_system: true,
      })
      .select()
      .single()

    if (roleError) {
      console.error('Role creation failed:', roleError)
    }

    // 4. إنشاء الملف الشخصي للمدير
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: directorId,
        establishment_id: establishmentData.id,
        role_id: roleData?.id || null,
        full_name: directorName || '',
      })

    if (profileError) {
      // تنظيف
      await supabaseAdmin.from('establishments').delete().eq('id', establishmentData.id)
      await supabaseAdmin.auth.admin.deleteUser(directorId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 5. إنشاء صندوق رئيسي افتراضي
    await supabaseAdmin
      .from('cash_registers')
      .insert({
        establishment_id: establishmentData.id,
        name: 'Caisse principale',
        is_main: true,
      })

    return NextResponse.json({ success: true, establishmentId: establishmentData.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}