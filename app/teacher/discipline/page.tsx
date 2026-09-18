// app/teacher/discipline/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import {
  ShieldAlert, RefreshCw, Plus, Trash2, X, Save, Calendar,
  AlertCircle, Filter, User,
} from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
}

type Discipline = {
  id: string
  incident_date: string
  category: string | null
  severity: string | null
  title: string
  description: string | null
  student_name: string
  is_mine: boolean
  reported_by_id: string | null
}

const SEVERITIES = [
  { value: 'low', label: 'خفيف' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high', label: 'خطير' },
]

const CATEGORIES = [
  'تأخر متكرر',
  'غياب غير مبرر',
  'سلوك غير لائق',
  'عدم إنجاز الفروض',
  'استعمال الهاتف',
  'مشاجرة',
  'أخرى',
]

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}
const todayISO = () => new Date().toISOString().split('T')[0]

export default function TeacherDisciplinePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [authUserId, setAuthUserId] = useState('')   // ⭐ user.id (FK)
  const [estabId, setEstabId] = useState('')

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [mineOnly, setMineOnly] = useState(false)
  const [incidents, setIncidents] = useState<Discipline[]>([])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    student_id: '',
    incident_date: todayISO(),
    category: CATEGORIES[0],
    severity: 'low',
    title: '',
    description: '',
  })

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (selectedClass) loadStudents() }, [selectedClass])
  useEffect(() => {
    if (authUserId && selectedClass) loadIncidents()
  }, [authUserId, selectedClass, mineOnly, students])

  const loadInit = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }
      setAuthUserId(user.id)

      const { establishmentId, classes: list } =
        await fetchTeacherData(supabase, user.id)

      setEstabId(establishmentId || '')
      setClasses(list)
      if (list.length > 0) setSelectedClass(list[0].id)
    } catch (e: any) {
      console.error('[teacher-discipline]', e?.message || e)
      setError(e?.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const loadStudents = async () => {
    const supabase = createClient()
    try {
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')

      const ids = (enrolls || []).map((e: any) => e.student_id).filter(Boolean)
      if (ids.length === 0) { setStudents([]); return }

      const { data: studs } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .in('id', ids)

      const list: Student[] = (studs || [])
        .map((s: any) => ({
          id: s.id,
          first_name: s.first_name || '',
          last_name: s.last_name || '',
          massar_code: s.massar_code || null,
        }))
        .sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        )
      setStudents(list)
    } catch (e: any) {
      console.error('[discipline-loadStudents]', e?.message || e)
    }
  }

  const loadIncidents = async () => {
    if (!estabId) return
    const supabase = createClient()
    try {
      let q = supabase
        .from('disciplines')
        .select('id, incident_date, category, severity, title, description, student_id, reported_by')
        .eq('establishment_id', estabId)
        .order('incident_date', { ascending: false })
        .limit(100)

      if (mineOnly) q = q.eq('reported_by', authUserId)

      const { data: raw, error: qErr } = await q
      if (qErr) {
        console.error('[discipline-loadIncidents]', qErr.message)
        setIncidents([]); return
      }

      const list = raw || []
      const studentIds = Array.from(new Set(list.map((d: any) => d.student_id).filter(Boolean)))

      let studMap = new Map<string, string>()
      if (studentIds.length > 0) {
        const { data: studs } = await supabase
          .from('students').select('id, first_name, last_name').in('id', studentIds)
        ;(studs || []).forEach((s: any) =>
          studMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim())
        )
      }

      const classStudentIds = new Set(students.map((s) => s.id))

      const mapped: Discipline[] = list
        .filter((d: any) => !selectedClass || classStudentIds.has(d.student_id))
        .map((d: any) => ({
          id: d.id,
          incident_date: d.incident_date,
          category: d.category,
          severity: d.severity,
          title: d.title,
          description: d.description,
          student_name: studMap.get(d.student_id) || '—',
          is_mine: d.reported_by === authUserId,
          reported_by_id: d.reported_by,
        }))

      setIncidents(mapped)
    } catch (e: any) {
      console.error('[discipline-loadIncidents]', e?.message || e)
    }
  }

  const openNew = () => {
    setForm({
      student_id: students[0]?.id || '',
      incident_date: todayISO(),
      category: CATEGORIES[0],
      severity: 'low',
      title: '',
      description: '',
    })
    setShowForm(true)
  }

 const handleSave = async () => {
  if (!form.student_id) { setError('خاص تختار تلميذ'); return }
  if (!form.title.trim()) { setError('خاص تكتب عنوان المخالفة'); return }
  if (!estabId || !authUserId) { setError('معلومات ناقصة'); return }

  setSaving(true); setError(''); setSuccess('')
  const supabase = createClient()

  try {
    const payload: any = {
      establishment_id: estabId,
      student_id: form.student_id,
      incident_date: form.incident_date,
      category: form.category,
      severity: form.severity,
      title: form.title.trim(),
      description: form.description.trim() || null,
      reported_by: authUserId,
    }

    const { data: inserted, error: insErr } = await supabase
      .from('disciplines')
      .insert(payload)
      .select('id')
      .single()

    if (insErr) throw insErr

    // ⭐ إيميل المخالفة (fire & forget)
    if (inserted?.id) {
      fetch('/api/teacher/discipline-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disciplineId: inserted.id }),
      }).catch((e) => console.error('[discipline-alert-call]', e))
    }

    setSuccess('✅ تم تسجيل المخالفة — جارٍ إرسال الإشعار')
    setTimeout(() => setSuccess(''), 3000)
    setShowForm(false)
    await loadIncidents()
  } catch (e: any) {
    console.error('[discipline-save]', e?.message || e)
    setError(e?.message || 'فشل الحفظ')
  } finally { setSaving(false) }
}

  const handleDelete = async (id: string) => {
    if (!confirm('واش متأكد؟')) return
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('disciplines').delete()
      .eq('id', id)
      .eq('reported_by', authUserId)
    if (delErr) { setError(delErr.message); return }
    await loadIncidents()
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  const sevLabel = (s: string | null) => {
    if (s === 'high') return { text: 'خطير', color: 'bg-rose-100 text-rose-700' }
    if (s === 'medium') return { text: 'متوسط', color: 'bg-amber-100 text-amber-700' }
    return { text: 'خفيف', color: 'bg-slate-100 text-slate-700' }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-sky-600" /> الانضباط
          </h1>
          <p className="text-sm text-gray-500 mt-1">سجل المخالفات والسلوكيات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadIncidents}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={openNew} disabled={!selectedClass || students.length === 0}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> تسجيل مخالفة
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش أقسام مسندة ليك</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">القسم</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level_name ? `— ${c.level_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500" />
                  <span className="text-sm font-medium text-slate-700">غير ديالي</span>
                </label>
              </div>
              <div className="flex items-end text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 ml-1" /> {incidents.length} حالة
              </div>
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-sky-600" /> تسجيل مخالفة
                  </h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">التلميذ *</label>
                    <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">التاريخ *</label>
                      <input type="date" value={form.incident_date}
                        onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">الخطورة</label>
                      <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                        {SEVERITIES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">التصنيف</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العنوان *</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="ملخص المخالفة"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الوصف</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3} placeholder="تفاصيل..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" />
                  </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">
                    إلغاء
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-medium text-sm disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {incidents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد مخالفات مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((d) => {
                const sev = sevLabel(d.severity)
                return (
                  <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${sev.color}`}>{sev.text}</span>
                        {d.category && (
                          <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md">{d.category}</span>
                        )}
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {fmtDate(d.incident_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-700 flex items-center gap-1">
                          <User className="h-3 w-3" /> {d.student_name}
                        </span>
                        {d.is_mine && (
                          <button onClick={() => handleDelete(d.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-100 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="font-bold text-slate-800">{d.title}</p>
                      {d.description && (
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{d.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}