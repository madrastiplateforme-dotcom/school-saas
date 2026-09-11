'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Plus, Trash2, BookOpen } from 'lucide-react'

type Classe = {
  id: string
  name: string
  level_id: string | null
  levels: { name: string } | null
  academic_year_id: string | null
  academic_years: { name: string } | null
}

type Level = {
  id: string
  name: string
}

type AcademicYear = {
  id: string
  name: string
  is_current: boolean
}

export default function ClassesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewClasses = hasPermission('classes', 'view')
  const canCreateClasses = hasPermission('classes', 'create')

  const [classes, setClasses] = useState<Classe[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [levelId, setLevelId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchData(establishmentId)
  }, [establishmentId])

  const fetchData = async (sid: string) => {
    const supabase = createClient()

    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        levels (name),
        academic_years (name)
      `)
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (classesError) setError(classesError.message)
    else setClasses(classesData || [])

    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name')
      .eq('establishment_id', sid)

    setLevels(levelsData || [])

    const { data: yearsData } = await supabase
      .from('academic_years')
      .select('id, name, is_current')
      .eq('establishment_id', sid)

    setAcademicYears(yearsData || [])

    setLoading(false)
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !name.trim()) return
    setAdding(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase
      .from('classes')
      .insert({
        establishment_id: establishmentId,
        name: name.trim(),
        level_id: levelId || null,
        academic_year_id: academicYearId || null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setLevelId('')
      setAcademicYearId('')
      fetchData(establishmentId)
    }
    setAdding(false)
  }

     const handleDeleteClass = async (classId: string) => {
  const supabase = createClient()
  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)

  if ((enrollmentCount || 0) > 0) {
    alert('لا يمكن حذف هذا القسم لأنه مرتبط بتسجيلات.')
    return
  }

  if (!confirm('Voulez-vous vraiment supprimer cette classe ?')) return
  const { error } = await supabase.from('classes').delete().eq('id', classId)
  if (error) setError(error.message)
  else fetchData(establishmentId!)
}

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewClasses) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          Classes
        </h1>
        <p className="text-gray-600">Gérez les classes de votre établissement</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {canCreateClasses ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Ajouter une classe</h2>
          <form onSubmit={handleAddClass} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ex: 6ème A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Niveau</label>
              <select
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Année scolaire</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}{year.is_current ? ' (Actuelle)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={adding}
                className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {adding ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء الأقسام.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Liste des classes ({classes.length})</h2>
        {classes.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune classe.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Niveau</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Année</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classe) => (
                <tr key={classe.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{classe.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{classe.levels?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{classe.academic_years?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDeleteClass(classe.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}