'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import { generateInstallmentsForContract } from '@/lib/billing'
import DateInput from '@/components/DateInput'
import {
  Plus, FileText, Trash2, RefreshCw, Pencil, X, Pause, Play,
  AlertCircle, Info, CheckCircle2, AlertTriangle,
} from 'lucide-react'

type StudentOption = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
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
  suspended_at?: string | null
  suspended_reason?: string | null
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
  const { yearId } = useAcademicYear()

  const canViewContracts = hasPermission('contracts', 'view')
  const canCreateContracts = hasPermission('contracts', 'create')
  const canDeleteContracts = hasPermission('contracts', 'delete')

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

  const [studentSearch, setStudentSearch] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const studentBoxRef = useRef<HTMLDivElement>(null)

  const [existingContracts, setExistingContracts] = useState<ContractRow[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  const [suspendDialog, setSuspendDialog] = useState<{ contractId: string; studentName: string } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending] = useState(false)

  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [editExistingItems, setEditExistingItems] = useState<any[]>([])
  const [editAvailableServices, setEditAvailableServices] = useState<ServiceWithLevelPrice[]>([])
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<Set<string>>(new Set())
  const [editNewServiceIds, setEditNewServiceIds] = useState<Set<string>>(new Set())
  const [editStartDate, setEditStartDate] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (!establishmentId || !yearId) return
    fetchAllData(establishmentId, yearId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, yearId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentBoxRef.current && !studentBoxRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchAllData = async (sid: string, yid: string) => {
    const supabase = createClient()

    // ✅ 1) Élèves actifs f l'année via enrollments
    const { data: enrollmentsData, error: enrError } = await supabase
      .from('enrollments')
      .select('id, student_id, academic_year_id, level_id, class_id')
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)

    if (enrError) {
      setError(enrError.message)
      setLoading(false)
      return
    }

    const studentIds = Array.from(
      new Set((enrollmentsData || []).map((e: any) => e.student_id).filter(Boolean)),
    )

    // 2) Charger les students
    let studentsData: any[] = []
    if (studentIds.length > 0) {
      const { data: sData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code')
        .eq('establishment_id', sid)
        .in('id', studentIds)
        .order('first_name', { ascending: true })

      if (studentsError) setError(studentsError.message)
      studentsData = sData || []
    }

    // 3) Charger années / niveaux / classes pour les enrollments
    const yearIds = Array.from(
      new Set((enrollmentsData || []).map((e: any) => e.academic_year_id).filter(Boolean)),
    )
    const levelIds = Array.from(
      new Set((enrollmentsData || []).map((e: any) => e.level_id).filter(Boolean)),
    )
    const classIds = Array.from(
      new Set((enrollmentsData || []).map((e: any) => e.class_id).filter(Boolean)),
    )

    const [yearsRes, levelsRes, classesRes] = await Promise.all([
      yearIds.length
        ? supabase
            .from('academic_years')
            .select('id, name, start_date, end_date')
            .in('id', yearIds)
        : Promise.resolve({ data: [] as any[] }),
      levelIds.length
        ? supabase.from('levels').select('id, name').in('id', levelIds)
        : Promise.resolve({ data: [] as any[] }),
      classIds.length
        ? supabase.from('classes').select('id, name').in('id', classIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const yearMap = new Map((yearsRes.data || []).map((y: any) => [y.id, y]))
    const levelMap = new Map((levelsRes.data || []).map((l: any) => [l.id, l]))
    const classMap = new Map((classesRes.data || []).map((c: any) => [c.id, c]))

    const enrollmentsByStudent = new Map<string, any[]>()
    for (const e of enrollmentsData || []) {
      const enriched = {
        id: e.id,
        academic_year_id: e.academic_year_id,
        level_id: e.level_id,
        class_id: e.class_id,
        academic_years: yearMap.get(e.academic_year_id) || null,
        levels: levelMap.get(e.level_id) || null,
        classes: e.class_id ? classMap.get(e.class_id) || null : null,
      }
      if (!enrollmentsByStudent.has(e.student_id)) {
        enrollmentsByStudent.set(e.student_id, [])
      }
      enrollmentsByStudent.get(e.student_id)!.push(enriched)
    }

    const mergedStudents: StudentOption[] = studentsData.map((s) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      massar_code: s.massar_code,
      enrollments: enrollmentsByStudent.get(s.id) || [],
    }))

    setStudents(mergedStudents)

    // ✅ 4) Contrats filtrés par année active
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id, student_id, academic_year_id, start_date, end_date, status, notes,
        suspended_at, suspended_reason,
        students (first_name, last_name),
        academic_years (name),
        contract_items (services (name))
      `)
      .eq('establishment_id', sid)
      .eq('academic_year_id', yid)
      .order('created_at', { ascending: false })

    if (contractsError) setError(contractsError.message)
    else setContracts((contractsData as any) || [])

    setLoading(false)
  }

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedEnrollment(null)
    setAvailableServices([])
    setSelectedServices([])
    setExistingContracts([])
    setStartDate('')
    setEndDate('')

    if (!studentId || !yearId) return

    const student = students.find((s) => s.id === studentId)
    if (!student || !student.enrollments || student.enrollments.length === 0) {
      setError('هذا التلميذ غير مسجل في السنة الحالية. سجّله أولاً.')
      return
    }

    // ✅ Enrollment dyal l'année active
    const enrollment =
      student.enrollments.find((e) => e.academic_year_id === yearId) ||
      student.enrollments[0]
    setSelectedEnrollment(enrollment)

    if (enrollment.academic_years?.start_date) setStartDate(enrollment.academic_years.start_date)
    if (enrollment.academic_years?.end_date) setEndDate(enrollment.academic_years.end_date)

    await fetchServicesForLevel(enrollment.level_id)

    if (establishmentId) {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('contracts')
        .select(`
          id, student_id, academic_year_id, start_date, end_date, status, notes,
          suspended_at, suspended_reason,
          contract_items (services (name))
        `)
        .eq('student_id', studentId)
        .eq('academic_year_id', enrollment.academic_year_id)
        .eq('establishment_id', establishmentId)
        .in('status', ['active', 'suspended', 'cancelled'])
        .order('created_at', { ascending: false })

      setExistingContracts((existing as any) || [])
    }
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
        services: selectedServices as any,
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
      setExistingContracts([])
      setStartDate('')
      setEndDate('')
      setNotes('')
      setStudentSearch('')
      setShowForm(false)
      if (yearId) fetchAllData(establishmentId, yearId)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setCreating(false)
    }
  }

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
      if (newSet.has(serviceId)) newSet.delete(serviceId)
      else newSet.add(serviceId)
      setEditSelectedServiceIds(newSet)
    } else {
      const newSet = new Set(editNewServiceIds)
      if (newSet.has(serviceId)) newSet.delete(serviceId)
      else newSet.add(serviceId)
      setEditNewServiceIds(newSet)
    }
  }

  const handleSaveEdit = async () => {
    if (!editContract || !establishmentId) return
    setEditSaving(true)
    setError('')

    const supabase = createClient()

    try {
      const existingServiceIds = new Set(editExistingItems.map(i => i.service_id))
      const toRemove: string[] = []
      existingServiceIds.forEach(id => {
        if (!editSelectedServiceIds.has(id)) toRemove.push(id)
      })

      const toAdd = Array.from(editNewServiceIds)

      for (const serviceId of toRemove) {
        const item = editExistingItems.find(i => i.service_id === serviceId)
        if (!item) continue

        const serviceName = (item.services?.name || '').trim()

        const { data: allInstallments } = await supabase
          .from('installments')
          .select('id, status, description, service_id')
          .eq('contract_id', editContract.id)

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

        if (filteredIds.length > 0) {
          const { error: delError } = await supabase
            .from('installments')
            .delete()
            .in('id', filteredIds)

          if (delError) throw delError
        }

        const { error: ciError } = await supabase
          .from('contract_items')
          .delete()
          .eq('id', item.id)

        if (ciError) throw ciError
      }

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
          services: newItems as any,
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
      if (yearId) fetchAllData(establishmentId, yearId)
    } catch (err: any) {
      console.error('❌ Save edit error:', err?.message || err)
      setError(err.message || 'حدث خطأ')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSuspendContract = async (contractId: string, reason: string) => {
    if (!establishmentId) return
    setSuspending(true)
    setError('')

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data: installments } = await supabase
        .from('installments')
        .select('id, status, due_date')
        .eq('contract_id', contractId)

      const toDelete = (installments || [])
        .filter((i: any) => {
          if (i.status === 'paid') return false
          if (!i.due_date) return true
          return i.due_date >= today
        })
        .map((i: any) => i.id)

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('installments')
          .delete()
          .in('id', toDelete)
        if (delErr) throw delErr
      }

      const { error: updErr } = await supabase
        .from('contracts')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_reason: reason || null,
        })
        .eq('id', contractId)

      if (updErr) throw updErr

      setSuccess(`✅ تم توقيف العقد (${toDelete.length} قسط غير مدفوع تم حذفه)`)
      setTimeout(() => setSuccess(''), 4000)
      setSuspendDialog(null)
      setSuspendReason('')
      if (yearId) fetchAllData(establishmentId, yearId)
    } catch (err: any) {
      console.error('❌ Suspend error:', err?.message || err)
      setError(err?.message || 'حدث خطأ')
    } finally {
      setSuspending(false)
    }
  }

  const handleReactivateContract = async (contract: ContractRow) => {
    if (!establishmentId) return
    if (!confirm('هل تريد إعادة تفعيل هذا العقد؟\nسيتم توليد أقساط جديدة من تاريخ اليوم حتى نهاية العقد.')) return

    setError('')
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data: items } = await supabase
        .from('contract_items')
        .select('id, service_id, price, discount_percent, discount_amount, final_price, services(id, name, type, accept_discount)')
        .eq('contract_id', contract.id)

      let endDate = contract.end_date
      if (endDate && new Date(endDate) <= new Date(today)) endDate = null

      const services: ContractItemInput[] = (items || []).map((i: any) => ({
        service_id: i.service_id,
        name: i.services?.name || '',
        type: i.services?.type || '',
        price: i.price,
        discount_percent: i.discount_percent,
        discount_amount: i.discount_amount,
        final_price: i.final_price,
        accept_discount: i.services?.accept_discount ?? false,
      }))

      if (services.length > 0) {
        const newInstallments = generateInstallmentsForContract({
          establishmentId,
          studentId: contract.student_id,
          contractId: contract.id,
          startDate: today,
          endDate,
          services: services as any,
        })

        if (newInstallments.length > 0) {
          const { error: instErr } = await supabase
            .from('installments')
            .insert(newInstallments)
          if (instErr) throw instErr
        }
      }

      const { error: updErr } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', contract.id)

      if (updErr) throw updErr

      setSuccess('✅ تم إعادة تفعيل العقد وتوليد الأقساط الجديدة')
      setTimeout(() => setSuccess(''), 4000)
      if (yearId) fetchAllData(establishmentId, yearId)
    } catch (err: any) {
      console.error('❌ Reactivate error:', err?.message || err)
      setError(err?.message || 'حدث خطأ')
    }
  }

  const handleDeleteContract = async (contractId: string) => {
    if (!canDeleteContracts) {
      setError('ليس لديك صلاحية الحذف النهائي')
      return
    }

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
        `هل تريد توقيفه بدلاً من ذلك؟`
      )) {
        const student = contracts.find(c => c.id === contractId)?.students
        const studentName = student ? `${student.first_name} ${student.last_name}` : ''
        setSuspendDialog({ contractId, studentName })
      }
      return
    }

    if (!confirm('⚠️ هل أنت متأكد من الحذف النهائي لهذا العقد؟\nهذه العملية لا يمكن التراجع عنها.')) return

    if (installmentIds.length > 0) {
      await supabase.from('installments').delete().in('id', installmentIds)
    }
    await supabase.from('contract_items').delete().eq('contract_id', contractId)
    await supabase.from('contracts').delete().eq('id', contractId)

    setSuccess('✅ تم حذف العقد نهائياً')
    setTimeout(() => setSuccess(''), 3000)
    if (yearId) fetchAllData(establishmentId!, yearId)
  }

  const handlePrintContract = (contractId: string) => {
    window.open(`/api/pdf/contract?contractId=${contractId}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium">● نشط</span>
      case 'suspended':
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-medium">⏸️ موقوف</span>
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

  const alreadySubscribedServiceNames = new Set(
    existingContracts
      .filter((c) => c.status === 'active')
      .flatMap((c) => c.contract_items?.map((i: any) => i.services?.name).filter(Boolean) || [])
  )

  const studentQuery = studentSearch.trim().toLowerCase()
  const filteredStudents = students.filter((s) => {
    if (!studentQuery) return true
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentQuery) ||
      (s.massar_code || '').toLowerCase().includes(studentQuery)
    )
  })

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
                <div ref={studentBoxRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    التلميذ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      const v = e.target.value
                      setStudentSearch(v)
                      setShowStudentDropdown(true)
                      if (selectedStudentId) {
                        setSelectedStudentId('')
                        setSelectedEnrollment(null)
                        setAvailableServices([])
                        setSelectedServices([])
                        setExistingContracts([])
                        setStartDate('')
                        setEndDate('')
                      }
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="ابحث بالاسم أو رقم مسار..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />

                  {showStudentDropdown && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">لا نتائج</div>
                      ) : (
                        filteredStudents.slice(0, 50).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setStudentSearch(`${s.first_name} ${s.last_name}`)
                              setShowStudentDropdown(false)
                              handleStudentChange(s.id)
                            }}
                            className="block w-full text-right px-3 py-2 hover:bg-indigo-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-800">
                              {s.first_name} {s.last_name}
                            </div>
                            {s.massar_code && (
                              <div className="text-xs text-gray-500" dir="ltr">
                                {s.massar_code}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedEnrollment && (
                  <div className="text-sm text-gray-700 self-end bg-gray-50 p-3 rounded-lg">
                    <p><span className="font-medium">السنة:</span> {selectedEnrollment.academic_years?.name}</p>
                    <p><span className="font-medium">المستوى:</span> {selectedEnrollment.levels?.name}</p>
                    {selectedEnrollment.classes?.name && <p><span className="font-medium">القسم:</span> {selectedEnrollment.classes.name}</p>}
                  </div>
                )}

                {selectedStudentId && existingContracts.length > 0 && (
                  <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      هذا التلميذ عنده {existingContracts.length} عقد فهاد السنة
                    </p>
                    <div className="space-y-1.5 mb-3">
                      {existingContracts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs bg-white rounded-lg p-2.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`font-bold flex-shrink-0 ${
                              c.status === 'active' ? 'text-emerald-700' :
                              c.status === 'suspended' ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {c.status === 'active' ? '● نشط' : c.status === 'suspended' ? '⏸️ موقوف' : '● ملغى'}
                            </span>
                            <span className="text-slate-600 truncate">
                              {c.contract_items?.map((i: any) => i.services?.name).filter(Boolean).join(' • ') || '—'}
                            </span>
                          </div>
                          <span className="text-slate-400 flex-shrink-0 mr-2">{c.start_date}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/60 rounded-lg p-2.5">
                      <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        يمكنك إما <strong>إضافة عقد جديد</strong> بخدمات مختلفة، أو إغلاق النموذج واستعمال زر <strong>"تعديل"</strong> على العقد الموجود.
                      </span>
                    </div>
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
                      const isAlreadySubscribed = alreadySubscribedServiceNames.has(si.name)

                      return (
                        <div
                          key={swp.id}
                          className={`flex items-start gap-2 p-3 border rounded-lg transition ${
                            isAlreadySubscribed ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
                          }`}
                        >
                          <input type="checkbox" checked={isSel} onChange={() => toggleServiceSelection(swp)} className="mt-1 h-4 w-4" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{si.name}</span>
                              <span className="text-sm text-gray-500">— {swp.price} DH ({si.type})</span>
                              {isAlreadySubscribed && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  ⚠️ مشترك فيها ف عقد آخر
                                </span>
                              )}
                            </div>
                            {isSel && si.accept_discount && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-sm">تخفيض % :</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={selectedServices.find(s => s.service_id === si.id)?.discount_percent || 0}
                                  onChange={(e) => updateServiceDiscount(si.id, 'discount_percent', Number(e.target.value))}
                                  className="w-20 px-2 py-1 border rounded"
                                />
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
          <button onClick={() => yearId && fetchAllData(establishmentId!, yearId)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
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
                  <tr key={contract.id} className={contract.status === 'cancelled' ? 'bg-red-50/30 opacity-70' : contract.status === 'suspended' ? 'bg-amber-50/40' : ''}>
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
                          <button
                            onClick={() => {
                              const sName = contract.students ? `${contract.students.first_name} ${contract.students.last_name}` : ''
                              setSuspendDialog({ contractId: contract.id, studentName: sName })
                            }}
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            title="توقيف"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {contract.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivateContract(contract)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="إعادة تفعيل"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {canDeleteContracts && (
                          <button onClick={() => handleDeleteContract(contract.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف نهائي">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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

      {/* SUSPEND MODAL */}
      {suspendDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">توقيف العقد</h3>
                {suspendDialog.studentName && (
                  <p className="text-sm text-gray-500 mt-0.5">{suspendDialog.studentName}</p>
                )}
              </div>
              <button
                onClick={() => { setSuspendDialog(null); setSuspendReason('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
              <p className="font-medium mb-1">⚠️ شنو غادي يطرا؟</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>الأقساط <strong>غير المدفوعة</strong> من اليوم لـ النهاية = <strong>غادي تتحيد</strong></li>
                <li>الأقساط <strong>المدفوعة</strong> = <strong>غادي تبقى</strong> فالسجل</li>
                <li>الدفعات المسجلة = <strong>ما كيتغيرش عليها والو</strong></li>
                <li>ممكن ترجع العقد بـ "إعادة تفعيل" → غادي تولّد أقساط جديدة من تاريخ الرجوع</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">سبب التوقيف (اختياري)</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={2}
                placeholder="مثال: التلميذ مريض / مسافر..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setSuspendDialog(null); setSuspendReason('') }}
                disabled={suspending}
                className="h-10 px-5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                رجوع
              </button>
              <button
                onClick={() => handleSuspendContract(suspendDialog.contractId, suspendReason)}
                disabled={suspending}
                className="h-10 px-5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                {suspending ? 'جارٍ التوقيف...' : 'تأكيد التوقيف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}