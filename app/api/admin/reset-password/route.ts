import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 })
    }

    // إذا لم يتم إرسال كلمة مرور، نولد كلمة مرور تلقائية
    const generatedPassword = newPassword || Math.random().toString(36).slice(-8)

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: generatedPassword }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      newPassword: generatedPassword 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}