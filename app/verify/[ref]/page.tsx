import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'
import {
  ShieldCheck, ShieldAlert, ShieldX, Calendar, GraduationCap,
  BookOpen, Hash, User, FileText, AlertCircle, Home,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Certificate = {
  reference_number: string
  certificate_type: string
  certificate_type_fr: string | null
  student_full_name: string
  massar_code: string | null
  class_name: string | null
  level_name: string | null
  academic_year: string | null
  purpose: string | null
  issued_at: string
  status: string
  revoked_at: string | null
  revoked_reason: string | null
  establishments: { name: string; city: string | null } | null
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} - ${hh}:${mm}`
  } catch {
    return iso
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const referenceNumber = decodeURIComponent(ref || '').trim()

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('certificates')
    .select(`
      reference_number,
      certificate_type,
      certificate_type_fr,
      student_full_name,
      massar_code,
      class_name,
      level_name,
      academic_year,
      purpose,
      issued_at,
      status,
      revoked_at,
      revoked_reason,
      establishments ( name, city )
    `)
    .eq('reference_number', referenceNumber)
    .maybeSingle()

  const certificate = (data as unknown) as Certificate | null

  // ── NOT FOUND ──
  if (error || !certificate) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">شهادة غير موجودة</h1>
          <p className="text-slate-500 text-sm mb-6">
            لم نتمكن من العثور على أي شهادة بهذا الرقم المرجعي.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              الرقم المرجعي
            </p>
            <code className="text-sm font-mono text-slate-700 break-all" dir="ltr">
              {referenceNumber || '—'}
            </code>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Home className="h-4 w-4" />
            الصفحة الرئيسية
          </Link>
        </div>
      </main>
    )
  }

  // ── REVOKED ──
  const isRevoked = certificate.status === 'revoked'

  if (isRevoked) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">شهادة ملغاة</h1>
          <p className="text-slate-500 text-sm mb-6">
            هذه الشهادة صادرة من نظامنا ولكن تم إلغاؤها.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-right mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">معلومات الإلغاء</p>
                <p>التاريخ: {certificate.revoked_at ? formatDate(certificate.revoked_at) : '—'}</p>
                {certificate.revoked_reason && (
                  <p className="mt-1">السبب: {certificate.revoked_reason}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              الرقم المرجعي
            </p>
            <code className="text-sm font-mono text-slate-700 break-all" dir="ltr">
              {certificate.reference_number}
            </code>
          </div>
        </div>
      </main>
    )
  }

  // ── VALID ──
  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success badge */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <ShieldCheck className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-700 mb-1">✓ شهادة صحيحة</h1>
          <p className="text-slate-500 text-sm">
            هذه الشهادة صادرة رسمياً من نظام {certificate.establishments?.name || 'المؤسسة'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-indigo-600 to-indigo-700 px-6 py-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  المؤسسة
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {certificate.establishments?.name || '—'}
                </p>
                {certificate.establishments?.city && (
                  <p className="text-xs opacity-90 mt-0.5">{certificate.establishments.city}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  النوع
                </p>
                <p className="text-sm font-bold mt-0.5">{certificate.certificate_type}</p>
                {certificate.certificate_type_fr && (
                  <p className="text-[10px] opacity-80" dir="ltr">
                    {certificate.certificate_type_fr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Reference */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  الرقم المرجعي
                </span>
              </div>
              <code
                className="text-base font-mono font-bold text-indigo-700 break-all"
                dir="ltr"
              >
                {certificate.reference_number}
              </code>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="التلميذ"
                value={certificate.student_full_name}
              />
              {certificate.massar_code && (
                <InfoRow
                  icon={<Hash className="h-4 w-4" />}
                  label="رقم مسار"
                  value={certificate.massar_code}
                  mono
                />
              )}
              {certificate.level_name && (
                <InfoRow
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="المستوى"
                  value={certificate.level_name}
                />
              )}
              {certificate.class_name && (
                <InfoRow
                  icon={<BookOpen className="h-4 w-4" />}
                  label="القسم"
                  value={certificate.class_name}
                />
              )}
              {certificate.academic_year && (
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="السنة الدراسية"
                  value={certificate.academic_year}
                />
              )}
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="تاريخ الإصدار"
                value={formatDate(certificate.issued_at)}
              />
            </div>

            {/* Purpose */}
            {certificate.purpose && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    الغرض
                  </span>
                </div>
                <p className="text-sm text-blue-900">{certificate.purpose}</p>
              </div>
            )}

            {/* Verified stamp */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  تم التحقق بنجاح
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  هذه الشهادة مطابقة للسجل الرسمي فقاعدة بيانات المؤسسة.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 text-center">
            <p className="text-xs text-slate-500">
              للتحقق من صحة أي شهادة، امسح رمز QR المطبوع على الشهادة الأصلية.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-sm font-bold text-slate-800 ${mono ? 'font-mono' : ''}`}
        dir={mono ? 'ltr' : 'rtl'}
      >
        {value}
      </p>
    </div>
  )
}