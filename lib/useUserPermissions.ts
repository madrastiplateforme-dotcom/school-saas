'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [bypassPermissions, setBypassPermissions] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 1. وضع المساعدة
      const assistId = sessionStorage.getItem('assistance_establishment_id')
      if (assistId) {
        setBypassPermissions(true)
        setLoading(false)
        return
      }

      // 2. التحقق من كونه سوبر أدمن
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (adminData) {
        setBypassPermissions(true)
        setLoading(false)
        return
      }

      // 3. جلب الملف الشخصي مع معلومات الدور
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role_id, establishment_id, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        setLoading(false)
        return
      }

      // 4. إذا كان المستخدم مديراً (الدور نظامي أو اسمه Directeur)
      const roleName = (profile.roles?.name || '').trim()
      const isSystemRole = profile.roles?.is_system || false
      if (roleName.toLowerCase() === 'directeur' || roleName === 'مدير' || isSystemRole) {
        setBypassPermissions(true)
        setLoading(false)
        return
      }

      // 5. مستخدم عادي: جلب صلاحيات دوره
      if (profile.role_id) {
        const { data: rolePerms, error: permsError } = await supabase
          .from('role_permissions')
          .select('permissions(module, action)')
          .eq('role_id', profile.role_id)

        if (!permsError && rolePerms) {
          const perms = new Set<string>()
          rolePerms.forEach((item: any) => {
            if (item.permissions) {
              perms.add(`${item.permissions.module}.${item.permissions.action}`)
            }
          })
          setPermissions(perms)
        }
      }

      setLoading(false)
    }

    checkPermissions()
  }, [])

  const hasPermission = (module: string, action: string) => {
    if (bypassPermissions) return true
    return permissions.has(`${module}.${action}`)
  }

  return { permissions, hasPermission, loading, bypassPermissions }
}