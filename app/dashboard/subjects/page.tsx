'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  BookOpen, Plus, Trash2, Pencil, X, Save, Search,
  RefreshCw, Palette, Clock, Percent, GraduationCap,
} from 'lucide-react'

type Subject = {
  id: string
  name: string
  code: string | null
  color: string
  default_duration: number
  active: boolean
}

type Level = {
  id: string
  name: string
}

type CoefficientMap = Record<string, string> // { levelId: "coefficient" }

const PRESET_COLORS = [
  '#4F46E5', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#14B8A6',
]

export default function SubjectsPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [color, setColor] = useState('#4F46E5')
  const [defaultDuration, setDefaultDuration] = useState('60')
  const [coefficients, setCoefficients] = useState<CoefficientMap>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    // 1. Jib les niveaux
    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .order('name', { ascending: true })

    setLevels(levelsData || [])

    // 2. Jib les matières
    const { data: subjectsData, error: subErr } = await supabase
      .from('subjects')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('name', { ascending: true })

    if (subErr) setError(subErr.message)
    else setSubjects(subjectsData || [])

    setLoading(false)
  }

  const loadCoefficientsForSubject = async (subjectId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('subject_level_coefficients')
      .select('level_id, coefficient')
      .eq('subject_id', subjectId)
      .eq('establishment_id', establishmentId)

    const map: CoefficientMap = {}
    ;(data || []).forEach((c: any) => {
      map[c.level_id] = String(c.coefficient)
    })
    return map
  }

  const resetForm = () => {
    setEditingSubject(null)
    setName('')
    setCode('')
    setColor('#4F46E5')
    setDefaultDuration('60')
    setCoefficients({})
    setError('')
  }

  const handleOpenCreate = () => {
    resetForm()
    // Initialise coefficients vides pour koul niveau
    const initial: CoefficientMap = {}
    levels.forEach(l => { initial[l.id] = '1' })
    setCoefficients(initial)
    setShowModal(true)
  }

  const handleOpenEdit = async (subject: Subject) => {
    setEditingSubject(subject)
    setName(subject.name)
    setCode(subject.code || '')
    setColor(subject.color || '#4F46E5')
    setDefaultDuration(String(subject.default_duration || 60))

    // Jib coefficients
    const map = await loadCoefficientsForSubject(subject.id)
    // Rempli les niveaux vides b "1"
    levels.forEach(l => {
      if (!map[l.id]) map[l.id] = '1'
    })
    setCoefficients(map)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('اسم المادة مطلوب')
      return
    }
    if (!establishmentId) return

    setSaving(true)
    setError('')

    const supabase = createClient()
    const subjectPayload = {
      establishment_id: establishmentId,
      name: name.trim(),
      code: code.trim() || null,
      color,
      default_duration: Number(defaultDuration) || 60,
      active: true,
    }

    try {
      let subjectId: string

      if (editingSubject) {
        // Update
        const { error } = await supabase
          .from('subjects')
          .update(subjectPayload)
          .eq('id', editingSubject.id)
        if (error) throw error
        subjectId = editingSubject.id

        // Msa7 les anciens coefficients
        await supabase
          .from('subject_level_coefficients')
          .delete()
          .eq('subject_id', subjectId)
          .eq('establishment_id', establishmentId)
      } else {
        // Insert
        const { data, error } = await supabase
          .from('subjects')
          .insert(subjectPayload)
          .select()
          .single()
        if (error) throw error
        subjectId = data.id
      }

      // Zid les coefficients
      const coeffRows = Object.entries(coefficients)
        .filter(([_, value]) => value && Number(value) > 0)
        .map(([levelId, value]) => ({
          establishment_id: establishmentId,
          subject_id: subjectId,
          level_id: levelId,
          coefficient: Number(value),
        }))

      if (coeffRows.length > 0) {
        const { error: coeffErr } = await supabase
          .from('subject_level_coefficients')
          .insert(coeffRows)
        if (coeffErr) throw coeffErr
      }

      setSuccess(editingSubject ? '✅ تم تحديث المادة' : '✅ تم إضافة المادة')
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذه المادة؟')) return
    const supabase = createClient()

    // Msa7 coefficients l'awlin
    await supabase
      .from('subject_level_coefficients')
      .delete()
      .eq('subject_id', id)
      .eq('establishment_id', establishmentId)

    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      setSuccess('✅ تم حذف المادة')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    }
  }

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            المواد الدراسية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة المواد + المعامل حسب كل مستوى
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
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> مادة جديدة
          </button>
        </div>
      </header>

      {error && !showModal && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      {levels.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          ⚠️ <strong>ملاحظة:</strong> لا توجد مستويات. أضف المستويات أولاً من صفحة "المستويات" باخ يتسنى لك تحديد المعامل لكل مستوى.
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث عن مادة..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">
            {subjects.length === 0 ? 'لا توجد مواد بعد' : 'لا توجد نتائج'}
          </p>
          {subjects.length === 0 && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> إضافة أول مادة
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="h-2" style={{ backgroundColor: s.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{s.name}</p>
                      {s.code && <p className="text-xs text-slate-400 font-mono">{s.code}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-4 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                    <Clock className="h-3 w-3" /> {s.default_duration} د
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-medium transition"
                  >
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="inline-flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-medium transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingSubject ? 'تعديل مادة' : 'إضافة مادة جديدة'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المادة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: الرياضيات"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرمز (اختياري)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="MATH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المدة (دقيقة)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Palette className="inline h-4 w-4 mr-1" /> اللون
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-lg transition ${
                        color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* ✅ Coefficients par niveau */}
              {levels.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    المعامل حسب المستوى
                  </h4>
                  <div className="space-y-2">
                    {levels.map(l => (
                      <div key={l.id} className="flex items-center gap-3">
                        <label className="flex-1 text-sm text-slate-700">
                          {l.name}
                        </label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={coefficients[l.id] || '1'}
                          onChange={(e) => setCoefficients(prev => ({
                            ...prev,
                            [l.id]: e.target.value,
                          }))}
                          className="w-24 h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                        />
                        <Percent className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
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