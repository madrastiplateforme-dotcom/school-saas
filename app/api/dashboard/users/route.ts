import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, email, password, roleId, establishmentId } = body

    if (!fullName || !email || !password || !roleId || !establishmentId) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    // التحقق من أن المستخدم الحالي مدير
    const currentProfile = await requireRole('Directeur')

    // التأكد أن المدير يدير نفس المؤسسة
    if (currentProfile.establishment_id !== establishmentId) {
      return NextResponse.json({ error: 'لا يمكنك إدارة هذه المؤسسة' }, { status: 403 })
    }

    // إنشاء المستخدم بواسطة Service Role
    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'فشل إنشاء المستخدم' }, { status: 400 })
    }

    const userId = authData.user.id

    // إنشاء الملف الشخصي
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        establishment_id: establishmentId,
        role_id: roleId,
        full_name: fullName,
      })

    if (profileError) {
      // حذف المستخدم إذا فشل
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}