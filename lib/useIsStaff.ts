'use client'

import { useUserRole } from './useUserRole'

/**
 * Vérifie si l'utilisateur est membre du staff administratif
 * (Directeur ou Secrétaire). Utilisé pour autoriser l'accès
 * aux pages d'administration comme Evaluations, Bulletins, Timetable.
 */
export function useIsStaff() {
  const { role, loading } = useUserRole()
  const isStaff =
    role === 'directeur' ||
    role === 'secretaire' ||
    role === 'super_admin'

  return { isStaff, role, loading }
}