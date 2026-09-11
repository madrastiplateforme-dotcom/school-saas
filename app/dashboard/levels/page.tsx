'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Plus, Trash2, GraduationCap } from 'lucide-react'

type Level = {
  id: string
  name: string
  created_at: string
}

export default function LevelsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewLevels = hasPermission('levels', 'view')
  const canCreateLevels = hasPermission('levels', 'create')

  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchLevels(establishmentId)
  }, [establishmentId])

  const fetchLevels = async (sid: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('levels')
      .select('*')
      .eq('establishment_id', sid)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setLevels(data || [])
    setLoading(false)
  }

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !name.trim()) return
    setAdding(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase
      .from('levels')
      .insert({
        establishment_id: establishmentId,
        name: name.trim(),
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setName('')
      fetchLevels(establishmentId)
    }
    setAdding(false)
  }

    const handleDeleteLevel = async (levelId: string) => {
  const supabase = createClient()

  // فحص إذا كان المستوى مرتبطاً بأقسام أو خدمات أو تسجيلات
  const { count: classCount } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', levelId)

  const { count: servicePriceCount } = await supabase
    .from('service_level_prices')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', levelId)

  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', levelId)

  if ((classCount || 0) > 0 || (servicePriceCount || 0) > 0 || (enrollmentCount || 0) > 0) {
    alert('لا يمكن حذف هذا المستوى لأنه مرتبط ببيانات أخرى. يمكنك فقط تعطيله.')
    return
  }

  if (!confirm('Voulez-vous vraiment supprimer ce niveau ?')) return
  const { error } = await supabase.from('levels').delete().eq('id', levelId)
  if (error) setError(error.message)
  else fetchLevels(establishmentId!)
}

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewLevels) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-indigo-600" />
          Niveaux
        </h1>
        <p className="text-gray-600">Gérez les niveaux de votre établissement</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {canCreateLevels ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Ajouter un niveau</h2>
          <form onSubmit={handleAddLevel} className="flex gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Ex: 1ère Année, 2ème Année BAC..."
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء المستويات.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Liste des niveaux ({levels.length})</h2>
        {levels.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun niveau défini.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {levels.map((level) => (
              <li key={level.id} className="flex justify-between items-center py-3">
                <span className="text-gray-900">{level.name}</span>
                <button
                  onClick={() => handleDeleteLevel(level.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}