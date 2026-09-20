'use client'

import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import path from 'path'

const FONTS_DIR = path.resolve(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(FONTS_DIR, 'Amiri-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Amiri-Italic.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
    { src: path.join(FONTS_DIR, 'Amiri-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Amiri-BoldItalic.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const C = {
  navy: '#1e3a5f', gold: '#b8860b', lightGold: '#f5ecd7',
  cream: '#fbf8f1', gray: '#555', dark: '#1a1a1a',
}

function getDynamicSizes(slotCount: number) {
  if (slotCount <= 6) return { contentPadding: 24, contentPaddingTop: 22, dayCellMinHeight: 50, timeCellWidth: 55, titleSize: 16, titleFrSize: 9, rowPadding: 4, lessonFontSize: 8.5, detailFontSize: 6.5, headerPadding: 8 }
  if (slotCount <= 8) return { contentPadding: 20, contentPaddingTop: 18, dayCellMinHeight: 44, timeCellWidth: 50, titleSize: 15, titleFrSize: 8.5, rowPadding: 3.5, lessonFontSize: 8, detailFontSize: 6, headerPadding: 6 }
  if (slotCount <= 10) return { contentPadding: 16, contentPaddingTop: 14, dayCellMinHeight: 38, timeCellWidth: 45, titleSize: 14, titleFrSize: 8, rowPadding: 3, lessonFontSize: 7.5, detailFontSize: 5.5, headerPadding: 5 }
  return { contentPadding: 14, contentPaddingTop: 12, dayCellMinHeight: 34, timeCellWidth: 42, titleSize: 13, titleFrSize: 7.5, rowPadding: 2.5, lessonFontSize: 7, detailFontSize: 5, headerPadding: 4 }
}

type Slot = {
  start: string; end: string; type: 'lesson' | 'pause'
  label?: string; index: number
}
type Timetable = {
  id: string; day_of_week: number; start_time: string; end_time: string
  subject_id: string | null; teacher_id: string | null; room: string | null
}
type Props = {
  schoolName: string; className: string; levelName: string | null
  yearName: string
  days: { value: number; label: string }[]
  slots: Slot[]
  timetables: Timetable[]
  subjects: { id: string; name: string; color: string }[]
  staff: { id: string; full_name: string }[]
  primaryColor?: string
}

const hhmm = (t: string) => (t || '').slice(0, 5)

export default function TimetablePDF({
  schoolName, className, levelName, yearName,
  days, slots, timetables, subjects, staff,
  primaryColor = '#1e3a5f',
}: Props) {
  const getSubject = (id: string | null) => subjects.find((s) => s.id === id)
  const getTeacher = (id: string | null) => staff.find((s) => s.id === id)
  const findTt = (day: number, startTime: string) =>
    timetables.find((t) => t.day_of_week === day && hhmm(t.start_time) === startTime)

  const S = getDynamicSizes(slots.length)

  const styles = StyleSheet.create({
    page: { padding: 0, fontFamily: 'Cairo', fontSize: 8, direction: 'rtl', backgroundColor: C.cream },
    outerFrame: {
      position: 'absolute', top: 12, left: 12, right: 12, bottom: 12,
      borderWidth: 2.5, borderColor: C.navy, borderRadius: 4,
    },
    innerFrame: {
      position: 'absolute', top: 18, left: 18, right: 18, bottom: 18,
      borderWidth: 0.8, borderColor: C.gold, borderRadius: 2,
    },
    content: { padding: S.contentPadding, paddingTop: S.contentPaddingTop },

    header: {
      flexDirection: 'row-reverse', justifyContent: 'space-between',
      alignItems: 'center', paddingBottom: S.headerPadding,
      borderBottomWidth: 2, borderBottomColor: C.navy, marginBottom: S.headerPadding,
    },
    headerLeft: { flex: 1, textAlign: 'right' },
    headerRight: { flex: 1, textAlign: 'left' },
    kingdomAr: { fontSize: 9.5, fontWeight: 'bold', color: C.navy, textAlign: 'right', lineHeight: 1.5 },
    kingdomFr: { fontSize: 7, fontWeight: 'bold', color: C.navy, textAlign: 'right', marginTop: 0.5 },
    schoolAr: { fontSize: 12, fontWeight: 'bold', color: C.gold, textAlign: 'center', marginTop: 3, lineHeight: 1.4 },
    schoolSub: { fontSize: 7.5, color: C.gray, textAlign: 'center', marginTop: 1, lineHeight: 1.5 },
    metaLine: { fontSize: 7.5, color: C.gray, textAlign: 'left', marginBottom: 2, lineHeight: 1.5 },
    metaStrong: { fontSize: 7.5, fontWeight: 'bold', color: C.navy },

    titleBox: { alignItems: 'center', marginTop: 4, marginBottom: S.headerPadding },
    titleAr: { fontSize: S.titleSize, fontWeight: 'bold', color: C.navy, textAlign: 'center', lineHeight: 1.3 },
    titleFr: { fontSize: S.titleFrSize, fontWeight: 'bold', color: C.gold, textAlign: 'center', letterSpacing: 1.5, marginTop: 1 },
    titleDivider: { width: 140, height: 1, backgroundColor: C.gold, marginTop: 3 },

    table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: C.navy, borderRadius: 3, overflow: 'hidden' },
    headerRow: { backgroundColor: C.navy, flexDirection: 'row-reverse' },
    row: {
      flexDirection: 'row-reverse',
      borderTopWidth: 0.5, borderTopColor: '#e5e5e5', borderTopStyle: 'dotted',
    },
    timeCell: {
      width: S.timeCellWidth, padding: S.rowPadding - 1,
      borderLeftWidth: 1, borderLeftColor: C.gold,
      textAlign: 'center', justifyContent: 'center', backgroundColor: C.lightGold,
    },
    dayCell: {
      flex: 1, padding: S.rowPadding - 1,
      borderLeftWidth: 0.5, borderLeftColor: '#e5e5e5', borderLeftStyle: 'dotted',
      textAlign: 'center', justifyContent: 'center', minHeight: S.dayCellMinHeight,
    },
    headerText: {
      fontSize: 8.5, fontWeight: 'bold', color: '#ffffff',
      textAlign: 'center', paddingVertical: 3, lineHeight: 1.4,
    },
    timeHeaderText: {
      fontSize: 8, fontWeight: 'bold', color: '#ffffff',
      textAlign: 'center', paddingVertical: 3, lineHeight: 1.4,
    },
    timeText: { fontSize: 8, color: C.navy, textAlign: 'center', fontWeight: 'bold', lineHeight: 1.4 },
    timeSubText: { fontSize: 6.5, color: C.gray, textAlign: 'center', marginTop: 1 },

    lesson: { padding: 2.5, borderRadius: 3, marginBottom: 1.5, borderLeftWidth: 3 },
    lessonSubject: {
      fontSize: S.lessonFontSize, fontWeight: 'bold',
      marginBottom: 0.5, textAlign: 'right', lineHeight: 1.4,
    },
    lessonDetail: { fontSize: S.detailFontSize, color: C.gray, textAlign: 'right', lineHeight: 1.4 },

    pauseRow: { backgroundColor: '#fffbeb', flexDirection: 'row-reverse', borderTopWidth: 0.5, borderTopColor: '#e5e5e5' },
    pauseTimeCell: {
      width: S.timeCellWidth, padding: S.rowPadding - 1,
      borderLeftWidth: 1, borderLeftColor: C.gold,
      backgroundColor: C.lightGold, justifyContent: 'center',
    },
    pauseTimeText: { fontSize: 7, color: C.navy, textAlign: 'center', fontWeight: 'bold', lineHeight: 1.4 },
    pauseCell: { flex: 1, padding: 4, textAlign: 'center', justifyContent: 'center' },
    pauseText: { fontSize: 7.5, color: '#92400e', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.5 },

    footer: {
      position: 'absolute', bottom: 18, left: 24, right: 24,
      fontSize: 6.5, color: C.gray, textAlign: 'center',
      borderTopWidth: 1, borderTopColor: C.gold, paddingTop: 4, fontStyle: 'italic',
    },
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.kingdomAr}>المملكة المغربية</Text>
              <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.schoolAr}>{schoolName}</Text>
              <Text style={styles.schoolSub}>
                {className}{levelName ? ` · ${levelName}` : ''}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.metaLine}>
                <Text style={styles.metaStrong}>السنة الدراسية: </Text>
                {yearName || '—'}
              </Text>
              <Text style={styles.metaLine}>
                <Text style={styles.metaStrong}>تاريخ الطباعة: </Text>
                {new Date().toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>

          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>جدول الحصص</Text>
            <Text style={styles.titleFr}>EMPLOI DU TEMPS</Text>
            <View style={styles.titleDivider} />
          </View>

          <View style={styles.table}>
            <View style={styles.headerRow}>
              <View style={styles.timeCell}>
                <Text style={styles.timeHeaderText}>التوقيت</Text>
              </View>
              {days.map((d) => (
                <View key={d.value} style={[styles.dayCell, { backgroundColor: C.navy, minHeight: 0 }]}>
                  <Text style={styles.headerText}>{d.label}</Text>
                </View>
              ))}
            </View>

            {slots.map((slot, idx) => {
              if (slot.type === 'pause') {
                return (
                  <View key={`p-${idx}`} style={styles.pauseRow}>
                    <View style={styles.pauseTimeCell}>
                      <Text style={styles.pauseTimeText}>{slot.start}</Text>
                      <Text style={[styles.pauseTimeText, { fontSize: 5.5 }]}>{slot.end}</Text>
                    </View>
                    <View style={[styles.pauseCell, { flex: 1 }]}>
                      <Text style={styles.pauseText}>
                        ☕ {slot.label} · {slot.start} → {slot.end}
                      </Text>
                    </View>
                  </View>
                )
              }
              return (
                <View key={`s-${idx}`} style={styles.row}>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeText}>{slot.start}</Text>
                    <Text style={styles.timeSubText}>{slot.end}</Text>
                  </View>
                  {days.map((d) => {
                    const tt = findTt(d.value, slot.start)
                    if (!tt) return <View key={`${d.value}-${slot.start}`} style={styles.dayCell} />
                    const subject = getSubject(tt.subject_id)
                    const teacher = getTeacher(tt.teacher_id)
                    const color = subject?.color || primaryColor
                    return (
                      <View key={`${d.value}-${slot.start}`} style={styles.dayCell}>
                        <View style={[styles.lesson, { borderLeftColor: color, backgroundColor: color + '15' }]}>
                          <Text style={[styles.lessonSubject, { color }]}>{subject?.name || '—'}</Text>
                          {teacher && <Text style={styles.lessonDetail}>{teacher.full_name}</Text>}
                          {tt.room && <Text style={styles.lessonDetail}>📍 {tt.room}</Text>}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          GestionEco · {schoolName} · جدول الحصص
        </Text>
      </Page>
    </Document>
  )
}