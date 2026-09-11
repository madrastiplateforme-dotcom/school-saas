'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useEffectiveEstablishmentId(): {
  establishmentId: string | null
  isAssistance: boolean
  loading: boolean
} {
  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [isAssistance, setIsAssistance] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }

      // 1. وضع المساعدة
      const assistId = sessionStorage.getItem('assistance_establishment_id')
      if (assistId) {
        setEstablishmentId(assistId)
        setIsAssistance(true)
        setLoading(false)
        return
      }

      // 2. الوضع العادي: من user_profiles
      supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setEstablishmentId(data?.establishment_id || null)
          setIsAssistance(false)
          setLoading(false)
        })
    })
  }, [])

  return { establishmentId, isAssistance, loading }
}