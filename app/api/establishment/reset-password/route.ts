// app/api/establishment/reset-password/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generatePassword } from '@/lib/generate-credentials'
import { sendEmail } from '@/lib/email'
import { passwordResetEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // 1) تحقق من هوية المدير
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
      data: { user: authUser },
    } = await supabase.auth.getUser()
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 3) تأكد أن المستخدم الهدف من نفس المدرسة
    const { data: targetProfile, error: tpErr } = await adminClient
      .from('user_profiles')
      .select('user_id, full_name, establishment_id')
      .eq('user_id', userId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (tpErr || !targetProfile) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
    }

    // 4) جيب إيميل المستخدم
    const { data: authUserData, error: authGetErr } =
      await adminClient.auth.admin.getUserById(userId)

    if (authGetErr || !authUserData?.user?.email) {
      return NextResponse.json({ error: 'تعذر جلب بريد المستخدم' }, { status: 400 })
    }

    const targetEmail = authUserData.user.email

    // 5) جيب اسم + إيميل المدرسة (للـ replyTo)
    const { data: est } = await adminClient
      .from('establishments')
      .select('name, email')
      .eq('id', profile.establishment_id)
      .single()

    const schoolName = est?.name || 'المؤسسة'
    const schoolEmail = est?.email || null

    // 6) ولّد كلمة مرور جديدة
    const newPassword = generatePassword()

    // 7) بدلها فـ Supabase Auth
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || 'فشل تحديث كلمة المرور' },
        { status: 400 },
      )
    }

    // 8) صيفط الإيميل
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000'

    const loginUrl = `${siteUrl}/login`

    const emailContent = passwordResetEmail({
      fullName: targetProfile.full_name || targetEmail,
      newPassword,
      loginUrl,
      schoolName,
    })

    const emailResult = await sendEmail({
      to: targetEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      replyTo: schoolEmail,
      establishmentId: profile.establishment_id,
      template: 'password_reset',
      metadata: {
        target_user_id: userId,
        target_email: targetEmail,
        schoolName,
      },
    })

    // 9) الرد — كلمة المرور كترجع غير إلا فشل الإيميل
    if (!emailResult.ok) {
      console.warn('⚠️ فشل إرسال إيميل كلمة المرور:', emailResult.error)
      return NextResponse.json({
        success: true,
        emailSent: false,
        password: newPassword,
        fullName: targetProfile.full_name,
        email: targetEmail,
        warning: 'فشل إرسال الإيميل — المرجو إعطاء كلمة المرور يدوياً',
      })
    }

    // ✅ الإيميل تصيفط — ما نرجعوش password (أمان)
    return NextResponse.json({
      success: true,
      emailSent: true,
      message: 'تم إرسال كلمة المرور الجديدة إلى بريد الموظف',
    })
  } catch (err: any) {
    console.error('[reset-password]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}