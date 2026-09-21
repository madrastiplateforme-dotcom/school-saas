'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useIsStaff } from '@/lib/useIsStaff'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  ClipboardList, Plus, Trash2, Pencil, X, Save, RefreshCw,
  Search, Info, GraduationCap, Calendar, Clock, BookOpen,
  Users, ArrowLeft, CheckCircle2, AlertTriangle, FileText,
} from 'lucide-react'

type AcademicYear = { id: string; name: string; is_current: boolean }
type ClassRow = { id: string; name: string; level_id: string | null; level_name: string | null }
type Subject = { id: string; name: string; code: string | null; color: string }
type EvaluationType = { id: string; name_ar: string; code: string }
type Evaluation = {
  id: string
  academic_year_id: string
  class_id: string
  subject_id: string
  term: number
  evaluation_type_id: string
  name: string | null
  date: string | null
  is_active: boolean
  created_at: string
  class_name?: string
  subject_name?: string
  subject_color?: string
  type_name?: string
  grades_count?: number
}

export default function EvaluationsPage() {
  const establishmentId = useEstablishmentId()
  const { isStaff, role, loading: roleLoading } = useIsStaff()
  const { yearId: contextYearId } = useAcademicYear()
  const canManage = role === 'directeur' || role === 'secretaire'
  const [years, setYears] = useState<AcademicYear[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [types, setTypes] = useState<EvaluationType[]>([])
  const isDirector = isStaff
  const [termsCount, setTermsCount] = useState(2)
  const [termNames, setTermNames] = useState<string[]>(['الدورة 1', 'الدورة 2'])

  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterYear, setFilterYear] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Evaluation | null>(null)
  const [formClass, setFormClass] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formType, setFormType] = useState('')
  const [formTerm, setFormTerm] = useState(1)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role || !contextYearId) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, contextYearId])

  const loadData = async () => {
    if (!contextYearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Academic years
    const { data: yearsData } = await supabase
      .from('academic_years')
      .select('id, name, is_current')
      .eq('establishment_id', establishmentId)
      .order('start_date', { ascending: false })
    setYears(yearsData || [])

    // ✅ Default filter = context year
    setFilterYear(contextYearId)

    // Settings
    const { data: settings } = await supabase
      .from('school_settings')
      .select('terms_count, term_names')
      .eq('establishment_id', establishmentId)
      .maybeSingle()

    const tc = Number(settings?.terms_count) || 2
    const tn = Array.isArray(settings?.term_names) && settings.term_names.length > 0
      ? settings.term_names
      : ['الدورة 1', 'الدورة 2']
    setTermsCount(tc)
    setTermNames(tn)

    // ✅ Classes dyal l'année active (mappées vers ClassRow)
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, level_id, levels(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', contextYearId)
      .order('name')

    const mappedClasses: ClassRow[] = (cls || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      level_id: c.level_id,
      level_name: c.levels?.name || null,
    }))
    setClasses(mappedClasses)

    // Subjects (globales)
    const { data: subs } = await supabase
      .from('subjects')
      .select('id, name, code, color')
      .eq('establishment_id', establishmentId)
      .eq('active', true)
      .order('name')
    setSubjects(subs || [])

    // Eval types
    const { data: tps } = await supabase
      .from('evaluation_types')
      .select('id, name_ar, code')
      .eq('establishment_id', establishmentId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    setTypes(tps || [])

    await loadEvaluations(mappedClasses, subs || [], tps || [])

    setLoading(false)
  }

  const loadEvaluations = async (cls: ClassRow[] = classes, subs: Subject[] = subjects, tps: EvaluationType[] = types) => {
    const supabase = createClient()
    const { data: evals, error: eErr } = await supabase
      .from('evaluations')
      .select(`
        id, academic_year_id, class_id, subject_id, term, evaluation_type_id,
        name, date, is_active, created_at
      `)
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })

    if (eErr) {
      setError(eErr.message)
      return
    }

    const evalIds = (evals || []).map(e => e.id)
    const counts: Record<string, number> = {}
    if (evalIds.length > 0) {
      const { data: gr } = await supabase
        .from('grades')
        .select('evaluation_id')
        .in('evaluation_id', evalIds)
      ;(gr || []).forEach((g: any) => {
        counts[g.evaluation_id] = (counts[g.evaluation_id] || 0) + 1
      })
    }

    const enriched: Evaluation[] = (evals || []).map(e => {
      const clsRow = cls.find(c => c.id === e.class_id)
      const sub = subs.find(s => s.id === e.subject_id)
      const tp = tps.find(t => t.id === e.evaluation_type_id)
      return {
        ...e,
        class_name: clsRow?.name || '—',
        subject_name: sub?.name || '—',
        subject_color: sub?.color || '#4F46E5',
        type_name: tp?.name_ar || '—',
        grades_count: counts[e.id] || 0,
      }
    })
    setEvaluations(enriched)
  }

  const resetForm = () => {
    setEditing(null)
    setFormClass('')
    setFormSubject('')
    setFormType(types[0]?.id || '')
    setFormTerm(1)
    setFormName('')
    setFormDate('')
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setFilterYear(contextYearId || '')
    if (filterClass) setFormClass(filterClass)
    if (filterTerm) setFormTerm(Number(filterTerm))
    setShowModal(true)
  }

  const openEdit = (ev: Evaluation) => {
    setEditing(ev)
    setFormClass(ev.class_id)
    setFormSubject(ev.subject_id)
    setFormType(ev.evaluation_type_id)
    setFormTerm(ev.term)
    setFormName(ev.name || '')
    setFormDate(ev.date || '')
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!establishmentId) return
    if (!contextYearId && !editing) { setError('لا توجد سنة دراسية'); return }
    if (!formClass) { setError('اختر القسم'); return }
    if (!formSubject) { setError('اختر المادة'); return }
    if (!formType) { setError('اختر نوع التقييم'); return }

    setSaving(true)
    setError('')
    const supabase = createClient()

    const yearId = editing?.academic_year_id || contextYearId
    const payload = {
      establishment_id: establishmentId,
      academic_year_id: yearId,
      class_id: formClass,
      subject_id: formSubject,
      term: formTerm,
      evaluation_type_id: formType,
      name: formName.trim() || null,
      date: formDate || null,
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('evaluations')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        setSuccess('✅ تم تحديث التقييم')
      } else {
        const { error } = await supabase.from('evaluations').insert(payload)
        if (error) throw error
        setSuccess('✅ تم إنشاء التقييم')
      }
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      resetForm()
      await loadEvaluations()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التقييم و كل النقط المرتبطة به؟')) return
    const supabase = createClient()
    const { error } = await supabase.from('evaluations').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      setSuccess('✅ تم الحذف')
      setTimeout(() => setSuccess(''), 3000)
      await loadEvaluations()
    }
  }

  const handleToggleActive = async (ev: Evaluation) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('evaluations')
      .update({ is_active: !ev.is_active })
      .eq('id', ev.id)
    if (error) setError(error.message)
    else await loadEvaluations()
  }

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      if (filterYear && e.academic_year_id !== filterYear) return false
      if (filterClass && e.class_id !== filterClass) return false
      if (filterTerm && e.term !== Number(filterTerm)) return false
      if (filterSubject && e.subject_id !== filterSubject) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          (e.name || '').toLowerCase().includes(q) ||
          (e.class_name || '').toLowerCase().includes(q) ||
          (e.subject_name || '').toLowerCase().includes(q) ||
          (e.type_name || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [evaluations, filterYear, filterClass, filterTerm, filterSubject, searchTerm])

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!canManage) return <div className="p-6">ليس لديك صلاحية</div>
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            التقييمات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إنشاء الفروض و الامتحانات + إدخال النقط
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={openCreate}
            disabled={!contextYearId || types.length === 0 || classes.length === 0 || subjects.length === 0}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> تقييم جديد
          </button>
        </div>
      </header>

      {error && !showModal && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      {(!contextYearId || types.length === 0 || classes.length === 0 || subjects.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>قبل ما تبدا، خاصك:</strong>
            {!contextYearId && <span> <Link href="/dashboard/academic-years" className="underline">سنة دراسية</Link> ·</span>}
            {classes.length === 0 && <span> <Link href="/dashboard/classes" className="underline">أقسام</Link> ·</span>}
            {subjects.length === 0 && <span> <Link href="/dashboard/subjects" className="underline">مواد</Link> ·</span>}
            {types.length === 0 && <span> <Link href="/dashboard/evaluation-types" className="underline">أنواع التقييمات</Link> ·</span>}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>كيفاش خدام:</strong> كل تقييم كيربط <strong>قسم × مادة × فصل × نوع</strong>. منين تدير التقييم، كتقدر تدخل النقط ديال التلاميذ.
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، القسم، المادة..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل السنوات</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>
                {y.name} {y.is_current ? '(الحالية)' : ''}
              </option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل الأقسام</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل الفصول</option>
            {Array.from({ length: termsCount }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{termNames[i] || `الفصل ${i + 1}`}</option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل المواد</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {(filterYear || filterClass || filterTerm || filterSubject || searchTerm) && (
          <button
            onClick={() => {
              setFilterYear('')
              setFilterClass('')
              setFilterTerm('')
              setFilterSubject('')
              setSearchTerm('')
            }}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            ✕ إزالة كل الفلاتر
          </button>
        )}
      </div>

      {filteredEvaluations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-slate-800">{filteredEvaluations.length}</div>
            <div className="text-xs text-slate-500 mt-1">إجمالي التقييمات</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {filteredEvaluations.reduce((s, e) => s + (e.grades_count || 0), 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">نقطة مسجلة</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-amber-600">
              {filteredEvaluations.filter(e => (e.grades_count || 0) === 0).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">تقييمات بلا نقط</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {new Set(filteredEvaluations.map(e => e.class_id)).size}
            </div>
            <div className="text-xs text-slate-500 mt-1">أقسام معنية</div>
          </div>
        </div>
      )}

      {filteredEvaluations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">
            {evaluations.length === 0 ? 'لا توجد تقييمات بعد' : 'لا توجد نتائج'}
          </p>
          {evaluations.length === 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> إضافة أول تقييم
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvaluations.map(ev => {
            const color = ev.subject_color || '#4F46E5'
            const hasGrades = (ev.grades_count || 0) > 0
            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden group ${
                  !ev.is_active ? 'opacity-60 border-slate-200' : 'border-slate-100'
                }`}
              >
                <div className="h-1.5" style={{ backgroundColor: color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate text-base">
                        {ev.name || ev.type_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{ev.type_name}</p>
                    </div>
                    {hasGrades ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        {ev.grades_count}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg flex-shrink-0">
                        بلا نقط
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <GraduationCap className="h-3.5 w-3.5 opacity-60" />
                      <span className="font-medium">{ev.class_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 opacity-60" style={{ color }} />
                      <span className="font-medium" style={{ color }}>{ev.subject_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3.5 w-3.5 opacity-60" />
                      <span>{termNames[ev.term - 1] || `الفصل ${ev.term}`}</span>
                      {ev.date && (
                        <span className="text-slate-400">· {new Date(ev.date).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/dashboard/evaluations/${ev.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {hasGrades ? 'تعديل النقط' : 'إدخال النقط'}
                    </Link>
                    <button
                      onClick={() => openEdit(ev)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="تعديل"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(ev)}
                      className={`p-2 rounded-lg transition text-xs font-bold ${
                        ev.is_active
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={ev.is_active ? 'نشط' : 'معطّل'}
                    >
                      {ev.is_active ? '●' : '○'}
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'تعديل التقييم' : 'تقييم جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السنة الدراسية <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— اختر السنة —</option>
                    {years.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.is_current ? '(الحالية)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  القسم <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر القسم —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.level_name ? ` (${c.level_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المادة <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر المادة —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع التقييم <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— اختر —</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفصل <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(Number(e.target.value))}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: termsCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {termNames[i] || `الفصل ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم مخصص (اختياري)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: الفرض 1 - الرياضيات"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    تاريخ الإجراء (اختياري)
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}