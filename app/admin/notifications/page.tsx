'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Bell, Check, RefreshCw } from 'lucide-react'

type Notification = {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
  establishment_id: string | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (error) setError(error.message)
    else fetchNotifications()
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)

    if (error) setError(error.message)
    else fetchNotifications()
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-600" />
          الإشعارات
        </h1>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="text-sm text-indigo-600 hover:underline"
          >
            تحديد الكل كمقروء
          </button>
          <button
            onClick={fetchNotifications}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-gray-500">لا توجد إشعارات</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <li key={notif.id} className={`p-4 ${notif.read ? 'bg-white' : 'bg-indigo-50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{notif.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString('ar-MA')}</p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-green-600 hover:text-green-800"
                      title="تحديد كمقروء"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}