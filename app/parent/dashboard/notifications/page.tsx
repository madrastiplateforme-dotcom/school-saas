'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Bell, ArrowRight, CheckCheck, RefreshCw, Check, Circle,
} from 'lucide-react'

type Notif = {
  id: string
  title: string
  message: string | null
  created_at: string
  read: boolean
  link: string | null
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ي`
  return d.toLocaleDateString('fr-FR')
}

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setNotifications(data || [])
    setLoading(false)
  }

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/parent/dashboard"
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-indigo-600" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="min-w-[24px] h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-2">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
            >
              <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-16">جارٍ التحميل...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 flex items-start gap-3 hover:bg-slate-50 transition ${
                !n.read ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                !n.read ? 'bg-indigo-500' : 'bg-transparent'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatTime(n.created_at)}
                  </span>
                </div>
                {n.message && (
                  <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {n.link && (
                    <Link
                      href={n.link}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      عرض
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      تعليم كمقروء
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}