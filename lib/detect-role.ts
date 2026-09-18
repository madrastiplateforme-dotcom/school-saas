// lib/detect-role.ts
// ═══════════════════════════════════════════════════════════════════════
// 🔑 Détection de rôle centralisée (évite la duplication)
// ═══════════════════════════════════════════════════════════════════════

export type UserRole =
  | 'super_admin'
  | 'directeur'
  | 'secretaire'
  | 'enseignant'
  | 'parent'
  | null

// Variantes multilingues + casse + accents
export const ROLE_VARIANTS: Record<
  Exclude<UserRole, null | 'super_admin'>,
  string[]
> = {
  directeur: ['directeur', 'director', 'مدير'],
  secretaire: ['secrétaire', 'secretaire', 'secretary', 'سكرتيرة'],
  enseignant: ['enseignant', 'teacher', 'prof', 'أستاذ'],
  parent: ['parent', 'ولي'],
}

/**
 * Détecte un rôle à partir du nom brut (depuis roles.name)
 */
export function detectRole(roleName: string | null | undefined): UserRole {
  if (!roleName) return null
  const n = roleName.toLowerCase().trim()

  for (const [role, variants] of Object.entries(ROLE_VARIANTS)) {
    for (const v of variants) {
      if (n === v || n.includes(v)) return role as UserRole
    }
  }
  return null
}

/**
 * URL du dashboard par rôle
 */
export function getDashboardUrl(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/admin/establishments'
    case 'directeur':
      return '/dashboard'
    case 'secretaire':
      return '/dashboard/secretary'
    case 'enseignant':
      return '/teacher/dashboard'
    case 'parent':
      return '/parent/dashboard'
    default:
      return '/login'
  }
}