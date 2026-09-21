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

  // localStorage persistence (اختياري — للتبديل السريع)
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

        // 1. حيد is_current من الكل
        const { error: clearErr } = await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('establishment_id', establishmentId)
          .eq('is_current', true)

        if (clearErr) throw clearErr

        // 2. حدد السنة الجديدة
        const { error: setErr } = await supabase
          .from('academic_years')
          .update({ is_current: true })
          .eq('id', newYearId)

        if (setErr) throw setErr

        // 3. حدّث الـ state
        await fetchYears()

        return true
      } catch (e: any) {
        console.error('[AcademicYearContext.switchYear]', e?.message || e)
        setError(e?.message || 'فشل التبديل')
        return false
      }
    },
    [establishmentId, fetchYears],
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