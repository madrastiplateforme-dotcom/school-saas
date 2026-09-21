'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'

// ═══════════════════════════════════════════════════════════════════════
// 📅 AcademicYearContext — السنة الدراسية النشطة
// ═══════════════════════════════════════════════════════════════════════

export type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
}

type AcademicYearContextValue = {
  year: AcademicYear | null
  yearId: string | null
  years: AcademicYear[]
  loading: boolean
  error: string | null
  switchYear: (yearId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  year: null,
  yearId: null,
  years: [],
  loading: true,
  error: null,
  switchYear: async () => false,
  refresh: async () => {},
})

// ═══════════════════════════════════════════════════════════════════════
// 💰 ROLLOVER CAISSES — Snapshot dyal soldes
// ═══════════════════════════════════════════════════════════════════════
async function rolloverCaisses(
  supabase: any,
  establishmentId: string,
  fromYearId: string,
  toYearId: string,
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const errors: string[] = []
  let created = 0
  let skipped = 0

  // 1) Caisses dyal l'année li fatet
  const { data: oldCaisses, error: errOld } = await supabase
    .from('cash_registers')
    .select('id, name, type, owner_user_id, initial_balance, is_main, service_id')
    .eq('establishment_id', establishmentId)
    .eq('academic_year_id', fromYearId)

  if (errOld) {
    errors.push(`lecture caisses: ${errOld.message}`)
    return { created, skipped, errors }
  }

  if (!oldCaisses || oldCaisses.length === 0) {
    return { created, skipped, errors }
  }

  // 2) Caisses déjà existantes dyal l'année jdida
  const { data: newCaisses, error: errNew } = await supabase
    .from('cash_registers')
    .select('id, name')
    .eq('establishment_id', establishmentId)
    .eq('academic_year_id', toYearId)

  if (errNew) {
    errors.push(`lecture nouvelles caisses: ${errNew.message}`)
    return { created, skipped, errors }
  }

  const existingNames = new Set(
    (newCaisses || []).map((c: any) => (c.name || '').trim()),
  )

  // 3) Calcul solde + création
  for (const old of oldCaisses) {
    const name = (old.name || '').trim()

    // Idempotent: si déjà existante → skip
    if (existingNames.has(name)) {
      skipped++
      continue
    }

    try {
      const initial = Number(old.initial_balance || 0)

      // Payments dyal l'année li fatet f had caisse
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('cash_register_id', old.id)
        .eq('academic_year_id', fromYearId)
        .is('deleted_at', null)

      const totalPayments = (payments || []).reduce(
        (s: number, p: any) => s + Number(p.amount || 0),
        0,
      )

      // Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('cash_register_id', old.id)

      const totalExpenses = (expenses || []).reduce(
        (s: number, e: any) => s + Number(e.amount || 0),
        0,
      )

      // Transfers OUT (accepted)
      const { data: tOut } = await supabase
        .from('cash_transfers')
        .select('amount')
        .eq('from_cash_register_id', old.id)
        .eq('status', 'accepted')

      const totalTOut = (tOut || []).reduce(
        (s: number, t: any) => s + Number(t.amount || 0),
        0,
      )

      // Transfers IN (accepted)
      const { data: tIn } = await supabase
        .from('cash_transfers')
        .select('amount')
        .eq('to_cash_register_id', old.id)
        .eq('status', 'accepted')

      const totalTIn = (tIn || []).reduce(
        (s: number, t: any) => s + Number(t.amount || 0),
        0,
      )

      const soldeCloture =
        initial + totalPayments - totalExpenses + totalTIn - totalTOut

      // 4) INSERT nouvelle caisse
      const { error: insertErr } = await supabase
        .from('cash_registers')
        .insert({
          establishment_id: establishmentId,
          academic_year_id: toYearId,
          name: old.name,
          type: old.type,
          owner_user_id: old.owner_user_id,
          initial_balance: Number(soldeCloture.toFixed(2)),
          is_main: old.is_main,
          service_id: old.service_id,
        })

      if (insertErr) {
        errors.push(`insert '${name}': ${insertErr.message}`)
      } else {
        created++
      }
    } catch (e: any) {
      errors.push(`caisse '${name}': ${e?.message || e}`)
    }
  }

  return { created, skipped, errors }
}

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const establishmentId = useEstablishmentId()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [year, setYear] = useState<AcademicYear | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchYears = useCallback(async () => {
    if (!establishmentId) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date, is_current')
        .eq('establishment_id', establishmentId)
        .order('start_date', { ascending: false })

      if (error) throw error

      const list = (data as AcademicYear[]) || []
      setYears(list)

      const current = list.find((y) => y.is_current) || null
      setYear(current)
    } catch (e: any) {
      console.error('[AcademicYearContext]', e?.message || e)
      setError(e?.message || 'خطأ في تحميل السنة الدراسية')
    } finally {
      setLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    fetchYears()
  }, [fetchYears])

  useEffect(() => {
    if (!year) return
    try {
      localStorage.setItem('madrasti.currentYearId', year.id)
    } catch {
      // ignore
    }
  }, [year])

  const switchYear = useCallback(
    async (newYearId: string): Promise<boolean> => {
      if (!establishmentId || !newYearId) return false

      try {
        const supabase = createClient()

        // 0) Récupère l'année actuelle (source du rollover)
        const previousYearId = year?.id

        // 1) Rollover caisses: si on change vers une nouvelle année
        if (previousYearId && previousYearId !== newYearId) {
          const rollover = await rolloverCaisses(
            supabase,
            establishmentId,
            previousYearId,
            newYearId,
          )
          if (rollover.errors.length > 0) {
            console.warn('[rollover] erreurs:', rollover.errors)
          }
          console.log(
            `[rollover] créées: ${rollover.created}, skip: ${rollover.skipped}`,
          )
        }

        // 2) Retire is_current de toutes les années
        const { error: clearErr } = await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('establishment_id', establishmentId)
          .eq('is_current', true)

        if (clearErr) throw clearErr

        // 3) Marque la nouvelle année
        const { error: setErr } = await supabase
          .from('academic_years')
          .update({ is_current: true })
          .eq('id', newYearId)

        if (setErr) throw setErr

        // 4) Refresh
        await fetchYears()

        return true
      } catch (e: any) {
        console.error('[AcademicYearContext.switchYear]', e?.message || e)
        setError(e?.message || 'فشل التبديل')
        return false
      }
    },
    [establishmentId, fetchYears, year?.id],
  )

  return (
    <AcademicYearContext.Provider
      value={{
        year,
        yearId: year?.id ?? null,
        years,
        loading,
        error,
        switchYear,
        refresh: fetchYears,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  return useContext(AcademicYearContext)
}