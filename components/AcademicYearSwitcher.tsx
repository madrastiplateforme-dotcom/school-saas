'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronDown, Check, Loader2 } from 'lucide-react'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import { toast } from 'sonner'

export default function AcademicYearSwitcher() {
  const router = useRouter()
  const { year, years, loading, switchYear } = useAcademicYear()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // إغلاق منين كتكليكي برا
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (id: string) => {
    if (id === year?.id) {
      setOpen(false)
      return
    }

    setSwitching(true)
    const ok = await switchYear(id)
    setSwitching(false)
    setOpen(false)

    if (ok) {
      toast.success('تم تبديل السنة الدراسية')
      router.refresh()
    } else {
      toast.error('فشل تبديل السنة')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">...</span>
      </div>
    )
  }

  if (!year) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">لا توجد سنة دراسية</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        aria-label="تبديل السنة الدراسية"
      >
        <Calendar className="h-4 w-4 text-indigo-600" />
        <span className="hidden sm:inline">{year.name}</span>
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl z-50"
          dir="rtl"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              السنة الدراسية
            </p>
          </div>

          {years.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              لا توجد سنوات
            </div>
          ) : (
            <div className="p-1">
              {years.map((y) => {
                const isActive = y.id === year.id
                return (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => handleSelect(y.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-bold">{y.name}</span>
                      {y.start_date && y.end_date && (
                        <span className="text-[10px] text-slate-400" dir="ltr">
                          {y.start_date} → {y.end_date}
                        </span>
                      )}
                    </div>
                    {isActive && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}