'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { generateInstallmentsForContract } from '@/lib/billing'
import DateInput from '@/components/DateInput'
import {
  Search, CheckCircle, UserPlus, Users, ListChecks, Pencil, X, Save,
  GraduationCap, Calendar, Filter, RefreshCw, AlertTriangle, Trash2,
  BookOpen, User, Award, CheckCircle2,
} from 'lucide-react'

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

type Family = {
  id: string
  family_name: string
  father_name: string
  mother_name: string
  phone: string
  email: string
  address: string
  city: string
}

type Student = {
  id: string
  first_name: string
  last_name: string
  massar_code: string | null
  gender: string
  birth_date: string | null
}

type AcademicYear = {
  id: string
  name: string
  is_current: boolean
  start_date?: string | null
  end_date?: string | null
}

type Level = { id: string; name: string }
type ClassItem = { id: string; name: string; level_id: string }

type ServiceOption = {
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

type SelectedService = {
  service_id: string
  name: string
  type: string
  price: number
  discount_percent: number
  discount_amount: number
  final_price: number
  accept_discount: boolean
}

type EnrollmentRow = {
  id: string
  enrollment_date: string | null
  status: string | null
  student_id: string
  student_first_name: string
  student_last_name: string
  student_massar: string | null
  student_gender: string | null
  class_id: string | null
  class_name: string | null
  level_id: string | null
  level_name: string | null
  academic_year_id: string
  academic_year_name: string
}

const steps = ['العائلة', 'التلميذ', 'التفاصيل والخدمات']

export default function EnrollPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'new' | 'list'>('new')

  // ============ TAB 1: NEW ENROLLMENT ============
  const [step, setStep] = useState(0)

  const [families, setFamilies] = useState<Family[]>([])
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [familySearch, setFamilySearch] = useState('')
  const [showNewFamily, setShowNewFamily] = useState(false)
  const [newFamily, setNewFamily] = useState({
    family_name: '', father_name: '', mother_name: '', phone: '',
    email: '', address: '', city: '',
  })

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [showNewStudent, setShowNewStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', massar_code: '', gender: 'ذكر', birth_date: '',
  })

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const debouncedFamilySearch = useDebounce(familySearch, 500)
  const debouncedStudentSearch = useDebounce(studentSearch, 500)

  // ============ TAB 2: ENROLLED LIST ============
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [filterYear, setFilterYear] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const debouncedFilterSearch = useDebounce(filterSearch, 400)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRow | null>(null)
  const [editClass, setEditClass] = useState('')
  const [editLevel, setEditLevel] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentRow | null>(null)
  const [deleteDetails, setDeleteDetails] = useState<{
    contracts: number
    installmentsTotal: number
    unpaidInstallments: number
    paidInstallments: number
    payments: number
    paidAmount: number
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ============ EFFECTS ============
  useEffect(() => {
    if (!establishmentId) return
    fetchInitialData(establishmentId)
  }, [establishmentId])

  useEffect(() => {
    if (debouncedFamilySearch.trim()) searchFamilies()
  }, [debouncedFamilySearch])

  useEffect(() => {
    if (debouncedStudentSearch.trim() && selectedFamily) searchStudentsInFamily()
  }, [debouncedStudentSearch, selectedFamily])

  useEffect(() => {
    if (tab === 'list' && establishmentId) {
      loadEnrollments()
    }
  }, [tab, establishmentId])

  useEffect(() => {
    if (tab === 'list' && establishmentId) {
      loadEnrollments()
    }
  }, [filterYear, filterLevel, filterClass, debouncedFilterSearch])

  const fetchInitialData = async (sid: string) => {
    const supabase = createClient()
    const { data: yearsData } = await supabase
      .from('academic_years')
      .select('id, name, is_current, start_date, end_date')
      .eq('establishment_id', sid)
    setAcademicYears(yearsData || [])

    const { data: levelsData } = await supabase
      .from('levels')
      .select('id, name')
      .eq('establishment_id', sid)
    setLevels(levelsData || [])

    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level_id')
      .eq('establishment_id', sid)
    setClasses(classesData || [])

    const current = (yearsData || []).find((y: any) => y.is_current)
    if (current) setFilterYear(current.id)

    setLoading(false)
  }

  // ============ FAMILIES ============
  const searchFamilies = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    let query = supabase.from('families').select('*').eq('establishment_id', establishmentId)
    if (familySearch.trim()) {
      query = query.or(
        `family_name.ilike.%${familySearch}%,father_name.ilike.%${familySearch}%,mother_name.ilike.%${familySearch}%,phone.ilike.%${familySearch}%`
      )
    }
    const { data, error } = await query.limit(20)
    if (error) setError(error.message)
    else setFamilies(data || [])
  }

  const selectFamily = async (family: Family) => {
    setSelectedFamily(family)
    setShowNewFamily(false)
    setStep(1)
    if (establishmentId) {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, massar_code, gender, birth_date')
        .eq('family_id', family.id)
        .eq('establishment_id', establishmentId)
      if (!error) setStudents(data || [])
    }
  }

  const createFamily = async () => {
    if (!establishmentId) return
    if (!newFamily.family_name.trim()) {
      setError('اسم العائلة مطلوب')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('families')
      .insert({
        establishment_id: establishmentId,
        family_name: newFamily.family_name,
        father_name: newFamily.father_name || null,
        mother_name: newFamily.mother_name || null,
        phone: newFamily.phone || null,
        email: newFamily.email || null,
        address: newFamily.address || null,
        city: newFamily.city || null,
      })
      .select()
      .single()

    if (error) setError(error.message)
    else {
      setSelectedFamily(data)
      setShowNewFamily(false)
      setStep(1)
    }
  }

  // ============ STUDENTS ============
  const searchStudentsInFamily = async () => {
    if (!selectedFamily || !establishmentId) return
    const supabase = createClient()
    let query = supabase
      .from('students')
      .select('id, first_name, last_name, massar_code, gender, birth_date')
      .eq('family_id', selectedFamily.id)
      .eq('establishment_id', establishmentId)
    if (studentSearch.trim()) {
      query = query.or(
        `first_name.ilike.%${studentSearch}%,last_name.ilike.%${studentSearch}%,massar_code.ilike.%${studentSearch}%`
      )
    }
    const { data, error } = await query
    if (error) setError(error.message)
    else setStudents(data || [])
  }

  const selectStudent = async (student: Student) => {
    if (selectedYear || academicYears.find(y => y.is_current)) {
      const yearId = selectedYear || academicYears.find(y => y.is_current)?.id
      if (yearId) {
        const supabase = createClient()
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', student.id)
          .eq('academic_year_id', yearId)
          .maybeSingle()

        if (existing) {
          const yearName = academicYears.find(y => y.id === yearId)?.name || ''
          setError(`هذا التلميذ مسجل مسبقاً في السنة الدراسية "${yearName}". يمكنك تعديل تسجيله من قائمة التلاميذ المسجلين.`)
          return
        }
      }
    }

    setSelectedStudent(student)
    setShowNewStudent(false)
    setStep(2)
    const cur = academicYears.find(y => y.is_current)
    if (cur && !selectedYear) {
      setSelectedYear(cur.id)
      setStartDate(cur.start_date || '')
      setEndDate(cur.end_date || '')
    }
  }

  const createStudent = async () => {
    if (!selectedFamily || !establishmentId) return
    if (!newStudent.first_name.trim() || !newStudent.last_name.trim()) {
      setError('اسم و لقب التلميذ مطلوبان')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('students')
      .insert({
        establishment_id: establishmentId,
        family_id: selectedFamily.id,
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        massar_code: newStudent.massar_code || null,
        gender: newStudent.gender,
        birth_date: newStudent.birth_date || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) setError(error.message)
    else {
      setSelectedStudent(data)
      setShowNewStudent(false)
      setStep(2)
      const cur = academicYears.find(y => y.is_current)
      if (cur && !selectedYear) {
        setSelectedYear(cur.id)
        setStartDate(cur.start_date || '')
        setEndDate(cur.end_date || '')
      }
    }
  }

  // ============ YEAR / LEVEL ============
  const handleYearChange = async (yearId: string) => {
    setSelectedYear(yearId)
    if (!yearId) return
    const supabase = createClient()
    const { data: yearData, error } = await supabase
      .from('academic_years')
      .select('start_date, end_date')
      .eq('id', yearId)
      .single()
    if (!error && yearData) {
      setStartDate(yearData.start_date || '')
      setEndDate(yearData.end_date || '')
    } else {
      const now = new Date()
      setStartDate(`${now.getFullYear()}-09-01`)
      setEndDate(`${now.getFullYear() + 1}-06-30`)
    }
  }

  const handleLevelChange = async (levelId: string) => {
    setSelectedLevel(levelId)
    setSelectedClass('')
    setAvailableServices([])
    setSelectedServices([])
    if (!establishmentId || !levelId) return
    const supabase = createClient()
    const { data: priceData, error: priceError } = await supabase
      .from('service_level_prices')
      .select('id, service_id, level_id, price')
      .eq('level_id', levelId)
    if (priceError) {
      setError('خطأ في جلب الأسعار: ' + priceError.message)
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

  const toggleService = (serviceOption: ServiceOption) => {
    const serviceInfo = serviceOption.services
    if (!serviceInfo || !serviceInfo.active) return
    setSelectedServices((prev) => {
      const existing = prev.find((s) => s.service_id === serviceInfo.id)
      if (existing) return prev.filter((s) => s.service_id !== serviceInfo.id)
      return [
        ...prev,
        {
          service_id: serviceInfo.id,
          name: serviceInfo.name,
          type: serviceInfo.type,
          price: serviceOption.price,
          discount_percent: 0,
          discount_amount: 0,
          final_price: serviceOption.price,
          accept_discount: serviceInfo.accept_discount,
        },
      ]
    })
  }

  const updateDiscount = (serviceId: string, percent: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.service_id !== serviceId) return s
        const discountAmount = (s.price * percent) / 100
        return {
          ...s,
          discount_percent: percent,
          discount_amount: discountAmount,
          final_price: Math.max(0, s.price - discountAmount),
        }
      })
    )
  }

  // ============ SUBMIT NEW ENROLLMENT ============
  const handleSubmit = async () => {
    if (
      !establishmentId ||
      !selectedFamily ||
      !selectedStudent ||
      !selectedYear ||
      !selectedLevel
    ) {
      setError('يرجى ملء السنة والمستوى على الأقل')
      return
    }
    if (selectedServices.length === 0) {
      setError('يرجى اختيار خدمة واحدة على الأقل')
      return
    }
    if (!startDate) {
      setError('تاريخ البداية إلزامي')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    try {
      const { data: existingEnroll } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', selectedStudent.id)
        .eq('academic_year_id', selectedYear)
        .maybeSingle()

      if (existingEnroll) {
        const yearName = academicYears.find(y => y.id === selectedYear)?.name || ''
        setError(`هذا التلميذ مسجل مسبقاً في السنة الدراسية "${yearName}".`)
        setSaving(false)
        return
      }

      let finalEndDate = endDate
      if (!finalEndDate) {
        const { data: yearData } = await supabase
          .from('academic_years')
          .select('end_date')
          .eq('id', selectedYear)
          .single()
        finalEndDate = yearData?.end_date || null
      }

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          establishment_id: establishmentId,
          student_id: selectedStudent.id,
          academic_year_id: selectedYear,
          level_id: selectedLevel,
          class_id: selectedClass || null,
          status: 'active',
        })
        .select()
        .single()

      if (enrollmentError) {
        if (enrollmentError.message?.includes('enrollments_unique_student_year') ||
            enrollmentError.message?.includes('duplicate key')) {
          setError('هذا التلميذ مسجل مسبقاً في هذه السنة الدراسية.')
          setSaving(false)
          return
        }
        throw enrollmentError
      }

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          establishment_id: establishmentId,
          student_id: selectedStudent.id,
          academic_year_id: selectedYear,
          start_date: startDate,
          end_date: endDate || null,
          status: 'active',
          notes: null,
        })
        .select()
        .single()
      if (contractError) throw contractError

      const contractItems = selectedServices.map((s) => ({
        contract_id: contract.id,
        service_id: s.service_id,
        price: s.price,
        discount_percent: s.discount_percent,
        discount_amount: s.discount_amount,
        final_price: s.final_price,
      }))
      const { error: itemsError } = await supabase
        .from('contract_items')
        .insert(contractItems)
      if (itemsError) throw itemsError

      const installments = generateInstallmentsForContract({
        establishmentId,
        studentId: selectedStudent.id,
        contractId: contract.id,
        startDate,
        endDate: finalEndDate,
        services: selectedServices,
      })
      if (installments.length > 0) {
        const { error: instError } = await supabase
          .from('installments')
          .insert(installments)
        if (instError) throw instError
      }

      setSuccess('تمت عملية التسجيل بنجاح')
      setTimeout(() => {
        router.push('/dashboard/students')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  // ============ LOAD ENROLLMENTS LIST ============
  const loadEnrollments = async () => {
    if (!establishmentId) return
    setListLoading(true)
    setError('')
    const supabase = createClient()

    let query = supabase
      .from('enrollments')
      .select(`
        id, enrollment_date, status,
        student_id, class_id, level_id, academic_year_id,
        students!inner(id, first_name, last_name, massar_code, gender),
        classes(id, name),
        levels(id, name),
        academic_years(id, name)
      `)
      .eq('establishment_id', establishmentId)
      .order('enrollment_date', { ascending: false })

    if (filterYear) query = query.eq('academic_year_id', filterYear)
    if (filterLevel) query = query.eq('level_id', filterLevel)
    if (filterClass) query = query.eq('class_id', filterClass)

    const { data, error: fetchErr } = await query
    if (fetchErr) {
      setError(fetchErr.message)
      setListLoading(false)
      return
    }

    let rows: EnrollmentRow[] = (data || []).map((e: any) => ({
      id: e.id,
      enrollment_date: e.enrollment_date,
      status: e.status,
      student_id: e.student_id,
      student_first_name: e.students?.first_name || '',
      student_last_name: e.students?.last_name || '',
      student_massar: e.students?.massar_code || null,
      student_gender: e.students?.gender || null,
      class_id: e.class_id,
      class_name: e.classes?.name || null,
      level_id: e.level_id,
      level_name: e.levels?.name || null,
      academic_year_id: e.academic_year_id,
      academic_year_name: e.academic_years?.name || '',
    }))

    if (debouncedFilterSearch.trim()) {
      const q = debouncedFilterSearch.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.student_first_name.toLowerCase().includes(q) ||
          r.student_last_name.toLowerCase().includes(q) ||
          (r.student_massar || '').toLowerCase().includes(q)
      )
    }

    setEnrollments(rows)
    setListLoading(false)
  }

  // ============ EDIT ENROLLMENT ============
  const openEdit = (e: EnrollmentRow) => {
    setEditingEnrollment(e)
    setEditLevel(e.level_id || '')
    setEditClass(e.class_id || '')
    setEditStatus(e.status || 'active')
    setError('')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingEnrollment || !establishmentId) return
    setSavingEdit(true)
    setError('')
    const supabase = createClient()

    try {
      const { error: upErr } = await supabase
        .from('enrollments')
        .update({
          level_id: editLevel || null,
          class_id: editClass || null,
          status: editStatus,
        })
        .eq('id', editingEnrollment.id)

      if (upErr) throw upErr

      setSuccess('تم تحديث التسجيل')
      setTimeout(() => setSuccess(''), 2500)
      setShowEditModal(false)
      await loadEnrollments()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSavingEdit(false)
    }
  }

  // ============ DELETE WITH SMART CASCADE ============
  const openDeleteModal = async (e: EnrollmentRow) => {
    setDeleteTarget(e)
    setDeleteDetails(null)
    setShowDeleteModal(true)
    setError('')

    const supabase = createClient()

    // 1. Contracts
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('student_id', e.student_id)
      .eq('academic_year_id', e.academic_year_id)

    const contractIds = (contracts || []).map(c => c.id)

    if (contractIds.length === 0) {
      setDeleteDetails({
        contracts: 0,
        installmentsTotal: 0,
        unpaidInstallments: 0,
        paidInstallments: 0,
        payments: 0,
        paidAmount: 0,
      })
      return
    }

    // 2. Installments
    const { data: inst } = await supabase
      .from('installments')
      .select('id')
      .in('contract_id', contractIds)
    const installmentIds = (inst || []).map(i => i.id)

    // 3. Payments (باش نعرفو شكون مخلّص)
    let paidInstallmentIds: string[] = []
    let paymentsCount = 0
    let paidTotal = 0

    if (installmentIds.length > 0) {
      const { data: pays } = await supabase
        .from('payments')
        .select('id, amount, installment_id')
        .in('installment_id', installmentIds)

      paidInstallmentIds = Array.from(
        new Set((pays || []).map((p: any) => p.installment_id).filter(Boolean))
      )
      paymentsCount = (pays || []).length
      paidTotal = (pays || []).reduce((s, p: any) => s + Number(p.amount || 0), 0)
    }

    const unpaidIds = installmentIds.filter(id => !paidInstallmentIds.includes(id))

    setDeleteDetails({
      contracts: contractIds.length,
      installmentsTotal: installmentIds.length,
      unpaidInstallments: unpaidIds.length,
      paidInstallments: paidInstallmentIds.length,
      payments: paymentsCount,
      paidAmount: paidTotal,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    const supabase = createClient()

    try {
      // 1. جيب العقود
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('student_id', deleteTarget.student_id)
        .eq('academic_year_id', deleteTarget.academic_year_id)

      const contractIds = (contracts || []).map(c => c.id)

      // 2. جيب الأقساط
      let installmentIds: string[] = []
      if (contractIds.length > 0) {
        const { data: inst } = await supabase
          .from('installments')
          .select('id')
          .in('contract_id', contractIds)
        installmentIds = (inst || []).map(i => i.id)
      }

      // 3. شوف شكون عندو payments
      let paidInstallmentIds: string[] = []
      if (installmentIds.length > 0) {
        const { data: pays } = await supabase
          .from('payments')
          .select('installment_id')
          .in('installment_id', installmentIds)
          .not('installment_id', 'is', null)

        paidInstallmentIds = Array.from(
          new Set((pays || []).map((p: any) => p.installment_id).filter(Boolean))
        )
      }

      const unpaidIds = installmentIds.filter(id => !paidInstallmentIds.includes(id))

      // 4. حذف الأقساط غير المخلّصة فقط
      if (unpaidIds.length > 0) {
        const { error: iErr } = await supabase
          .from('installments')
          .delete()
          .in('id', unpaidIds)
        if (iErr) throw iErr
      }

      // 5. إلا ما كاينش أي قسط مخلّص → حذف كامل للعقد
      if (paidInstallmentIds.length === 0) {
        if (contractIds.length > 0) {
          const { error: ciErr } = await supabase
            .from('contract_items')
            .delete()
            .in('contract_id', contractIds)
          if (ciErr) throw ciErr

          const { error: cErr } = await supabase
            .from('contracts')
            .delete()
            .in('id', contractIds)
          if (cErr) throw cErr
        }
      }
      // إلا كانو أقساط مخلّصة → نخليو العقد + الأقساط المخلّصة + payments (سجل تاريخي)

      // 6. حذف التسجيل
      const { error: eErr } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', deleteTarget.id)
      if (eErr) throw eErr

      // 7. رسالة نجاح
      if (paidInstallmentIds.length > 0) {
        setSuccess(
          `تم حذف التسجيل. تم الاحتفاظ بـ ${paidInstallmentIds.length} قسط مخلّص كسجل تاريخي.`
        )
      } else {
        setSuccess('تم حذف التسجيل وجميع السجلات المالية')
      }
      setTimeout(() => setSuccess(''), 4000)
      setShowDeleteModal(false)
      await loadEnrollments()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setDeleting(false)
    }
  }

  const editClasses = useMemo(
    () => classes.filter((c) => c.level_id === editLevel),
    [classes, editLevel]
  )

  if (loading || permissionsLoading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (!hasPermission('students', 'create'))
    return <div className="p-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</div>

  return (
    <div className="p-6" dir="rtl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">التسجيلات</h1>
        <p className="text-gray-600 mt-1">تسجيل تلميذ جديد، أو مراجعة التسجيلات السابقة</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('new')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'new'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          تسجيل جديد
        </button>
        <button
          onClick={() => setTab('list')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            tab === 'list'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListChecks className="h-4 w-4" />
          التلاميذ المسجلون
        </button>
      </div>

      {error && !showDeleteModal && !showEditModal && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* =========================== TAB 1: NEW =========================== */}
      {tab === 'new' && (
        <>
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            {steps.map((label, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                    index === step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < step ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                <span className={index === step ? 'font-semibold' : 'text-gray-500'}>
                  {label}
                </span>
                {index < steps.length - 1 && <div className="h-px w-8 bg-gray-300" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">الخطوة 1: اختيار العائلة</h2>

              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    className="w-full h-11 pr-10 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="البحث عن عائلة..."
                  />
                </div>
                <button
                  onClick={() => setShowNewFamily(!showNewFamily)}
                  className="h-11 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                >
                  عائلة جديدة
                </button>
              </div>

              {showNewFamily && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <input
                    type="text"
                    placeholder="اسم العائلة"
                    value={newFamily.family_name}
                    onChange={(e) => setNewFamily({ ...newFamily, family_name: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="اسم الأب"
                    value={newFamily.father_name}
                    onChange={(e) => setNewFamily({ ...newFamily, father_name: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="اسم الأم"
                    value={newFamily.mother_name}
                    onChange={(e) => setNewFamily({ ...newFamily, mother_name: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="الهاتف"
                    value={newFamily.phone}
                    onChange={(e) => setNewFamily({ ...newFamily, phone: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={newFamily.email}
                    onChange={(e) => setNewFamily({ ...newFamily, email: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="العنوان"
                    value={newFamily.address}
                    onChange={(e) => setNewFamily({ ...newFamily, address: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="المدينة"
                    value={newFamily.city}
                    onChange={(e) => setNewFamily({ ...newFamily, city: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={createFamily}
                    className="col-span-2 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    حفظ العائلة
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {families.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لم يتم العثور على عائلات.</p>
                ) : (
                  families.map((family) => (
                    <button
                      key={family.id}
                      onClick={() => selectFamily(family)}
                      className="w-full text-right p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span className="font-medium">
                        {family.family_name || family.father_name || family.mother_name}
                      </span>
                      <span className="text-gray-500 text-sm">{family.phone}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 1 && selectedFamily && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">الخطوة 2: اختيار التلميذ</h2>
                <button
                  onClick={() => {
                    setStep(0)
                    setSelectedStudent(null)
                  }}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  ← تغيير العائلة
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                <strong>العائلة:</strong> {selectedFamily.family_name || selectedFamily.father_name}
              </div>

              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full h-11 pr-10 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="البحث عن تلميذ..."
                  />
                </div>
                <button
                  onClick={() => setShowNewStudent(!showNewStudent)}
                  className="h-11 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                >
                  تلميذ جديد
                </button>
              </div>

              {showNewStudent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <input
                    type="text"
                    placeholder="الاسم الشخصي"
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="الاسم العائلي"
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="رقم مسار"
                    value={newStudent.massar_code}
                    onChange={(e) => setNewStudent({ ...newStudent, massar_code: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                  <DateInput
                    value={newStudent.birth_date}
                    onChange={(isoDate) => setNewStudent({ ...newStudent, birth_date: isoDate })}
                    className="h-10"
                  />
                  <button
                    onClick={createStudent}
                    className="col-span-2 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    حفظ التلميذ
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {students.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لم يتم العثور على تلاميذ.</p>
                ) : (
                  students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => selectStudent(student)}
                      className="w-full text-right p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span className="font-medium">
                        {student.first_name} {student.last_name}
                      </span>
                      {student.massar_code && (
                        <span className="text-gray-500 text-sm">{student.massar_code}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 2 && selectedStudent && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">الخطوة 3: التفاصيل والخدمات</h2>
                <button
                  onClick={() => {
                    setStep(1)
                  }}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  ← تغيير التلميذ
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3 text-sm md:col-span-2">
                  <strong>التلميذ:</strong> {selectedStudent.first_name} {selectedStudent.last_name}
                  {selectedStudent.massar_code && (
                    <span className="text-slate-500 mr-2">· {selectedStudent.massar_code}</span>
                  )}
                </div>

                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="h-10 px-3 border border-gray-300 rounded-lg"
                >
                  <option value="">السنة الدراسية</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? '(الحالية)' : ''}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="h-10 px-3 border border-gray-300 rounded-lg"
                >
                  <option value="">المستوى</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="h-10 px-3 border border-gray-300 rounded-lg"
                >
                  <option value="">القسم</option>
                  {classes
                    .filter((c) => c.level_id === selectedLevel)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <DateInput value={startDate} onChange={setStartDate} className="h-10" />
                <DateInput
                  value={endDate}
                  onChange={setEndDate}
                  className="h-10"
                  placeholder="jj/mm/aaaa (اختياري)"
                />
              </div>

              {availableServices.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">الخدمات المتاحة</h3>
                  <div className="space-y-2">
                    {availableServices.map((svc) => {
                      const serviceInfo = svc.services
                      if (!serviceInfo || !serviceInfo.active) return null
                      const isSelected = selectedServices.some(
                        (s) => s.service_id === serviceInfo.id
                      )
                      return (
                        <div
                          key={svc.id}
                          className="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleService(svc)}
                            className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">{serviceInfo.name}</span>
                              <span className="text-sm text-gray-500">
                                {svc.price} د.م ({serviceInfo.type})
                              </span>
                            </div>
                            {isSelected && serviceInfo.accept_discount && (
                              <div className="mt-2 flex items-center gap-3">
                                <label className="text-sm text-gray-600">الخصم % :</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={
                                    selectedServices.find(
                                      (s) => s.service_id === serviceInfo.id
                                    )?.discount_percent || 0
                                  }
                                  onChange={(e) =>
                                    updateDiscount(serviceInfo.id, Number(e.target.value))
                                  }
                                  className="h-9 w-20 border border-gray-300 rounded px-2 text-sm"
                                />
                                <span className="text-sm text-gray-700">
                                  النهائي:{' '}
                                  <span className="font-bold">
                                    {
                                      selectedServices.find(
                                        (s) => s.service_id === serviceInfo.id
                                      )?.final_price
                                    }{' '}
                                    د.م
                                  </span>
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

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {saving ? 'جارٍ التسجيل...' : 'تأكيد التسجيل'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================== TAB 2: LIST =========================== */}
      {tab === 'list' && (
        <>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">الفلاتر</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">كل السنوات</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(الحالية)' : ''}
                  </option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value)
                  setFilterClass('')
                }}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">كل المستويات</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={!filterLevel}
              >
                <option value="">كل الأقسام</option>
                {classes
                  .filter((c) => !filterLevel || c.level_id === filterLevel)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="البحث بالاسم أو رقم مسار..."
                  className="w-full h-10 pr-10 pl-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {(filterYear || filterLevel || filterClass || filterSearch) && (
              <button
                onClick={() => {
                  setFilterYear('')
                  setFilterLevel('')
                  setFilterClass('')
                  setFilterSearch('')
                }}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                ✕ إزالة جميع الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-bold text-slate-800">{enrollments.length}</div>
              <div className="text-xs text-slate-500 mt-1">تسجيل</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-bold text-emerald-600">
                {enrollments.filter((e) => e.status === 'active').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">نشط</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-bold text-indigo-600">
                {new Set(enrollments.map((e) => e.class_id).filter(Boolean)).size}
              </div>
              <div className="text-xs text-slate-500 mt-1">قسم معني</div>
            </div>
          </div>

          {listLoading ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
              <RefreshCw className="h-8 w-8 text-indigo-400 mx-auto animate-spin mb-4" />
              <p className="text-slate-500 text-sm">جارٍ التحميل...</p>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">لا توجد تسجيلات مطابقة للفلاتر</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        الاسم الكامل
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        رقم مسار
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        المستوى
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        القسم
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        السنة الدراسية
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                        الحالة
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrollments.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                              {e.student_first_name.charAt(0)}
                            </span>
                            <span className="text-sm font-medium text-slate-800">
                              {e.student_first_name} {e.student_last_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {e.student_massar ? (
                            <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {e.student_massar}
                            </code>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {e.level_name ? (
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                              {e.level_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {e.class_name ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                              <BookOpen className="h-3.5 w-3.5" />
                              {e.class_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">بدون قسم</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {e.academic_year_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                              <CheckCircle className="h-3 w-3" /> نشط
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">غير نشط</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => openEdit(e)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="حذف التسجيل"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== EDIT MODAL ========== */}
      {showEditModal && editingEnrollment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-indigo-600" />
                تعديل التسجيل
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <strong>
                  {editingEnrollment.student_first_name} {editingEnrollment.student_last_name}
                </strong>
                {editingEnrollment.student_massar && (
                  <code className="text-xs font-mono text-slate-600">
                    {editingEnrollment.student_massar}
                  </code>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{editingEnrollment.academic_year_name}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المستوى
                </label>
                <select
                  value={editLevel}
                  onChange={(e) => {
                    setEditLevel(e.target.value)
                    setEditClass('')
                  }}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— اختر المستوى —</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  القسم
                </label>
                <select
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  disabled={!editLevel}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">— بدون قسم —</option>
                  {editClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠️ لا يمكن تغيير التلميذ أو السنة الدراسية. إلا أردت ذلك، احذف التسجيل
                وأنشئ تسجيلاً جديداً.
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  <Save className="h-4 w-4" />
                  {savingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE MODAL ========== */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                تأكيد حذف التسجيل
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <strong>
                  {deleteTarget.student_first_name} {deleteTarget.student_last_name}
                </strong>
                {deleteTarget.student_massar && (
                  <code className="text-xs font-mono text-slate-600">
                    {deleteTarget.student_massar}
                  </code>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>
                  {deleteTarget.academic_year_name} · {deleteTarget.class_name || 'بدون قسم'}
                </span>
              </div>
            </div>

            {!deleteDetails ? (
              <div className="text-center py-6">
                <RefreshCw className="h-6 w-6 text-indigo-400 mx-auto animate-spin mb-2" />
                <p className="text-slate-500 text-sm">جارٍ التحقق من السجلات المالية...</p>
              </div>
            ) : (
              <>
                {/* ملخص */}
                <div
                  className={`rounded-lg p-4 mb-4 text-sm ${
                    deleteDetails.paidInstallments > 0
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-slate-50 border border-slate-200 text-slate-700'
                  }`}
                >
                  <strong className="block mb-1">ملاحظة:</strong>
                  {deleteDetails.paidInstallments > 0 ? (
                    <p>
                      سيتم حذف الأقساط غير المخلّصة فقط. سيتم الاحتفاظ بـ{' '}
                      <strong>{deleteDetails.paidInstallments}</strong> قسط مخلّص والمبلغ{' '}
                      <strong>{deleteDetails.paidAmount.toFixed(2)} د.م</strong> كسجل تاريخي.
                    </p>
                  ) : (
                    <p>سيتم حذف التسجيل وجميع السجلات المالية المرتبطة به بشكل نهائي.</p>
                  )}
                </div>

                {/* ما سيُحذف */}
                <div className="border border-red-200 rounded-lg overflow-hidden mb-3">
                  <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-700 border-b border-red-200 flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5" /> سيتم الحذف نهائياً
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-slate-700">التسجيل</span>
                      <span className="font-bold text-slate-800">1</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-slate-700">الأقساط غير المخلّصة</span>
                      <span className="font-bold text-red-600">
                        {deleteDetails.unpaidInstallments}
                      </span>
                    </div>
                    {deleteDetails.paidInstallments === 0 && deleteDetails.contracts > 0 && (
                      <div className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-slate-700">العقود</span>
                        <span className="font-bold text-slate-800">
                          {deleteDetails.contracts}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ما سيُحتفظ به */}
                {deleteDetails.paidInstallments > 0 && (
                  <div className="border border-emerald-200 rounded-lg overflow-hidden mb-4">
                    <div className="bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 border-b border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> سيتم الاحتفاظ به (سجل تاريخي)
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-slate-700">العقود</span>
                        <span className="font-bold text-slate-800">
                          {deleteDetails.contracts}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-slate-700">الأقساط المخلّصة</span>
                        <span className="font-bold text-emerald-700">
                          {deleteDetails.paidInstallments}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-slate-700">المدفوعات</span>
                        <span className="font-bold text-emerald-700">
                          {deleteDetails.payments}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 text-sm bg-emerald-50/40">
                        <span className="text-emerald-800 font-medium">المبلغ المخلّص</span>
                        <span className="font-bold text-emerald-700">
                          {deleteDetails.paidAmount.toFixed(2)} د.م
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="h-11 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-bold"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}