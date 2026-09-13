'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import DateInput from '@/components/DateInput'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import * as XLSX from 'xlsx'
import {
  FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown,
  Wallet, Filter, Building2, Wrench, Users, BookOpen, GraduationCap,
} from 'lucide-react'

type Tab = 'caisses' | 'services' | 'students' | 'classes'

export default function ReportsPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()

  const [activeTab, setActiveTab] = useState<Tab>('caisses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  // Data
  const [caisses, setCaisses] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [contractItems, setContractItems] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])

  const isDirector = role === 'directeur'
  const isSecretary = role === 'secretaire'

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role, dateFrom, dateTo])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Caisses
    let caisseQuery = supabase
      .from('cash_registers')
      .select('id, name, type, initial_balance, owner_user_id')
      .eq('establishment_id', establishmentId)

    if (isSecretary) {
      caisseQuery = caisseQuery.eq('owner_user_id', user.id)
    }

    const { data: caisseData } = await caisseQuery
    const caisseIds = (caisseData || []).map(c => c.id)

    setCaisses(caisseData || [])

    if (caisseIds.length > 0) {
      // 2. Payments
      const { data: payData } = await supabase
        .from('payments')
        .select('id, amount, payment_date, cash_register_id, student_id, installment_id')
        .in('cash_register_id', caisseIds)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)

      // 3. Expenses
      const { data: expData } = await supabase
        .from('expenses')
        .select('id, amount, expense_date, cash_register_id, nature')
        .in('cash_register_id', caisseIds)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)

      setPayments(payData || [])
      setExpenses(expData || [])
    }

    // 4. Transfers
    const { data: transData } = await supabase
      .from('cash_transfers')
      .select('id, amount, transfer_date, from_cash_register_id, to_cash_register_id, status')
      .eq('establishment_id', establishmentId)
      .eq('status', 'accepted')
      .gte('transfer_date', dateFrom)
      .lte('transfer_date', dateTo)

    setTransfers(transData || [])

    // 5. Services
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, type')
      .eq('establishment_id', establishmentId)

    setServices(servicesData || [])

    // 6. Students
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, first_name, last_name, family_id')
      .eq('establishment_id', establishmentId)

    setStudents(studentsData || [])

    // 7. Installments (bach n7esbo le reste)
    const { data: instData } = await supabase
      .from('installments')
      .select('id, amount, paid_amount, student_id, contract_id')
      .eq('establishment_id', establishmentId)

    setInstallments(instData || [])

    // 8. Enrollments (bach n3refo classe dyal élève)
    const { data: enrData } = await supabase
      .from('enrollments')
      .select('id, student_id, class_id, level_id, classes(name), levels(name)')
      .eq('establishment_id', establishmentId)

    setEnrollments(enrData || [])

    // 9. Contracts
    const { data: contData } = await supabase
      .from('contracts')
      .select('id, student_id')
      .eq('establishment_id', establishmentId)

    setContracts(contData || [])

    // 10. Contract items (bach n3refo service dyal koul contract)
    const { data: ciData } = await supabase
      .from('contract_items')
      .select('id, contract_id, service_id, final_price')

    setContractItems(ciData || [])

    setLoading(false)
  }

  // ============ RAPPORT PAR CAISSE ============
  const caisseReports = useMemo(() => {
    return caisses.map((c) => {
      const encaissements = payments
        .filter(p => p.cash_register_id === c.id)
        .reduce((s, p) => s + Number(p.amount), 0)

      const depenses = expenses
        .filter(e => e.cash_register_id === c.id)
        .reduce((s, e) => s + Number(e.amount), 0)

      const transfersIn = transfers
        .filter(t => t.to_cash_register_id === c.id)
        .reduce((s, t) => s + Number(t.amount), 0)

      const transfersOut = transfers
        .filter(t => t.from_cash_register_id === c.id)
        .reduce((s, t) => s + Number(t.amount), 0)

      const initial = Number(c.initial_balance || 0)
      const balance = initial + encaissements + transfersIn - depenses - transfersOut
      const net = encaissements - depenses

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        initial,
        encaissements,
        depenses,
        transfersIn,
        transfersOut,
        balance,
        net,
      }
    })
  }, [caisses, payments, expenses, transfers])

  // ============ RAPPORT PAR SERVICE ============
  const serviceReports = useMemo(() => {
    // Map : contractId → serviceIds
    const contractServicesMap = new Map<string, string[]>()
    contractItems.forEach(ci => {
      if (!contractServicesMap.has(ci.contract_id)) {
        contractServicesMap.set(ci.contract_id, [])
      }
      contractServicesMap.get(ci.contract_id)!.push(ci.service_id)
    })

    // Map : studentId → contractIds
    const studentContractsMap = new Map<string, string[]>()
    contracts.forEach(c => {
      if (!studentContractsMap.has(c.student_id)) {
        studentContractsMap.set(c.student_id, [])
      }
      studentContractsMap.get(c.student_id)!.push(c.id)
    })

    return services.map((s) => {
      // Encaissements dyal had service : payments li 3ndhom contract li fih had service
      const encaissements = payments
        .filter(p => {
          const studentContracts = studentContractsMap.get(p.student_id) || []
          return studentContracts.some(cid => 
            (contractServicesMap.get(cid) || []).includes(s.id)
          )
        })
        .reduce((sum, p) => sum + Number(p.amount), 0)

      // Dépenses (nature "service" wla via tag) - hadi ma3ndnach tracking daba
      // Ghadi nzidou : dépenses li 3ndhom service_id
      const depenses = expenses
        .filter(e => (e as any).service_id === s.id)
        .reduce((sum, e) => sum + Number(e.amount), 0)

      return {
        id: s.id,
        name: s.name,
        type: s.type,
        encaissements,
        depenses,
        net: encaissements - depenses,
      }
    }).filter(r => r.encaissements > 0 || r.depenses > 0)
  }, [services, payments, expenses, contracts, contractItems])

  // ============ RAPPORT PAR ÉLÈVE ============
  const studentReports = useMemo(() => {
    return students.map((s) => {
      const studentPayments = payments.filter(p => p.student_id === s.id)
      const paid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      const studentInstallments = installments.filter(i => i.student_id === s.id)
      const total = studentInstallments.reduce((sum, i) => sum + Number(i.amount), 0)

      const remaining = total - paid
      const percentage = total > 0 ? (paid / total) * 100 : 0

      // Classe
      const enr = enrollments.find(e => e.student_id === s.id)
      const className = (enr as any)?.classes?.name || '-'
      const levelName = (enr as any)?.levels?.name || '-'

      return {
        id: s.id,
        full_name: `${s.first_name} ${s.last_name}`,
        className,
        levelName,
        paid,
        total,
        remaining,
        percentage,
      }
    }).filter(r => r.total > 0 || r.paid > 0)
      .sort((a, b) => b.remaining - a.remaining)
  }, [students, payments, installments, enrollments])

  // ============ RAPPORT PAR CLASSE ============
  const classReports = useMemo(() => {
    const classesMap = new Map<string, { name: string; levelName: string; students: number; paid: number; total: number; remaining: number }>()

    enrollments.forEach(e => {
      const classId = e.class_id
      if (!classId) return
      const className = (e as any)?.classes?.name || '-'
      const levelName = (e as any)?.levels?.name || '-'

      if (!classesMap.has(classId)) {
        classesMap.set(classId, { name: className, levelName, students: 0, paid: 0, total: 0, remaining: 0 })
      }

      const entry = classesMap.get(classId)!
      entry.students += 1

      const studentPayments = payments.filter(p => p.student_id === e.student_id)
      const paid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      const studentInstallments = installments.filter(i => i.student_id === e.student_id)
      const total = studentInstallments.reduce((sum, i) => sum + Number(i.amount), 0)

      entry.paid += paid
      entry.total += total
      entry.remaining += (total - paid)
    })

    return Array.from(classesMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      percentage: data.total > 0 ? (data.paid / data.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total)
  }, [enrollments, payments, installments])

  // ============ EXPORT EXCEL ============
  const handleExportExcel = () => {
    let data: any[] = []
    let sheetName = ''

    if (activeTab === 'caisses') {
      sheetName = 'Caisses'
      data = caisseReports.map(r => ({
        'الصندوق': r.name,
        'النوع': r.type === 'central' || r.type === 'principal' ? 'مركزي' : r.type === 'secretary' ? 'سكرتيرة' : 'خدمة',
        'الرصيد الابتدائي': r.initial,
        'المداخيل': r.encaissements,
        'المصاريف': r.depenses,
        'تحويلات واردة': r.transfersIn,
        'تحويلات صادرة': r.transfersOut,
        'الرصيد النهائي': r.balance,
        'النتيجة': r.net,
      }))
    } else if (activeTab === 'services') {
      sheetName = 'Services'
      data = serviceReports.map(r => ({
        'الخدمة': r.name,
        'النوع': r.type,
        'المداخيل': r.encaissements,
        'المصاريف': r.depenses,
        'النتيجة': r.net,
      }))
    } else if (activeTab === 'students') {
      sheetName = 'Élèves'
      data = studentReports.map(r => ({
        'التلميذ': r.full_name,
        'المستوى': r.levelName,
        'القسم': r.className,
        'المجموع': r.total,
        'المدفوع': r.paid,
        'المتبقي': r.remaining,
        'النسبة %': r.percentage.toFixed(1),
      }))
    } else if (activeTab === 'classes') {
      sheetName = 'Classes'
      data = classReports.map(r => ({
        'القسم': r.name,
        'المستوى': r.levelName,
        'عدد التلاميذ': r.students,
        'المجموع': r.total,
        'المدفوع': r.paid,
        'المتبقي': r.remaining,
        'النسبة %': r.percentage.toFixed(1),
      }))
    }

    if (data.length === 0) {
      alert('لا توجد بيانات للتصدير')
      return
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `rapport-${sheetName.toLowerCase()}-${dateFrom}-${dateTo}.xlsx`)
  }

  if (loading || roleLoading) return <div className="p-6">Chargement...</div>
  if (!isDirector && !isSecretary) return <div className="p-6">ليس لديك صلاحية</div>

  const tabs = [
    { key: 'caisses', label: 'الصناديق', icon: Building2 },
    { key: 'services', label: 'الخدمات', icon: Wrench },
    { key: 'students', label: 'التلاميذ', icon: Users },
    { key: 'classes', label: 'الأقسام', icon: BookOpen },
  ] as const

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            التقارير المالية
          </h1>
          <p className="text-gray-600">تحليل شامل حسب الصندوق / الخدمة / التلميذ / القسم</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" /> تصدير Excel
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800">الفلاتر</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <DateInput value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <DateInput value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 font-medium transition border-b-2 -mb-px ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ============ TAB 1 : CAISSES ============ */}
      {activeTab === 'caisses' && (
        <CaissesReport
          reports={caisseReports}
          payments={payments}
          expenses={expenses}
        />
      )}

      {/* ============ TAB 2 : SERVICES ============ */}
      {activeTab === 'services' && (
        <ServicesReport reports={serviceReports} />
      )}

      {/* ============ TAB 3 : ÉLÈVES ============ */}
      {activeTab === 'students' && (
        <StudentsReport reports={studentReports} />
      )}

      {/* ============ TAB 4 : CLASSES ============ */}
      {activeTab === 'classes' && (
        <ClassesReport reports={classReports} />
      )}
    </div>
  )
}

// ================== COMPONENTS ==================

function CaissesReport({ reports, payments, expenses }: any) {
  const totals = reports.reduce((acc: any, r: any) => ({
    encaissements: acc.encaissements + r.encaissements,
    depenses: acc.depenses + r.depenses,
    net: acc.net + r.net,
    balance: acc.balance + r.balance,
  }), { encaissements: 0, depenses: 0, net: 0, balance: 0 })

  const chartData = reports.map((r: any) => ({
    name: r.name,
    encaissements: Number(r.encaissements.toFixed(2)),
    depenses: Number(r.depenses.toFixed(2)),
  }))

  const pieData = [
    { name: 'مداخيل', value: Number(totals.encaissements.toFixed(2)), color: '#10b981' },
    { name: 'مصاريف', value: Number(totals.depenses.toFixed(2)), color: '#ef4444' },
  ].filter(x => x.value > 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="إجمالي المداخيل" value={totals.encaissements} color="emerald" icon={TrendingUp} />
        <StatCard label="إجمالي المصاريف" value={totals.depenses} color="red" icon={TrendingDown} />
        <StatCard label="النتيجة" value={totals.net} color={totals.net >= 0 ? 'emerald' : 'red'} icon={Wallet} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-bold mb-4">المداخيل والمصاريف حسب الصندوق</h3>
          {chartData.length === 0 ? <p className="text-center text-gray-400 py-12">لا توجد بيانات</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="encaissements" fill="#10b981" name="مداخيل" />
                <Bar dataKey="depenses" fill="#ef4444" name="مصاريف" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-bold mb-4">التوزيع</h3>
          {pieData.length === 0 ? <p className="text-center text-gray-400 py-12">لا توجد بيانات</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                  label={(e: any) => `${e.name}: ${Number(e.value).toFixed(0)}`}
                  outerRadius={100} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h3 className="font-bold">تفاصيل حسب الصندوق ({reports.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصندوق</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد الابتدائي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المداخيل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المصاريف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد النهائي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النتيجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs">{r.type === 'central' || r.type === 'principal' ? 'مركزي' : r.type === 'secretary' ? 'سكرتيرة' : 'خدمة'}</td>
                  <td className="px-4 py-3 text-sm">{r.initial.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">+ {r.encaissements.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">- {r.depenses.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${r.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{r.balance.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${r.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{r.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ServicesReport({ reports }: any) {
  const totals = reports.reduce((acc: any, r: any) => ({
    encaissements: acc.encaissements + r.encaissements,
    depenses: acc.depenses + r.depenses,
    net: acc.net + r.net,
  }), { encaissements: 0, depenses: 0, net: 0 })

  const chartData = reports.map((r: any) => ({
    name: r.name,
    encaissements: Number(r.encaissements.toFixed(2)),
    depenses: Number(r.depenses.toFixed(2)),
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="إجمالي المداخيل" value={totals.encaissements} color="emerald" icon={TrendingUp} />
        <StatCard label="إجمالي المصاريف" value={totals.depenses} color="red" icon={TrendingDown} />
        <StatCard label="النتيجة" value={totals.net} color={totals.net >= 0 ? 'emerald' : 'red'} icon={Wallet} highlight />
      </div>

      <div className="bg-white rounded-2xl p-5 border shadow-sm">
        <h3 className="font-bold mb-4">المداخيل حسب الخدمة</h3>
        {chartData.length === 0 ? <p className="text-center text-gray-400 py-12">لا توجد بيانات</p> : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="encaissements" fill="#10b981" name="مداخيل" />
              <Bar dataKey="depenses" fill="#ef4444" name="مصاريف" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h3 className="font-bold">تفاصيل حسب الخدمة ({reports.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخدمة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المداخيل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المصاريف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النتيجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs">{r.type === 'monthly' ? 'شهري' : r.type === 'annual' ? 'سنوي' : 'مرة واحدة'}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">+ {r.encaissements.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">- {r.depenses.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${r.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{r.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StudentsReport({ reports }: any) {
  const totals = reports.reduce((acc: any, r: any) => ({
    total: acc.total + r.total,
    paid: acc.paid + r.paid,
    remaining: acc.remaining + r.remaining,
  }), { total: 0, paid: 0, remaining: 0 })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="إجمالي المستحقات" value={totals.total} color="indigo" icon={Wallet} />
        <StatCard label="إجمالي المدفوع" value={totals.paid} color="emerald" icon={TrendingUp} />
        <StatCard label="إجمالي المتبقي" value={totals.remaining} color="red" icon={TrendingDown} highlight={totals.remaining > 0} />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h3 className="font-bold">تفاصيل حسب التلميذ ({reports.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التلميذ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.levelName} - {r.className}</td>
                  <td className="px-4 py-3 text-sm">{r.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{r.paid.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${r.remaining > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{r.remaining.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                        <div className={`h-2 rounded-full ${r.percentage >= 100 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, r.percentage)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{r.percentage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ClassesReport({ reports }: any) {
  const totals = reports.reduce((acc: any, r: any) => ({
    students: acc.students + r.students,
    total: acc.total + r.total,
    paid: acc.paid + r.paid,
    remaining: acc.remaining + r.remaining,
  }), { students: 0, total: 0, paid: 0, remaining: 0 })

  const chartData = reports.map((r: any) => ({
    name: r.name,
    paid: Number(r.paid.toFixed(2)),
    remaining: Number(r.remaining.toFixed(2)),
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="عدد التلاميذ" value={totals.students} color="indigo" icon={Users} isCount />
        <StatCard label="إجمالي المستحقات" value={totals.total} color="indigo" icon={Wallet} />
        <StatCard label="إجمالي المدفوع" value={totals.paid} color="emerald" icon={TrendingUp} />
        <StatCard label="إجمالي المتبقي" value={totals.remaining} color="red" icon={TrendingDown} highlight={totals.remaining > 0} />
      </div>

      <div className="bg-white rounded-2xl p-5 border shadow-sm">
        <h3 className="font-bold mb-4">المدفوع والمتبقي حسب القسم</h3>
        {chartData.length === 0 ? <p className="text-center text-gray-400 py-12">لا توجد بيانات</p> : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="paid" fill="#10b981" name="مدفوع" />
              <Bar dataKey="remaining" fill="#ef4444" name="متبقي" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h3 className="font-bold">تفاصيل حسب القسم ({reports.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستوى</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد التلاميذ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدفوع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتبقي</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.levelName}</td>
                  <td className="px-4 py-3 text-sm">{r.students}</td>
                  <td className="px-4 py-3 text-sm">{r.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{r.paid.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${r.remaining > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{r.remaining.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                        <div className={`h-2 rounded-full ${r.percentage >= 100 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, r.percentage)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{r.percentage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon, highlight, isCount }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  }
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${highlight ? colors[color] : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? '' : 'text-' + color + '-600'}`}>
        {Icon && <Icon className="h-5 w-5" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? '' : 'text-slate-800'}`}>
        {isCount ? value : `${Number(value).toFixed(2)} DH`}
      </p>
    </div>
  )
}