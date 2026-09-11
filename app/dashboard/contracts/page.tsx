'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { generateInstallmentsForContract } from '@/lib/billing'
import DateInput from '@/components/DateInput'
import { Plus, FileText, Trash2, RefreshCw } from 'lucide-react'

type StudentOption = {
  id: string
  first_name: string
  last_name: string
  enrollments: {
    id: string
    academic_year_id: string
    level_id: string
    class_id: string | null
    academic_years: { name: string; start_date?: string | null; end_date?: string | null }
    levels: { name: string }
    classes: { name: string } | null
  }[]
}

type ServiceWithLevelPrice = {
  id: string
  service_id: string
  level_id: string
  price: number
  services: {
    id: string
    name: string
    type: string
    accept_discount: boolean
    active: boolean
  } | null
}

type ContractItemInput = {
  service_id: string
  service_name: string
  service_type: string
  price: number
  discount_percent: number
  discount_amount: number
  final_price: number
  accept_discount: boolean
}

type ContractRow = {
  id: string
  start_date: string
  end_date: string | null
  status: string
  students: {
    first_name: string
    last_name: string
  } | null
  academic_years: {
    name: string
  } | null
  contract_items: {
    services: {
      name: string
    } | null
  }[]
}

export default function ContractsPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canViewContracts = hasPermission('contracts', 'view')
  const canCreateContracts = hasPermission('contracts', 'create')

  const [students, setStudents] = useState<StudentOption[]>([])
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedEnrollment, setSelectedEnrollment] = useState<StudentOption['enrollments'][0] | null>(null)
  const [availableServices, setAvailableServices] = useState<ServiceWithLevelPrice[]>([])
  const [selectedServices, setSelectedServices] = useState<ContractItemInput[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    fetchAllData(establishmentId)
  }, [establishmentId])

  const fetchAllData = async (sid: string) => {
    const supabase = createClient()

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id, first_name, last_name,
        enrollments (
          id, academic_year_id, level_id, class_id,
          academic_years (name, start_date, end_date),
          levels (name),
          classes (name)
        )
      `)
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (studentsError) setError(studentsError.message)
    else setStudents(studentsData || [])

    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id, start_date, end_date, status,
        students (first_name, last_name),
        academic_years (name),
        contract_items (services (name))
      `)
      .eq('establishment_id', sid)
      .order('created_at', { ascending: false })

    if (contractsError) setError(contractsError.message)
    else setContracts(contractsData || [])

    setLoading(false)
  }

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedEnrollment(null)
    setAvailableServices([])
    setSelectedServices([])
    setStartDate('')
    setEndDate('')

    if (!studentId) return

    const student = students.find((s) => s.id === studentId)
    if (!student || !student.enrollments || student.enrollments.length === 0) {
      setError('هذا التلميذ غير مسجل في أي سنة دراسية. سجّله أولاً.')
      return
    }

    const enrollment = student.enrollments[0]
    setSelectedEnrollment(enrollment)

    if (enrollment.academic_years?.start_date) {
      setStartDate(enrollment.academic_years.start_date)
    }
    if (enrollment.academic_years?.end_date) {
      setEndDate(enrollment.academic_years.end_date)
    }

    await fetchServicesForLevel(enrollment.level_id)
  }

  const fetchServicesForLevel = async (levelId: string) => {
    const supabase = createClient()
    if (!levelId) {
      setError('هذا التلميذ لا يملك مستوى محدد.')
      setAvailableServices([])
      return
    }

    const { data: priceData, error: priceError } = await supabase
      .from('service_level_prices')
      .select('id, service_id, level_id, price')
      .eq('level_id', levelId)

    if (priceError) {
      setError('خطأ في جلب الأسعار: ' + priceError.message)
      setAvailableServices([])
      return
    }

    if (!priceData || priceData.length === 0) {
      setAvailableServices([])
      setError('لا توجد خدمات معرفة لهذا المستوى.')
      return
    }

    const serviceIds = priceData.map((p) => p.service_id)
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, name, type, accept_discount, active')
      .in('id', serviceIds)

    if (servicesError) {
      setError('خطأ في جلب الخدمات: ' + servicesError.message)
      setAvailableServices([])
      return
    }

    const merged = priceData
      .map((priceEntry) => {
        const service = servicesData?.find((s) => s.id === priceEntry.service_id)
        if (!service) return null
        return {
          ...priceEntry,
          services: service,
        }
      })
      .filter((item) => item !== null)

    setAvailableServices(merged as any)
    setError('')
  }

  const toggleServiceSelection = (serviceWithPrice: ServiceWithLevelPrice) => {
    const existing = selectedServices.find((s) => s.service_id === serviceWithPrice.service_id)
    if (existing) {
      setSelectedServices(selectedServices.filter((s) => s.service_id !== serviceWithPrice.service_id))
    } else {
      const serviceInfo = serviceWithPrice.services
      if (!serviceInfo) return

      setSelectedServices([
        ...selectedServices,
        {
          service_id: serviceInfo.id,
          service_name: serviceInfo.name,
          service_type: serviceInfo.type,
          price: serviceWithPrice.price,
          discount_percent: 0,
          discount_amount: 0,
          final_price: serviceWithPrice.price,
          accept_discount: serviceInfo.accept_discount,
        },
      ])
    }
  }

  const updateServiceDiscount = (serviceId: string, field: 'discount_percent' | 'discount_amount', value: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.service_id !== serviceId) return s
        const updated = { ...s, [field]: value }
        let discountAmount = updated.discount_amount
        if (field === 'discount_percent') {
          discountAmount = (updated.price * updated.discount_percent) / 100
        }
        updated.discount_amount = discountAmount
        updated.final_price = Math.max(0, updated.price - discountAmount)
        return updated
      })
    )
  }

  const handleCreateContract = async () => {
    if (!establishmentId || !selectedStudentId || !selectedEnrollment || !startDate) {
      setError('تاريخ البداية والتلميذ مطلوبان')
      return
    }
    if (selectedServices.length === 0) {
      setError('يرجى اختيار خدمة واحدة على الأقل')
      return
    }

    let finalEndDate = endDate
    if (!finalEndDate && selectedEnrollment.academic_years?.end_date) {
      finalEndDate = selectedEnrollment.academic_years.end_date
    }

    setCreating(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert({
          establishment_id: establishmentId,
          student_id: selectedStudentId,
          academic_year_id: selectedEnrollment.academic_year_id,
          start_date: startDate,
          end_date: finalEndDate || null,
          status: 'active',
          notes,
        })
        .select()
        .single()

      if (contractError) throw contractError

      const contractItemsToInsert = selectedServices.map((s) => ({
        contract_id: contractData.id,
        service_id: s.service_id,
        price: s.price,
        discount_percent: s.discount_percent,
        discount_amount: s.discount_amount,
        final_price: s.final_price,
      }))

      const { error: itemsError } = await supabase
        .from('contract_items')
        .insert(contractItemsToInsert)

      if (itemsError) throw itemsError

      const installments = generateInstallmentsForContract({
        establishmentId,
        studentId: selectedStudentId,
        contractId: contractData.id,
        startDate,
        endDate: finalEndDate || null,
        services: selectedServices,
      })

      if (installments.length > 0) {
        const { error: installmentsError } = await supabase
          .from('installments')
          .insert(installments)

        if (installmentsError) throw installmentsError
      }

      setSuccess('تم إنشاء العقد والأقساط بنجاح!')
      setSelectedStudentId('')
      setSelectedEnrollment(null)
      setAvailableServices([])
      setSelectedServices([])
      setStartDate('')
      setEndDate('')
      setNotes('')
      setShowForm(false)
      fetchAllData(establishmentId)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('هل تريد حذف هذا العقد؟')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId)

    if (error) setError(error.message)
    else fetchAllData(establishmentId!)
  }

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!canViewContracts) {
    return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" />
          Contrats
        </h1>
        <p className="text-gray-600">Créez des contrats et générez les échéanciers</p>
      </header>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      {canCreateContracts ? (
        <>
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'إلغاء' : 'عقد جديد'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-lg font-semibold mb-4">Nouveau contrat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      التلميذ <span className="text-red-500">*</span>
    </label>
    <select
      value={selectedStudentId}
      onChange={(e) => handleStudentChange(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    >
      <option value="">-- اختر --</option>
      {students.map((student) => (
        <option key={student.id} value={student.id}>
          {student.first_name} {student.last_name}
        </option>
      ))}
    </select>
  </div>

  {selectedEnrollment && (
    <div className="text-sm text-gray-700 self-end bg-gray-50 p-3 rounded-lg">
      <p><span className="font-medium">السنة:</span> {selectedEnrollment.academic_years?.name}</p>
      <p><span className="font-medium">المستوى:</span> {selectedEnrollment.levels?.name}</p>
      {selectedEnrollment.classes?.name && <p><span className="font-medium">القسم:</span> {selectedEnrollment.classes.name}</p>}
    </div>
  )}

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      تاريخ البداية <span className="text-red-500">*</span>
    </label>
    <DateInput value={startDate} onChange={setStartDate} />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      تاريخ النهاية (اختياري)
    </label>
    <DateInput value={endDate} onChange={setEndDate} />
  </div>

  <div className="md:col-span-2">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      ملاحظات
    </label>
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      rows={2}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      placeholder="ملاحظات إضافية..."
    ></textarea>
  </div>
</div>

              {availableServices.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Services disponibles pour ce niveau</h3>
                  <div className="space-y-2">
                    {availableServices.map((swp) => {
                      const serviceInfo = swp.services
                      if (!serviceInfo || !serviceInfo.active) return null
                      const isSelected = selectedServices.some((s) => s.service_id === serviceInfo.id)
                      return (
                        <div key={swp.id} className="flex items-start gap-2 p-2 border rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleServiceSelection(swp)}
                            className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <span className="font-medium">{serviceInfo.name}</span>
                            <span className="text-sm text-gray-500"> - {swp.price} DH ({serviceInfo.type})</span>
                            {isSelected && serviceInfo.accept_discount && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-sm">Remise % :</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={selectedServices.find((s) => s.service_id === serviceInfo.id)?.discount_percent || 0}
                                  onChange={(e) => updateServiceDiscount(serviceInfo.id, 'discount_percent', Number(e.target.value))}
                                  className="w-20 px-2 py-1 border rounded"
                                />
                                <span className="text-sm">
                                  Final : {selectedServices.find((s) => s.service_id === serviceInfo.id)?.final_price || swp.price} DH
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateContract}
                disabled={creating || !selectedStudentId || !selectedEnrollment}
                className="mt-4 inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {creating ? 'Création...' : 'Créer le contrat'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
          ليس لديك صلاحية لإنشاء العقود.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Liste des contrats ({contracts.length})</h2>
          <button
            onClick={() => fetchAllData(establishmentId!)}
            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>
        {contracts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucun contrat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Élève</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Année</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date début</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Date fin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Services</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contract.students ? `${contract.students.first_name} ${contract.students.last_name}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {contract.academic_years?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.start_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.end_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contract.contract_items?.map((item: any) => item.services?.name).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
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