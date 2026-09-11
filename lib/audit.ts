import { createClient } from '@/lib/supabase'

export async function logAudit(
  action: string,
  details?: Record<string, any>,
  establishmentId?: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('audit_logs').insert({
    user_id: user.id,
    establishment_id: establishmentId || null,
    action,
    details,
  })

  // تجاهل الخطأ إذا كان بسبب صلاحيات RLS (مثل مستخدم ليس سوبر أدمن)
  if (error) {
    console.warn('Audit log skipped:', error.message)
  }
}