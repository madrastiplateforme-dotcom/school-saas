import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { registerPdfFonts } from '@/lib/pdf-fonts'

registerPdfFonts()
// ═══════════════════════════════════════════════════
// Colors
// ═══════════════════════════════════════════════════
const C = {
  navy: '#1e3a5f',
  gold: '#b8860b',
  lightGold: '#f5ecd7',
  gray: '#555',
  dark: '#1a1a1a',
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Cairo',
    fontSize: 11,
    direction: 'rtl',
  },

  outerFrame: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 3,
    borderColor: C.navy,
    borderRadius: 4,
  },
  innerFrame: {
    position: 'absolute',
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 2,
  },

  content: {
    padding: 50,
    paddingTop: 45,
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 8,
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerSide: {
    width: 130,
    textAlign: 'center',
  },
  kingdomAr: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 1,
  },
  kingdomFr: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  ministryAr: {
    fontSize: 9,
    color: C.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  ministryFr: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
    marginTop: 0.5,
  },
  schoolAr: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    marginTop: 8,
  },
  schoolFr: {
    fontSize: 10,
    color: C.gray,
    textAlign: 'center',
    marginTop: 1,
    fontStyle: 'italic',
  },
  sideInfoAr: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
  },
  sideInfoFr: {
    fontSize: 7.5,
    color: C.gray,
    textAlign: 'center',
    marginTop: 1,
  },

  // Title
  titleBox: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  titleAr: {
    fontSize: 26,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleFr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 3,
  },
  titleDivider: {
    width: 200,
    height: 2,
    backgroundColor: C.gold,
    marginTop: 12,
  },
  titleDividerSmall: {
    width: 100,
    height: 1,
    backgroundColor: C.navy,
    marginTop: 4,
  },

  // Intro
  introBox: {
    marginTop: 15,
    marginBottom: 12,
  },
  introAr: {
    fontSize: 12,
    color: C.dark,
    textAlign: 'right',
    lineHeight: 1.9,
  },
  introFr: {
    fontSize: 11,
    color: C.gray,
    textAlign: 'left',
    lineHeight: 1.7,
    marginTop: 3,
    fontStyle: 'italic',
  },

  // Info rows
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'dotted',
  },
  rowAlt: {
    backgroundColor: '#fafafa',
  },
  label: {
    width: 165,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
  },
  labelFr: {
    fontSize: 8,
    fontWeight: 'normal',
    color: C.gray,
    textAlign: 'right',
    marginTop: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: C.dark,
  },
  valueFr: {
    flex: 1,
    textAlign: 'left',
    fontSize: 9,
    color: C.gray,
    fontStyle: 'italic',
  },

  // Highlight
  highlight: {
    backgroundColor: C.lightGold,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 2,
  },
  highlightLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
  },
  highlightLabelFr: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'right',
    marginTop: 1,
  },
  highlightValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
    marginTop: 4,
  },
  highlightValueFr: {
    fontSize: 12,
    color: C.gray,
    textAlign: 'right',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Badge
  badge: {
    backgroundColor: C.navy,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 3,
  },
  badgeAr: {
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 1.5,
  },
  badgeFr: {
    fontSize: 9,
    color: '#f5ecd7',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Purpose
  purposeBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 3,
    borderRightColor: C.navy,
    borderRadius: 2,
  },
  purposeAr: {
    fontSize: 11,
    color: C.dark,
    textAlign: 'right',
    lineHeight: 1.8,
  },
  purposeFr: {
    fontSize: 9,
    color: C.gray,
    textAlign: 'left',
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.6,
  },

  // Footer
  footer: {
    marginTop: 25,
  },
  dateBlock: {
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  dateAr: {
    fontSize: 11,
    color: C.dark,
    textAlign: 'right',
  },
  dateFr: {
    fontSize: 9,
    color: C.gray,
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: 1,
  },
  signatureRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 30,
  },
  signatureBox: {
    alignItems: 'center',
    width: 180,
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
  },
  signatureLabelFr: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
    marginTop: 1,
    fontStyle: 'italic',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: C.navy,
    marginTop: 55,
  },
  signatureName: {
    fontSize: 10,
    color: C.gray,
    textAlign: 'center',
    marginTop: 3,
    fontStyle: 'italic',
  },
})

export type CertificateData = {
  schoolName: string
  schoolNameFr?: string | null
  schoolAddress?: string | null
  schoolPhone?: string | null
  schoolEmail?: string | null
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
}

export function SchoolCertificatePDF({ data }: { data: CertificateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Decorations */}
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerSide}>
              <Text style={styles.sideInfoAr}>المملكة المغربية</Text>
              <Text style={styles.sideInfoFr}>Royaume du Maroc</Text>
              <Text style={[styles.sideInfoAr, { marginTop: 6, fontSize: 7.5 }]}>
                وزارة التربية الوطنية
              </Text>
              <Text style={[styles.sideInfoFr, { fontSize: 6.5 }]}>
                Ministère de l'Éducation
              </Text>
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.kingdomAr}>{data.schoolName}</Text>
              {data.schoolNameFr && (
                <Text style={styles.kingdomFr}>{data.schoolNameFr}</Text>
              )}
              {data.schoolAddress && (
                <Text style={styles.ministryAr}>{data.schoolAddress}</Text>
              )}
              {(data.schoolPhone || data.schoolEmail) && (
                <Text style={styles.ministryFr}>
                  {[data.schoolPhone, data.schoolEmail].filter(Boolean).join(' • ')}
                </Text>
              )}
              <Text style={styles.schoolAr}>
                السنة الدراسية: {data.academicYear}
              </Text>
              <Text style={styles.schoolFr}>
                Année scolaire : {data.academicYear}
              </Text>
            </View>

            <View style={styles.headerSide}>
              {data.referenceNumber && (
                <>
                  <Text style={styles.sideInfoAr}>
                    المرجع: {data.referenceNumber}
                  </Text>
                  <Text style={styles.sideInfoFr}>
                    Réf : {data.referenceNumber}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>{data.certificateType}</Text>
            <Text style={styles.titleFr}>{data.certificateTypeFr}</Text>
            <View style={styles.titleDivider} />
            <View style={styles.titleDividerSmall} />
          </View>

          {/* INTRO */}
          <View style={styles.introBox}>
            <Text style={styles.introAr}>يشهد مدير المؤسسة أن التلميذ(ة):</Text>
            <Text style={styles.introFr}>
              Le Directeur certifie que l'élève :
            </Text>
          </View>

          {/* NAME */}
          <View style={styles.highlight}>
            <Text style={styles.highlightLabel}>الاسم الكامل</Text>
            <Text style={styles.highlightLabelFr}>Nom & Prénom</Text>
            <Text style={styles.highlightValue}>{data.studentFullName}</Text>
            {data.studentFullNameFr && (
              <Text style={styles.highlightValueFr}>
                {data.studentFullNameFr}
              </Text>
            )}
          </View>

          {/* DETAILS */}
          {data.massarCode && (
            <View style={styles.row}>
              <View style={{ width: 165 }}>
                <Text style={styles.label}>رقم مسار</Text>
                <Text style={styles.labelFr}>Code Massar</Text>
              </View>
              <Text style={styles.value}>{data.massarCode}</Text>
            </View>
          )}

          {data.birthDate && (
            <View style={[styles.row, styles.rowAlt]}>
              <View style={{ width: 165 }}>
                <Text style={styles.label}>تاريخ الازدياد</Text>
                <Text style={styles.labelFr}>Date de naissance</Text>
              </View>
              <Text style={styles.value}>{data.birthDate}</Text>
            </View>
          )}

          {data.birthPlace && (
            <View style={styles.row}>
              <View style={{ width: 165 }}>
                <Text style={styles.label}>مكان الازدياد</Text>
                <Text style={styles.labelFr}>Lieu de naissance</Text>
              </View>
              <Text style={styles.value}>{data.birthPlace}</Text>
            </View>
          )}

          {data.levelName && (
            <View style={[styles.row, styles.rowAlt]}>
              <View style={{ width: 165 }}>
                <Text style={styles.label}>المستوى الدراسي</Text>
                <Text style={styles.labelFr}>Niveau scolaire</Text>
              </View>
              <Text style={styles.value}>{data.levelName}</Text>
            </View>
          )}

          {data.className && (
            <View style={styles.row}>
              <View style={{ width: 165 }}>
                <Text style={styles.label}>القسم</Text>
                <Text style={styles.labelFr}>Classe</Text>
              </View>
              <Text style={styles.value}>{data.className}</Text>
            </View>
          )}

          {/* BADGE */}
          <View style={styles.badge}>
            <Text style={styles.badgeAr}>
              مسجل(ة) بهذه المؤسسة خلال السنة الدراسية {data.academicYear}
            </Text>
            <Text style={styles.badgeFr}>
              Inscrit(e) dans cet établissement pour l'année scolaire{' '}
              {data.academicYear}
            </Text>
          </View>

          {/* PURPOSE */}
          {data.purpose && (
            <View style={styles.purposeBox}>
              <Text style={styles.purposeAr}>
                وقد سُلِّمت له(ها) هذه الشهادة بناءً على طلبه(ها) للإدلاء بها عند
                الحاجة.
              </Text>
              <Text style={styles.purposeFr}>
                La présente attestation est délivrée à l'intéressé(e) pour servir
                et valoir ce que de droit.
              </Text>
              <Text
                style={[
                  styles.purposeAr,
                  { marginTop: 6, fontWeight: 'bold' },
                ]}
              >
                الغرض: {data.purpose}
              </Text>
              <Text
                style={[
                  styles.purposeFr,
                  { fontWeight: 'bold', fontStyle: 'normal' },
                ]}
              >
                Objet : {data.purpose}
              </Text>
            </View>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateAr}>
                حُرِّر بـ {data.schoolName}، في {data.issueDate}
              </Text>
              <Text style={styles.dateFr}>
                Fait à {data.schoolNameFr || data.schoolName}, le{' '}
                {data.issueDateFr || data.issueDate}
              </Text>
            </View>

            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>توقيع وخاتم المدير(ة)</Text>
                <Text style={styles.signatureLabelFr}>
                  Signature et cachet du Directeur
                </Text>
                <View style={styles.signatureLine} />
                {data.directorName && (
                  <Text style={styles.signatureName}>{data.directorName}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}