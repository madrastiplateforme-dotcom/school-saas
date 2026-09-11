import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // التحقق من أن الطالب سوبر أدمن أو يحمل مفتاح cron سري
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
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      const cronSecret = request.headers.get('x-cron-secret')
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
      }
    } else {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminError || !adminData) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
    }

    const supabaseAdmin = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // 1. تحديث الفواتير المتأخرة
    const { data: pendingInvoices, error: pendingError } = await supabaseAdmin
      .from('subscription_invoices')
      .select('id, establishment_id, billing_month, status')
      .lt('billing_month', today)
      .eq('status', 'pending')

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    if (pendingInvoices && pendingInvoices.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('subscription_invoices')
        .update({ status: 'overdue' })
        .in('id', pendingInvoices.map((inv) => inv.id))

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // إشعارات + audit log لكل فاتورة متأخرة
      for (const invoice of pendingInvoices) {
        await supabaseAdmin.from('notifications').insert({
          user_id: null,
          establishment_id: invoice.establishment_id,
          title: 'فاتورة متأخرة',
          message: `المؤسسة ${invoice.establishment_id} لديها فاتورة شهر ${invoice.billing_month} متأخرة.`,
          read: false,
        })

        await supabaseAdmin.from('audit_logs').insert({
          user_id: null,
          establishment_id: invoice.establishment_id,
          action: 'invoice_marked_overdue',
          details: { invoiceId: invoice.id, billingMonth: invoice.billing_month },
        })
      }
    }

    // 2. إيقاف المؤسسات التي تجاوزت فترة السماح
    const { data: overdueInvoices, error: overdueError } = await supabaseAdmin
      .from('subscription_invoices')
      .select('establishment_id, billing_month, status')
      .eq('status', 'overdue')

    if (overdueError) {
      return NextResponse.json({ error: overdueError.message }, { status: 500 })
    }

    if (overdueInvoices && overdueInvoices.length > 0) {
      const { data: establishments, error: estError } = await supabaseAdmin
        .from('establishments')
        .select('id, name, grace_period_days, status')
        .neq('status', 'suspended')

      if (estError) {
        return NextResponse.json({ error: estError.message }, { status: 500 })
      }

      const todayDate = new Date()
      const establishmentsToSuspend: string[] = []

      for (const est of establishments || []) {
        const overdueForEst = overdueInvoices.filter((inv) => inv.establishment_id === est.id)
        if (overdueForEst.length === 0) continue

        const oldestOverdue = overdueForEst.sort((a, b) => a.billing_month.localeCompare(b.billing_month))[0]
        const dueDate = new Date(oldestOverdue.billing_month)
        const gracePeriodDays = est.grace_period_days || 5
        const suspensionDate = new Date(dueDate)
        suspensionDate.setDate(suspensionDate.getDate() + gracePeriodDays)

        if (todayDate >= suspensionDate) {
          establishmentsToSuspend.push(est.id)
        }
      }

      if (establishmentsToSuspend.length > 0) {
        await supabaseAdmin
          .from('establishments')
          .update({ status: 'suspended' })
          .in('id', establishmentsToSuspend)

        // إشعارات + audit log لكل إيقاف
        for (const estId of establishmentsToSuspend) {
          await supabaseAdmin.from('notifications').insert({
            user_id: null,
            establishment_id: estId,
            title: 'إيقاف مؤسسة تلقائياً',
            message: 'تم إيقاف المؤسسة بسبب تجاوز فترة السماح.',
            read: false,
          })

          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            establishment_id: estId,
            action: 'establishment_suspended_auto',
            details: { reason: 'overdue_subscription' },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedInvoices: pendingInvoices?.length || 0,
      suspended: establishmentsToSuspend?.length || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}