// app/teacher/cahier/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import {
  NotebookPen, RefreshCw, Plus, Edit3, Trash2, X, Save, Calendar,
  BookOpen, AlertCircle, User, Filter,
} from 'lucide-react'

type Entry = {
  id: string
  entry_date: string
  title: string
  content: string | null
  homework: string | null
  subject_id: string
  subject_name: string
  teacher_id: string
  teacher_name: string
  class_id: string
  is_mine: boolean
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const dayName = (d: string) => { try { return AR_DAYS[new Date(d).getDay()] } catch { return '' } }
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
const todayISO = () => new Date().toISOString().split('T')[0]

export default function TeacherCahierPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [staffId, setStaffId] = useState('')
  const [estabId, setEstabId] = useState('')
  const [yearId, setYearId] = useState('')

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [mineOnly, setMineOnly] = useState(false)

  const [entries, setEntries] = useState<Entry[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    entry_date: todayISO(), title: '', content: '', homework: '',
  })

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (staffId) loadEntries() }, [selectedClass, selectedSubject, mineOnly, staffId])

  const loadInit = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      const { staffId: sid, establishmentId, classes: list } =
        await fetchTeacherData(supabase, user.id)

      if (!sid) { setError('ملف الأستاذ غير موجود'); setLoading(false); return }
      setStaffId(sid)
      setEstabId(establishmentId || '')

      const { data: year } = await supabase
        .from('academic_years').select('id')
        .eq('establishment_id', establishmentId).eq('is_current', true).maybeSingle()
      if (year?.id) setYearId(year.id)

      setClasses(list)
      if (list.length > 0) {
        setSelectedClass(list[0].id)
        if (list[0].subjects.length > 0) setSelectedSubject(list[0].subjects[0].id)
      }
    } catch (e: any) {
      console.error('[teacher-cahier]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const loadEntries = async () => {
    if (!selectedClass) return
    const supabase = createClient()

    // 1) entries base
    let q = supabase
      .from('cahier_entries')
      .select('id, entry_date, title, content, homework, class_id, subject_id, teacher_id')
      .eq('class_id', selectedClass)
      .order('entry_date', { ascending: false })
      .limit(100)

    if (selectedSubject) q = q.eq('subject_id', selectedSubject)
    if (mineOnly) q = q.eq('teacher_id', staffId)

    const { data: raw, error: err } = await q
    if (err) { console.error(err); setEntries([]); return }

    const list = raw || []

    // 2) subjects names
    const subjectIds = Array.from(new Set(list.map((e: any) => e.subject_id).filter(Boolean)))
    const teacherIds = Array.from(new Set(list.map((e: any) => e.teacher_id).filter(Boolean)))

    let subjectsMap = new Map<string, string>()
    let teachersMap = new Map<string, string>()

    if (subjectIds.length > 0) {
      const { data: subjs } = await supabase
        .from('subjects').select('id, name').in('id', subjectIds)
      ;(subjs || []).forEach((s: any) => subjectsMap.set(s.id, s.name))
    }
    if (teacherIds.length > 0) {
      const { data: staffs } = await supabase
        .from('staff').select('id, full_name').in('id', teacherIds)
      ;(staffs || []).forEach((s: any) => teachersMap.set(s.id, s.full_name))
    }

    const mapped: Entry[] = list.map((e: any) => ({
      id: e.id,
      entry_date: e.entry_date,
      title: e.title,
      content: e.content,
      homework: e.homework,
      subject_id: e.subject_id,
      subject_name: subjectsMap.get(e.subject_id) || '—',
      teacher_id: e.teacher_id,
      teacher_name: teachersMap.get(e.teacher_id) || '—',
      class_id: e.class_id,
      is_mine: e.teacher_id === staffId,
    }))
    setEntries(mapped)
  }

  const currentClass = classes.find((c) => c.id === selectedClass)
  const availableSubjects = currentClass?.subjects || []

  const openNew = () => {
    setEditingId(null)
    setForm({ entry_date: todayISO(), title: '', content: '', homework: '' })
    setShowForm(true)
  }

  const openEdit = (e: Entry) => {
    setEditingId(e.id)
    setForm({
      entry_date: e.entry_date,
      title: e.title,
      content: e.content || '',
      homework: e.homework || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.entry_date || !selectedSubject) {
      setError('خاص العنوان + التاريخ + المادة'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('cahier_entries')
          .update({
            entry_date: form.entry_date,
            title: form.title.trim(),
            content: form.content.trim() || null,
            homework: form.homework.trim() || null,
          })
          .eq('id', editingId)
          .eq('teacher_id', staffId)
        if (err) throw err
      } else {
        const payload: any = {
          establishment_id: estabId,
          class_id: selectedClass,
          subject_id: selectedSubject,
          teacher_id: staffId,
          entry_date: form.entry_date,
          title: form.title.trim(),
          content: form.content.trim() || null,
          homework: form.homework.trim() || null,
        }
        if (yearId) payload.academic_year_id = yearId
        const { error: err } = await supabase.from('cahier_entries').insert(payload)
        if (err) throw err
      }
      setShowForm(false); setEditingId(null)
      await loadEntries()
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('واش متأكد من الحذف؟')) return
    const supabase = createClient()
    await supabase.from('cahier_entries').delete().eq('id', id).eq('teacher_id', staffId)
    await loadEntries()
  }

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <NotebookPen className="h-6 w-6 text-sky-600" /> دفتر النصوص
          </h1>
          <p className="text-sm text-gray-500 mt-1">سجّل الدروس اليومية والعمل المنزلي</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadEntries}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={openNew} disabled={!selectedClass || !selectedSubject}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> درس جديد
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">ما عندكش أقسام مسندة ليك</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">القسم</label>
                <select value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value)
                    const c = classes.find((x) => x.id === e.target.value)
                    setSelectedSubject(c?.subjects[0]?.id || '')
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level_name ? `— ${c.level_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">المادة</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500" />
                  <span className="text-sm font-medium text-slate-700">غير دروسي</span>
                </label>
              </div>
              <div className="flex items-end text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 ml-1" /> {entries.length} درس
              </div>
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-sky-600" />
                    {editingId ? 'تعديل درس' : 'درس جديد'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}
                    className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">التاريخ *</label>
                    <input type="date" value={form.entry_date}
                      onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العنوان *</label>
                    <input type="text" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="مثال: Les fractions"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">محتوى الدرس</label>
                    <textarea value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={4} placeholder="تفاصيل الدرس..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العمل المنزلي</label>
                    <textarea value={form.homework}
                      onChange={(e) => setForm({ ...form, homework: e.target.value })}
                      rows={3} placeholder="التمارين المنزلية..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" />
                  </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">
                    إلغاء
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-medium text-sm disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <NotebookPen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد دروس مسجلة</p>
              <p className="text-xs text-slate-400 mt-1">اضغط "درس جديد" للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
                  <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                    e.is_mine ? 'bg-sky-50/60 border-sky-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-md">
                        <BookOpen className="h-3 w-3" /> {e.subject_name}
                      </span>
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dayName(e.entry_date)} {fmtDate(e.entry_date)}
                      </span>
                      {e.is_mine && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          درسي
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> {e.teacher_name}
                      </span>
                      {e.is_mine && (
                        <>
                          <button onClick={() => openEdit(e)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-sky-100 hover:text-sky-700">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(e.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-100 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="font-bold text-slate-800 text-base">{e.title}</p>
                    {e.content && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                    )}
                    {e.homework && (
                      <div className="bg-amber-50 border border-amber-200 border-r-4 border-r-amber-500 rounded-lg p-3">
                        <p className="text-xs font-bold text-amber-900 mb-1">العمل المنزلي</p>
                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{e.homework}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}