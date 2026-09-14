'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  ClipboardList, Plus, Trash2, Pencil, X, Save, RefreshCw,
  Search, Info, ToggleLeft, ToggleRight, GripVertical,
} from 'lucide-react'

type EvaluationType = {
  id: string
  code: string
  name_ar: string
  name_fr: string | null
  order_index: number
  is_active: boolean
}

const PRESET_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
]

export default function EvaluationTypesPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [types, setTypes] = useState<EvaluationType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EvaluationType | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formNameAr, setFormNameAr] = useState('')
  const [formNameFr, setFormNameFr] = useState('')
  const [formOrder, setFormOrder] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('evaluation_types')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('order_index', { ascending: true })

    if (error) setError(error.message)
    else setTypes(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setEditing(null)
    setFormCode('')
    setFormNameAr('')
    setFormNameFr('')
    setFormOrder('0')
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setFormOrder(String(types.length + 1))
    setShowModal(true)
  }

  const openEdit = (t: EvaluationType) => {
    setEditing(t)
    setFormCode(t.code)
    setFormNameAr(t.name_ar)
    setFormNameFr(t.name_fr || '')
    setFormOrder(String(t.order_index))
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!establishmentId) return
    if (!formNameAr.trim()) { setError('الاسم بالعربية مطلوب'); return }

    // Code auto-generated إلا ما كانش (slug بسيط)
    let code = formCode.trim().toLowerCase()
    if (!code) {
      code = 'type_' + Date.now().toString(36)
    }
    code = code.replace(/[^a-z0-9_]/g, '_')

    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      establishment_id: establishmentId,
      code,
      name_ar: formNameAr.trim(),
      name_fr: formNameFr.trim() || null,
      order_index: Number(formOrder) || 0,
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('evaluation_types')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        setSuccess('✅ تم التحديث')
      } else {
        const { error } = await supabase.from('evaluation_types').insert(payload)
        if (error) throw error
        setSuccess('✅ تمت الإضافة')
      }
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      resetForm()
      loadData()
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        setError('هاد الكود موجود مسبقاً. بدّل الكود.')
      } else {
        setError(err.message || 'حدث خطأ')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (t: EvaluationType) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('evaluation_types')
      .update({ is_active: !t.is_active })
      .eq('id', t.id)
    if (error) setError(error.message)
    else loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا النوع؟ لا يمكن حذفه إذا كان مستعمل ف تقييمات.')) return
    const supabase = createClient()
    const { error } = await supabase.from('evaluation_types').delete().eq('id', id)
    if (error) {
      if (error.message?.includes('foreign key')) {
        setError('لا يمكن الحذف: هاد النوع مستعمل ف تقييمات. عطّلو بدل.')
      } else {
        setError(error.message)
      }
    } else {
      setSuccess('✅ تم الحذف')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    }
  }

  const filtered = types.filter(t =>
    t.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.name_fr || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            أنواع التقييمات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            الفروض، الامتحانات، و أنواع التقييم الأخرى
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
            <Plus className="h-4 w-4" /> نوع جديد
          </button>
        </div>
      </header>

      {error && !showModal && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>ملاحظة:</strong> هاد الأنواع كتستعمل باش تصنّف التقييمات (فرض 1، فرض 2، امتحان...). منين كتزيد تقييم ف قسم، كتختار النوع ديالو. الأنواع المعطّلة ما كتظهرش ف الاختيار.
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">
            {types.length === 0 ? 'لا توجد أنواع تقييم بعد' : 'لا توجد نتائج'}
          </p>
          {types.length === 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> إضافة أول نوع
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-16">الترتيب</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((t, i) => {
                const color = PRESET_COLORS[i % PRESET_COLORS.length]
                return (
                  <tr key={t.id} className={`hover:bg-gray-50 ${!t.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-500">
                        <GripVertical className="h-4 w-4 opacity-40" />
                        <span className="text-sm font-bold">{t.order_index}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${color.bg} ${color.text} border ${color.border}`}>
                          {t.name_ar}
                        </span>
                        {t.name_fr && (
                          <span className="text-xs text-slate-400">{t.name_fr}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {t.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                          t.is_active
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={t.is_active ? 'نشط - انقر لتعطيله' : 'معطّل - انقر لتفعيله'}
                      >
                        {t.is_active ? (
                          <><ToggleRight className="h-4 w-4" /> نشط</>
                        ) : (
                          <><ToggleLeft className="h-4 w-4" /> معطّل</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'تعديل نوع' : 'إضافة نوع جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم (بالعربية) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثال: الفرض 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم (بالفرنسية)
                </label>
                <input
                  type="text"
                  value={formNameFr}
                  onChange={(e) => setFormNameFr(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Devoir 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الكود
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="devoir1"
                  />
                  <p className="text-xs text-slate-400 mt-1">اختياري - يُنشأ تلقائياً</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الترتيب
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
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