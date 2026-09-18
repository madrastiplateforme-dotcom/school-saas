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
import { registerPdfFonts } from '@/lib/pdf-fonts'

registerPdfFonts()

// ═══════════════════════════════════════════════════
// Palette
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

// ═══════════════════════════════════════════════════
// 🎯 DYNAMIC SIZING — fit 1 page if possible, else 2
// ═══════════════════════════════════════════════════
function getDynamicSizes(subjectCount: number) {
  // Paliers : plus il y a de matières, plus on réduit
  if (subjectCount <= 8) {
    return {
      pagePadding: 0,
      contentPadding: 40,
      contentPaddingTop: 35,
      fontSize: 9,
      tableRowPadding: 5,
      titleSize: 20,
      titleFrSize: 11,
      headerMargin: 12,
      titleMarginTop: 8,
      titleMarginBottom: 12,
      studentPadding: 8,
      studentMarginBottom: 10,
      summaryPadding: 7,
      summaryMarginBottom: 8,
      decisionPadding: 8,
      decisionMarginBottom: 8,
      commentPadding: 8,
      commentMinHeight: 42,
      commentMarginBottom: 8,
      footerMarginTop: 8,
      footerPaddingTop: 8,
      cellSubjectFont: 9,
      cellMoyFont: 9.5,
      cellCenterFont: 8.5,
      tableHeaderPadding: 6,
    }
  }
  if (subjectCount <= 12) {
    return {
      pagePadding: 0,
      contentPadding: 32,
      contentPaddingTop: 28,
      fontSize: 8.5,
      tableRowPadding: 4,
      titleSize: 18,
      titleFrSize: 10,
      headerMargin: 10,
      titleMarginTop: 6,
      titleMarginBottom: 10,
      studentPadding: 6,
      studentMarginBottom: 8,
      summaryPadding: 6,
      summaryMarginBottom: 6,
      decisionPadding: 6,
      decisionMarginBottom: 6,
      commentPadding: 6,
      commentMinHeight: 34,
      commentMarginBottom: 6,
      footerMarginTop: 6,
      footerPaddingTop: 6,
      cellSubjectFont: 8.5,
      cellMoyFont: 9,
      cellCenterFont: 8,
      tableHeaderPadding: 5,
    }
  }
  if (subjectCount <= 15) {
    return {
      pagePadding: 0,
      contentPadding: 26,
      contentPaddingTop: 22,
      fontSize: 8,
      tableRowPadding: 3,
      titleSize: 16,
      titleFrSize: 9,
      headerMargin: 8,
      titleMarginTop: 4,
      titleMarginBottom: 8,
      studentPadding: 5,
      studentMarginBottom: 6,
      summaryPadding: 5,
      summaryMarginBottom: 5,
      decisionPadding: 5,
      decisionMarginBottom: 5,
      commentPadding: 5,
      commentMinHeight: 28,
      commentMarginBottom: 5,
      footerMarginTop: 4,
      footerPaddingTop: 4,
      cellSubjectFont: 8,
      cellMoyFont: 8.5,
      cellCenterFont: 7.5,
      tableHeaderPadding: 4,
    }
  }
  // > 15 → on accepte 2 pages
  return {
    pagePadding: 0,
    contentPadding: 22,
    contentPaddingTop: 18,
    fontSize: 7.5,
    tableRowPadding: 2.5,
    titleSize: 15,
    titleFrSize: 8.5,
    headerMargin: 6,
    titleMarginTop: 3,
    titleMarginBottom: 6,
    studentPadding: 4,
    studentMarginBottom: 5,
    summaryPadding: 4,
    summaryMarginBottom: 4,
    decisionPadding: 4,
    decisionMarginBottom: 4,
    commentPadding: 4,
    commentMinHeight: 24,
    commentMarginBottom: 4,
    footerMarginTop: 3,
    footerPaddingTop: 3,
    cellSubjectFont: 7.5,
    cellMoyFont: 8,
    cellCenterFont: 7,
    tableHeaderPadding: 3.5,
  }
}

// ═══════════════════════════════════════════════════
// TYPES
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

  // 🎯 Calcule la taille dynamique selon le nombre de matières
  const S = getDynamicSizes(subjects.length)

  const styles = StyleSheet.create({
    page: {
      padding: S.pagePadding,
      fontFamily: 'Cairo',
      fontSize: S.fontSize,
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
      padding: S.contentPadding,
      paddingTop: S.contentPaddingTop,
    },

    header: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: C.navy,
      marginBottom: S.headerMargin,
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
    logoImg: { width: 50, height: 50, borderRadius: 6 },
    logoPlaceholder: { fontSize: 20, color: C.navy, fontWeight: 'bold' },
    headerCenter: { flex: 1, textAlign: 'center', paddingHorizontal: 12 },
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
    headerRight: { width: 130, textAlign: 'left' },
    headerRightLine: { fontSize: 8, color: C.gray, textAlign: 'left', marginBottom: 2 },
    headerRightStrong: { fontSize: 8, fontWeight: 'bold', color: C.navy },

    titleBox: {
      alignItems: 'center',
      marginTop: S.titleMarginTop,
      marginBottom: S.titleMarginBottom,
    },
    titleAr: {
      fontSize: S.titleSize,
      fontWeight: 'bold',
      color: C.navy,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    titleFr: {
      fontSize: S.titleFrSize,
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

    studentBox: {
      flexDirection: 'row-reverse',
      backgroundColor: C.lightGold,
      borderLeftWidth: 3,
      borderLeftColor: C.gold,
      borderRadius: 3,
      padding: S.studentPadding,
      marginBottom: S.studentMarginBottom,
      flexWrap: 'wrap',
    },
    studentItem: { width: '33.33%', paddingVertical: 3, paddingHorizontal: 4 },
    studentLabel: {
      fontSize: 7.5,
      color: C.gray,
      textAlign: 'right',
      marginBottom: 1,
    },
    studentLabelFr: { fontSize: 6.5, color: C.gray, textAlign: 'right' },
    studentValue: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: C.navy,
      marginTop: 1.5,
      textAlign: 'right',
    },

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
      paddingVertical: S.tableHeaderPadding,
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
      paddingVertical: S.tableRowPadding,
      alignItems: 'center',
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    cellSubject: {
      flex: 2.2,
      textAlign: 'right',
      paddingHorizontal: 6,
      fontSize: S.cellSubjectFont,
      fontWeight: 'bold',
      color: C.navy,
    },
    cellCenter: {
      flex: 1,
      textAlign: 'center',
      fontSize: S.cellCenterFont,
      paddingHorizontal: 3,
      color: C.gray,
    },
    cellMoy: {
      flex: 1,
      textAlign: 'center',
      fontSize: S.cellMoyFont,
      fontWeight: 'bold',
      paddingHorizontal: 3,
    },
    totalRow: {
      flexDirection: 'row-reverse',
      backgroundColor: C.lightGold,
      paddingVertical: S.tableRowPadding,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: C.gold,
    },

    summaryGrid: {
      flexDirection: 'row-reverse',
      gap: 6,
      marginBottom: S.summaryMarginBottom,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 3,
      padding: S.summaryPadding,
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
    summaryUnit: { fontSize: 7.5, color: C.gray, fontWeight: 'normal' },

    decisionBox: {
      flexDirection: 'row-reverse',
      borderRadius: 3,
      padding: S.decisionPadding,
      marginBottom: S.decisionMarginBottom,
      alignItems: 'center',
      borderWidth: 1,
    },
    decisionLabelAr: { fontSize: 9, color: C.gray, marginLeft: 6 },
    decisionLabelFr: {
      fontSize: 7,
      color: C.gray,
      marginLeft: 6,
      fontStyle: 'italic',
    },
    decisionValue: { fontSize: 12, fontWeight: 'bold' },

    commentBox: {
      borderWidth: 1,
      borderColor: C.line,
      borderStyle: 'dashed',
      borderRadius: 3,
      padding: S.commentPadding,
      minHeight: S.commentMinHeight,
      marginBottom: S.commentMarginBottom,
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

    footer: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: S.footerMarginTop,
      paddingTop: S.footerPaddingTop,
      borderTopWidth: 1,
      borderTopColor: C.gold,
    },
    footerBlock: { alignItems: 'center', width: '30%' },
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
    footerLine: { fontSize: 7, color: C.gray, textAlign: 'center' },
  })

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.outerFrame} />
      <View style={styles.innerFrame} />

      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {establishment.logo_url ? (
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

        {/* TITLE */}
        <View style={styles.titleBox}>
          <Text style={styles.titleAr}>كشف نقط التلميذ(ة)</Text>
          <Text style={styles.titleFr}>BULLETIN DE NOTES</Text>
          <View style={styles.titleDivider} />
        </View>

        {/* STUDENT */}
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

        {/* TABLE */}
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

        {/* SUMMARY */}
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

        {/* DECISION */}
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

        {/* COMMENT */}
        <View style={styles.commentBox}>
          <Text style={styles.commentLabelAr}>ملاحظات المدير(ة)</Text>
          <Text style={styles.commentLabelFr}>Commentaires du Directeur</Text>
          <Text style={styles.commentText}>
            {bulletin.directorComment?.trim() ||
              bulletin.decisionNotes?.trim() ||
              ' '}
          </Text>
        </View>

        {/* FOOTER */}
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