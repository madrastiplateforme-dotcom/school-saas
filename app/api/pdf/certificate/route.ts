import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import QRCode from 'qrcode'
import { SchoolCertificatePDF } from '@/components/pdfs/SchoolCertificatePDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      .select('establishment_id, role_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const estabId = profile?.establishment_id
    if (!estabId) return NextResponse.json({ error: 'لا توجد مؤسسة' }, { status: 403 })

    // Get role name (query séparée, R1)
    let roleName = ''
    if (profile?.role_id) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', profile.role_id)
        .maybeSingle()
      roleName = (roleData?.name || '').toLowerCase()
    }

    const isDirecteur = roleName.includes('directeur') || roleName.includes('مدير')
    const isSecretaire = roleName.includes('secr')
    const isParent = roleName.includes('parent')

    const admin = createAdminClient()

    // Check parent ownership
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

    // ── Student ──
    const { data: student } = await admin
      .from('students')
      .select('id, first_name, last_name, massar_code, birth_date, gender, establishment_id')
      .eq('id', studentId)
      .eq('establishment_id', estabId)
      .maybeSingle()

    if (!student) return NextResponse.json({ error: 'التلميذ غير موجود' }, { status: 404 })

    // ── Establishment (avec logo + city) ──
    const { data: establishment } = await admin
      .from('establishments')
      .select('name, address, phone, email, logo_url, city')
      .eq('id', estabId)
      .single()

    // ── Current year ──
    const { data: year } = await admin
      .from('academic_years')
      .select('id, name')
      .eq('establishment_id', estabId)
      .eq('is_current', true)
      .maybeSingle()

    // ── Enrollment → class + level ──
    let className: string | null = null
    let levelName: string | null = null

    if (year?.id) {
      const { data: enr } = await admin
        .from('enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('academic_year_id', year.id)
        .maybeSingle()

      if (enr?.class_id) {
        const { data: cls } = await admin
          .from('classes')
          .select('name, level_id')
          .eq('id', enr.class_id)
          .maybeSingle()

        className = cls?.name || null

        if (cls?.level_id) {
          const { data: lvl } = await admin
            .from('levels')
            .select('name')
            .eq('id', cls.level_id)
            .maybeSingle()
          levelName = lvl?.name || null
        }
      }
    }

    // ── Director name (premier directeur de l'établissement) ──
    let directorName: string | null = null
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, full_name, role_id')
      .eq('establishment_id', estabId)

    if (profiles && profiles.length > 0) {
      const roleIds = Array.from(
        new Set(profiles.map((p: any) => p.role_id).filter(Boolean)),
      ) as string[]

      const { data: rolesList } = await admin
        .from('roles')
        .select('id, name')
        .in('id', roleIds)

      const roleMap = new Map((rolesList || []).map((r: any) => [r.id, (r.name || '').toLowerCase()]))

      const director = profiles.find((p: any) => {
        const n = roleMap.get(p.role_id) || ''
        return n.includes('directeur') || n.includes('director') || n.includes('مدير')
      })

      directorName = director?.full_name || null
    }

    // ── Reference number ──
    const now = new Date()
    const yearStr = now.getFullYear()
    const typeCode = {
      'شهادة مدرسية': 'SCOL',
      'شهادة التسجيل': 'INSC',
      'شهادة المغادرة': 'DEP',
      'شهادة النجاح': 'REU',
    }[certificateType] || 'CERT'
    const uniquePart = (student.massar_code || student.id)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase()
    const referenceNumber = `CERT-${typeCode}-${yearStr}-${uniquePart}`

    // ── ✅ NOUVEAU: Enregistrer le certificat en DB (pour vérification QR) ──
    const { error: certInsertError } = await admin
      .from('certificates')
      .upsert(
        {
          reference_number: referenceNumber,
          establishment_id: estabId,
          student_id: studentId,
          certificate_type: certificateType,
          certificate_type_fr: CERT_TYPE_FR[certificateType] || 'CERTIFICAT',
          purpose,
          student_full_name: `${student.first_name} ${student.last_name}`,
          massar_code: student.massar_code,
          class_name: className,
          level_name: levelName,
          academic_year: year?.name || null,
          issued_by: user.id,
          status: 'valid',
        },
        { onConflict: 'reference_number', ignoreDuplicates: true },
      )

    if (certInsertError) {
      // Fail-soft: on log mais on continue à générer le PDF
      console.warn('[certificate] DB insert failed:', certInsertError.message)
    }

    // ── QR Code (URL de vérification) ──
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const verifyUrl = `${siteUrl}/verify/${referenceNumber}`
    let qrDataUrl: string | null = null
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1e3a5f', light: '#ffffff' },
      })
    } catch (e: any) {
      console.warn('[certificate] QR generation failed:', e?.message || e)
    }

    // ── Dates ──
    const fullNameAr = `${student.first_name} ${student.last_name}`
    const issueDateAr = now.toLocaleDateString('fr-MA')
    const issueDateFr = formatDateFr(now)

    const buffer = await renderToBuffer(
      SchoolCertificatePDF({
        data: {
          schoolName: establishment?.name || 'المؤسسة',
          schoolNameFr: null,
          schoolAddress: establishment?.address || null,
          schoolPhone: establishment?.phone || null,
          schoolEmail: establishment?.email || null,
          schoolLogoUrl: establishment?.logo_url || null,
          schoolCity: establishment?.city || null,
          studentFullName: fullNameAr,
          studentFullNameFr: null,
          massarCode: student.massar_code,
          birthDate: student.birth_date,
          birthPlace: null,
          className,
          levelName,
          academicYear: year?.name || '—',
          certificateType,
          certificateTypeFr: CERT_TYPE_FR[certificateType] || 'CERTIFICAT',
          purpose,
          issueDate: issueDateAr,
          issueDateFr,
          directorName,
          referenceNumber,
          qrCodeUrl: qrDataUrl,
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
    console.error('[pdf-certificate]', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'فشل توليد الشهادة' },
      { status: 500 },
    )
  }
}