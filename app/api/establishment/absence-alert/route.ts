// app/api/establishment/absence-alert/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendAbsenceEmails } from '@/lib/send-absence-email'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    // 1) تحقق من الصلاحية
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
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // 2) جيب establishment_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.establishment_id) {
      return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })
    }

    // 3) المدخلات
    const body = await request.json()
    const { studentIds, date, note } = body

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'studentIds مطلوب' }, { status: 400 })
    }
    if (!date) {
      return NextResponse.json({ error: 'date مطلوب' }, { status: 400 })
    }

    // 4) صيفط الإيميلات
    const result = await sendAbsenceEmails({
      establishmentId: profile.establishment_id,
      studentIds,
      attendanceDate: date,
      note: note || null,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[absence-alert]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}