'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollText, RefreshCw } from 'lucide-react'

type AuditLog = {
  id: string
  action: string
  details: any
  created_at: string
  user_id: string | null
  establishment_id: string | null
  user_email: string | null
}

// قاموس ترجمة الأحداث
const actionTranslations: Record<string, string> = {
  create_establishment: 'إنشاء مؤسسة',
  update_establishment: 'تعديل مؤسسة',
  change_establishment_status: 'تغيير حالة مؤسسة',
  reset_director_password: 'إعادة تعيين كلمة مرور مدير',
  record_subscription_payment: 'تسجيل دفعة اشتراك',
  upload_logo: 'رفع شعار',
  change_director: 'تغيير مدير',
}

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/audit-logs')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')
      setLogs(data.logs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const formatDetails = (details: any) => {
    if (!details) return '-'
    if (typeof details === 'object') {
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join('، ')
    }
    return details
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">سجل التدقيق</h1>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحدث</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التفاصيل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستخدم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا توجد سجلات</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {actionTranslations[log.action] || log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDetails(log.details)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {log.user_email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}