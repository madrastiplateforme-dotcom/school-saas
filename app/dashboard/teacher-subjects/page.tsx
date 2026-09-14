'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  BookOpen, Plus, Trash2, Pencil, X, Save, Search,
  RefreshCw, Users, GraduationCap, Clock, Link2, AlertTriangle,
} from 'lucide-react'

type Teacher = {
  id: string
  full_name: string
  type: string
  status: string | null
}

type Subject = {
  id: string
  name: string
  code: string | null
  color: string
}

type Level = {
  id: string
  name: string
}

type TeacherSubject = {
  id: string
  teacher_id: string
  subject_id: string
  level_id: string | null
  weekly_hours: number
  created_at: string
}

export default function TeacherSubjectsPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [links, setLinks] = useState<TeacherSubject[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterLevel, setFilterLevel] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TeacherSubject | null>(null)
  const [formTeacher, setFormTeacher] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formLevel, setFormLevel] = useState('') // '' = all levels
  const [formWeeklyHours, setFormWeeklyHours] = useState('4')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    // 1. Teachers (staff type='teacher' + active)
    const { data: teachersData, error: tErr } = await supabase
      .from('staff')
      .select('id, full_name, type, status')
      .eq('establishment_id', establishmentId)
      .eq('type', 'teacher')
      .order('full_name', { ascending: true })

    if (tErr) setError(tErr.message)
    setTeachers(teachersData || [])

    // 2. Subjects (active)
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, code, color')
      .eq('establishment_id', establishmentId)
      .order('name', { ascending: true })

    setSubjects(subjectsData || [])

    // 3. Levels
    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .order('name', { ascending: true })

    setLevels(levelsData || [])

    // 4. Teacher-Subjects links
    const { data: linksData, error: lErr } = await supabase
      .from('teacher_subjects')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: false })

    if (lErr) setError(lErr.message)
    else setLinks(linksData || [])

    setLoading(false)
  }

  const resetForm = () => {
    setEditing(null)
    setFormTeacher('')
    setFormSubject('')
    setFormLevel('')
    setFormWeeklyHours('4')
    setError('')
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (link: TeacherSubject) => {
    setEditing(link)
    setFormTeacher(link.teacher_id)
    setFormSubject(link.subject_id)
    setFormLevel(link.level_id || '')
    setFormWeeklyHours(String(link.weekly_hours || 0))
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!establishmentId) return
    if (!formTeacher) { setError('يرجى اختيار الأستاذ'); return }
    if (!formSubject) { setError('يرجى اختيار المادة'); return }

    const hours = Number(formWeeklyHours)
    if (isNaN(hours) || hours <= 0) {
      setError('عدد الساعات الأسبوعية يجب أن يكون أكبر من 0')
      return
    }

    // Vérif doublon (même prof + matière + niveau)
    const duplicate = links.find(
      l =>
        l.teacher_id === formTeacher &&
        l.subject_id === formSubject &&
        (l.level_id || '') === formLevel &&
        l.id !== editing?.id
    )
    if (duplicate) {
      setError('هذا الربط موجود مسبقاً (نفس الأستاذ + المادة + المستوى)')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      establishment_id: establishmentId,
      teacher_id: formTeacher,
      subject_id: formSubject,
      level_id: formLevel || null,
      weekly_hours: hours,
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('teacher_subjects')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        setSuccess('✅ تم تحديث الربط')
      } else {
        const { error } = await supabase.from('teacher_subjects').insert(payload)
        if (error) throw error
        setSuccess('✅ تم إضافة الربط')
      }

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
    if (!confirm('هل تريد حذف هذا الربط؟')) return
    const supabase = createClient()
    const { error } = await supabase.from('teacher_subjects').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      setSuccess('✅ تم حذف الربط')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    }
  }

  // Helpers
  const getTeacherName = (id: string) =>
    teachers.find(t => t.id === id)?.full_name || '—'
  const getSubject = (id: string) => subjects.find(s => s.id === id)
  const getLevelName = (id: string | null) =>
    id ? levels.find(l => l.id === id)?.name || '—' : 'كل المستويات'

  // Filtered
  const filtered = links.filter(l => {
    const teacherName = getTeacherName(l.teacher_id).toLowerCase()
    const subject = getSubject(l.subject_id)
    const subjectName = (subject?.name || '').toLowerCase()
    const q = searchTerm.toLowerCase()

    const matchSearch =
      !q || teacherName.includes(q) || subjectName.includes(q)
    const matchTeacher = !filterTeacher || l.teacher_id === filterTeacher
    const matchSubject = !filterSubject || l.subject_id === filterSubject
    const matchLevel =
      !filterLevel ||
      (filterLevel === '__all__' ? !l.level_id : l.level_id === filterLevel)

    return matchSearch && matchTeacher && matchSubject && matchLevel
  })

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  const noTeachers = teachers.length === 0
  const noSubjects = subjects.length === 0

  return (
    <div className="p-6 space-y-6" dir="rtl">

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-indigo-600" />
            الأساتذة والمواد
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ربط الأساتذة بالمواد + تحديد الساعات الأسبوعية
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
            disabled={noTeachers || noSubjects}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> ربط جديد
          </button>
        </div>
      </header>

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* تحذير إلا ما كانوش أساتذة / مواد */}
      {(noTeachers || noSubjects) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>تنبيه:</strong>
            {noTeachers && <span> لا يوجد أساتذة (أضف من صفحة "الموظفون" بنوع Enseignant).</span>}
            {noSubjects && <span> لا توجد مواد (أضف من صفحة "المواد").</span>}
          </div>
        </div>
      )}

      {/* Search + Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو المادة..."
            className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل الأساتذة</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
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

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">كل المستويات</option>
            <option value="__all__">— بدون مستوى (كولشي) —</option>
            {levels.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Link2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-4">
            {links.length === 0 ? 'لا توجد روابط بعد' : 'لا توجد نتائج'}
          </p>
          {links.length === 0 && !noTeachers && !noSubjects && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> إضافة أول ربط
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأستاذ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المادة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستوى</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الساعات/الأسبوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((l) => {
                const subject = getSubject(l.subject_id)
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                          {getTeacherName(l.teacher_id).charAt(0)}
                        </span>
                        {getTeacherName(l.teacher_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {subject ? (
                        <span
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: subject.color }}
                        >
                          <BookOpen className="h-3 w-3" />
                          {subject.name}
                          {subject.code && (
                            <span className="opacity-80 font-mono">({subject.code})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {l.level_id ? (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {getLevelName(l.level_id)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                          <Users className="h-3.5 w-3.5" />
                          كل المستويات
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {l.weekly_hours} س
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(l)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'تعديل الربط' : 'ربط جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الأستاذ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر الأستاذ —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
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
                    <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المستوى
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— كل المستويات (عام) —</option>
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  اتركه فارغاً إذا كان الأستاذ يدرس هذه المادة في جميع المستويات
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عدد الساعات الأسبوعية <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  step="1"
                  value={formWeeklyHours}
                  onChange={(e) => setFormWeeklyHours(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                />
              </div>

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