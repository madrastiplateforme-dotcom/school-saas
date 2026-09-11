'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { Plus, Trash2, Wrench } from 'lucide-react'

type Level = {
  id: string
  name: string
}

type Service = {
  id: string
  name: string
  description: string
  type: string
  accept_discount: boolean
  active: boolean
  created_at: string
}

type ServiceLevelPrice = {
  id: string
  service_id: string
  level_id: string
  price: number
}

export default function ServicesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewServices = hasPermission('services', 'view')
  const canCreateServices = hasPermission('services', 'create')

  const [services, setServices] = useState<Service[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [prices, setPrices] = useState<ServiceLevelPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('monthly')
  const [acceptDiscount, setAcceptDiscount] = useState(true)
  const [active, setActive] = useState(true)
  const [levelPrices, setLevelPrices] = useState<{ levelId: string; price: number }[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchAllData(establishmentId)
  }, [establishmentId])

  const fetchAllData = async (sid: string) => {
    const supabase = createClient()

    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (servicesError) setError(servicesError.message)
    else setServices(servicesData || [])

    const { data: levelsData, error: levelsError } = await supabase
      .from('levels')
      .select('id, name')
      .eq('establishment_id', sid)

    if (levelsError) setError(levelsError.message)
    else setLevels(levelsData || [])

    if (servicesData && servicesData.length > 0) {
      const { data: pricesData, error: pricesError } = await supabase
        .from('service_level_prices')
        .select('*')
        .in('service_id', servicesData.map((s: Service) => s.id))

      if (pricesError) setError(pricesError.message)
      else setPrices(pricesData || [])
    } else {
      setPrices([])
    }

    setLoading(false)
  }

  const handlePriceChange = (levelId: string, price: number) => {
    setLevelPrices((prev) => {
      const existing = prev.find((p) => p.levelId === levelId)
      if (existing) {
        return prev.map((p) => (p.levelId === levelId ? { ...p, price } : p))
      } else {
        return [...prev, { levelId, price }]
      }
    })
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!establishmentId || !name.trim()) return
    setAdding(true)
    setError('')

    const supabase = createClient()

    try {
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert({
          establishment_id: establishmentId,
          name: name.trim(),
          description,
          price: 0,
          type,
          accept_discount: acceptDiscount,
          active,
        })
        .select()
        .single()

      if (serviceError) throw serviceError

      if (levelPrices.length > 0 && newService) {
        const priceInserts = levelPrices.map((p) => ({
          service_id: newService.id,
          level_id: p.levelId,
          price: p.price,
        }))

        const { error: pricesError } = await supabase
          .from('service_level_prices')
          .insert(priceInserts)

        if (pricesError) throw pricesError
      }

      setName('')
      setDescription('')
      setType('monthly')
      setAcceptDiscount(true)
      setActive(true)
      setLevelPrices([])
      fetchAllData(establishmentId)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
  const supabase = createClient()
  const { count: contractItemCount } = await supabase
    .from('contract_items')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const { count: servicePriceCount } = await supabase
    .from('service_level_prices')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  if ((contractItemCount || 0) > 0 || (servicePriceCount || 0) > 0) {
    alert('لا يمكن حذف هذه الخدمة لأنها مستخدمة في عقود أو تسعيرات.')
    return
  }

  if (!confirm('Voulez-vous vraiment supprimer ce service ?')) return
  const { error } = await supabase.from('services').delete().eq('id', serviceId)
  if (error) setError(error.message)
  else fetchAllData(establishmentId!)
}

  const getPriceForLevel = (serviceId: string, levelId: string): number | null => {
    const priceEntry = prices.find((p) => p.service_id === serviceId && p.level_id === levelId)
    return priceEntry ? priceEntry.price : null
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewServices) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-indigo-600" />
          Services
        </h1>
        <p className="text-gray-600">Gérez les services et leurs tarifs par niveau</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {canCreateServices ? (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Ajouter un service</h2>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Ex: Scolarité"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="annual">Annuel</option>
                  <option value="one_time">Unique</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={acceptDiscount}
                  onChange={(e) => setAcceptDiscount(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                Accepter remise
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                Actif
              </label>
            </div>

            {levels.length > 0 ? (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Tarifs par niveau (obligatoire)</h3>
                <div className="space-y-2">
                  {levels.map((level) => (
                    <div key={level.id} className="flex items-center gap-4">
                      <span className="w-40 text-sm text-gray-700">{level.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={levelPrices.find((p) => p.levelId === level.id)?.price ?? ''}
                        onChange={(e) => handlePriceChange(level.id, Number(e.target.value))}
                        className="w-40 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Prix"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun niveau défini. Ajoutez d'abord des niveaux.</p>
            )}

            <div>
              <button
                type="submit"
                disabled={adding}
                className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {adding ? 'Ajout...' : 'Ajouter le service'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء الخدمات.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Services disponibles ({services.length})</h2>
        {services.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun service.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tarifs par niveau</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remise</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {levels.length > 0 ? (
                        <ul className="space-y-1">
                          {levels.map((level) => {
                            const price = getPriceForLevel(service.id, level.id)
                            return (
                              <li key={level.id}>
                                {level.name}: {price !== null ? `${price} DH` : '-'}
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.accept_discount ? 'Oui' : 'Non'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{service.active ? 'Actif' : 'Inactif'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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