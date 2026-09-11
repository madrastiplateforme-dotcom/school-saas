'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useEstablishmentId(): string | null {
  const [establishmentId, setEstablishmentId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setEstablishmentId(null)
        return
      }

      // ✅ 1. ASSISTANCE MODE — priorité maximale
      const assistId = sessionStorage.getItem('assistance_establishment_id')
      if (assistId) {
        setEstablishmentId(assistId)
        return
      }

      // ✅ 2. MODE NORMAL — user_profiles
      supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data: profile }) => {
          setEstablishmentId(profile?.establishment_id || null)
        })
    })

    // ✅ 3. Écouter les changements de sessionStorage (quand on entre/sort d'assistance)
    const handleStorageChange = () => {
      const assistId = sessionStorage.getItem('assistance_establishment_id')
      setEstablishmentId(assistId || null)
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return establishmentId
}