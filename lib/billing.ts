// lib/billing.ts

// أسامي الشهور بالعربية (المغربية)
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'
]

export type ServiceType = 'monthly' | 'annual' | 'one_time'

export interface ContractServiceInput {
  service_id: string
  name: string
  type: ServiceType
  price: number
  discount_percent: number
  discount_amount: number
  final_price: number
  accept_discount: boolean
}

/**
 * حساب مبلغ الشهر الأول بنظام البروراتا.
 * المقام ثابت 30، وعدد الأيام = (أيام الشهر الفعلية - يوم البداية)
 */
export function calculateProratedMonthlyAmount(monthlyPrice: number, startDate: Date): number {
  const dayOfMonth = startDate.getDate()
  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
  const remainingDays = dayOfMonth === 1 ? 30 : daysInMonth - dayOfMonth
  // إذا بدأ في اليوم الأول، لا بروراتا
  if (dayOfMonth === 1) return monthlyPrice
  const prorata = (monthlyPrice / 30) * remainingDays
  return Math.round(prorata * 100) / 100
}

/**
 * توليد الأقساط لعقد معين بناءً على الخدمات المختارة.
 * تاريخ النهاية اختياري، وإذا لم يُعطَ نستخدم 12 شهراً من تاريخ البداية.
 */
export function generateInstallmentsForContract(params: {
  establishmentId: string
  studentId: string
  contractId: string
  startDate: string // ISO
  endDate?: string | null
  services: ContractServiceInput[]
}): any[] {
  const { establishmentId, studentId, contractId, startDate, services, endDate } = params
  const start = new Date(startDate)
  const installments: any[] = []

  // تحديد تاريخ النهاية (إذا لم يحدد، نضع 12 شهراً افتراضياً)
  const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 12, 0)
  const monthCount = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)

  // ===== الخدمات الشهرية =====
  const monthlyServices = services.filter(s => s.type === 'monthly')
  for (const service of monthlyServices) {
    const monthlyPrice = service.final_price

    // الشهر الأول (قد يكون بالبروراتا)
    const firstMonthAmount = calculateProratedMonthlyAmount(monthlyPrice, start)
    const firstMonthDate = new Date(start.getFullYear(), start.getMonth(), 1)
    if (monthCount >= 1) {
      installments.push({
        establishment_id: establishmentId,
        contract_id: contractId,
        student_id: studentId,
        description: `${service.name} - ${ARABIC_MONTHS[firstMonthDate.getMonth()]} ${firstMonthDate.getFullYear()}`,
        amount: firstMonthAmount,
        due_date: startDate,
        status: 'pending',
      })
    }

    // الأشهر الكاملة التالية
    for (let i = 1; i < monthCount; i++) {
      const dueDate = new Date(start.getFullYear(), start.getMonth() + i, 1)
      installments.push({
        establishment_id: establishmentId,
        contract_id: contractId,
        student_id: studentId,
        description: `${service.name} - ${ARABIC_MONTHS[dueDate.getMonth()]} ${dueDate.getFullYear()}`,
        amount: monthlyPrice,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      })
    }
  }

  // ===== الخدمات غير الشهرية (سنوي / مرة واحدة) => قسط واحد بكامل المبلغ =====
  const nonMonthlyServices = services.filter(s => s.type !== 'monthly')
  for (const service of nonMonthlyServices) {
    installments.push({
      establishment_id: establishmentId,
      contract_id: contractId,
      student_id: studentId,
      description: service.name,
      amount: service.final_price,
      due_date: startDate,
      status: 'pending',
    })
  }

  return installments
}