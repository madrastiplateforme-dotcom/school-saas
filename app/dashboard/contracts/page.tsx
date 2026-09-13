'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { generateInstallmentsForContract } from '@/lib/billing'
import DateInput from '@/components/DateInput'
import { Plus, FileText, Trash2, RefreshCw, XCircle, Pencil, X } from 'lucide-react'

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
  name: string
  type: string
  price: number
  discount_percent: number
  discount_amount: number
  final_price: number
  accept_discount: boolean
}

type ContractRow = {
  id: string
  student_id: string
  academic_year_id: string
  start_date: string
  end_date: string | null
  status: string
  notes: string | null
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

  // Edit states
  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [editExistingItems, setEditExistingItems] = useState<any[]>([])
  const [editAvailableServices, setEditAvailableServices] = useState<ServiceWithLevelPrice[]>([])
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<Set<string>>(new Set())
  const [editNewServiceIds, setEditNewServiceIds] = useState<Set<string>>(new Set())
  const [editStartDate, setEditStartDate] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

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
        id, student_id, academic_year_id, start_date, end_date, status, notes,
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
        return { ...priceEntry, services: service }
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
          name: serviceInfo.name,
          type: serviceInfo.type,
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

  // ✅ OPEN EDIT
  const handleOpenEdit = async (contract: ContractRow) => {
    setEditContract(contract)
    setEditLoading(true)
    setError('')

    const supabase = createClient()

    const { data: items } = await supabase
      .from('contract_items')
      .select('id, service_id, price, discount_percent, discount_amount, final_price, services(id, name, type, accept_discount)')
      .eq('contract_id', contract.id)

    setEditExistingItems(items || [])

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('level_id')
      .eq('student_id', contract.student_id)
      .eq('academic_year_id', contract.academic_year_id)
      .maybeSingle()

    const levelId = enrollment?.level_id

    if (levelId) {
      const { data: priceData } = await supabase
        .from('service_level_prices')
        .select('id, service_id, level_id, price')
        .eq('level_id', levelId)

      if (priceData && priceData.length > 0) {
        const serviceIds = priceData.map(p => p.service_id)
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, type, accept_discount, active')
          .in('id', serviceIds)

        const merged = priceData.map(p => {
          const s = servicesData?.find(x => x.id === p.service_id)
          if (!s) return null
          return { ...p, services: s }
        }).filter(Boolean)

        setEditAvailableServices(merged as any)
      }
    }

    const existingIds = new Set((items || []).map((i: any) => i.service_id))
    setEditSelectedServiceIds(existingIds)
    setEditNewServiceIds(new Set())
    setEditStartDate(new Date().toISOString().split('T')[0])
    setEditLoading(false)
  }

  const handleToggleEditService = (serviceId: string, isExisting: boolean) => {
    if (isExisting) {
      const newSet = new Set(editSelectedServiceIds)
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId)
      } else {
        newSet.add(serviceId)
      }
      setEditSelectedServiceIds(newSet)
    } else {
      const newSet = new Set(editNewServiceIds)
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId)
      } else {
        newSet.add(serviceId)
      }
      setEditNewServiceIds(newSet)
    }
  }

  // ✅ SAVE EDIT
  const handleSaveEdit = async () => {
    if (!editContract || !establishmentId) return
    setEditSaving(true)
    setError('')

    const supabase = createClient()

    try {
      // 1. Services li khass yt7aydo
      const existingServiceIds = new Set(editExistingItems.map(i => i.service_id))
      const toRemove: string[] = []
      existingServiceIds.forEach(id => {
        if (!editSelectedServiceIds.has(id)) toRemove.push(id)
      })

      // 2. Services jdad
      const toAdd = Array.from(editNewServiceIds)

      // ========== REMOVE ==========
      for (const serviceId of toRemove) {
        const item = editExistingItems.find(i => i.service_id === serviceId)
        if (!item) continue

        const serviceName = (item.services?.name || '').trim()
        console.log('🗑️ Service à supprimer:', serviceName, '| ID:', serviceId)

        // Jib ga3 les installments
        const { data: allInstallments } = await supabase
          .from('installments')
          .select('id, status, description, service_id')
          .eq('contract_id', editContract.id)

        console.log('📋 Total installments:', allInstallments?.length || 0)

        // Filtre : machi paid + match par service_id (fallback: description)
        const filteredIds = (allInstallments || [])
          .filter(i => {
            if (i.status === 'paid') return false
            if (i.service_id && i.service_id === serviceId) return true
            if (!i.description) return false
            const desc = i.description.toLowerCase()
            const svcName = serviceName.toLowerCase()
            return desc.includes(svcName)
          })
          .map(i => i.id)

        console.log('🎯 À supprimer:', filteredIds.length)

        if (filteredIds.length > 0) {
          const { error: delError } = await supabase
            .from('installments')
            .delete()
            .in('id', filteredIds)

          if (delError) throw delError
          console.log('✅ Installments supprimés')
        }

        // Msa7 contract_item
        const { error: ciError } = await supabase
          .from('contract_items')
          .delete()
          .eq('id', item.id)

        if (ciError) throw ciError
        console.log('✅ Contract_item supprimé')
      }

      // ========== ADD ==========
      if (toAdd.length > 0) {
        const newItems: ContractItemInput[] = []

        for (const serviceId of toAdd) {
          const svc = editAvailableServices.find(x => x.services?.id === serviceId)
          if (!svc?.services) continue

          const { error: itemError } = await supabase
            .from('contract_items')
            .insert({
              contract_id: editContract.id,
              service_id: serviceId,
              price: svc.price,
              discount_percent: 0,
              discount_amount: 0,
              final_price: svc.price,
            })

          if (itemError) throw itemError

          newItems.push({
            service_id: serviceId,
            name: svc.services.name,
            type: svc.services.type,
            price: svc.price,
            discount_percent: 0,
            discount_amount: 0,
            final_price: svc.price,
            accept_discount: svc.services.accept_discount,
          })
        }

        let newServicesEndDate = editContract.end_date
        if (newServicesEndDate && new Date(newServicesEndDate) <= new Date(editStartDate)) {
          newServicesEndDate = null
        }

        const newInstallments = generateInstallmentsForContract({
          establishmentId,
          studentId: editContract.student_id,
          contractId: editContract.id,
          startDate: editStartDate,
          endDate: newServicesEndDate,
          services: newItems,
        })

        if (newInstallments.length > 0) {
          const { error: instError } = await supabase
            .from('installments')
            .insert(newInstallments)

          if (instError) throw instError
        }
      }

      setSuccess(
        `✅ تم تعديل العقد\n` +
        (toRemove.length > 0 ? `- حذف ${toRemove.length} خدمة\n` : '') +
        (toAdd.length > 0 ? `- إضافة ${toAdd.length} خدمة\n` : '')
      )
      setTimeout(() => setSuccess(''), 4000)
      setEditContract(null)
      fetchAllData(establishmentId)
    } catch (err: any) {
      console.error('❌ Save edit error:', err)
      setError(err.message || 'حدث خطأ')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteContract = async (contractId: string) => {
    const supabase = createClient()

    const { data: installments } = await supabase
      .from('installments')
      .select('id')
      .eq('contract_id', contractId)

    const installmentIds = (installments || []).map(i => i.id)

    let paidCount = 0
    if (installmentIds.length > 0) {
      const { count } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .in('installment_id', installmentIds)
      paidCount = count || 0
    }

    if (paidCount > 0) {
      if (confirm(
        `⚠️ هذا العقد يحتوي على ${paidCount} دفعة مسجلة.\n\n` +
        `لا يمكن حذفه نهائياً (للحفاظ على السجل المالي).\n\n` +
        `هل تريد إلغاء العقد بدلاً من ذلك؟`
      )) {
        const { error } = await supabase
          .from('contracts')
          .update({
            status: 'cancelled',
            end_date: new Date().toISOString().split('T')[0],
            notes: `تم الإلغاء بتاريخ ${new Date().toLocaleDateString('fr-FR')}`,
          })
          .eq('id', contractId)

        if (error) setError(error.message)
        else {
          setSuccess('✅ تم إلغاء العقد (مازال محفوظاً في السجل)')
          setTimeout(() => setSuccess(''), 3000)
          fetchAllData(establishmentId!)
        }
      }
      return
    }

    if (!confirm('هل تريد حذف هذا العقد؟ (لا يحتوي على دفعات)')) return

    if (installmentIds.length > 0) {
      await supabase.from('installments').delete().in('id', installmentIds)
    }
    await supabase.from('contract_items').delete().eq('contract_id', contractId)
    await supabase.from('contracts').delete().eq('id', contractId)

    setSuccess('✅ تم حذف العقد')
    setTimeout(() => setSuccess(''), 3000)
    fetchAllData(establishmentId!)
  }

  const handleCancelContract = async (contractId: string) => {
    if (!confirm('هل تريد إلغاء هذا العقد؟ (سيتم الاحتفاظ بالسجل)')) return
    const supabase = createClient()

    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString().split('T')[0],
        notes: `تم الإلغاء بتاريخ ${new Date().toLocaleDateString('fr-FR')}`,
      })
      .eq('id', contractId)

    if (error) setError(error.message)
    else {
      setSuccess('✅ تم إلغاء العقد')
      setTimeout(() => setSuccess(''), 3000)
      fetchAllData(establishmentId!)
    }
  }

  const handleReactivateContract = async (contractId: string) => {
    if (!confirm('هل تريد إعادة تفعيل هذا العقد؟')) return
    const supabase = createClient()

    const { error } = await supabase
      .from('contracts')
      .update({ status: 'active', end_date: null })
      .eq('id', contractId)

    if (error) setError(error.message)
    else {
      setSuccess('✅ تم إعادة تفعيل العقد')
      setTimeout(() => setSuccess(''), 3000)
      fetchAllData(establishmentId!)
    }
  }

  const handlePrintContract = (contractId: string) => {
    window.open(`/api/pdf/contract?contractId=${contractId}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium">● نشط</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-medium">● ملغى</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium">● مكتمل</span>
      default:
        return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium">{status}</span>
    }
  }

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!canViewContracts) return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6" dir="rtl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-600" />
          العقود
        </h1>
        <p className="text-gray-600">إنشاء وتعديل العقود</p>
      </header>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg whitespace-pre-line">{success}</div>}

      {canCreateContracts && (
        <>
          <div className="mb-6">
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              {showForm ? 'إلغاء' : 'عقد جديد'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-lg font-semibold mb-4">عقد جديد</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التلميذ <span className="text-red-500">*</span></label>
                  <select value={selectedStudentId} onChange={(e) => handleStudentChange(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">-- اختر --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية <span className="text-red-500">*</span></label>
                  <DateInput value={startDate} onChange={setStartDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية (اختياري)</label>
                  <DateInput value={endDate} onChange={setEndDate} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                </div>
              </div>
              {availableServices.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">الخدمات المتاحة</h3>
                  <div className="space-y-2">
                    {availableServices.map((swp) => {
                      const si = swp.services
                      if (!si || !si.active) return null
                      const isSel = selectedServices.some(s => s.service_id === si.id)
                      return (
                        <div key={swp.id} className="flex items-start gap-2 p-2 border rounded">
                          <input type="checkbox" checked={isSel} onChange={() => toggleServiceSelection(swp)} className="mt-1 h-4 w-4" />
                          <div className="flex-1">
                            <span className="font-medium">{si.name}</span>
                            <span className="text-sm text-gray-500"> - {swp.price} DH ({si.type})</span>
                            {isSel && si.accept_discount && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-sm">تخفيض % :</label>
                                <input type="number" min="0" max="100" value={selectedServices.find(s => s.service_id === si.id)?.discount_percent || 0} onChange={(e) => updateServiceDiscount(si.id, 'discount_percent', Number(e.target.value))} className="w-20 px-2 py-1 border rounded" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <button onClick={handleCreateContract} disabled={creating || !selectedStudentId || !selectedEnrollment} className="mt-4 inline-flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <Plus className="h-4 w-4" />
                {creating ? 'جارٍ الإنشاء...' : 'إنشاء العقد'}
              </button>
            </div>
          )}
        </>
      )}

      {/* LISTE */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">قائمة العقود ({contracts.length})</h2>
          <button onClick={() => fetchAllData(establishmentId!)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>
        {contracts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد عقود.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السنة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البداية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النهاية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخدمات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className={contract.status === 'cancelled' ? 'bg-red-50/30 opacity-70' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contract.students ? `${contract.students.first_name} ${contract.students.last_name}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.academic_years?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.start_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.end_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contract.contract_items?.map((item: any) => item.services?.name).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {contract.status === 'active' && canCreateContracts && (
                          <button onClick={() => handleOpenEdit(contract)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handlePrintContract(contract.id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="طباعة">
                          <FileText className="h-4 w-4" />
                        </button>
                        {contract.status === 'active' && (
                          <button onClick={() => handleCancelContract(contract.id)} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="إلغاء">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {contract.status === 'cancelled' && (
                          <button onClick={() => handleReactivateContract(contract.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded text-xs font-bold" title="إعادة تفعيل">↻</button>
                        )}
                        <button onClick={() => handleDeleteContract(contract.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">تعديل العقد</h3>
                <p className="text-sm text-gray-500">
                  {editContract.students ? `${editContract.students.first_name} ${editContract.students.last_name}` : ''}
                </p>
              </div>
              <button onClick={() => setEditContract(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editLoading ? (
              <p className="text-center py-8">Chargement...</p>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                  ℹ️ <strong>ملاحظة:</strong> عند إضافة خدمة جديدة، يتم توليد الأقساط من تاريخ البداية الذي تختاره. الأقساط المدفوعة لا تُحذف أبداً.
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-slate-800 mb-3">🛠️ الخدمات الحالية</h4>
                  <div className="space-y-2">
                    {editExistingItems.map((item) => {
                      const svc = item.services
                      const isKept = editSelectedServiceIds.has(item.service_id)
                      return (
                        <div key={item.id} className={`flex items-start gap-3 p-3 border rounded-lg transition ${isKept ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30 opacity-70'}`}>
                          <input type="checkbox" checked={isKept} onChange={() => handleToggleEditService(item.service_id, true)} className="mt-1 h-4 w-4" />
                          <div className="flex-1">
                            <p className={`font-medium ${isKept ? 'text-slate-800' : 'text-red-700 line-through'}`}>{svc?.name || '-'}</p>
                            <p className="text-xs text-slate-500">{item.price} DH — نهائي: {item.final_price} DH</p>
                            {!isKept && <p className="text-xs text-red-600 mt-1">⚠️ سيتم حذف الأقساط غير المدفوعة فقط</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {editAvailableServices.filter(s => !editExistingItems.some(i => i.service_id === s.service_id)).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-slate-800 mb-3">➕ إضافة خدمات جديدة</h4>
                    <div className="space-y-2">
                      {editAvailableServices
                        .filter(s => !editExistingItems.some(i => i.service_id === s.service_id))
                        .map((swp) => {
                          const svc = swp.services
                          if (!svc || !svc.active) return null
                          const isChecked = editNewServiceIds.has(svc.id)
                          return (
                            <div key={swp.id} className={`flex items-start gap-3 p-3 border rounded-lg transition ${isChecked ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'}`}>
                              <input type="checkbox" checked={isChecked} onChange={() => handleToggleEditService(svc.id, false)} className="mt-1 h-4 w-4" />
                              <div className="flex-1">
                                <p className="font-medium text-slate-800">{svc.name}</p>
                                <p className="text-xs text-slate-500">{swp.price} DH ({svc.type})</p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {editNewServiceIds.size > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <label className="block text-sm font-medium text-amber-900 mb-2">
                      📅 تاريخ بداية الخدمات الجديدة <span className="text-red-500">*</span>
                    </label>
                    <DateInput value={editStartDate} onChange={setEditStartDate} />
                    <p className="text-xs text-amber-700 mt-2">سيتم توليد الأقساط انطلاقاً من هذا التاريخ</p>
                  </div>
                )}

                {(editNewServiceIds.size > 0 || Array.from(editExistingItems).some(i => !editSelectedServiceIds.has(i.service_id))) && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                    <p className="font-medium text-slate-800 mb-2">📝 ملخص التعديلات :</p>
                    {Array.from(editExistingItems).filter(i => !editSelectedServiceIds.has(i.service_id)).length > 0 && (
                      <p className="text-red-700">🗑️ حذف: {Array.from(editExistingItems).filter(i => !editSelectedServiceIds.has(i.service_id)).map(i => i.services?.name).join(', ')}</p>
                    )}
                    {editNewServiceIds.size > 0 && (
                      <p className="text-emerald-700">➕ إضافة: {Array.from(editNewServiceIds).map(id => editAvailableServices.find(s => s.services?.id === id)?.services?.name).join(', ')}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <button onClick={handleSaveEdit} disabled={editSaving} className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                    {editSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button onClick={() => setEditContract(null)} className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}