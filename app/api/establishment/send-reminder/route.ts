import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    if (!roleName.includes('directeur') && !roleName.includes('مدير') && !roleName.includes('secr')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const {
      parentUserId,
      parentPhone,
      parentEmail,
      studentName,
      amount,
      installmentsCount,
      maxDaysOverdue,
      type,
      establishmentId,
    } = await request.json()

    const adminClient = createAdminClient()
    const results = {
      notification: false,
      sms: false,
      email: false,
    }

    // 1. Notification (DB)
    if ((type === 'all' || type === 'notification') && parentUserId) {
      const { error: notifError } = await adminClient.from('notifications').insert({
        user_id: parentUserId,
        establishment_id: establishmentId,
        type: 'payment_reminder',
        title: '⚠️ تذكير بالدفع',
        message: `عزيزي ولي الأمر، نذكركم بأن التلميذ ${studentName} لديه ${installmentsCount} قسط متأخر بمبلغ إجمالي ${amount.toFixed(2)} DH. آخر موعد متأخر بـ ${maxDaysOverdue} يوم.`,
        link: '/parent/dashboard',
        metadata: { student_name: studentName, amount, max_days: maxDaysOverdue },
      })

      if (!notifError) results.notification = true
    }

    // 2. SMS (placeholder — Twilio/m3akil integration)
    if ((type === 'all' || type === 'sms') && parentPhone) {
      // TODO: Integrate with Twilio or Moroccan SMS provider
      console.log(`📱 SMS à ${parentPhone}: تذكير بالدفع — ${studentName} — ${amount.toFixed(2)} DH`)
      results.sms = true
    }

    // 3. Email (placeholder — Resend/SendGrid integration)
    if ((type === 'all' || type === 'email') && parentEmail) {
      // TODO: Integrate with Resend or SendGrid
      console.log(`📧 Email à ${parentEmail}: تذكير بالدفع — ${studentName} — ${amount.toFixed(2)} DH`)
      results.email = true
    }

    // 4. Log audit
    try {
      await adminClient.from('notifications').insert({
        user_id: user.id,
        establishment_id: establishmentId,
        type: 'reminder_sent_log',
        title: 'تذكير مُرسل',
        message: `تم إرسال تذكير إلى ${studentName} بمبلغ ${amount.toFixed(2)} DH`,
        metadata: { results, student_name: studentName },
      })
    } catch (e) {}

    return NextResponse.json({
      success: true,
      results,
      message: 'تم إرسال التذكير',
    })
  } catch (error: any) {
    console.error('Send reminder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}