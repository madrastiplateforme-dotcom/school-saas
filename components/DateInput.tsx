'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'

type DateInputProps = {
  value: string // ISO: YYYY-MM-DD
  onChange: (isoDate: string) => void
  className?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}

export default function DateInput({
  value,
  onChange,
  className = '',
  required = false,
  placeholder = 'jj/mm/aaaa',
  disabled = false,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-')
      setDisplayValue(`${day}/${month}/${year}`)
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d]/g, '')
    if (raw.length >= 5) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4, 8)
    } else if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2)
    }
    setDisplayValue(raw)
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, day, month, year] = match
      const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10)
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900) {
        onChange(`${year}-${month}-${day}`)
      }
    } else if (raw === '') {
      onChange('')
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={10}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  )
}