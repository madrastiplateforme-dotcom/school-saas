/**
 * Génère un email système unique pour un compte SaaS
 * Format : {prefix}-{slug}-{random}@gestioneco.local
 * Ila smiya 3arabiya → {prefix}-{random}@gestioneco.local
 */
export function generateSystemEmail(fullName: string, roleType: string): string {
  const prefix =
    roleType === 'secretaire' ? 'sec' :
    roleType === 'parent' ? 'par' :
    roleType === 'teacher' ? 'prof' :
    'usr'

  // Tentative dyal slug men smiya (ghir latin)
  const slug = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10)

  const random = Math.random().toString(36).slice(2, 7)
  const parts = [prefix, slug, random].filter(Boolean)
  return `${parts.join('-')}@gestioneco.local`
}

/**
 * Génère un mot de passe aléatoire sécurisé (10 chars)
 * Bla caractères ambigus (l, I, 1, O, 0)
 */
export function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}