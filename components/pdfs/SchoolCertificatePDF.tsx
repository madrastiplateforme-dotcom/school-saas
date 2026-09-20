import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer'
import path from 'path'
import { registerPdfFonts } from '@/lib/pdf-fonts'

registerPdfFonts()

const C = {
  navy: '#1e3a5f',
  navyDark: '#0f2942',
  gold: '#b8860b',
  goldLight: '#d4a92f',
  lightGold: '#f5ecd7',
  cream: '#fbf8f1',
  gray: '#555',
  dark: '#1a1a1a',
  line: '#d4c9a8',
}

const MINISTRY_LOGO_PATH = path.resolve(
  process.cwd(), 'public', 'images', 'ministry-logo.png',
)

// ═══════════════════════════════════════════════════
// Contenu spécifique PAR TYPE
// ═══════════════════════════════════════════════════
type CertContent = {
  introAr: string
  introFr: string
  badgeAr: string
  badgeFr: string
  closingAr: string
  closingFr: string
  accent: string
  accentSoft: string
}

const CERT_CONTENT: Record<string, CertContent> = {
  'شهادة مدرسية': {
    introAr: 'يشهد مدير المؤسسة أن التلميذ(ة) المذكور(ة) أدناه مسجل(ة) بصفة نظامية بهذه المؤسسة خلال الموسم الدراسي الجاري.',
    introFr: "Le Directeur certifie que l'élève désigné(e) ci-dessous est régulièrement inscrit(e) dans cet établissement pour l'année scolaire en cours.",
    badgeAr: 'مسجل بصفة نظامية',
    badgeFr: 'Régulièrement inscrit(e)',
    closingAr: 'وسلمت له هذه الشهادة بناء على طلبه للإدلاء بها عند الحاجة.',
    closingFr: "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.",
    accent: '#1e3a5f',
    accentSoft: '#e8eff7',
  },
  'شهادة التسجيل': {
    introAr: 'يشهد مدير المؤسسة أن التلميذ(ة) المذكور(ة) أدناه تم تسجيله بنجاح بهذه المؤسسة برسم الموسم الدراسي الجاري.',
    introFr: "Le Directeur certifie que l'élève désigné(e) ci-dessous a été inscrit(e) avec succès dans cet établissement pour l'année scolaire en cours.",
    badgeAr: 'تم التسجيل بنجاح',
    badgeFr: 'Inscription confirmée',
    closingAr: 'وسلمت له هذه الشهادة للإدلاء بها عند الحاجة.',
    closingFr: "La présente attestation est délivrée pour servir et valoir ce que de droit.",
    accent: '#059669',
    accentSoft: '#e6f7f0',
  },
  'شهادة المغادرة': {
    introAr: 'يشهد مدير المؤسسة أن التلميذ(ة) المذكور(ة) أدناه كان مسجلا بهذه المؤسسة، وقد غادرها بصفة نظامية.',
    introFr: "Le Directeur certifie que l'élève désigné(e) ci-dessous était inscrit(e) dans cet établissement et l'a quitté régulièrement.",
    badgeAr: 'غادر المؤسسة بصفة نظامية',
    badgeFr: 'Départ régulier',
    closingAr: 'وسلمت له هذه الشهادة للمعلومات اللازمة.',
    closingFr: "La présente attestation est délivrée à titre informatif.",
    accent: '#dc2626',
    accentSoft: '#fdecec',
  },
  'شهادة النجاح': {
    introAr: 'يشهد مدير المؤسسة أن التلميذ(ة) المذكور(ة) أدناه اجتاز بنجاح الامتحانات المقررة برسم الموسم الدراسي الجاري.',
    introFr: "Le Directeur certifie que l'élève désigné(e) ci-dessous a réussi les examens de l'année scolaire en cours.",
    badgeAr: 'نجح بنجاح',
    badgeFr: 'Réussite confirmée',
    closingAr: 'وسلمت له هذه الشهادة للاستعمال فيما يخدم مصلحته.',
    closingFr: "La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.",
    accent: '#d97706',
    accentSoft: '#fdf3e3',
  },
}

const DEFAULT_CONTENT: CertContent = {
  introAr: 'يشهد مدير المؤسسة أن التلميذ(ة) المذكور(ة) أدناه مسجل بهذه المؤسسة.',
  introFr: "Le Directeur certifie que l'élève désigné(e) ci-dessous est inscrit(e) dans cet établissement.",
  badgeAr: 'مسجل',
  badgeFr: 'Inscrit(e)',
  closingAr: 'وسلمت له هذه الشهادة للإدلاء بها عند الحاجة.',
  closingFr: "La présente attestation est délivrée pour servir et valoir ce que de droit.",
  accent: '#1e3a5f',
  accentSoft: '#e8eff7',
}

// ═══════════════════════════════════════════════════
// Styles — ⚠️ SANS letterSpacing sur l'arabe
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Cairo',
    fontSize: 10,
    direction: 'rtl',
    backgroundColor: C.cream,
  },

  outerFrame: {
    position: 'absolute', top: 14, left: 14, right: 14, bottom: 14,
    borderWidth: 3, borderColor: C.navy, borderRadius: 4,
  },
  outerFrameInner: {
    position: 'absolute', top: 19, left: 19, right: 19, bottom: 19,
    borderWidth: 0.5, borderColor: C.gold, borderRadius: 2,
  },
  innerFrame: {
    position: 'absolute', top: 24, left: 24, right: 24, bottom: 24,
    borderWidth: 0.8, borderColor: C.navy, borderRadius: 2,
  },

  corner: { position: 'absolute', width: 22, height: 22 },
  cornerTL: { top: 28, left: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: C.gold },
  cornerTR: { top: 28, right: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: C.gold },
  cornerBL: { bottom: 28, left: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: C.gold },
  cornerBR: { bottom: 28, right: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: C.gold },

  watermark: {
    position: 'absolute', top: '32%', left: '25%',
    width: 250, height: 250, opacity: 0.05,
  },
  watermarkLetter: {
    position: 'absolute', top: '28%', left: 0, right: 0,
    fontSize: 260, fontWeight: 'bold', color: C.navy,
    textAlign: 'center', opacity: 0.04,
  },

  content: { padding: 40, paddingTop: 34 },

  // ═══ HEADER ═══
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 14,
  },
  headerLeft: { flex: 1, alignItems: 'flex-end' },
  headerCenter: { flex: 2, alignItems: 'center', paddingHorizontal: 12 },
  headerRight: { flex: 1, alignItems: 'flex-start' },

  ministryLogo: { width: 55, height: 55, marginTop: 4 },
  schoolLogoBox: {
    width: 60, height: 60, borderRadius: 6,
    backgroundColor: C.lightGold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.gold,
  },
  schoolLogoImg: { width: 60, height: 60, borderRadius: 6 },
  schoolLogoPlaceholder: { fontSize: 26, fontWeight: 'bold', color: C.navy },

  // ⚠️ ARABE : PAS de letterSpacing
  kingdomAr: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
    lineHeight: 1.5,
  },
  kingdomFr: {
    fontSize: 8, fontWeight: 'bold', color: C.navy,
    textAlign: 'right', marginTop: 1,
  },
  ministryAr: {
    fontSize: 8.5, color: C.gray, textAlign: 'right',
    marginTop: 3, lineHeight: 1.5,
  },
  ministryFr: {
    fontSize: 7, color: C.gray, textAlign: 'right', marginTop: 0.5,
  },

  schoolAr: {
    fontSize: 16, fontWeight: 'bold', color: C.navy,
    textAlign: 'center', lineHeight: 1.4,
  },
  schoolFr: {
    fontSize: 10, color: C.gold, textAlign: 'center',
    marginTop: 2, fontStyle: 'italic',
  },
  schoolMeta: {
    fontSize: 7.5, color: C.gray, textAlign: 'center',
    marginTop: 3, lineHeight: 1.4,
  },

  refBox: {
    borderWidth: 1, borderColor: C.gold, borderRadius: 3,
    paddingVertical: 4, paddingHorizontal: 8,
    marginTop: 6, backgroundColor: C.lightGold,
  },
  refLabelAr: {
    fontSize: 6.5, color: C.gray, textAlign: 'left',
    fontWeight: 'bold', lineHeight: 1.4,
  },
  refValue: {
    fontSize: 8.5, color: C.navy, textAlign: 'left',
    fontWeight: 'bold', marginTop: 1,
  },

  // ═══ TITLE ═══
  titleBox: { alignItems: 'center', marginTop: 10, marginBottom: 18 },
  titleAr: {
    fontSize: 24, fontWeight: 'bold', color: C.navy,
    textAlign: 'center', lineHeight: 1.3,
  },
  titleFr: {
    fontSize: 12, fontWeight: 'bold', color: C.gold,
    textAlign: 'center', letterSpacing: 2, marginTop: 4,
  },
  titleDividerRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginTop: 8, gap: 6,
  },
  titleDividerLine: { width: 80, height: 1.2, backgroundColor: C.gold },
  titleDividerStar: { fontSize: 12, color: C.gold },

  // ═══ INTRO ═══
  introBox: { marginBottom: 14, paddingHorizontal: 6 },
  introAr: {
    fontSize: 11.5, color: C.dark, textAlign: 'right',
    lineHeight: 1.9,
  },
  introFr: {
    fontSize: 9.5, color: C.gray, textAlign: 'left',
    lineHeight: 1.6, marginTop: 4, fontStyle: 'italic',
  },

  // ═══ NAME ═══
  nameBox: {
    backgroundColor: C.lightGold,
    borderWidth: 1.5, borderColor: C.gold,
    borderRadius: 4, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 14, borderRightWidth: 4, borderRightColor: C.gold,
  },
  nameLabelAr: {
    fontSize: 8, color: C.gray, textAlign: 'right',
    lineHeight: 1.5,
  },
  nameLabelFr: {
    fontSize: 7, color: C.gray, textAlign: 'right',
    marginTop: 0.5, fontStyle: 'italic',
  },
  nameValueAr: {
    fontSize: 17, fontWeight: 'bold', color: C.navy,
    textAlign: 'right', marginTop: 6, lineHeight: 1.5,
  },

  // ═══ DETAILS ═══
  detailsBox: {
    borderWidth: 1, borderColor: C.line, borderRadius: 3,
    marginBottom: 14, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 7, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'dotted', alignItems: 'center',
  },
  detailRowAlt: { backgroundColor: '#fafafa' },
  detailRowLast: {
    flexDirection: 'row-reverse',
    paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center',
  },
  detailLabelBox: { width: 180, textAlign: 'right' },
  detailLabelAr: {
    fontSize: 9.5, fontWeight: 'bold', color: C.navy,
    textAlign: 'right', lineHeight: 1.5,
  },
  detailLabelFr: {
    fontSize: 7.5, color: C.gray, textAlign: 'right', marginTop: 0.5,
  },
  detailValue: {
    flex: 1, fontSize: 11, color: C.dark,
    textAlign: 'right', fontWeight: 'bold', lineHeight: 1.5,
  },

  // ═══ BADGE ═══
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 6, marginBottom: 14,
    borderWidth: 1.5, alignSelf: 'center',
  },
  badgeIcon: { fontSize: 14 },
  badgeAr: {
    fontSize: 12, fontWeight: 'bold',
    textAlign: 'center', lineHeight: 1.5,
  },
  badgeFr: {
    fontSize: 8.5, textAlign: 'center',
    marginTop: 1, fontStyle: 'italic',
  },

  // ═══ PURPOSE ═══
  purposeBox: {
    backgroundColor: C.cream,
    borderWidth: 1, borderColor: C.line,
    borderStyle: 'dashed', borderRadius: 3,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 14,
  },
  purposeLabelAr: {
    fontSize: 8, color: C.gray, textAlign: 'right',
    fontWeight: 'bold', lineHeight: 1.5,
  },
  purposeLabelFr: {
    fontSize: 7, color: C.gray, textAlign: 'right',
    fontStyle: 'italic', marginTop: 0.5,
  },
  purposeValue: {
    fontSize: 11, color: C.navy, textAlign: 'right',
    fontWeight: 'bold', marginTop: 4, lineHeight: 1.6,
  },

  // ═══ CLOSING ═══
  closingBox: { marginBottom: 16, paddingHorizontal: 6 },
  closingAr: {
    fontSize: 10.5, color: C.dark, textAlign: 'right',
    lineHeight: 1.8,
  },
  closingFr: {
    fontSize: 9, color: C.gray, textAlign: 'left',
    lineHeight: 1.5, marginTop: 3, fontStyle: 'italic',
  },

  // ═══ FOOTER ═══
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.gold,
  },
  footerLeft: { flex: 1, alignItems: 'flex-end' },
  footerCenter: { flex: 1, alignItems: 'center' },
  footerRight: { flex: 1, alignItems: 'flex-start' },

  qrImg: { width: 68, height: 68 },
  qrCaption: {
    fontSize: 6, color: C.gray, textAlign: 'center',
    marginTop: 2, lineHeight: 1.4,
  },

  placeTextAr: {
    fontSize: 9.5, color: C.dark,
    textAlign: 'center', lineHeight: 1.6,
  },
  placeTextFr: {
    fontSize: 8, color: C.gray, textAlign: 'center',
    marginTop: 2, fontStyle: 'italic',
  },

  signatureBlock: { alignItems: 'center', minWidth: 160 },
  signatureLabelAr: {
    fontSize: 9.5, fontWeight: 'bold', color: C.navy,
    textAlign: 'center', lineHeight: 1.5,
  },
  signatureLabelFr: {
    fontSize: 7, color: C.gray, textAlign: 'center',
    marginTop: 1, fontStyle: 'italic',
  },
  signatureLine: {
    width: 150, borderTopWidth: 1,
    borderTopColor: C.navy, marginTop: 42,
  },
  signatureName: {
    fontSize: 9.5, color: C.navy, textAlign: 'center',
    marginTop: 4, fontWeight: 'bold', lineHeight: 1.5,
  },
  signatureNameFr: {
    fontSize: 7, color: C.gray, textAlign: 'center',
    marginTop: 1, fontStyle: 'italic',
  },

  legalNote: {
    marginTop: 12, paddingTop: 8,
    borderTopWidth: 0.5, borderTopColor: C.line,
    fontSize: 6.5, color: C.gray, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 1.5,
  },
})

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
export type CertificateData = {
  schoolName: string
  schoolNameFr?: string | null
  schoolAddress?: string | null
  schoolPhone?: string | null
  schoolEmail?: string | null
  schoolLogoUrl?: string | null
  schoolCity?: string | null
  studentFullName: string
  studentFullNameFr?: string | null
  massarCode?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  className?: string | null
  levelName?: string | null
  academicYear: string
  certificateType: string
  certificateTypeFr: string
  purpose?: string | null
  issueDate: string
  issueDateFr?: string | null
  directorName?: string | null
  referenceNumber?: string | null
  qrCodeUrl?: string | null
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try {
    const date = new Date(d)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${date.getFullYear()}`
  } catch {
    return d
  }
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════
export function SchoolCertificatePDF({ data }: { data: CertificateData }) {
  const content = CERT_CONTENT[data.certificateType] || DEFAULT_CONTENT

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        {/* Watermark */}
        {data.schoolLogoUrl ? (
          <Image src={data.schoolLogoUrl} style={styles.watermark} />
        ) : (
          <Text style={styles.watermarkLetter}>
            {(data.schoolName || 'م').charAt(0)}
          </Text>
        )}

        {/* Cadres */}
        <View style={styles.outerFrame} />
        <View style={styles.outerFrameInner} />
        <View style={styles.innerFrame} />

        {/* Coins décoratifs */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.kingdomAr}>المملكة المغربية</Text>
              <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
              <Text style={styles.ministryAr}>وزارة التربية الوطنية</Text>
              <Text style={styles.ministryFr}>Ministère de l'Éducation Nationale</Text>
              <Image src={MINISTRY_LOGO_PATH} style={styles.ministryLogo} />
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.schoolAr}>{data.schoolName}</Text>
              {data.schoolNameFr && (
                <Text style={styles.schoolFr}>{data.schoolNameFr}</Text>
              )}
              {data.schoolAddress && (
                <Text style={styles.schoolMeta}>{data.schoolAddress}</Text>
              )}
              {(data.schoolPhone || data.schoolEmail) && (
                <Text style={styles.schoolMeta}>
                  {[data.schoolPhone, data.schoolEmail].filter(Boolean).join(' • ')}
                </Text>
              )}
              <Text style={styles.schoolMeta}>
                السنة الدراسية : {data.academicYear}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.schoolLogoBox}>
                {data.schoolLogoUrl ? (
                  <Image src={data.schoolLogoUrl} style={styles.schoolLogoImg} />
                ) : (
                  <Text style={styles.schoolLogoPlaceholder}>
                    {(data.schoolName || 'م').charAt(0)}
                  </Text>
                )}
              </View>
              {data.referenceNumber && (
                <View style={styles.refBox}>
                  <Text style={styles.refLabelAr}>رقم المرجع</Text>
                  <Text style={[styles.refValue, { textAlign: 'left' }]}>{data.referenceNumber}</Text>
                </View>
              )}
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>{data.certificateType}</Text>
            <Text style={styles.titleFr}>{data.certificateTypeFr}</Text>
            <View style={styles.titleDividerRow}>
              <View style={styles.titleDividerLine} />
              <Text style={styles.titleDividerStar}>✦</Text>
              <View style={styles.titleDividerLine} />
            </View>
          </View>

          {/* INTRO */}
          <View style={styles.introBox}>
            <Text style={styles.introAr}>{content.introAr}</Text>
            <Text style={styles.introFr}>{content.introFr}</Text>
          </View>

          {/* NOM */}
          <View style={styles.nameBox}>
            <Text style={styles.nameLabelAr}>الاسم الكامل للتلميذ</Text>
            <Text style={styles.nameLabelFr}>Nom complet de l'élève</Text>
            <Text style={styles.nameValueAr}>{data.studentFullName}</Text>
            {data.studentFullNameFr && (
              <Text style={[styles.nameValueAr, { fontSize: 13, marginTop: 4, color: C.gray, fontWeight: 'normal' }]}>
                {data.studentFullNameFr}
              </Text>
            )}
          </View>

          {/* DETAILS */}
          <View style={styles.detailsBox}>
            {data.massarCode && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelBox}>
                  <Text style={styles.detailLabelAr}>رقم مسار</Text>
                  <Text style={styles.detailLabelFr}>Code Massar</Text>
                </View>
                <Text style={[styles.detailValue, { fontFamily: 'Cairo', textAlign: 'left' }]}>
                  {data.massarCode}
                </Text>
              </View>
            )}
            {data.birthDate && (
              <View style={[styles.detailRow, styles.detailRowAlt]}>
                <View style={styles.detailLabelBox}>
                  <Text style={styles.detailLabelAr}>تاريخ الازدياد</Text>
                  <Text style={styles.detailLabelFr}>Date de naissance</Text>
                </View>
                <Text style={styles.detailValue}>{formatDate(data.birthDate)}</Text>
              </View>
            )}
            {data.className && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelBox}>
                  <Text style={styles.detailLabelAr}>القسم</Text>
                  <Text style={styles.detailLabelFr}>Classe</Text>
                </View>
                <Text style={styles.detailValue}>{data.className}</Text>
              </View>
            )}
            {data.levelName && (
              <View style={[styles.detailRow, styles.detailRowAlt]}>
                <View style={styles.detailLabelBox}>
                  <Text style={styles.detailLabelAr}>المستوى الدراسي</Text>
                  <Text style={styles.detailLabelFr}>Niveau scolaire</Text>
                </View>
                <Text style={styles.detailValue}>{data.levelName}</Text>
              </View>
            )}
            <View style={styles.detailRowLast}>
              <View style={styles.detailLabelBox}>
                <Text style={styles.detailLabelAr}>الموسم الدراسي</Text>
                <Text style={styles.detailLabelFr}>Année scolaire</Text>
              </View>
              <Text style={styles.detailValue}>{data.academicYear}</Text>
            </View>
          </View>

          {/* BADGE */}
          <View style={[styles.badge, { backgroundColor: content.accentSoft, borderColor: content.accent }]}>
            <View>
              <Text style={[styles.badgeAr, { color: content.accent }]}>
                ✓ {content.badgeAr}
              </Text>
              <Text style={[styles.badgeFr, { color: content.accent }]}>
                {content.badgeFr}
              </Text>
            </View>
          </View>

          {/* PURPOSE */}
          {data.purpose && (
            <View style={styles.purposeBox}>
              <Text style={styles.purposeLabelAr}>الغرض من الشهادة</Text>
              <Text style={styles.purposeLabelFr}>Objet de l'attestation</Text>
              <Text style={styles.purposeValue}>{data.purpose}</Text>
            </View>
          )}

          {/* CLOSING */}
          <View style={styles.closingBox}>
            <Text style={styles.closingAr}>{content.closingAr}</Text>
            <Text style={styles.closingFr}>{content.closingFr}</Text>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {data.qrCodeUrl && (
                <>
                  <Image src={data.qrCodeUrl} style={styles.qrImg} />
                  <Text style={styles.qrCaption}>امسح للتحقق</Text>
                </>
              )}
            </View>

            <View style={styles.footerCenter}>
              <Text style={styles.placeTextAr}>
                حرر بـ {data.schoolCity || data.schoolName}، في {data.issueDate}
              </Text>
              <Text style={styles.placeTextFr}>
                Fait à {data.schoolCity || data.schoolName}, le {data.issueDateFr || data.issueDate}
              </Text>
            </View>

            <View style={styles.footerRight}>
              <View style={styles.signatureBlock}>
                <Text style={styles.signatureLabelAr}>توقيع وخاتم المدير</Text>
                <Text style={styles.signatureLabelFr}>Signature et cachet du Directeur</Text>
                <View style={styles.signatureLine} />
                {data.directorName && (
                  <>
                    <Text style={styles.signatureName}>{data.directorName}</Text>
                    <Text style={styles.signatureNameFr}>Directeur / Directrice</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* NOTE LÉGALE */}
          {data.referenceNumber && (
            <Text style={styles.legalNote}>
              للتحقق من صحة هذه الشهادة، امسح رمز QR أو زر الموقع الرسمي للمؤسسة — Réf : {data.referenceNumber}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}