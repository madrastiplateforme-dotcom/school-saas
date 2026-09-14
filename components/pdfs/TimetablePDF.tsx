'use client'

import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf' },
    { src: '/fonts/Cairo-Bold.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Cairo',
    fontSize: 9,
    direction: 'rtl',
  },
  header: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  meta: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'left',
  },
  metaLine: {
    marginBottom: 3,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
  },
  timeCell: {
    width: 55,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    textAlign: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    textAlign: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  timeText: {
    fontSize: 8,
    color: '#475569',
    textAlign: 'center',
  },
  cell: {
    minHeight: 40,
    padding: 4,
    justifyContent: 'center',
  },
  lesson: {
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  lessonSubject: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  lessonDetail: {
    fontSize: 7,
    color: '#475569',
  },
  pauseRow: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
  },
  pauseCell: {
    padding: 4,
    textAlign: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontSize: 8,
    color: '#92400e',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
})

type DayConfig = { enabled: boolean; start: string; end: string }
type Pause = { name: string; start: string; end: string; blocks?: boolean }
type Slot = {
  start: string; end: string; type: 'lesson' | 'pause'; label?: string; index: number;
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
  schoolName, className, levelName, yearName,
  days, slots, timetables, subjects, staff,
  primaryColor = '#4F46E5',
}: Props) {
  const getSubject = (id: string | null) => subjects.find(s => s.id === id)
  const getTeacher = (id: string | null) => staff.find(s => s.id === id)
  const findTt = (day: number, startTime: string) =>
    timetables.find(t => t.day_of_week === day && hhmm(t.start_time) === startTime)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.schoolName}>{schoolName}</Text>
            <Text style={styles.subtitle}>
              جدول الحصص — {className}
              {levelName ? ` · ${levelName}` : ''}
            </Text>
          </View>
          <View>
            <Text style={[styles.meta, styles.metaLine]}>
              السنة الدراسية: {yearName || '—'}
            </Text>
            <Text style={[styles.meta, styles.metaLine]}>
              تاريخ الطباعة: {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.timeCell}>
              <Text style={styles.headerText}>التوقيت</Text>
            </View>
            {days.map(d => (
              <View key={d.value} style={styles.dayCell}>
                <Text style={styles.headerText}>{d.label}</Text>
              </View>
            ))}
          </View>

          {/* Slot rows */}
          {slots.map((slot, idx) => {
            if (slot.type === 'pause') {
              return (
                <View key={`p-${idx}`} style={styles.pauseRow}>
                  <View style={[styles.timeCell, { backgroundColor: '#fef3c7' }]}>
                    <Text style={styles.timeText}>{slot.start}</Text>
                    <Text style={[styles.timeText, { fontSize: 6 }]}>{slot.end}</Text>
                  </View>
                  <View style={[styles.pauseCell, { flex: 1 }]}>
                    <Text style={styles.pauseText}>☕ {slot.label} · {slot.start} → {slot.end}</Text>
                  </View>
                </View>
              )
            }

            return (
              <View key={`s-${idx}`} style={styles.row}>
                <View style={styles.timeCell}>
                  <Text style={styles.timeText}>{slot.start}</Text>
                  <Text style={[styles.timeText, { fontSize: 6, color: '#94a3b8' }]}>{slot.end}</Text>
                </View>
                {days.map(d => {
                  const tt = findTt(d.value, slot.start)
                  if (!tt) {
                    return (
                      <View key={`${d.value}-${slot.start}`} style={styles.dayCell} />
                    )
                  }
                  const subject = getSubject(tt.subject_id)
                  const teacher = getTeacher(tt.teacher_id)
                  const color = subject?.color || primaryColor
                  return (
                    <View key={`${d.value}-${slot.start}`} style={styles.dayCell}>
                      <View style={[styles.lesson, { borderLeftWidth: 3, borderLeftColor: color, backgroundColor: color + '15' }]}>
                        <Text style={[styles.lessonSubject, { color }]}>
                          {subject?.name || '—'}
                        </Text>
                        {teacher && (
                          <Text style={styles.lessonDetail}>{teacher.full_name}</Text>
                        )}
                        {tt.room && (
                          <Text style={[styles.lessonDetail, { color: '#94a3b8' }]}>📍 {tt.room}</Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          GestionEco · {schoolName} · صفحة
        </Text>
      </Page>
    </Document>
  )
}