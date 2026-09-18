// app/teacher/evaluations/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchTeacherData, TeacherClass } from '@/lib/useTeacherData'
import {
  ClipboardList, RefreshCw, Plus, Trash2, Calendar, X, Save,
  AlertCircle, BookOpen, Filter, Edit3,
} from 'lucide-react'

type EvalType = {
  id: string
  code: string
  name_ar: string
  name_fr: string | null
}

type Evaluation = {
  id: string
  name: string | null
  date: string | null
  term: number
  weight: number
  is_active: boolean
  evaluation_type_id: string
  type_name: string
  type_code: string
  subject_id: string
  subject_name: string
  class_id: string
}

const fmtDate = (d: string | null) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

export default function TeacherEvaluationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [staffId, setStaffId] = useState('')
  const [estabId, setEstabId] = useState('')
  const [yearId, setYearId] = useState('')

  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [evalTypes, setEvalTypes] = useState<EvalType[]>([])

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  const [evaluations, setEvaluations] = useState<Evaluation[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    term: '1',
    evaluation_type_id: '',
    weight: '1',
  })

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (staffId && selectedClass && selectedSubject) loadEvaluations() }, [staffId, selectedClass, selectedSubject])

  const loadInit = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('غير مصرح'); setLoading(false); return }

      const { staffId: sid, establishmentId, classes: list } =
        await fetchTeacherData(supabase, user.id)

      if (!sid || !establishmentId) {
        setError('ملف الأستاذ غير موجود'); setLoading(false); return
      }
      setStaffId(sid)
      setEstabId(establishmentId)

      // Academic year
      const { data: year } = await supabase
        .from('academic_years').select('id')
        .eq('establishment_id', establishmentId).eq('is_current', true).maybeSingle()
      if (year?.id) setYearId(year.id)

      // Evaluation types
      const { data: types } = await supabase
        .from('evaluation_types')
        .select('id, code, name_ar, name_fr')
        .eq('establishment_id', establishmentId)
        .eq('is_active', true)
        .order('order_index')
      setEvalTypes(types || [])

      setClasses(list)
      if (list.length > 0) {
        setSelectedClass(list[0].id)
        if (list[0].subjects.length > 0) setSelectedSubject(list[0].subjects[0].id)
      }
    } catch (e: any) {
      console.error('[teacher-evaluations]', e)
      setError(e.message || 'خطأ')
    } finally { setLoading(false) }
  }

  const loadEvaluations = async () => {
    const supabase = createClient()
    const { data: raw, error: err } = await supabase
      .from('evaluations')
      .select('id, name, date, term, weight, is_active, evaluation_type_id, subject_id, class_id')
      .eq('class_id', selectedClass)
      .eq('subject_id', selectedSubject)
      .order('date', { ascending: false })

    if (err) { console.error(err); setEvaluations([]); return }

    const list = raw || []
    const typeIds = Array.from(new Set(list.map((e: any) => e.evaluation_type_id).filter(Boolean)))

    let typesMap = new Map<string, EvalType>()
    if (typeIds.length > 0) {
      const { data: types } = await supabase
        .from('evaluation_types').select('id, code, name_ar, name_fr').in('id', typeIds)
      ;(types || []).forEach((t: any) => typesMap.set(t.id, t))
    }

    const currentSubject = classes.find((c) => c.id === selectedClass)?.subjects.find((s) => s.id === selectedSubject)

    const mapped: Evaluation[] = list.map((e: any) => {
      const t = typesMap.get(e.evaluation_type_id)
      return {
        id: e.id,
        name: e.name,
        date: e.date,
        term: e.term || 1,
        weight: Number(e.weight) || 1,
        is_active: e.is_active ?? true,
        evaluation_type_id: e.evaluation_type_id,
        type_name: t?.name_ar || '—',
        type_code: t?.code || '—',
        subject_id: e.subject_id,
        subject_name: currentSubject?.name || '—',
        class_id: e.class_id,
      }
    })
    setEvaluations(mapped)
  }

  const currentClass = classes.find((c) => c.id === selectedClass)
  const availableSubjects = currentClass?.subjects || []

  const openNew = () => {
    setEditingId(null)
    setForm({
      name: '',
      date: new Date().toISOString().split('T')[0],
      term: '1',
      evaluation_type_id: evalTypes[0]?.id || '',
      weight: '1',
    })
    setShowForm(true)
  }

  const openEdit = (e: Evaluation) => {
    setEditingId(e.id)
    setForm({
      name: e.name || '',
      date: e.date || new Date().toISOString().split('T')[0],
      term: String(e.term),
      evaluation_type_id: e.evaluation_type_id,
      weight: String(e.weight),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!yearId) { setError('لا توجد سنة دراسية حالية'); return }
    if (!form.evaluation_type_id) { setError('خاص تختار نوع التقييم'); return }
    if (!selectedClass || !selectedSubject) { setError('خاص تختار القسم والمادة'); return }

    setSaving(true); setError(''); setSuccess('')
    const supabase = createClient()
    try {
      const payload: any = {
        establishment_id: estabId,
        academic_year_id: yearId,
        class_id: selectedClass,
        subject_id: selectedSubject,
        term: Number(form.term) || 1,
        evaluation_type_id: form.evaluation_type_id,
        name: form.name.trim() || null,
        date: form.date || null,
        weight: Number(form.weight) || 1,
        is_active: true,
      }

      if (editingId) {
        const { error: err } = await supabase
          .from('evaluations').update(payload).eq('id', editingId)
        if (err) throw err
        setSuccess('✅ تم التحديث')
      } else {
        const { error: err } = await supabase.from('evaluations').insert(payload)
        if (err) throw err
        setSuccess('✅ تمت الإضافة')
      }
      setTimeout(() => setSuccess(''), 2500)
      setShowForm(false)
      setEditingId(null)
      await loadEvaluations()
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('واش متأكد؟ النقط المرتبطين بهاد التقييم غادي يتحيدو.')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('evaluations').delete().eq('id', id)
    if (err) { setError(err.message); return }
    await loadEvaluations()
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
            <ClipboardList className="h-6 w-6 text-sky-600" /> التقييمات
          </h1>
          <p className="text-sm text-gray-500 mt-1">صاوب التقييمات (فروض، امتحانات...)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadEvaluations}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={openNew} disabled={!selectedClass || !selectedSubject || evalTypes.length === 0}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg hover:bg-sky-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> تقييم جديد
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {!yearId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>لا توجد سنة دراسية حالية.</strong> تواصل مع الإدارة باش يعينو السنة الحالية.
          </div>
        </div>
      )}

      {evalTypes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>ما كايناش أنواع تقييمات.</strong> تواصل مع الإدارة باش يصاوبو (فرض 1، فرض 2، امتحان...).
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-end text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 ml-1" /> {evaluations.length} تقييم
              </div>
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-sky-600" />
                    {editingId ? 'تعديل تقييم' : 'تقييم جديد'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }}
                    className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">نوع التقييم *</label>
                    <select value={form.evaluation_type_id}
                      onChange={(e) => setForm({ ...form, evaluation_type_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      {evalTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name_ar} {t.name_fr ? `(${t.name_fr})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">العنوان (اختياري)</label>
                    <input type="text" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="مثال: الفرض 1 - الدورة 1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">التاريخ</label>
                      <input type="date" value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">الدورة (Term)</label>
                      <select value={form.term}
                        onChange={(e) => setForm({ ...form, term: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <option value="1">الدورة 1</option>
                        <option value="2">الدورة 2</option>
                        <option value="3">الدورة 3</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">المعامل (Weight)</label>
                    <input type="number" min="0.5" step="0.5" value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
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

          {evaluations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد تقييمات لهذا القسم والمادة</p>
              <p className="text-xs text-slate-400 mt-1">اضغط "تقييم جديد" للبدء</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-gray-100">
                  <tr className="text-xs font-bold text-slate-600">
                    <th className="text-right px-4 py-3">النوع</th>
                    <th className="text-right px-4 py-3">العنوان</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">التاريخ</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">الدورة</th>
                    <th className="text-right px-4 py-3">المعامل</th>
                    <th className="text-left px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md">
                          {e.type_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{e.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                        د{e.term}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700" dir="ltr">{e.weight}</td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(e)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-sky-100 hover:text-sky-700">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(e.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-100 hover:text-rose-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}