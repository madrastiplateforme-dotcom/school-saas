'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import path from 'path'

// ═══════════════════════════════════════════════════
// Fonts — Cairo (4 variants)
// ═══════════════════════════════════════════════════
const FONTS_DIR = path.resolve(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

// ═══════════════════════════════════════════════════
// Palette — même que SchoolCertificate
// ═══════════════════════════════════════════════════
const C = {
  navy: '#1e3a5f',
  gold: '#b8860b',
  lightGold: '#f5ecd7',
  gray: '#555',
  dark: '#1a1a1a',
  line: '#d4c9a8',
}

const EMERALD = '#059669'
const ORANGE = '#ea580c'
const ROSE = '#dc2626'
const AMBER = '#d97706'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Cairo',
    fontSize: 9,
    direction: 'rtl',
  },

  outerFrame: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 2.5,
    borderColor: C.navy,
    borderRadius: 4,
  },
  innerFrame: {
    position: 'absolute',
    top: 25,
    left: 25,
    right: 25,
    bottom: 25,
    borderWidth: 0.8,
    borderColor: C.gold,
    borderRadius: 2,
  },

  content: {
    padding: 40,
    paddingTop: 35,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 12,
  },
  logoBox: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: C.lightGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.gold,
  },
  logoImg: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  logoPlaceholder: {
    fontSize: 20,
    color: C.navy,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  kingdomAr: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  kingdomFr: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    marginTop: 1,
  },
  schoolAr: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    marginTop: 5,
  },
  schoolFr: {
    fontSize: 9,
    color: C.gray,
    textAlign: 'center',
    marginTop: 0.5,
    fontStyle: 'italic',
  },
  schoolMeta: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  headerRight: {
    width: 130,
    textAlign: 'left',
  },
  headerRightLine: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'left',
    marginBottom: 2,
  },
  headerRightStrong: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.navy,
  },

  // ─── Title ───
  titleBox: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  titleAr: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleFr: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  titleDivider: {
    width: 160,
    height: 1.5,
    backgroundColor: C.gold,
    marginTop: 6,
  },

  // ─── Student box ───
  studentBox: {
    flexDirection: 'row-reverse',
    backgroundColor: C.lightGold,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  studentItem: {
    width: '33.33%',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  studentLabel: {
    fontSize: 7.5,
    color: C.gray,
    textAlign: 'right',
    marginBottom: 1,
  },
  studentLabelFr: {
    fontSize: 6.5,
    color: C.gray,
    textAlign: 'right',
  },
  studentValue: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: C.navy,
    marginTop: 1.5,
    textAlign: 'right',
  },

  // ─── Table ───
  table: {
    borderWidth: 1,
    borderColor: C.navy,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: C.navy,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'dotted',
    paddingVertical: 5,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  cellSubject: {
    flex: 2.2,
    textAlign: 'right',
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 'bold',
    color: C.navy,
  },
  cellCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8.5,
    paddingHorizontal: 3,
    color: C.gray,
  },
  cellMoy: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: 'bold',
    paddingHorizontal: 3,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    backgroundColor: C.lightGold,
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.gold,
  },

  // ─── Summary cards ───
  summaryGrid: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 3,
    padding: 7,
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: C.navy,
  },
  summaryLabelAr: {
    fontSize: 7.5,
    color: C.gray,
    marginBottom: 1,
    textAlign: 'right',
  },
  summaryLabelFr: {
    fontSize: 6.5,
    color: C.gray,
    marginBottom: 3,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
  },
  summaryUnit: {
    fontSize: 7.5,
    color: C.gray,
    fontWeight: 'normal',
  },

  // ─── Decision ───
  decisionBox: {
    flexDirection: 'row-reverse',
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  decisionLabelAr: {
    fontSize: 9,
    color: C.gray,
    marginLeft: 6,
  },
  decisionLabelFr: {
    fontSize: 7,
    color: C.gray,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  decisionValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ─── Comment ───
  commentBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
    borderRadius: 3,
    padding: 8,
    minHeight: 42,
    marginBottom: 8,
    backgroundColor: '#fdfdf9',
  },
  commentLabelAr: {
    fontSize: 7.5,
    color: C.gray,
    marginBottom: 1,
    textAlign: 'right',
  },
  commentLabelFr: {
    fontSize: 6.5,
    color: C.gray,
    marginBottom: 3,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 9,
    color: C.dark,
    lineHeight: 1.5,
    textAlign: 'right',
  },

  // ─── Footer ───
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.gold,
  },
  footerBlock: {
    alignItems: 'center',
    width: '30%',
  },
  footerLabelAr: {
    fontSize: 8,
    color: C.navy,
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'center',
  },
  footerLabelFr: {
    fontSize: 6.5,
    color: C.gray,
    marginBottom: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerLine: {
    fontSize: 7,
    color: C.gray,
    textAlign: 'center',
  },

  pageNumber: {
    position: 'absolute',
    bottom: 12,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: C.gray,
  },
})

// ═══════════════════════════════════════════════════
// TYPES (same as before)
// ═══════════════════════════════════════════════════
export type BulletinSubjectRow = {
  subjectId: string
  subjectName: string
  subjectColor: string
  coefficient: number
  studentAverage: number | null
  classAverage: number | null
  weightedValue: number | null
  absentCount: number
}

export type BulletinStudent = {
  id: string
  fullName: string
  massarCode: string | null
  birthDate: string | null
  gender: string | null
}

export type BulletinData = {
  student: BulletinStudent
  subjects: BulletinSubjectRow[]
  overall: number | null
  rank: number | null
  classSize: number
  totalCoef: number
  totalWeighted: number
  absencesJustified: number
  absencesUnjustified: number
  lates: number
  behavior: string | null
  decision: string | null
  decisionNotes: string | null
  directorComment: string | null
}

export type Establishment = {
  name: string
  logo_url: string | null
  address: string | null
  city: string | null
  phone: string | null
}

type Props = {
  establishment: Establishment
  yearName: string
  termName: string
  className: string
  levelName: string | null
  gradeMax: number
  bulletins: BulletinData[]
}

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const formatDateFr = (d: Date) =>
  `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`

const autoDecision = (avg: number | null, gradeMax: number): string => {
  if (avg == null) return '—'
  const pass = gradeMax / 2
  if (avg >= pass) return 'مقبول'
  if (avg >= pass * 0.5) return 'استدراك'
  return 'يكرر السنة'
}

const decisionFrMap: Record<string, string> = {
  'مقبول': 'ADMIS',
  'استدراك': 'RATTRAPAGE',
  'يكرر السنة': 'REDOUBLE',
}

// ═══════════════════════════════════════════════════
// SINGLE PAGE
// ═══════════════════════════════════════════════════
function BulletinPage({
  establishment,
  yearName,
  termName,
  className,
  levelName,
  gradeMax,
  bulletin,
}: Omit<Props, 'bulletins'> & { bulletin: BulletinData }) {
  const { student, subjects, overall, rank, classSize, totalCoef, totalWeighted } = bulletin
  const pass = gradeMax / 2
  const overallPass = overall != null && overall >= pass
  const decision = bulletin.decision || autoDecision(overall, gradeMax)
  const decisionFr = decisionFrMap[decision] || decision

  const today = new Date()
  const todayAr = today.toLocaleDateString('fr-FR')
  const todayFr = formatDateFr(today)

  return (
    <Page size="A4" style={styles.page}>
      {/* Cadres décoratifs */}
      <View style={styles.outerFrame} />
      <View style={styles.innerFrame} />

      <View style={styles.content}>
        {/* ═══════ HEADER ═══════ */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {establishment.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={establishment.logo_url} style={styles.logoImg} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                {establishment.name.charAt(0)}
              </Text>
            )}
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.kingdomAr}>المملكة المغربية</Text>
            <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
            <Text style={styles.schoolAr}>{establishment.name}</Text>
            {establishment.address && (
              <Text style={styles.schoolMeta}>{establishment.address}</Text>
            )}
            <Text style={styles.schoolMeta}>
              {[establishment.city, establishment.phone].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.headerRightLine}>
              <Text style={styles.headerRightStrong}>السنة الدراسية: </Text>
              {yearName}
            </Text>
            <Text style={styles.headerRightLine}>
              <Text style={styles.headerRightStrong}>الفصل: </Text>
              {termName}
            </Text>
            <Text style={styles.headerRightLine}>
              <Text style={styles.headerRightStrong}>التاريخ: </Text>
              {todayAr}
            </Text>
          </View>
        </View>

        {/* ═══════ TITLE ═══════ */}
        <View style={styles.titleBox}>
          <Text style={styles.titleAr}>كشف نقط التلميذ(ة)</Text>
          <Text style={styles.titleFr}>BULLETIN DE NOTES</Text>
          <View style={styles.titleDivider} />
        </View>

        {/* ═══════ STUDENT ═══════ */}
        <View style={styles.studentBox}>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>الاسم الكامل</Text>
            <Text style={styles.studentLabelFr}>Nom complet</Text>
            <Text style={styles.studentValue}>{student.fullName}</Text>
          </View>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>رقم مسار</Text>
            <Text style={styles.studentLabelFr}>Code Massar</Text>
            <Text style={styles.studentValue}>{student.massarCode || '—'}</Text>
          </View>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>تاريخ الميلاد</Text>
            <Text style={styles.studentLabelFr}>Date de naissance</Text>
            <Text style={styles.studentValue}>{formatDate(student.birthDate)}</Text>
          </View>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>القسم</Text>
            <Text style={styles.studentLabelFr}>Classe</Text>
            <Text style={styles.studentValue}>{className}</Text>
          </View>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>المستوى</Text>
            <Text style={styles.studentLabelFr}>Niveau</Text>
            <Text style={styles.studentValue}>{levelName || '—'}</Text>
          </View>
          <View style={styles.studentItem}>
            <Text style={styles.studentLabel}>الجنس</Text>
            <Text style={styles.studentLabelFr}>Genre</Text>
            <Text style={styles.studentValue}>{student.gender || '—'}</Text>
          </View>
        </View>

        {/* ═══════ TABLE ═══════ */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2.2, textAlign: 'right' }]}>
              المادة / Matière
            </Text>
            <Text style={styles.tableHeaderCell}>المعامل{'\n'}Coef</Text>
            <Text style={styles.tableHeaderCell}>نقطة التلميذ{'\n'}Note élève</Text>
            <Text style={styles.tableHeaderCell}>معدل القسم{'\n'}Moy. classe</Text>
            <Text style={styles.tableHeaderCell}>ن × م{'\n'}N × C</Text>
          </View>

          {subjects.map((s, idx) => {
            const isPass = s.studentAverage != null && s.studentAverage >= pass
            return (
              <View
                key={s.subjectId}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.cellSubject, { color: s.subjectColor || C.navy }]}>
                  {s.subjectName}
                </Text>
                <Text style={styles.cellCenter}>{s.coefficient}</Text>
                <Text
                  style={[
                    styles.cellMoy,
                    {
                      color:
                        s.studentAverage == null
                          ? C.gray
                          : isPass
                          ? EMERALD
                          : ORANGE,
                    },
                  ]}
                >
                  {s.studentAverage != null ? s.studentAverage.toFixed(2) : '—'}
                </Text>
                <Text style={styles.cellCenter}>
                  {s.classAverage != null ? s.classAverage.toFixed(2) : '—'}
                </Text>
                <Text style={styles.cellCenter}>
                  {s.weightedValue != null ? s.weightedValue.toFixed(2) : '—'}
                </Text>
              </View>
            )
          })}

          <View style={styles.totalRow}>
            <Text style={[styles.cellSubject, { color: C.navy }]}>
              المجموع / Total
            </Text>
            <Text style={[styles.cellCenter, { fontWeight: 'bold', color: C.navy }]}>
              {totalCoef}
            </Text>
            <Text style={styles.cellCenter}>—</Text>
            <Text style={styles.cellCenter}>—</Text>
            <Text style={[styles.cellMoy, { color: C.navy }]}>
              {totalWeighted.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ═══════ SUMMARY ═══════ */}
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              {
                borderLeftColor: overallPass ? EMERALD : ORANGE,
                backgroundColor: overallPass ? '#f0fdf4' : '#fff7ed',
              },
            ]}
          >
            <Text style={styles.summaryLabelAr}>المعدل العام</Text>
            <Text style={styles.summaryLabelFr}>Moyenne générale</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: overallPass ? EMERALD : ORANGE },
              ]}
            >
              {overall != null ? overall.toFixed(2) : '—'}
              <Text style={styles.summaryUnit}> / {gradeMax}</Text>
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { borderLeftColor: AMBER, backgroundColor: '#fffbeb' },
            ]}
          >
            <Text style={styles.summaryLabelAr}>الرتبة في القسم</Text>
            <Text style={styles.summaryLabelFr}>Rang en classe</Text>
            <Text style={[styles.summaryValue, { color: AMBER }]}>
              {rank != null ? rank : '—'}
              <Text style={styles.summaryUnit}> / {classSize}</Text>
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { borderLeftColor: C.gray, backgroundColor: '#fafafa' },
            ]}
          >
            <Text style={styles.summaryLabelAr}>الغيابات (مبررة / غير مبررة)</Text>
            <Text style={styles.summaryLabelFr}>Absences (just. / non just.)</Text>
            <Text style={[styles.summaryValue, { color: C.gray }]}>
              {bulletin.absencesJustified}
              <Text style={styles.summaryUnit}> / </Text>
              {bulletin.absencesUnjustified}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { borderLeftColor: C.gray, backgroundColor: '#fafafa' },
            ]}
          >
            <Text style={styles.summaryLabelAr}>التأخيرات</Text>
            <Text style={styles.summaryLabelFr}>Retards</Text>
            <Text style={[styles.summaryValue, { color: C.gray }]}>
              {bulletin.lates}
            </Text>
          </View>
        </View>

        {/* ═══════ DECISION ═══════ */}
        <View
          style={[
            styles.decisionBox,
            {
              backgroundColor:
                decision === 'مقبول'
                  ? '#f0fdf4'
                  : decision === 'استدراك'
                  ? '#fff7ed'
                  : '#fef2f2',
              borderColor:
                decision === 'مقبول'
                  ? '#bbf7d0'
                  : decision === 'استدراك'
                  ? '#fed7aa'
                  : '#fecaca',
            },
          ]}
        >
          <Text style={styles.decisionLabelAr}>القرار:</Text>
          <Text style={styles.decisionLabelFr}>Décision :</Text>
          <Text
            style={[
              styles.decisionValue,
              {
                color:
                  decision === 'مقبول'
                    ? EMERALD
                    : decision === 'استدراك'
                    ? ORANGE
                    : ROSE,
              },
            ]}
          >
            {decision}
          </Text>
          <Text
            style={[
              styles.decisionValue,
              {
                fontSize: 10,
                marginLeft: 6,
                color:
                  decision === 'مقبول'
                    ? EMERALD
                    : decision === 'استدراك'
                    ? ORANGE
                    : ROSE,
              },
            ]}
          >
            ({decisionFr})
          </Text>

          {bulletin.behavior && (
            <>
              <Text style={[styles.decisionLabelAr, { marginLeft: 14 }]}>السلوك:</Text>
              <Text style={[styles.decisionValue, { color: C.gray, fontSize: 10 }]}>
                {bulletin.behavior}
              </Text>
            </>
          )}
        </View>

        {/* ═══════ COMMENT ═══════ */}
        <View style={styles.commentBox}>
          <Text style={styles.commentLabelAr}>ملاحظات المدير(ة)</Text>
          <Text style={styles.commentLabelFr}>Commentaires du Directeur</Text>
          <Text style={styles.commentText}>
            {bulletin.directorComment?.trim() ||
              bulletin.decisionNotes?.trim() ||
              ' '}
          </Text>
        </View>

        {/* ═══════ FOOTER ═══════ */}
        <View style={styles.footer}>
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabelAr}>التاريخ</Text>
            <Text style={styles.footerLabelFr}>Date</Text>
            <Text style={styles.footerLine}>{todayFr}</Text>
          </View>
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabelAr}>خاتم المدرسة</Text>
            <Text style={styles.footerLabelFr}>Cachet de l'école</Text>
            <Text style={styles.footerLine}> </Text>
          </View>
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabelAr}>توقيع المدير(ة)</Text>
            <Text style={styles.footerLabelFr}>Signature du Directeur</Text>
            <Text style={styles.footerLine}> </Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// ═══════════════════════════════════════════════════
// MAIN DOCUMENT
// ═══════════════════════════════════════════════════
export default function BulletinPDF({
  establishment,
  yearName,
  termName,
  className,
  levelName,
  gradeMax,
  bulletins,
}: Props) {
  return (
    <Document>
      {bulletins.map((b) => (
        <BulletinPage
          key={b.student.id}
          establishment={establishment}
          yearName={yearName}
          termName={termName}
          className={className}
          levelName={levelName}
          gradeMax={gradeMax}
          bulletin={b}
        />
      ))}
    </Document>
  )
}