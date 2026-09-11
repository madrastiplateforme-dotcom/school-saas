'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type UserRole = 'super_admin' | 'directeur' | 'secretaire' | 'parent' | null

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      
      // 1. Super Admin ?
      const { data: admin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (admin) {
        setRole('super_admin')
        setLoading(false)
        return
      }
      
      // 2. Role mn user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single()
      
      const roleName = ((profile?.roles as any)?.name || '').toLowerCase()
      
      if (roleName.includes('directeur') || roleName.includes('مدير')) {
        setRole('directeur')
      } else if (roleName.includes('secr')) {
        setRole('secretaire')
      } else if (roleName.includes('parent')) {
        setRole('parent')
      }
      
      setLoading(false)
    })
  }, [])

  return { role, loading }
}

// Helper : URL 3la 7sab rôle
export function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '/admin/establishments'
    case 'directeur': return '/dashboard'
    case 'secretaire': return '/dashboard/secretary'
    case 'parent': return '/parent/dashboard'
    default: return '/login'
  }
}