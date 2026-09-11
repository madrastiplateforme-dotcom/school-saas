import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST() {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. جلب المؤسسات النشطة
    const { data: establishments, error: estError } = await supabaseAdmin
      .from('establishments')
      .select('id, subscription_price_per_student')
      .eq('status', 'active')

    if (estError) {
      return NextResponse.json({ error: estError.message }, { status: 500 })
    }

    const now = new Date()
    const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    let createdCount = 0

    for (const est of establishments || []) {
      // 2. حساب عدد التلاميذ
      const { count: studentCount, error: countError } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', est.id)
        .eq('status', 'active')

      if (countError) continue

      const amount = (studentCount || 0) * Number(est.subscription_price_per_student)

      // 3. تحقق من وجود فاتورة لهذا الشهر
      const { data: existing } = await supabaseAdmin
        .from('subscription_invoices')
        .select('id')
        .eq('establishment_id', est.id)
        .eq('billing_month', billingMonth)
        .maybeSingle()

      if (!existing) {
        // إنشاء فاتورة
        const { error: insertError } = await supabaseAdmin
          .from('subscription_invoices')
          .insert({
            establishment_id: est.id,
            billing_month: billingMonth,
            student_count: studentCount || 0,
            amount,
            status: 'pending',
          })

        if (!insertError) createdCount++
      }
    }

    return NextResponse.json({ success: true, createdCount, billingMonth })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}