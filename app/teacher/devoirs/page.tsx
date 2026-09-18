// app/teacher/devoirs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import {
  FileText, RefreshCw, Plus, Edit3, Trash2, X, Save, Calendar,
  BookOpen, AlertCircle, User, Filter, Paperclip,
} from 'lucide-react'

type Devoir = {
  id: string
  title: string
  description: string | null
  due_date: string
  attachment_url: string | null
  subject_id: string
  subject_name: string
  teacher_id: string
  teacher_name: string
  is_mine: boolean
  is_past: boolean
}

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d } }
const todayISO = () => new Date().toISOString().split('T')[0]
const daysUntil = (s: string) => {
  const d = new Date(s); const t = new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0)
  return Math.floor((d.getTime() - t.getTime()) / 86400000)
}

export default function TeacherDevoirsPage() {
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

  const [devoirs, setDevoirs] = useState<Devoir[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', due_date: todayISO(), attachment_url: '',
  })

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (staffId) loadDevoirs() }, [selectedClass, selectedSubject, mineOnly, staffId])

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
      console.error('[teacher-devoirs]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const loadDevoirs = async () => {
    if (!selectedClass) return
    const supabase = createClient()

    let q = supabase
      .from('devoirs')
      .select('id, title, description, due_date, attachment_url, subject_id, teacher_id')
      .eq('class_id', selectedClass)
      .order('due_date', { ascending: true })
      .limit(100)

    if (selectedSubject) q = q.eq('subject_id', selectedSubject)
    if (mineOnly) q = q.eq('teacher_id', staffId)

    const { data: raw, error: err } = await q
    if (err) { console.error(err); setDevoirs([]); return }

    const list = raw || []
    const subjectIds = Array.from(new Set(list.map((d: any) => d.subject_id).filter(Boolean)))
    const teacherIds = Array.from(new Set(list.map((d: any) => d.teacher_id).filter(Boolean)))

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

    const today = new Date(); today.setHours(0,0,0,0)
    const mapped: Devoir[] = list.map((d: any) => {
      const due = new Date(d.due_date); due.setHours(0,0,0,0)
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        due_date: d.due_date,
        attachment_url: d.attachment_url,
        subject_id: d.subject_id,
        subject_name: subjectsMap.get(d.subject_id) || '—',
        teacher_id: d.teacher_id,
        teacher_name: teachersMap.get(d.teacher_id) || '—',
        is_mine: d.teacher_id === staffId,
        is_past: due.getTime() < today.getTime(),
      }
    })
    setDevoirs(mapped)
  }

  const currentClass = classes.find((c) => c.id === selectedClass)
  const availableSubjects = currentClass?.subjects || []

  const openNew = () => {
    setEditingId(null)
    setForm({ title: '', description: '', due_date: todayISO(), attachment_url: '' })
    setShowForm(true)
  }

  const openEdit = (d: Devoir) => {
    setEditingId(d.id)
    setForm({
      title: d.title,
      description: d.description || '',
      due_date: d.due_date,
      attachment_url: d.attachment_url || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date || !selectedSubject) {
      setError('خاص العنوان + تاريخ التسليم + المادة'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('devoirs')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            due_date: form.due_date,
            attachment_url: form.attachment_url.trim() || null,
          })
          .eq('id', editingId).eq('teacher_id', staffId)
        if (err) throw err
      } else {
        const payload: any = {
          establishment_id: estabId,
          class_id: selectedClass,
          subject_id: selectedSubject,
          teacher_id: staffId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          due_date: form.due_date,
          attachment_url: form.attachment_url.trim() || null,
        }
        if (yearId) payload.academic_year_id = yearId
        const { error: err } = await supabase.from('devoirs').insert(payload)
        if (err) throw err
      }
      setShowForm(false); setEditingId(null)
      await loadDevoirs()
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('واش متأكد من الحذف؟')) return
    const supabase = createClient()
    await supabase.from('devoirs').delete().eq('id', id).eq('teacher_id', staffId)
    await loadDevoirs()
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
            <FileText className="h-6 w-6 text-sky-600" /> الفروض
          </h1>
          <p className="text-sm text-gray-500 mt-1">أضف الفروض المنزلية للأقسام</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDevoirs}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={openNew} disabled={!selectedClass || !selectedSubject}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> فرض جديد
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
                  <span className="text-sm font-medium text-slate-700">غير ديالي</span>
                </label>
              </div>
              <div className="flex items-end text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 ml-1" /> {devoirs.length} فرض
              </div>
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sky-600" />
                    {editingId ? 'تعديل فرض' : 'فرض جديد'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}
                    className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العنوان *</label>
                    <input type="text" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="مثال: تمارين صفحة 45"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">الوصف</label>
                    <textarea value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4} placeholder="تفاصيل الفرض..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">تاريخ التسليم *</label>
                      <input type="date" value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">رابط الملف (اختياري)</label>
                      <input type="url" value={form.attachment_url}
                        onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
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

          {devoirs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد فروض مسجلة</p>
              <p className="text-xs text-slate-400 mt-1">اضغط "فرض جديد" للبدء</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devoirs.map((d) => {
                const diff = daysUntil(d.due_date)
                const isOverdue = diff < 0
                const isToday = diff === 0
                const isTomorrow = diff === 1
                const isSoon = diff > 0 && diff <= 3
                return (
                  <div key={d.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition ${
                    isOverdue ? 'border-rose-200' : isToday ? 'border-amber-200' : 'border-gray-100'
                  }`}>
                    <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                      isOverdue ? 'bg-rose-50 border-rose-100'
                        : isToday ? 'bg-amber-50 border-amber-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-md">
                          <BookOpen className="h-3 w-3" /> {d.subject_name}
                        </span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isOverdue ? 'text-rose-700' : isToday ? 'text-amber-700' : 'text-slate-600'
                        }`}>
                          <Calendar className="h-3.5 w-3.5" />
                          {isOverdue ? `فات: ${fmtDate(d.due_date)}`
                            : isToday ? 'اليوم'
                            : isTomorrow ? 'غدا'
                            : isSoon ? `باقي ${diff} أيام`
                            : fmtDate(d.due_date)}
                        </span>
                        {d.is_mine && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">ديالي</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> {d.teacher_name}
                        </span>
                        {d.is_mine && (
                          <>
                            <button onClick={() => openEdit(d)}
                              className="p-1.5 rounded-md text-slate-500 hover:bg-sky-100 hover:text-sky-700">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(d.id)}
                              className="p-1.5 rounded-md text-slate-500 hover:bg-rose-100 hover:text-rose-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <p className="font-bold text-slate-800 text-base">{d.title}</p>
                      {d.description && (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{d.description}</p>
                      )}
                      {d.attachment_url && (
                        <a href={d.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-bold">
                          <Paperclip className="h-3 w-3" /> تحميل الملف
                        </a>
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