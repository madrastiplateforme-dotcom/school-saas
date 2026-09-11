'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

type Settings = {
  platform_name: string
  platform_logo: string
  primary_color: string
  currency: string
  default_language: string
}

const defaultSettings: Settings = {
  platform_name: 'منصتي المدرسية',
  platform_logo: '',
  primary_color: '#4F46E5',
  currency: 'DH',
  default_language: 'fr',
}

const SettingsContext = createContext<Settings>(defaultSettings)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('settings')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) {
          const settingsMap: any = {}
          data.forEach((s: any) => {
            settingsMap[s.key] = s.value
          })
          setSettings((prev) => ({ ...prev, ...settingsMap }))
        }
      })
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)