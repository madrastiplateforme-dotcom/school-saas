'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { ArrowRight, Users } from 'lucide-react'

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  gender: string
  status: string
  enrollments: {
    id: string
    academic_year_id: string
    level_id: string
    class_id: string
    academic_years: { name: string }
    levels: { name: string }
    classes: { name: string }
  }[]
}

export default function FamilyStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const familyId = params.familyId as string

  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const [students, setStudents] = useState<Student[]>([])
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!establishmentId || !familyId) return
    fetchData(establishmentId, familyId)
  }, [establishmentId, familyId])

  const fetchData = async (sid: string, fid: string) => {
    const supabase = createClient()

    // جلب اسم العائلة
    const { data: familyData } = await supabase
      .from('families')
      .select('family_name')
      .eq('id', fid)
      .single()
    if (familyData) setFamilyName(familyData.family_name || '')

    // جلب التلاميذ
    const { data: studentsData, error } = await supabase
      .from('students')
      .select(`
        id, first_name, last_name, massar_code, gender, status,
        enrollments (
          id, academic_year_id, level_id, class_id,
          academic_years (name),
          levels (name),
          classes (name)
        )
      `)
      .eq('family_id', fid)
      .eq('establishment_id', sid)

     if (error) setError(error.message)
     else setStudents((studentsData as any) || [])

    setLoading(false)
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-indigo-600 hover:underline"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          تلاميذ العائلة: {familyName}
        </h1>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        {students.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا يوجد تلاميذ في هذه العائلة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رمز مسار</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجنس</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التسجيل</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.massar_code || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.gender}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.enrollments && student.enrollments.length > 0 ? (
                        <ul className="space-y-1">
                          {student.enrollments.map((enr) => (
                            <li key={enr.id}>
                              {enr.academic_years?.name} - {enr.levels?.name} - {enr.classes?.name || 'Sans classe'}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}