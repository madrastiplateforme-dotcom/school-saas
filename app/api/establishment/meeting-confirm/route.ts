// app/api/establishment/meeting-confirm/route.ts
// Envoie un email de confirmation au parent après réservation d'un slot

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'
import { meetingConfirmationEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // ═══ Auth ═══
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
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()
    const { slotId } = body

    if (!slotId) {
      return NextResponse.json({ error: 'slotId مطلوب' }, { status: 400 })
    }

    const admin = createAdminClient()

    // ═══ Récupérer slot + meeting ═══
    const { data: slot, error: sErr } = await admin
      .from('meeting_slots')
      .select(`
        id, start_time, end_time, parent_user_id, student_id, notes,
        meetings (
          id, title, meeting_date, location,
          establishment_id,
          staff (full_name)
        ),
        students (first_name, last_name)
      `)
      .eq('id', slotId)
      .maybeSingle()

    if (sErr || !slot) {
      return NextResponse.json({ error: 'الموعد غير موجود' }, { status: 404 })
    }

    // Vérifier que c'est bien le parent qui a réservé
    if (slot.parent_user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const meeting = (slot as any).meetings
    const student = (slot as any).students
    const teacher = meeting?.staff

    if (!meeting) {
      return NextResponse.json({ error: 'اللقاء غير موجود' }, { status: 404 })
    }

    // ═══ Check prefs ═══
    const { data: parentProfile } = await admin
      .from('user_profiles')
      .select('full_name, notification_preferences')
      .eq('user_id', user.id)
      .maybeSingle()

    const prefs = parentProfile?.notification_preferences || {}
    const emailPrefs = prefs.email || {}
    if (emailPrefs.meeting === false) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'email.meeting = false' })
    }

    // ═══ Email parent ═══
    const parentEmail = user.email
    if (!parentEmail) {
      return NextResponse.json({ sent: false, skipped: true, reason: 'لا يوجد إيميل' })
    }

    const { data: establishment } = await admin
      .from('establishments')
      .select('name, email')
      .eq('id', meeting.establishment_id)
      .single()

    const fmtTime = (t: string) => (t || '').slice(0, 5)
    const fmtDate = new Date(meeting.meeting_date).toLocaleDateString('fr-FR')

    const emailContent = meetingConfirmationEmail({
      parentName: parentProfile?.full_name || 'ولي الأمر',
      studentName: student ? `${student.first_name} ${student.last_name}` : '—',
      meetingTitle: meeting.title,
      meetingDate: fmtDate,
      startTime: fmtTime(slot.start_time),
      endTime: fmtTime(slot.end_time),
      location: meeting.location,
      teacherName: teacher?.full_name || null,
      schoolName: establishment?.name || 'المؤسسة',
    })

    const result = await sendEmail({
      to: parentEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      replyTo: establishment?.email || undefined,
      establishmentId: meeting.establishment_id,
      template: 'meeting_confirmation',
      metadata: {
        slot_id: slotId,
        meeting_id: meeting.id,
      },
    })

    return NextResponse.json({ sent: result.ok, failed: !result.ok, error: result.ok ? undefined : result.error })
  } catch (err: any) {
    console.error('[meeting-confirm]', err)
    return NextResponse.json({ error: err?.message || 'خطأ' }, { status: 500 })
  }
}