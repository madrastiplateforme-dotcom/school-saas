'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  School,
  RefreshCw,
  AlertTriangle,
  Users,
  TrendingUp,
} from 'lucide-react'

type Establishment = {
  id: string
  name: string
  status: string
  student_count: number
  active_student_count: number
  subscription_status: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalActiveStudents, setTotalActiveStudents] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.push('/login')
          return
        }

        // ✅ FIX: maybeSingle() au lieu de single() (single échoue si 0 rows)
        supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: adminData, error: adminErr }) => {
            if (adminErr) {
              console.error('[admin/auth]', adminErr.message || adminErr)
            }
            if (!adminData) {
              setError('ليس لديك صلاحية الوصول لهذه الصفحة')
              setLoading(false)
              return
            }
            fetchData()
          })
      })
      .catch((e: any) => {
        console.error('[admin/auth]', e?.message || e)
        setError('خطأ في المصادقة')
        setLoading(false)
      })
  }, [router])

  const fetchData = async () => {
    const supabase = createClient()

    // 1) المؤسسات + total students
    const { data, error } = await supabase
      .from('establishments')
      .select(`
        id, name, status, subscription_status,
        students (count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const estList: any[] = data || []
    const establishmentIds = estList.map((e: any) => e.id)

    // ✅ 2) MULTI-YEAR: années courantes (is_current=true) per établissement
    const currentYearByEstab = new Map<string, string>()
    const { data: currentYears } = await supabase
      .from('academic_years')
      .select('id, establishment_id')
      .eq('is_current', true)
      .in('establishment_id', establishmentIds)

    ;(currentYears || []).forEach((y: any) => {
      if (y.establishment_id && y.id) {
        currentYearByEstab.set(y.establishment_id, y.id)
      }
    })

    const yearIds = Array.from(currentYearByEstab.values())

    // ✅ 3) Élèves actifs f l'année courante per établissement
    const activeCountByEstab = new Map<string, number>()
    if (yearIds.length > 0) {
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id, academic_year_id')
        .in('academic_year_id', yearIds)
        .eq('status', 'active')

      // Map yearId → establishmentId
      const yearToEstab = new Map<string, string>()
      currentYearByEstab.forEach((yearId, estabId) => {
        yearToEstab.set(yearId, estabId)
      })

      // Count uniques par établissement
      const studentSetByEstab = new Map<string, Set<string>>()
      ;(enrollmentsData || []).forEach((e: any) => {
        const estabId = yearToEstab.get(e.academic_year_id)
        if (!estabId || !e.student_id) return
        if (!studentSetByEstab.has(estabId)) {
          studentSetByEstab.set(estabId, new Set())
        }
        studentSetByEstab.get(estabId)!.add(e.student_id)
      })

      studentSetByEstab.forEach((set, estabId) => {
        activeCountByEstab.set(estabId, set.size)
      })
    }

    const formatted: Establishment[] = estList.map((est: any) => ({
      id: est.id,
      name: est.name,
      status: est.status,
      subscription_status: est.subscription_status,
      student_count: est.students?.[0]?.count || 0,
      active_student_count: activeCountByEstab.get(est.id) || 0,
    }))

    setEstablishments(formatted)
    setTotalStudents(formatted.reduce((sum, e) => sum + e.student_count, 0))
    setTotalActiveStudents(
      formatted.reduce((sum, e) => sum + e.active_student_count, 0),
    )

    // 4) إيرادات المنصة من مدفوعات الاشتراكات
    const { data: payments, error: payError } = await supabase
      .from('subscription_payments')
      .select('amount')

    if (!payError && payments) {
      const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      setTotalRevenue(revenue)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (error && !establishments.length) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  const activeCount = establishments.filter((e) => e.status === 'active').length
  const suspendedCount = establishments.filter((e) => e.status === 'suspended').length
  const pendingCount = establishments.filter((e) => e.status === 'pending').length

  return (
    <div>
      {/* بطاقات إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">المؤسسات النشطة</p>
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">المؤسسات المعلقة</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">المؤسسات الموقوفة</p>
          <p className="text-3xl font-bold text-red-600">{suspendedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">إجمالي التلاميذ (كلي)</p>
          <p className="text-3xl font-bold text-indigo-600">{totalStudents}</p>
        </div>
      </div>

      {/* ✅ MULTI-YEAR: Élèves actifs f l'année courante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Users className="h-5 w-5" />
            <p className="text-sm">التلاميذ النشطون (السنة الحالية)</p>
          </div>
          <p className="text-3xl font-bold">{totalActiveStudents}</p>
          <p className="text-xs opacity-80 mt-1">
            مسجلون فـ السنة الدراسية الجارية دyal kol مؤسسة
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
            <p className="text-sm text-gray-500">إيرادات المنصة (من الاشتراكات)</p>
          </div>
          <p className="text-3xl font-bold text-indigo-600">{totalRevenue} DH</p>
        </div>
      </div>

      {/* تنبيهات الاشتراكات */}
      {establishments.some((e) => e.subscription_status === 'unpaid' && e.status === 'active') && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>يوجد مؤسسات نشطة عليها اشتراكات غير مدفوعة.</span>
        </div>
      )}

      {/* جدول مختصر */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">أحدث المؤسسات</h2>
          <button
            onClick={() => router.push('/admin/establishments')}
            className="text-indigo-600 hover:underline text-sm"
          >
            عرض الكل
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المؤسسة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلاميذ (نشط)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكلي</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">حالة الدفع</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {establishments.slice(0, 5).map((est) => (
              <tr key={est.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{est.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    est.status === 'active' ? 'bg-green-100 text-green-700' :
                    est.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {est.status === 'active' ? 'نشطة' : est.status === 'pending' ? 'معلقة' : 'موقوفة'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                    <Users className="h-3.5 w-3.5" />
                    {est.active_student_count}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{est.student_count}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    est.subscription_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {est.subscription_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}