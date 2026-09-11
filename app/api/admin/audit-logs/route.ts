import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()

    // جلب السجلات
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    // جلب البريد الإلكتروني لكل مستخدم
    const userIds = [...new Set(logs?.map((log: any) => log.user_id).filter(Boolean))]
    const userEmails: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      if (!usersError && users?.users) {
        users.users.forEach((u) => {
          if (userIds.includes(u.id)) {
            userEmails[u.id] = u.email || u.id
          }
        })
      }
    }

    // إضافة البريد للسجلات
    const formattedLogs = (logs || []).map((log: any) => ({
      ...log,
      user_email: log.user_id ? userEmails[log.user_id] || log.user_id : null,
    }))

    return NextResponse.json({ logs: formattedLogs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}