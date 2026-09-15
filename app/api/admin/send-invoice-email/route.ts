import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendInvoiceEmailById } from '@/lib/send-invoice-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 1) تحقق من Super Admin
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

    if (!user) {
      return NextResponse.json({ ok: false, error: 'غير مصرح' }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'غير مصرح — Super Admin فقط' },
        { status: 403 },
      )
    }

    // 2) البيانات
    const body = await request.json()
    const invoiceId = body?.invoiceId

    if (!invoiceId) {
      return NextResponse.json(
        { ok: false, error: 'invoiceId مطلوب' },
        { status: 400 },
      )
    }

    // 3) إرسال
    const result = await sendInvoiceEmailById(invoiceId)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[send-invoice-email]', e)
    return NextResponse.json(
      { ok: false, error: e.message || 'خطأ' },
      { status: 500 },
    )
  }
}