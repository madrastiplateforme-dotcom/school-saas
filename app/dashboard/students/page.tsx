'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import DateInput from '@/components/DateInput'
import { Search, GraduationCap, UserMinus, Eye, Pencil, Trash2 } from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string
  gender: string
  birth_date: string | null
  status: string
  family_id: string | null
  families: {
    family_name: string
    father_name: string
    mother_name: string
  } | null
  enrollments: {
    id: string
    academic_year_id: string
    level_id: string
    class_id: string
    status: string
    academic_years: { name: string }
    levels: { name: string }
    classes: { name: string }
  }[]
}

export default function StudentsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewStudents = hasPermission('students', 'view')
  const canEditStudents = hasPermission('students', 'edit')

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editMassarCode, setEditMassarCode] = useState('')
  const [editGender, setEditGender] = useState('ذكر')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [departStudent, setDepartStudent] = useState<Student | null>(null)
  const [departDate, setDepartDate] = useState('')
  const [departReason, setDepartReason] = useState('')
  const [savingDepart, setSavingDepart] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchAllData(establishmentId)
  }, [establishmentId])

  const fetchAllData = async (sid: string) => {
    const supabase = createClient()
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        *,
        families (family_name, father_name, mother_name),
        enrollments (
          id, academic_year_id, level_id, class_id, status,
          academic_years (name),
          levels (name),
          classes (name)
        )
      `)
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (studentsError) setError(studentsError.message)
    else setStudents(studentsData || [])
    setLoading(false)
  }

  const handleEditStudent = (student: Student) => {
    setEditStudent(student)
    setEditFirstName(student.first_name)
    setEditLastName(student.last_name)
    setEditMassarCode(student.massar_code || '')
    setEditGender(student.gender)
    setEditBirthDate(student.birth_date || '')
  }

  const handleSaveEdit = async () => {
    if (!editStudent || !establishmentId) return
    setSavingEdit(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('students')
      .update({
        first_name: editFirstName,
        last_name: editLastName,
        massar_code: editMassarCode || null,
        gender: editGender,
        birth_date: editBirthDate || null,
      })
      .eq('id', editStudent.id)
    if (!error) {
      setEditStudent(null)
      fetchAllData(establishmentId)
    } else {
      setError(error.message)
    }
    setSavingEdit(false)
  }

  const handleDeleteStudent = async (studentId: string) => {
    const supabase = createClient()
    const { count: enrollmentCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('student_id', studentId)
    const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('student_id', studentId)
    const { count: installmentCount } = await supabase.from('installments').select('*', { count: 'exact', head: true }).eq('student_id', studentId)
    const { count: paymentCount } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('student_id', studentId)

    if ((enrollmentCount || 0) > 0 || (contractCount || 0) > 0 || (installmentCount || 0) > 0 || (paymentCount || 0) > 0) {
      alert('لا يمكن حذف هذا التلميذ لأن لديه تاريخ أكاديمي ومالي.')
      return
    }
    if (!confirm('Voulez-vous vraiment supprimer cet élève ?')) return
    const { error } = await supabase.from('students').delete().eq('id', studentId)
    if (error) setError(error.message)
    else fetchAllData(establishmentId!)
  }

  const handleDepartStudent = async () => {
    if (!departStudent || !departDate) return
    setSavingDepart(true)
    const supabase = createClient()
    try {
      await supabase.from('students').update({ status: 'left' }).eq('id', departStudent.id)
      await supabase.from('enrollments').update({ status: 'completed' }).eq('student_id', departStudent.id).eq('status', 'active')
      await supabase.from('contracts').update({ status: 'completed', end_date: departDate }).eq('student_id', departStudent.id).eq('status', 'active')
      await supabase.from('installments').update({ status: 'cancelled' }).eq('student_id', departStudent.id).gt('due_date', departDate).in('status', ['pending', 'partially_paid'])
      setDepartStudent(null)
      setDepartDate('')
      fetchAllData(establishmentId!)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingDepart(false)
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.massar_code || '').includes(searchTerm) ||
    (s.families?.family_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canViewStudents) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Élèves</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 h-10 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Rechercher..."
          />
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nom complet</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Massar</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sexe</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Famille</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inscription</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredStudents.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Aucun élève</td></tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.first_name} {student.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.massar_code || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.families?.family_name || student.families?.father_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {student.enrollments && student.enrollments.length > 0 ? (
                      student.enrollments.map((enr) => (
                        <div key={enr.id} className="text-xs">{enr.academic_years?.name} - {enr.levels?.name} - {enr.classes?.name || 'Sans classe'}</div>
                      ))
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'left' ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {student.status === 'active' ? 'نشط' : student.status === 'left' ? 'غادر' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/dashboard/student-finance/${student.id}`)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="الوضعية المالية"><Eye className="h-4 w-4" /></button>
                      {canEditStudents && student.status === 'active' && (
                        <>
                          <button onClick={() => handleEditStudent(student)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="تعديل"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => { setDepartStudent(student); setDepartDate(new Date().toISOString().split('T')[0]) }} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="تسجيل مغادرة"><UserMinus className="h-4 w-4" /></button>
                        </>
                      )}
                      <button onClick={() => handleDeleteStudent(student.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
{/* Edit modal */}
{editStudent && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">تعديل تلميذ</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الاسم الشخصي <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editFirstName}
            onChange={(e) => setEditFirstName(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: أحمد"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الاسم العائلي <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editLastName}
            onChange={(e) => setEditLastName(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: العلوي"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رمز مسار (Code Massar)
          </label>
          <input
            type="text"
            value={editMassarCode}
            onChange={(e) => setEditMassarCode(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: A123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الجنس <span className="text-red-500">*</span>
          </label>
          <select
            value={editGender}
            onChange={(e) => setEditGender(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="ذكر">ذكر</option>
            <option value="أنثى">أنثى</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            تاريخ الازدياد
          </label>
          <DateInput
            value={editBirthDate}
            onChange={(isoDate) => setEditBirthDate(isoDate)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={handleSaveEdit}
            disabled={savingEdit}
            className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingEdit ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={() => setEditStudent(null)}
            className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Depart modal */}
{departStudent && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6">
      <h3 className="text-lg font-semibold mb-4">تسجيل مغادرة</h3>
      <p className="mb-4 text-gray-700">
        التلميذ: <span className="font-medium">{departStudent.first_name} {departStudent.last_name}</span>
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            تاريخ المغادرة <span className="text-red-500">*</span>
          </label>
          <DateInput
            value={departDate}
            onChange={(isoDate) => setDepartDate(isoDate)}
            className="h-10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سبب المغادرة
          </label>
          <textarea
            value={departReason}
            onChange={(e) => setDepartReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="مثال: انتقال إلى مدينة أخرى"
          ></textarea>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={handleDepartStudent}
            disabled={savingDepart}
            className="h-10 px-6 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {savingDepart ? 'جارٍ الحفظ...' : 'تأكيد المغادرة'}
          </button>
          <button
            onClick={() => setDepartStudent(null)}
            className="h-10 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      {/* Depart modal */}
      {departStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">تسجيل مغادرة</h3>
            <p className="mb-4">{departStudent.first_name} {departStudent.last_name}</p>
            <div className="space-y-4">
              <DateInput
                value={departDate}
                onChange={(isoDate) => setDepartDate(isoDate)}
                className="h-10"
              />
              <textarea value={departReason} onChange={(e) => setDepartReason(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="سبب المغادرة"></textarea>
              <div className="flex gap-2 justify-end">
                <button onClick={handleDepartStudent} disabled={savingDepart} className="h-10 px-4 bg-orange-600 text-white rounded-lg">تأكيد</button>
                <button onClick={() => setDepartStudent(null)} className="h-10 px-4 bg-white border border-gray-300 rounded-lg">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}