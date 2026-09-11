'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserPermissions } from '@/lib/useUserPermissions'
import { generateInstallmentsForContract } from '@/lib/billing'
import DateInput from '@/components/DateInput'
import { Search, CheckCircle, UserPlus } from 'lucide-react'

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

const steps = ['العائلة', 'التلميذ', 'التفاصيل والخدمات']

export default function EnrollPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)

  const [families, setFamilies] = useState<Family[]>([])
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [familySearch, setFamilySearch] = useState('')
  const [showNewFamily, setShowNewFamily] = useState(false)
  const [newFamily, setNewFamily] = useState({
    family_name: '',
    father_name: '',
    mother_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  })

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [showNewStudent, setShowNewStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({
    first_name: '',
    last_name: '',
    massar_code: '',
    gender: 'ذكر',
    birth_date: '',
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

  const fetchInitialData = async (sid: string) => {
    const supabase = createClient()
    const { data: yearsData } = await supabase.from('academic_years').select('id, name, is_current, start_date, end_date').eq('establishment_id', sid)
    setAcademicYears(yearsData || [])
    const { data: levelsData } = await supabase.from('levels').select('id, name').eq('establishment_id', sid)
    setLevels(levelsData || [])
    const { data: classesData } = await supabase.from('classes').select('id, name, level_id').eq('establishment_id', sid)
    setClasses(classesData || [])
    setLoading(false)
  }

  const searchFamilies = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    let query = supabase.from('families').select('*').eq('establishment_id', establishmentId)
    if (familySearch.trim()) {
      query = query.or(`family_name.ilike.%${familySearch}%,father_name.ilike.%${familySearch}%,mother_name.ilike.%${familySearch}%,phone.ilike.%${familySearch}%`)
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
      const { data, error } = await supabase.from('students').select('id, first_name, last_name, massar_code, gender, birth_date').eq('family_id', family.id).eq('establishment_id', establishmentId)
      if (!error) setStudents(data || [])
    }
  }

  const createFamily = async () => {
    if (!establishmentId) return
    const supabase = createClient()
    const { data, error } = await supabase.from('families').insert({
      establishment_id: establishmentId,
      family_name: newFamily.family_name,
      father_name: newFamily.father_name || null,
      mother_name: newFamily.mother_name || null,
      phone: newFamily.phone || null,
      email: newFamily.email || null,
      address: newFamily.address || null,
      city: newFamily.city || null,
    }).select().single()

    if (error) setError(error.message)
    else {
      setSelectedFamily(data)
      setShowNewFamily(false)
      setStep(1)
    }
  }

  const searchStudentsInFamily = async () => {
    if (!selectedFamily || !establishmentId) return
    const supabase = createClient()
    let query = supabase.from('students').select('id, first_name, last_name, massar_code, gender, birth_date').eq('family_id', selectedFamily.id).eq('establishment_id', establishmentId)
    if (studentSearch.trim()) {
      query = query.or(`first_name.ilike.%${studentSearch}%,last_name.ilike.%${studentSearch}%,massar_code.ilike.%${studentSearch}%`)
    }
    const { data, error } = await query
    if (error) setError(error.message)
    else setStudents(data || [])
  }

  const selectStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowNewStudent(false)
    setStep(2)
  }

  const createStudent = async () => {
    if (!selectedFamily || !establishmentId) return
    const supabase = createClient()
    const { data, error } = await supabase.from('students').insert({
      establishment_id: establishmentId,
      family_id: selectedFamily.id,
      first_name: newStudent.first_name,
      last_name: newStudent.last_name,
      massar_code: newStudent.massar_code || null,
      gender: newStudent.gender,
      birth_date: newStudent.birth_date || null,
      status: 'active',
    }).select().single()

    if (error) setError(error.message)
    else {
      setSelectedStudent(data)
      setShowNewStudent(false)
      setStep(2)
    }
  }

  const handleYearChange = async (yearId: string) => {
    setSelectedYear(yearId)
    if (!yearId) return
    const supabase = createClient()
    const { data: yearData, error } = await supabase.from('academic_years').select('start_date, end_date').eq('id', yearId).single()
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
    const { data: priceData, error: priceError } = await supabase.from('service_level_prices').select('id, service_id, level_id, price').eq('level_id', levelId)
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
    const { data: servicesData, error: servicesError } = await supabase.from('services').select('id, name, type, accept_discount, active').in('id', serviceIds)
    if (servicesError) {
      setError('خطأ في جلب الخدمات: ' + servicesError.message)
      return
    }
    const merged = priceData.map((priceEntry) => {
      const service = servicesData?.find((s) => s.id === priceEntry.service_id)
      if (!service) return null
      return { ...priceEntry, services: service }
    }).filter((item) => item !== null)
    setAvailableServices(merged as any)
    setError('')
  }

  const toggleService = (serviceOption: ServiceOption) => {
    const serviceInfo = serviceOption.services
    if (!serviceInfo || !serviceInfo.active) return
    setSelectedServices((prev) => {
      const existing = prev.find((s) => s.service_id === serviceInfo.id)
      if (existing) return prev.filter((s) => s.service_id !== serviceInfo.id)
      return [...prev, {
        service_id: serviceInfo.id,
        name: serviceInfo.name,
        type: serviceInfo.type,
        price: serviceOption.price,
        discount_percent: 0,
        discount_amount: 0,
        final_price: serviceOption.price,
        accept_discount: serviceInfo.accept_discount,
      }]
    })
  }

  const updateDiscount = (serviceId: string, percent: number) => {
    setSelectedServices((prev) => prev.map((s) => {
      if (s.service_id !== serviceId) return s
      const discountAmount = (s.price * percent) / 100
      return { ...s, discount_percent: percent, discount_amount: discountAmount, final_price: Math.max(0, s.price - discountAmount) }
    }))
  }

  const handleSubmit = async () => {
    if (!establishmentId || !selectedFamily || !selectedStudent || !selectedYear || !selectedLevel) {
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
    let finalEndDate = endDate
    if (!finalEndDate) {
      const supabase = createClient()
      const { data: yearData } = await supabase.from('academic_years').select('end_date').eq('id', selectedYear).single()
      finalEndDate = yearData?.end_date || null
    }

    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    try {
      const { data: enrollment, error: enrollmentError } = await supabase.from('enrollments').insert({
        establishment_id: establishmentId,
        student_id: selectedStudent.id,
        academic_year_id: selectedYear,
        level_id: selectedLevel,
        class_id: selectedClass || null,
        status: 'active',
      }).select().single()
      if (enrollmentError) throw enrollmentError

      const { data: contract, error: contractError } = await supabase.from('contracts').insert({
        establishment_id: establishmentId,
        student_id: selectedStudent.id,
        academic_year_id: selectedYear,
        start_date: startDate,
        end_date: endDate || null,
        status: 'active',
        notes: null,
      }).select().single()
      if (contractError) throw contractError

      const contractItems = selectedServices.map((s) => ({
        contract_id: contract.id,
        service_id: s.service_id,
        price: s.price,
        discount_percent: s.discount_percent,
        discount_amount: s.discount_amount,
        final_price: s.final_price,
      }))
      const { error: itemsError } = await supabase.from('contract_items').insert(contractItems)
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
        const { error: instError } = await supabase.from('installments').insert(installments)
        if (instError) throw instError
      }

      setSuccess('تمت عملية التسجيل بنجاح')
      setTimeout(() => router.push('/dashboard/students'), 1500)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (loading || permissionsLoading) return <div className="p-6">Chargement...</div>
  if (!hasPermission('students', 'create')) return <div className="p-6">ليس لديك صلاحية للوصول لهذه الصفحة</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Nouvelle inscription</h1>
      <p className="text-gray-600 mb-6">Rechercher une famille ou créer un nouveau dossier</p>

      <div className="mb-6 flex items-center gap-3">
        {steps.map((label, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${index === step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {index < step ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
            <span className={index === step ? 'font-semibold' : 'text-gray-500'}>{label}</span>
            {index < steps.length - 1 && <div className="h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      {step === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Étape 1 : choisir la famille</h2>
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
                className="w-full h-11 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Rechercher une famille..."
              />
            </div>
            <button onClick={() => setShowNewFamily(!showNewFamily)} className="h-11 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Nouvelle famille
            </button>
          </div>

          {showNewFamily && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              <input type="text" placeholder="Nom de famille" value={newFamily.family_name} onChange={(e) => setNewFamily({...newFamily, family_name: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Père" value={newFamily.father_name} onChange={(e) => setNewFamily({...newFamily, father_name: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Mère" value={newFamily.mother_name} onChange={(e) => setNewFamily({...newFamily, mother_name: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="tel" placeholder="Téléphone" value={newFamily.phone} onChange={(e) => setNewFamily({...newFamily, phone: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="email" placeholder="Email" value={newFamily.email} onChange={(e) => setNewFamily({...newFamily, email: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Adresse" value={newFamily.address} onChange={(e) => setNewFamily({...newFamily, address: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Ville" value={newFamily.city} onChange={(e) => setNewFamily({...newFamily, city: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <button onClick={createFamily} className="col-span-2 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer la famille</button>
            </div>
          )}

          <div className="space-y-2">
            {families.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune famille trouvée.</p>
            ) : (
              families.map((family) => (
                <button key={family.id} onClick={() => selectFamily(family)} className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center">
                  <span className="font-medium">{family.family_name || family.father_name || family.mother_name}</span>
                  <span className="text-gray-500 text-sm">{family.phone}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {step === 1 && selectedFamily && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Étape 2 : choisir l'élève</h2>
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Rechercher un élève..."
              />
            </div>
            <button onClick={() => setShowNewStudent(!showNewStudent)} className="h-11 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Nouvel élève
            </button>
          </div>

          {showNewStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              <input type="text" placeholder="Prénom" value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Nom" value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <input type="text" placeholder="Code Massar" value={newStudent.massar_code} onChange={(e) => setNewStudent({...newStudent, massar_code: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg" />
              <select value={newStudent.gender} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})} className="h-10 px-3 border border-gray-300 rounded-lg">
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
              <DateInput
                value={newStudent.birth_date}
                onChange={(isoDate) => setNewStudent({...newStudent, birth_date: isoDate})}
                className="h-10"
              />
              <button onClick={createStudent} className="col-span-2 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer l'élève</button>
            </div>
          )}

          <div className="space-y-2">
            {students.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun élève trouvé.</p>
            ) : (
              students.map((student) => (
                <button key={student.id} onClick={() => selectStudent(student)} className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center">
                  <span className="font-medium">{student.first_name} {student.last_name}</span>
                  {student.massar_code && <span className="text-gray-500 text-sm">{student.massar_code}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {step === 2 && selectedStudent && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Étape 3 : détails et services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)} className="h-10 px-3 border border-gray-300 rounded-lg">
              <option value="">Année scolaire</option>
              {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <select value={selectedLevel} onChange={(e) => handleLevelChange(e.target.value)} className="h-10 px-3 border border-gray-300 rounded-lg">
              <option value="">Niveau</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="h-10 px-3 border border-gray-300 rounded-lg">
              <option value="">Classe</option>
              {classes.filter((c) => c.level_id === selectedLevel).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <DateInput value={startDate} onChange={setStartDate} className="h-10" />
            <DateInput value={endDate} onChange={setEndDate} className="h-10" placeholder="jj/mm/aaaa (optionnel)" />
          </div>

          {availableServices.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">Services disponibles</h3>
              <div className="space-y-2">
                {availableServices.map((svc) => {
                  const serviceInfo = svc.services
                  if (!serviceInfo || !serviceInfo.active) return null
                  const isSelected = selectedServices.some((s) => s.service_id === serviceInfo.id)
                  return (
                    <div key={svc.id} className="border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleService(svc)}
                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{serviceInfo.name}</span>
                          <span className="text-sm text-gray-500">{svc.price} DH ({serviceInfo.type})</span>
                        </div>
                        {isSelected && serviceInfo.accept_discount && (
                          <div className="mt-2 flex items-center gap-3">
                            <label className="text-sm text-gray-600">Remise % :</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selectedServices.find((s) => s.service_id === serviceInfo.id)?.discount_percent || 0}
                              onChange={(e) => updateDiscount(serviceInfo.id, Number(e.target.value))}
                              className="h-9 w-20 border border-gray-300 rounded px-2 text-sm"
                            />
                            <span className="text-sm text-gray-700">
                              Final : <span className="font-bold">{selectedServices.find((s) => s.service_id === serviceInfo.id)?.final_price} DH</span>
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
              className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : "Confirmer l'inscription"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}