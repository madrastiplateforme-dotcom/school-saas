'use client'

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
// Palette
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
    fontSize: 9,
    direction: 'rtl',
  },

  outerFrame: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderWidth: 2.5,
    borderColor: C.navy,
    borderRadius: 4,
  },
  innerFrame: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 0.8,
    borderColor: C.gold,
    borderRadius: 2,
  },

  content: {
    padding: 30,
    paddingTop: 26,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    textAlign: 'right',
  },
  headerRight: {
    flex: 1,
    textAlign: 'left',
  },
  kingdomAr: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
  },
  kingdomFr: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
    marginTop: 0.5,
  },
  schoolAr: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    marginTop: 3,
  },
  schoolSub: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
    marginTop: 1,
  },
  metaLine: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'left',
    marginBottom: 2,
  },
  metaStrong: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.navy,
  },

  // ─── Title ───
  titleBox: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  titleAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
  },
  titleFr: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  titleDivider: {
    width: 150,
    height: 1,
    backgroundColor: C.gold,
    marginTop: 4,
  },

  // ─── Table ───
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: C.navy,
    borderRadius: 3,
    overflow: 'hidden',
  },
  headerRow: {
    backgroundColor: C.navy,
    flexDirection: 'row-reverse',
  },
  row: {
    flexDirection: 'row-reverse',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    borderTopStyle: 'dotted',
  },
  timeCell: {
    width: 60,
    padding: 5,
    borderLeftWidth: 1,
    borderLeftColor: C.gold,
    textAlign: 'center',
    justifyContent: 'center',
    backgroundColor: C.lightGold,
  },
  dayCell: {
    flex: 1,
    padding: 4,
    borderLeftWidth: 0.5,
    borderLeftColor: '#e5e5e5',
    borderLeftStyle: 'dotted',
    textAlign: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 3,
  },
  timeHeaderText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 3,
  },
  timeText: {
    fontSize: 8.5,
    color: C.navy,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timeSubText: {
    fontSize: 7,
    color: C.gray,
    textAlign: 'center',
    marginTop: 1,
  },

  // ─── Lesson cell ───
  lesson: {
    padding: 3,
    borderRadius: 3,
    marginBottom: 2,
    borderLeftWidth: 3,
  },
  lessonSubject: {
    fontSize: 8.5,
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'right',
  },
  lessonDetail: {
    fontSize: 6.5,
    color: C.gray,
    textAlign: 'right',
  },

  // ─── Pause ───
  pauseRow: {
    backgroundColor: '#fffbeb',
    flexDirection: 'row-reverse',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
  },
  pauseTimeCell: {
    width: 60,
    padding: 4,
    borderLeftWidth: 1,
    borderLeftColor: C.gold,
    backgroundColor: C.lightGold,
    justifyContent: 'center',
  },
  pauseTimeText: {
    fontSize: 7.5,
    color: C.navy,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pauseCell: {
    flex: 1,
    padding: 5,
    textAlign: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontSize: 8,
    color: '#92400e',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 30,
    right: 30,
    fontSize: 7,
    color: C.gray,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: C.gold,
    paddingTop: 6,
    fontStyle: 'italic',
  },
})

type DayConfig = { enabled: boolean; start: string; end: string }
type Pause = { name: string; start: string; end: string; blocks?: boolean }
type Slot = {
  start: string
  end: string
  type: 'lesson' | 'pause'
  label?: string
  index: number
  inlineBreaks?: { name: string; start: string; end: string }[]
}

type Timetable = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string | null
  teacher_id: string | null
  room: string | null
}

type Props = {
  schoolName: string
  className: string
  levelName: string | null
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
  schoolName,
  className,
  levelName,
  yearName,
  days,
  slots,
  timetables,
  subjects,
  staff,
  primaryColor = '#1e3a5f',
}: Props) {
  const getSubject = (id: string | null) =>
    subjects.find((s) => s.id === id)
  const getTeacher = (id: string | null) => staff.find((s) => s.id === id)
  const findTt = (day: number, startTime: string) =>
    timetables.find(
      (t) => t.day_of_week === day && hhmm(t.start_time) === startTime,
    )

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cadres décoratifs */}
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        <View style={styles.content}>
          {/* ═══════ HEADER ═══════ */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.kingdomAr}>المملكة المغربية</Text>
              <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
            </View>

            <View style={{ flex: 2 }}>
              <Text style={styles.schoolAr}>{schoolName}</Text>
              <Text style={styles.schoolSub}>
                {className}
                {levelName ? ` · ${levelName}` : ''}
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

          {/* ═══════ TITLE ═══════ */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>جدول الحصص</Text>
            <Text style={styles.titleFr}>EMPLOI DU TEMPS</Text>
            <View style={styles.titleDivider} />
          </View>

          {/* ═══════ TABLE ═══════ */}
          <View style={styles.table}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={styles.timeCell}>
                <Text style={styles.timeHeaderText}>التوقيت</Text>
              </View>
              {days.map((d) => (
                <View key={d.value} style={[styles.dayCell, { backgroundColor: C.navy }]}>
                  <Text style={styles.headerText}>{d.label}</Text>
                </View>
              ))}
            </View>

            {/* Slot rows */}
            {slots.map((slot, idx) => {
              if (slot.type === 'pause') {
                return (
                  <View key={`p-${idx}`} style={styles.pauseRow}>
                    <View style={styles.pauseTimeCell}>
                      <Text style={styles.pauseTimeText}>{slot.start}</Text>
                      <Text style={[styles.pauseTimeText, { fontSize: 6 }]}>
                        {slot.end}
                      </Text>
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
                    if (!tt) {
                      return (
                        <View
                          key={`${d.value}-${slot.start}`}
                          style={styles.dayCell}
                        />
                      )
                    }
                    const subject = getSubject(tt.subject_id)
                    const teacher = getTeacher(tt.teacher_id)
                    const color = subject?.color || primaryColor
                    return (
                      <View
                        key={`${d.value}-${slot.start}`}
                        style={styles.dayCell}
                      >
                        <View
                          style={[
                            styles.lesson,
                            {
                              borderLeftColor: color,
                              backgroundColor: color + '15',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lessonSubject,
                              { color },
                            ]}
                          >
                            {subject?.name || '—'}
                          </Text>
                          {teacher && (
                            <Text style={styles.lessonDetail}>
                              {teacher.full_name}
                            </Text>
                          )}
                          {tt.room && (
                            <Text style={styles.lessonDetail}>
                              📍 {tt.room}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        </View>

        {/* ═══════ FOOTER ═══════ */}
        <Text style={styles.footer} fixed>
          GestionEco · {schoolName} · جدول الحصص
        </Text>
      </Page>
    </Document>
  )
}