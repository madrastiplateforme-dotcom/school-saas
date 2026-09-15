'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import {
  Shield, Plus, X, Save, Search, RefreshCw, Users, AlertTriangle,
  AlertCircle, Info, Edit, Trash2, Calendar, BookOpen, User as UserIcon,
  Gavel, Filter, ChevronDown,
} from 'lucide-react'

type Discipline = {
  id: string
  student_id: string
  student_name: string
  class_name: string | null
  incident_date: string
  category: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string | null
  created_at: string
}

const CATEGORIES = [
  { value: 'late', labelAr: 'تأخير متكرر' },
  { value: 'absence', labelAr: 'غياب متكرر' },
  { value: 'behavior', labelAr: 'سلوك سيئ' },
  { value: 'disrespect', labelAr: 'عدم احترام' },
  { value: 'violence', labelAr: 'عنف' },
  { value: 'cheating', labelAr: 'غش' },
  { value: 'other', labelAr: 'أخرى' },
]

const SEVERITIES = [
  { value: 'low', labelAr: 'منخفض', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'medium', labelAr: 'متوسط', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'high', labelAr: 'عالي', color: 'bg-rose-100 text-rose-700 border-rose-200' },
]

const categoryLabel = (c: string) =>
  CATEGORIES.find(x => x.value === c)?.labelAr || c
const severityLabel = (s: string) =>
  SEVERITIES.find(x => x.value === s)?.labelAr || s
const severityStyle = (s: string) =>
  SEVERITIES.find(x => x.value === s)?.color || ''

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

export default function DisciplinePage() {
  const establishmentId = useEstablishmentId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form
  const [formStudentId, setFormStudentId] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formCategory, setFormCategory] = useState('behavior')
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high'>('low')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    if (establishmentId) loadData()
  }, [establishmentId])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      // Students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .eq('establishment_id', establishmentId)
        .eq('status', 'active')
        .order('first_name')

      setStudents(studentsData || [])

      // Disciplines avec student + class
      const { data: dData, error: dErr } = await supabase
        .from('disciplines')
        .select(`
          id, student_id, incident_date, category, severity, title, description, created_at,
          students (first_name, last_name)
        `)
        .eq('establishment_id', establishmentId)
        .order('incident_date', { ascending: false })
        .limit(500)

      if (dErr) throw dErr

      const studentIds = (dData || []).map((d: any) => d.student_id)

      // Classes via enrollments
      let enrollmentsData: any[] = []
      if (studentIds.length > 0) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('student_id, classes(name)')
          .in('student_id', studentIds)
          .eq('establishment_id', establishmentId)
          .eq('status', 'active')
        enrollmentsData = enr || []
      }

      const classByStudent: Record<string, string> = {}
      enrollmentsData.forEach((e: any) => {
        if (e.classes?.name && !classByStudent[e.student_id]) {
          classByStudent[e.student_id] = e.classes.name
        }
      })

      const list: Discipline[] = (dData || []).map((d: any) => ({
        id: d.id,
        student_id: d.student_id,
        student_name: `${d.students?.first_name || ''} ${d.students?.last_name || ''}`.trim(),
        class_name: classByStudent[d.student_id] || null,
        incident_date: d.incident_date,
        category: d.category,
        severity: d.severity,
        title: d.title,
        description: d.description,
        created_at: d.created_at,
      }))

      setDisciplines(list)
    } catch (e: any) {
      console.error('[discipline]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setFormStudentId('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormCategory('behavior')
    setFormSeverity('low')
    setFormTitle('')
    setFormDescription('')
    setShowModal(true)
  }

  const openEdit = (d: Discipline) => {
    setEditingId(d.id)
    setFormStudentId(d.student_id)
    setFormDate(d.incident_date)
    setFormCategory(d.category)
    setFormSeverity(d.severity)
    setFormTitle(d.title)
    setFormDescription(d.description || '')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formStudentId || !formTitle.trim()) {
      setError('التلميذ والعنوان مطلوبان')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const payload = {
        establishment_id: establishmentId,
        student_id: formStudentId,
        incident_date: formDate,
        category: formCategory,
        severity: formSeverity,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        reported_by: user?.id || null,
      }

      if (editingId) {
        const { error: upErr } = await supabase
          .from('disciplines')
          .update(payload)
          .eq('id', editingId)
        if (upErr) throw upErr
        setSuccess('✅ تم التحديث')
      } else {
  const { data: newDisc, error: insErr } = await supabase
    .from('disciplines')
    .insert(payload)
    .select('id')
    .single()
  if (insErr) throw insErr

  // 📧 إرسال إيميل للوالد
  if (newDisc?.id) {
    try {
      const res = await fetch('/api/establishment/discipline-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disciplineId: newDisc.id }),
      })
      const json = await res.json()
      if (json.sent) {
        setSuccess('✅ تم تسجيل المخالفة + إرسال إيميل للوالد')
      } else if (json.skipped) {
        setSuccess(`✅ تم تسجيل المخالفة (لم يُرسل إيميل — ${json.reason || ''})`)
      } else {
        setSuccess('✅ تم تسجيل المخالفة')
      }
    } catch (e) {
      console.error('Email send failed:', e)
      setSuccess('✅ تم تسجيل المخالفة (فشل إرسال الإيميل)')
    }
    setTimeout(() => setSuccess(''), 5000)
  } else {
    setSuccess('✅ تم تسجيل المخالفة')
  }
}

      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هاد المخالفة نهائياً؟')) return
    const supabase = createClient()
    const { error: delErr } = await supabase
      .from('disciplines')
      .delete()
      .eq('id', id)
    if (delErr) setError(delErr.message)
    else {
      setSuccess('✅ تم الحذف')
      setTimeout(() => setSuccess(''), 2500)
      await loadData()
    }
  }

  const stats = useMemo(() => {
    return {
      total: disciplines.length,
      low: disciplines.filter(d => d.severity === 'low').length,
      medium: disciplines.filter(d => d.severity === 'medium').length,
      high: disciplines.filter(d => d.severity === 'high').length,
    }
  }, [disciplines])

  const filtered = disciplines.filter(d => {
    if (filterSeverity && d.severity !== filterSeverity) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      d.student_name.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      (d.class_name || '').toLowerCase().includes(q)
    )
  })

  if (loading && disciplines.length === 0) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            الانضباط والمخالفات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تسجيل ومتابعة سلوك التلاميذ
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
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> تسجيل مخالفة
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">المجموع</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Info className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">منخفض</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.low}</div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">متوسط</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.medium}</div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-slate-500">عالي</span>
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats.high}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSeverity('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
              !filterSeverity
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({stats.total})
          </button>
          {SEVERITIES.map(s => (
            <button
              key={s.value}
              onClick={() => setFilterSeverity(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition border ${
                filterSeverity === s.value
                  ? s.color
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.labelAr}
            </button>
          ))}
        </div>

        <div className="flex-1"></div>

        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالتلميذ أو العنوان..."
            className="w-64 pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">
            {disciplines.length === 0
              ? 'ما كايناش مخالفات مسجلة'
              : 'ما لقيناش نتائج'}
          </p>
          {disciplines.length === 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> تسجيل أول مخالفة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden"
            >
              <div className="flex items-stretch">
                {/* Severity bar */}
                <div
                  className={`w-1.5 flex-shrink-0 ${
                    d.severity === 'high'
                      ? 'bg-rose-500'
                      : d.severity === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${severityStyle(d.severity)}`}
                        >
                          {severityLabel(d.severity)}
                        </span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {categoryLabel(d.category)}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(d.incident_date)}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-base mb-1">
                        {d.title}
                      </h3>

                      {d.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                          {d.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {d.student_name}
                        </span>
                        {d.class_name && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {d.class_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Gavel className="h-5 w-5 text-indigo-600" />
                {editingId ? 'تعديل المخالفة' : 'تسجيل مخالفة جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Student */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  التلميذ(ة) *
                </label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                      {s.massar_code ? ` (${s.massar_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    الفئة *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  درجة الخطورة *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setFormSeverity(s.value as any)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition ${
                        formSeverity === s.value
                          ? s.color + ' border-current'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s.labelAr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  العنوان *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: إزعاج داخل القسم"
                  className="w-full h-11 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="تفاصيل إضافية..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end p-6 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}