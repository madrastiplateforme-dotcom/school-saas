'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { detectRole, getDashboardUrl, type UserRole } from '@/lib/detect-role'

export type { UserRole }
export { getDashboardUrl }

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const loadRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!mounted) return

        if (!user) {
          setRole(null)
          setLoading(false)
          return
        }

        // ═══ Super Admin ═══
        const { data: admin } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (admin) {
          const assistId =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('assistance_establishment_id')
              : null
          setRole(assistId ? 'directeur' : 'super_admin')
          setLoading(false)
          return
        }

        // ═══ Profile + role (2 queries, R1) ═══
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!profile?.role_id) {
          setRole(null)
          setLoading(false)
          return
        }

        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', profile.role_id)
          .maybeSingle()

        if (!mounted) return
        setRole(detectRole(roleData?.name))
        setLoading(false)
      } catch (e: any) {
        console.error('[useUserRole]', e?.message || e)
        if (mounted) {
          setRole(null)
          setLoading(false)
        }
      }
    }

    loadRole()

    // ═══ Réagir aux changements auth (login/logout) ═══
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (mounted) {
        setLoading(true)
        loadRole()
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { role, loading }
}