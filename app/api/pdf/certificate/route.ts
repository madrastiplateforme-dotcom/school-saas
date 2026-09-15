import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { SchoolCertificatePDF } from '@/components/pdfs/SchoolCertificatePDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ترجمة أنواع الشهادات
const CERT_TYPE_FR: Record<string, string> = {
  'شهادة مدرسية': 'CERTIFICAT DE SCOLARITÉ',
  'شهادة التسجيل': "CERTIFICAT D'INSCRIPTION",
  'شهادة المغادرة': 'CERTIFICAT DE DÉPART',
  'شهادة النجاح': 'CERTIFICAT DE RÉUSSITE',
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatDateFr(d: Date): string {
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const certificateType = searchParams.get('type') || 'شهادة مدرسية'
    const purpose = searchParams.get('purpose') || null

    if (!studentId) {
      return NextResponse.json({ error: 'studentId مطلوب' }, { status: 400 })
    }

    // ── Auth ──
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
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id, roles(name)')
      .eq('user_id', user.id)
      .maybeSingle()

    const estabId = profile?.establishment_id
    if (!estabId) return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })

    const roleName = ((profile?.roles as any)?.name || '').toLowerCase()
    const isDirecteur = roleName.includes('directeur') || roleName.includes('مدير')
    const isSecretaire = roleName.includes('secr')
    const isParent = roleName.includes('parent')

    const admin = createAdminClient()

    // Check parent owns student
    if (isParent) {
      const { data: family } = await admin
        .from('families')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('establishment_id', estabId)
        .maybeSingle()

      if (!family) return NextResponse.json({ error: 'لا توجد عائلة' }, { status: 403 })

      const { data: ownership } = await admin
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('family_id', family.id)
        .maybeSingle()

      if (!ownership) {
        return NextResponse.json({ error: 'التلميذ غير موجود في عائلتك' }, { status: 403 })
      }
    } else if (!isDirecteur && !isSecretaire) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    // Student
    const { data: student } = await admin
      .from('students')
      .select('id, first_name, last_name, massar_code, birth_date, gender, establishment_id')
      .eq('id', studentId)
      .eq('establishment_id', estabId)
      .maybeSingle()

    if (!student) return NextResponse.json({ error: 'التلميذ غير موجود' }, { status: 404 })

    // Establishment
    const { data: establishment } = await admin
      .from('establishments')
      .select('name, address, phone, email')
      .eq('id', estabId)
      .single()

    // Current year
    const { data: year } = await admin
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', estabId)
      .eq('is_current', true)
      .maybeSingle()

    // Enrollment
    let cls: any = null
    if (year?.id) {
      const { data: enr } = await admin
        .from('enrollments')
        .select('classes(name, levels(name))')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .maybeSingle()
      cls = (enr as any)?.classes || null
    }

    const fullNameAr = `${student.first_name} ${student.last_name}`
    const today = new Date()
    const issueDateAr = today.toLocaleDateString('fr-MA')
    const issueDateFr = formatDateFr(today)

    const buffer = await renderToBuffer(
      SchoolCertificatePDF({
        data: {
          schoolName: establishment?.name || 'المؤسسة',
          schoolNameFr: null,
          schoolAddress: establishment?.address || null,
          schoolPhone: establishment?.phone || null,
          schoolEmail: establishment?.email || null,
          studentFullName: fullNameAr,
          studentFullNameFr: null,
          massarCode: student.massar_code,
          birthDate: student.birth_date,
          birthPlace: null,
          className: cls?.name || null,
          levelName: cls?.levels?.name || null,
          academicYear: year?.name || '—',
          certificateType: certificateType,
          certificateTypeFr: CERT_TYPE_FR[certificateType] || 'CERTIFICAT',
          purpose,
          issueDate: issueDateAr,
          issueDateFr: issueDateFr,
          directorName: null,
          referenceNumber: null,
        },
      }),
    )

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificate-${student.massar_code || studentId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[pdf-certificate]', error)
    return NextResponse.json(
      { error: error.message || 'فشل توليد الشهادة' },
      { status: 500 },
    )
  }
}