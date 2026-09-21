'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import DateInput from '@/components/DateInput'
import { buildAbsenceMessage, openWhatsApp } from '@/lib/whatsapp'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Save, Users,
  Calendar, Search, RefreshCw, Download, BookOpen, Phone, Bell,
  MessageCircle,
} from 'lucide-react'

type StudentRow = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  family_id: string | null
  family_phone: string | null
  family_name: string | null
  parent_user_id: string | null
}

type AttendanceRow = {
  student_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  check_in_time: string | null
  check_out_time: string | null
  note: string | null
}

type ClassItem = {
  id: string
  name: string
  level_id: string
  level_name: string
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'حاضر', icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'absent', label: 'غائب', icon: XCircle, color: 'red', bg: 'bg-red-500', light: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'late', label: 'متأخر', icon: Clock, color: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'excused', label: 'مبرر', icon: AlertCircle, color: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-200' },
] as const

export default function AttendancePage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId } = useAcademicYear()

  const canView = hasPermission('attendance', 'view') || hasPermission('students', 'view')
  const canCreate = hasPermission('attendance', 'create') || hasPermission('students', 'create')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [attendances, setAttendances] = useState<Map<string, AttendanceRow>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [sendNotifications, setSendNotifications] = useState(true)
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    if (!establishmentId || !role || !yearId) return
    loadClasses()
    loadSchoolName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, yearId])

  useEffect(() => {
    if (!selectedClass || !date || !yearId) return
    loadAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, date, yearId])

  const loadSchoolName = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('establishments')
      .select('name')
      .eq('id', establishmentId)
      .maybeSingle()
    if (data?.name) setSchoolName(data.name)
  }

  const loadClasses = async () => {
    if (!yearId) return
    const supabase = createClient()
    setLoading(true)

    // ✅ Classes filtrées par année active
    const { data: classesData, error: err } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .order('name', { ascending: true })

    if (err) {
      console.error('[attendance-classes]', err?.message || err)
      toast.error(err.message)
      setLoading(false)
      return
    }

    const formatted = (classesData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      level_id: c.level_id,
      level_name: c.levels?.name || '-',
    }))
    setClasses(formatted)
    if (formatted.length > 0 && !selectedClass) {
      setSelectedClass(formatted[0].id)
    }
    setLoading(false)
  }

  const loadAttendance = async () => {
    if (!yearId) return
    setLoading(true)
    const supabase = createClient()

    // ✅ Enrollments dyal l'année active
    const { data: enrollmentsData, error: stErr } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        students (
          id, first_name, last_name, massar_code, status, family_id,
          families (family_name, phone, parent_user_id)
        )
      `)
      .eq('class_id', selectedClass)
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .eq('status', 'active')

    if (stErr) {
      console.error('[attendance-students]', stErr?.message || stErr)
      toast.error(stErr.message)
      setLoading(false)
      return
    }

    const uniqueStudentsMap = new Map<string, StudentRow>()
    ;(enrollmentsData || []).forEach((e: any) => {
      if (!e.students || e.students.status !== 'active') return
      if (uniqueStudentsMap.has(e.students.id)) return

      uniqueStudentsMap.set(e.students.id, {
        id: e.students.id,
        first_name: e.students.first_name,
        last_name: e.students.last_name,
        massar_code: e.students.massar_code,
        family_id: e.students.family_id,
        family_phone: e.students.families?.phone || null,
        family_name: e.students.families?.family_name || null,
        parent_user_id: e.students.families?.parent_user_id || null,
      })
    })

    const studentList = Array.from(uniqueStudentsMap.values())
      .sort((a, b) => a.first_name.localeCompare(b.first_name))

    setStudents(studentList)

    if (studentList.length === 0) {
      setAttendances(new Map())
      setLoading(false)
      return
    }

    // ✅ Attendances dyal l'année active
    const { data: attData, error: attErr } = await supabase
      .from('attendances')
      .select('student_id, status, check_in_time, check_out_time, note')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', yearId)
      .eq('attendance_date', date)
      .in('student_id', studentList.map(s => s.id))

    if (attErr) {
      console.error('[attendance-load]', attErr?.message || attErr)
    }

    const map = new Map<string, AttendanceRow>()
    studentList.forEach(s => {
      map.set(s.id, {
        student_id: s.id,
        status: 'present',
        check_in_time: null,
        check_out_time: null,
        note: null,
      })
    })
    ;(attData || []).forEach((a: any) => {
      map.set(a.student_id, {
        student_id: a.student_id,
        status: a.status,
        check_in_time: a.check_in_time,
        check_out_time: a.check_out_time,
        note: a.note,
      })
    })
    setAttendances(map)
    setLoading(false)
  }

  const updateStudent = (studentId: string, field: keyof AttendanceRow, value: any) => {
    setAttendances(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || {
        student_id: studentId,
        status: 'present',
        check_in_time: null,
        check_out_time: null,
        note: null,
      }
      newMap.set(studentId, { ...current, [field]: value })
      return newMap
    })
  }

  const setAllStatus = (status: AttendanceRow['status']) => {
    setAttendances(prev => {
      const newMap = new Map(prev)
      students.forEach(s => {
        const current = newMap.get(s.id)!
        newMap.set(s.id, { ...current, status })
      })
      return newMap
    })
  }

  const handleWhatsApp = (student: StudentRow) => {
    if (!student.family_phone) {
      toast.error('لا يوجد رقم هاتف لهذا الولي')
      return
    }

    const att = attendances.get(student.id)
    const statusLabel = att
      ? STATUS_OPTIONS.find(o => o.value === att.status)?.label || '—'
      : '—'

    let message = ''
    if (att?.status === 'absent') {
      message = buildAbsenceMessage({
        parentName: student.family_name || undefined,
        studentName: `${student.first_name} ${student.last_name}`,
        date,
        schoolName,
      })
    } else {
      message = [
        `السلام عليكم${student.family_name ? ' ' + student.family_name : ''}،`,
        ``,
        `نحيطكم علماً أن حالة ابنكم/ابنتكم *${student.first_name} ${student.last_name}* اليوم *${date}* هي: *${statusLabel}*.`,
        ``,
        schoolName ? `— ${schoolName}` : '',
      ].filter(Boolean).join('\n')
    }

    const ok = openWhatsApp(student.family_phone, message)
    if (!ok) toast.error('رقم الهاتف غير صحيح')
  }

  const handleWhatsAppAllAbsents = () => {
    const absents = students.filter(s => attendances.get(s.id)?.status === 'absent')
    if (absents.length === 0) {
      toast.warning('لا يوجد غياب مسجل')
      return
    }
    const withPhone = absents.filter(s => s.family_phone)
    const withoutPhone = absents.length - withPhone.length

    if (withPhone.length === 0) {
      toast.error('لا يوجد أرقام هواتف للأولياء')
      return
    }

    if (withPhone.length > 5) {
      const ok = confirm(
        `سيتم فتح ${withPhone.length} نافذة WhatsApp.\n` +
        `${withoutPhone > 0 ? `⚠️ ${withoutPhone} بدون رقم هاتف.\n` : ''}` +
        `هل تريد المتابعة؟`,
      )
      if (!ok) return
    }

    withPhone.forEach((s, i) => {
      setTimeout(() => {
        const message = buildAbsenceMessage({
          parentName: s.family_name || undefined,
          studentName: `${s.first_name} ${s.last_name}`,
          date,
          schoolName,
        })
        openWhatsApp(s.family_phone, message)
      }, i * 500)
    })

    toast.success(`جارٍ إرسال ${withPhone.length} رسالة WhatsApp...`)

    if (withoutPhone > 0) {
      toast.warning(`${withoutPhone} تلميذ بدون رقم هاتف`)
    }
  }

  const handleSave = async () => {
    if (!establishmentId || !selectedClass || students.length === 0 || !yearId) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    try {
      const selectedClassData = classes.find(c => c.id === selectedClass)

      const attToSave = Array.from(attendances.values()).map(a => ({
        establishment_id: establishmentId,
        academic_year_id: yearId,           // 🎯 NEW
        student_id: a.student_id,
        class_id: selectedClass,
        level_id: selectedClassData?.level_id || null,
        attendance_date: date,
        status: a.status,
        check_in_time: a.check_in_time || null,
        check_out_time: a.check_out_time || null,
        note: a.note || null,
        marked_by: user.id,
        updated_at: new Date().toISOString(),
      }))

      const { error: upsertErr } = await supabase
        .from('attendances')
        .upsert(attToSave, { onConflict: 'student_id,attendance_date' })

      if (upsertErr) throw upsertErr

      let savedMsg = `تم حفظ الحضور (${students.length} تلميذ)`

      if (sendNotifications) {
        const absentStudents = students.filter(s => attendances.get(s.id)?.status === 'absent')
        const lateStudents = students.filter(s => attendances.get(s.id)?.status === 'late')

        const notifsToInsert: any[] = []

        for (const s of absentStudents) {
          if (!s.parent_user_id) continue
          notifsToInsert.push({
            user_id: s.parent_user_id,
            establishment_id: establishmentId,
            type: 'attendance_absent',
            title: '⚠️ غياب التلميذ',
            message: `التلميذ(ة) ${s.first_name} ${s.last_name} غائب(ة) اليوم ${date}`,
            link: '/parent/dashboard',
            metadata: { student_id: s.id, date, student_name: `${s.first_name} ${s.last_name}` },
          })
        }

        for (const s of lateStudents) {
          if (!s.parent_user_id) continue
          notifsToInsert.push({
            user_id: s.parent_user_id,
            establishment_id: establishmentId,
            type: 'attendance_late',
            title: '⏰ تأخر التلميذ',
            message: `التلميذ(ة) ${s.first_name} ${s.last_name} وصل(ت) متأخر(ة) اليوم`,
            link: '/parent/dashboard',
            metadata: { student_id: s.id, date },
          })
        }

        if (notifsToInsert.length > 0) {
          const { error: notifErr } = await supabase
            .from('notifications')
            .insert(notifsToInsert)
          if (notifErr) console.error('Notif error:', notifErr)
        }

        if (absentStudents.length > 0) {
          try {
            const emailRes = await fetch('/api/establishment/absence-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentIds: absentStudents.map(s => s.id),
                date,
              }),
            })
            const emailData = await emailRes.json()

            if (emailData.sent > 0) savedMsg += ` + ${emailData.sent} إيميل`
            if (emailData.failed > 0) savedMsg += ` (${emailData.failed} فشل)`
            if (emailData.skipped > 0) savedMsg += ` (${emailData.skipped} بلا إيميل)`
          } catch (e) {
            console.error('Email send failed:', e)
          }
        }

        savedMsg += ' + إشعار الأولياء'
      }

      toast.success(savedMsg)
    } catch (err: any) {
      console.error('[attendance-save]', err?.message || err)
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const values = Array.from(attendances.values())
    return {
      total: values.length,
      present: values.filter(a => a.status === 'present').length,
      absent: values.filter(a => a.status === 'absent').length,
      late: values.filter(a => a.status === 'late').length,
      excused: values.filter(a => a.status === 'excused').length,
    }
  }, [attendances])

  const filteredStudents = students.filter(s => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
      (s.massar_code || '').toLowerCase().includes(term)
    )
  })

  const handleExportExcel = () => {
    if (students.length === 0) {
      toast.warning('لا يوجد تلاميذ')
      return
    }
    const data = students.map(s => {
      const att = attendances.get(s.id)
      return {
        'التلميذ': `${s.first_name} ${s.last_name}`,
        'رقم مسار': s.massar_code || '-',
        'الحالة': att ? STATUS_OPTIONS.find(o => o.value === att.status)?.label : '-',
        'وقت الدخول': att?.check_in_time || '-',
        'وقت الخروج': att?.check_out_time || '-',
        'ملاحظة': att?.note || '-',
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الحضور')
    const className = classes.find(c => c.id === selectedClass)?.name || 'classe'
    XLSX.writeFile(wb, `attendance-${className}-${date}.xlsx`)
    toast.success('تم تصدير Excel')
  }

  if (loading && classes.length === 0) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    )
  }
  if (permissionsLoading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!canView) return <div className="p-6">ليس لديك صلاحية</div>

  const selectedClassData = classes.find(c => c.id === selectedClass)
  const absentCount = stats.absent

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            الحضور والغياب
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل حضور التلاميذ + إشعار الأولياء (إيميل + WhatsApp)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {absentCount > 0 && (
            <button
              onClick={handleWhatsAppAllAbsents}
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-lg hover:bg-[#1da851] font-medium text-sm shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp للغائبين ({absentCount})
            </button>
          )}
          <button
            onClick={loadAttendance}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium text-sm"
          >
            <Download className="h-4 w-4" /> تصدير Excel
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              التاريخ
            </label>
            <DateInput value={date} onChange={setDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="inline h-4 w-4 mr-1" />
              القسم
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {classes.length === 0 ? (
                <option value="">لا توجد أقسام في هذه السنة</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.id}>{c.level_name} - {c.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-blue-50 border border-blue-200 px-4 h-11 rounded-lg hover:bg-blue-100 transition">
              <input
                type="checkbox"
                checked={sendNotifications}
                onChange={(e) => setSendNotifications(e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded"
              />
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">إشعار الأولياء</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Users className="h-3.5 w-3.5" /> الإجمالي
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> حاضر
          </div>
          <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 text-red-600 text-xs mb-1">
            <XCircle className="h-3.5 w-3.5" /> غائب
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
            <Clock className="h-3.5 w-3.5" /> متأخر
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
            <AlertCircle className="h-3.5 w-3.5" /> مبرر
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.excused}</p>
        </div>
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-slate-600">تعيين الكل :</span>
          {STATUS_OPTIONS.map(opt => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => setAllStatus(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition ${opt.light} hover:opacity-80`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            )
          })}

          <div className="flex-1"></div>

          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث..."
              className="w-48 pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <p className="text-slate-500">Chargement...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {classes.length === 0 ? 'لا توجد أقسام في السنة الحالية' : 'لا يوجد تلاميذ في هذا القسم'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">مسار</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدخول</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخروج</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ملاحظة</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s, index) => {
                  const att = attendances.get(s.id)
                  if (!att) return null

                  return (
                    <tr key={`${s.id}-${index}`} className={`hover:bg-slate-50 transition ${
                      att.status === 'absent' ? 'bg-red-50/30' :
                      att.status === 'late' ? 'bg-amber-50/30' :
                      att.status === 'excused' ? 'bg-blue-50/30' : ''
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            att.status === 'present' ? 'bg-emerald-500' :
                            att.status === 'absent' ? 'bg-red-500' :
                            att.status === 'late' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}>
                            {s.first_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {s.first_name} {s.last_name}
                            </p>
                            {s.family_phone && (
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span dir="ltr">{s.family_phone}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {s.massar_code || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {STATUS_OPTIONS.map(opt => {
                            const Icon = opt.icon
                            const isActive = att.status === opt.value
                            return (
                              <button
                                key={opt.value}
                                onClick={() => updateStudent(s.id, 'status', opt.value)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                                  isActive
                                    ? `${opt.bg} text-white border-transparent shadow-sm`
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                                title={opt.label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{opt.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={att.check_in_time || ''}
                          onChange={(e) => updateStudent(s.id, 'check_in_time', e.target.value || null)}
                          className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          disabled={att.status === 'absent' || att.status === 'excused'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={att.check_out_time || ''}
                          onChange={(e) => updateStudent(s.id, 'check_out_time', e.target.value || null)}
                          className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          disabled={att.status === 'absent' || att.status === 'excused'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={att.note || ''}
                          onChange={(e) => updateStudent(s.id, 'note', e.target.value || null)}
                          placeholder="ملاحظة..."
                          className="w-full min-w-[120px] px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleWhatsApp(s)}
                          disabled={!s.family_phone}
                          className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                            s.family_phone
                              ? 'bg-[#25D366] text-white hover:bg-[#1da851] shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={s.family_phone ? `WhatsApp ${s.family_phone}` : 'لا يوجد رقم هاتف'}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-600">
              📅 {date} • 🏫 {selectedClassData?.level_name} - {selectedClassData?.name} • 👥 {students.length} تلميذ
              {sendNotifications && <span className="ml-2 text-blue-600">🔔 سيتم إشعار الأولياء</span>}
            </div>
            {canCreate && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium shadow-md"
              >
                <Save className="h-5 w-5" />
                {saving ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}