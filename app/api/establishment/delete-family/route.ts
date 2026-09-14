// app/api/establishment/delete-family/route.ts
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
    const { familyId, deleteStudents, confirmedName } = body

    if (!familyId) {
      return NextResponse.json({ error: 'familyId مطلوب' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 3) جيب العائلة
    const { data: family, error: fErr } = await adminClient
      .from('families')
      .select('id, family_name, parent_user_id, establishment_id')
      .eq('id', familyId)
      .eq('establishment_id', profile.establishment_id)
      .maybeSingle()

    if (fErr || !family) {
      return NextResponse.json({ error: 'العائلة غير موجودة' }, { status: 404 })
    }

    // 4) جيب التلاميذ
    const { data: students } = await adminClient
      .from('students')
      .select('id, first_name, last_name, status')
      .eq('family_id', familyId)
      .eq('establishment_id', profile.establishment_id)

    const studentList = students || []
    const activeStudents = studentList.filter(s => s.status !== 'inactive')

    // 5) إلا كاينين تلاميذ و ما تأكيدش
    if (activeStudents.length > 0 && !deleteStudents) {
      return NextResponse.json(
        {
          error: 'العائلة فيها تلاميذ',
          needsConfirmation: true,
          studentsCount: activeStudents.length,
          students: activeStudents.map(s => `${s.first_name} ${s.last_name}`),
        },
        { status: 409 },
      )
    }

    // 6) تأكد أن المدير كتب اسم العائلة
    if (activeStudents.length > 0 && deleteStudents) {
      if (confirmedName !== family.family_name) {
        return NextResponse.json(
          { error: 'الاسم المدخل غير مطابق. اكتب اسم العائلة بدقة للتأكيد' },
          { status: 400 },
        )
      }
    }

    // 7) حذف التدريجي
    const warnings: string[] = []

    // 7.a حيد enrollments
    if (activeStudents.length > 0) {
      const studentIds = activeStudents.map(s => s.id)

      // حيد attendances
      await adminClient.from('attendances').delete().in('student_id', studentIds)

      // حيد grades
      await adminClient.from('grades').delete().in('student_id', studentIds)

      // حيد bulletins
      await adminClient.from('bulletins').delete().in('student_id', studentIds)

      // حيد payments
      await adminClient.from('payments').delete().in('student_id', studentIds)

      // حيد installments
      await adminClient.from('installments').delete().in('student_id', studentIds)

      // حيد contracts
      await adminClient.from('contracts').delete().in('student_id', studentIds)

      // حيد enrollments
      await adminClient.from('enrollments').delete().in('student_id', studentIds)

      // حيد students
      const { error: delStErr } = await adminClient
        .from('students')
        .delete()
        .in('id', studentIds)
      if (delStErr) warnings.push(`فشل حذف التلاميذ: ${delStErr.message}`)
    }

    // 7.b حيد حساب الوالد (إلا كان)
    if (family.parent_user_id) {
      await adminClient
        .from('user_profiles')
        .delete()
        .eq('user_id', family.parent_user_id)

      const { error: authDelErr } = await adminClient.auth.admin.deleteUser(
        family.parent_user_id,
      )
      if (authDelErr) warnings.push(`فشل حذف حساب الوالد: ${authDelErr.message}`)
    }

    // 7.c حيد العائلة
    const { error: delFamErr } = await adminClient
      .from('families')
      .delete()
      .eq('id', familyId)

    if (delFamErr) {
      return NextResponse.json({ error: delFamErr.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      deletedStudents: activeStudents.length,
      deletedParent: !!family.parent_user_id,
      warnings: warnings.length ? warnings : undefined,
      message: `تم حذف العائلة ${family.family_name}${
        activeStudents.length ? ` و ${activeStudents.length} تلميذ` : ''
      }${family.parent_user_id ? ' + حساب الوالد' : ''}`,
    })
  } catch (err: any) {
    console.error('[delete-family]', err)
    return NextResponse.json(
      { error: err?.message || 'خطأ غير متوقع' },
      { status: 500 },
    )
  }
}