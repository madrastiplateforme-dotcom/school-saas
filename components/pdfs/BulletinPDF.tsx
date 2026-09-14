'use client'

import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf' },
    { src: '/fonts/Cairo-Bold.ttf', fontWeight: 'bold' },
  ],
})

const PRIMARY = '#4F46E5'
const SLATE_600 = '#475569'
const SLATE_400 = '#94a3b8'
const SLATE_200 = '#e2e8f0'
const SLATE_100 = '#f1f5f9'
const EMERALD = '#059669'
const ORANGE = '#ea580c'
const ROSE = '#e11d48'
const AMBER = '#d97706'

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Cairo',
    fontSize: 9,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    marginBottom: 10,
  },
  logoBox: {
    width: 55,
    height: 55,
    borderRadius: 6,
    backgroundColor: SLATE_100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImg: {
    width: 55,
    height: 55,
    borderRadius: 6,
  },
  schoolBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  schoolMeta: {
    fontSize: 7,
    color: SLATE_600,
    marginTop: 1,
  },
  metaBox: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 8,
    color: SLATE_600,
    marginBottom: 2,
  },
  metaStrong: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'center',
    marginBottom: 10,
    paddingVertical: 5,
    backgroundColor: '#eef2ff',
    borderRadius: 5,
  },
  studentBox: {
    flexDirection: 'row',
    backgroundColor: SLATE_100,
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  studentItem: {
    width: '33%',
    paddingVertical: 2,
  },
  studentLabel: {
    fontSize: 7,
    color: SLATE_400,
  },
  studentValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  cellSubject: {
    flex: 2.2,
    textAlign: 'right',
    paddingHorizontal: 5,
    fontSize: 9,
    fontWeight: 'bold',
  },
  cellCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8,
    paddingHorizontal: 3,
  },
  cellMoy: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 3,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    paddingVertical: 5,
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 5,
    padding: 8,
    backgroundColor: SLATE_100,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  summaryLabel: {
    fontSize: 7,
    color: SLATE_400,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryUnit: {
    fontSize: 8,
    color: SLATE_400,
    fontWeight: 'normal',
  },
  decisionBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  decisionLabel: {
    fontSize: 9,
    color: SLATE_600,
    marginLeft: 6,
  },
  decisionValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: EMERALD,
  },
  commentBox: {
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 5,
    padding: 8,
    minHeight: 40,
    marginBottom: 10,
  },
  commentLabel: {
    fontSize: 7,
    color: SLATE_400,
    marginBottom: 3,
  },
  commentText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
  },
  footerBlock: {
    alignItems: 'center',
    width: '30%',
  },
  footerLabel: {
    fontSize: 8,
    color: SLATE_600,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  footerLine: {
    fontSize: 7,
    color: SLATE_400,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 7,
    color: SLATE_400,
  },
})

// ============ TYPES ============
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
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR')
  } catch {
    return d
  }
}

const autoDecision = (avg: number | null, gradeMax: number): string => {
  if (avg == null) return '—'
  const pass = gradeMax / 2
  if (avg >= pass) return 'مقبول'
  if (avg >= pass * 0.5) return 'استدراك'
  return 'يكرر السنة'
}

// ============ SINGLE PAGE ============
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

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          {establishment.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={establishment.logo_url} style={styles.logoImg} />
          ) : (
            <Text style={{ fontSize: 20, color: PRIMARY, fontWeight: 'bold' }}>
              {establishment.name.charAt(0)}
            </Text>
          )}
        </View>

        <View style={styles.schoolBlock}>
          <Text style={styles.schoolName}>{establishment.name}</Text>
          {establishment.address && (
            <Text style={styles.schoolMeta}>{establishment.address}</Text>
          )}
          <Text style={styles.schoolMeta}>
            {[establishment.city, establishment.phone].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={styles.metaBox}>
          <Text style={styles.metaText}>
            <Text style={styles.metaStrong}>السنة الدراسية: </Text>
            {yearName}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaStrong}>الفصل: </Text>
            {termName}
          </Text>
          <Text style={styles.metaText}>
            <Text style={styles.metaStrong}>التاريخ: </Text>
            {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>كشف نقط التلميذ</Text>

      {/* Student info */}
      <View style={styles.studentBox}>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>الاسم الكامل</Text>
          <Text style={styles.studentValue}>{student.fullName}</Text>
        </View>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>رقم مسار</Text>
          <Text style={styles.studentValue}>{student.massarCode || '—'}</Text>
        </View>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>تاريخ الميلاد</Text>
          <Text style={styles.studentValue}>{formatDate(student.birthDate)}</Text>
        </View>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>القسم</Text>
          <Text style={styles.studentValue}>{className}</Text>
        </View>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>المستوى</Text>
          <Text style={styles.studentValue}>{levelName || '—'}</Text>
        </View>
        <View style={styles.studentItem}>
          <Text style={styles.studentLabel}>الجنس</Text>
          <Text style={styles.studentValue}>{student.gender || '—'}</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2.2, textAlign: 'right' }]}>المادة</Text>
          <Text style={styles.tableHeaderCell}>المعامل</Text>
          <Text style={styles.tableHeaderCell}>نقطة التلميذ</Text>
          <Text style={styles.tableHeaderCell}>معدل القسم</Text>
          <Text style={styles.tableHeaderCell}>ن × م</Text>
        </View>

        {subjects.map((s, idx) => {
          const isPass = s.studentAverage != null && s.studentAverage >= pass
          return (
            <View
              key={s.subjectId}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.cellSubject, { color: s.subjectColor }]}>
                {s.subjectName}
              </Text>
              <Text style={styles.cellCenter}>{s.coefficient}</Text>
              <Text
                style={[
                  styles.cellMoy,
                  { color: s.studentAverage == null ? SLATE_400 : isPass ? EMERALD : ORANGE },
                ]}
              >
                {s.studentAverage != null ? s.studentAverage.toFixed(2) : '—'}
              </Text>
              <Text style={[styles.cellCenter, { color: SLATE_600 }]}>
                {s.classAverage != null ? s.classAverage.toFixed(2) : '—'}
              </Text>
              <Text style={styles.cellCenter}>
                {s.weightedValue != null ? s.weightedValue.toFixed(2) : '—'}
              </Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={[styles.cellSubject, { color: '#1e293b' }]}>المجموع</Text>
          <Text style={[styles.cellCenter, { fontWeight: 'bold', color: '#1e293b' }]}>
            {totalCoef}
          </Text>
          <Text style={styles.cellCenter}>—</Text>
          <Text style={styles.cellCenter}>—</Text>
          <Text style={[styles.cellMoy, { color: PRIMARY }]}>
            {totalWeighted.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Summary cards */}
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
          <Text style={styles.summaryLabel}>المعدل العام</Text>
          <Text style={[styles.summaryValue, { color: overallPass ? EMERALD : ORANGE }]}>
            {overall != null ? overall.toFixed(2) : '—'}
            <Text style={styles.summaryUnit}> / {gradeMax}</Text>
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: AMBER, backgroundColor: '#fffbeb' }]}>
          <Text style={styles.summaryLabel}>الرتبة في القسم</Text>
          <Text style={[styles.summaryValue, { color: AMBER }]}>
            {rank != null ? rank : '—'}
            <Text style={styles.summaryUnit}> / {classSize}</Text>
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: SLATE_600, backgroundColor: SLATE_100 }]}>
          <Text style={styles.summaryLabel}>الغيابات (مبررة / غير مبررة)</Text>
          <Text style={[styles.summaryValue, { color: SLATE_600 }]}>
            {bulletin.absencesJustified}
            <Text style={styles.summaryUnit}> / </Text>
            {bulletin.absencesUnjustified}
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: SLATE_600, backgroundColor: SLATE_100 }]}>
          <Text style={styles.summaryLabel}>التأخيرات</Text>
          <Text style={[styles.summaryValue, { color: SLATE_600 }]}>
            {bulletin.lates}
          </Text>
        </View>
      </View>

      {/* Decision */}
      <View
        style={[
          styles.decisionBox,
          {
            backgroundColor:
              decision === 'مقبول' ? '#f0fdf4' : decision === 'استدراك' ? '#fff7ed' : '#fef2f2',
            borderColor:
              decision === 'مقبول' ? '#bbf7d0' : decision === 'استدراك' ? '#fed7aa' : '#fecaca',
          },
        ]}
      >
        <Text style={styles.decisionLabel}>القرار:</Text>
        <Text
          style={[
            styles.decisionValue,
            {
              color:
                decision === 'مقبول' ? EMERALD : decision === 'استدراك' ? ORANGE : ROSE,
            },
          ]}
        >
          {decision}
        </Text>
        {bulletin.behavior && (
          <>
            <Text style={[styles.decisionLabel, { marginLeft: 16 }]}>السلوك:</Text>
            <Text style={[styles.decisionValue, { color: SLATE_600 }]}>
              {bulletin.behavior}
            </Text>
          </>
        )}
      </View>

      {/* Comment */}
      <View style={styles.commentBox}>
        <Text style={styles.commentLabel}>ملاحظات المدير:</Text>
        <Text style={styles.commentText}>
          {bulletin.directorComment?.trim() ||
            bulletin.decisionNotes?.trim() ||
            ' '}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>التاريخ</Text>
          <Text style={styles.footerLine}>{new Date().toLocaleDateString('fr-FR')}</Text>
        </View>
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>خاتم المدرسة</Text>
          <Text style={styles.footerLine}> </Text>
        </View>
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>توقيع المدير</Text>
          <Text style={styles.footerLine}> </Text>
        </View>
      </View>
    </Page>
  )
}

// ============ MAIN DOCUMENT ============
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