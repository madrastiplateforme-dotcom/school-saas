'use client'

import { Toaster as SonnerToaster } from 'sonner'

export default function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          fontFamily: 'inherit',
          direction: 'rtl',
        },
        classNames: {
          toast:
            'rounded-xl border border-slate-200 bg-white shadow-lg text-slate-800',
          title: 'font-bold text-sm',
          description: 'text-xs text-slate-500 mt-1',
          success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
          error: 'border-rose-200 bg-rose-50 text-rose-900',
          warning: 'border-amber-200 bg-amber-50 text-amber-900',
          info: 'border-blue-200 bg-blue-50 text-blue-900',
          closeButton: 'bg-white border-slate-200',
        },
      }}
    />
  )
}