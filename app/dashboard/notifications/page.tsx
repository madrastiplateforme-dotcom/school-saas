'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setNotifications(data || [])
    setLoading(false)
  }

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا الإشعار؟')) return
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleClick = async (n: any) => {
    if (!n.read) await handleMarkAsRead(n.id)
    if (n.link) router.push(n.link)
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getIcon = (type: string) => {
    if (type?.includes('transfer')) return '💰'
    if (type?.includes('payment')) return '💵'
    if (type?.includes('expense')) return '💸'
    if (type?.includes('establishment')) return '🏫'
    return '🔔'
  }

  if (loading) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            الإشعارات
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </h1>
          <p className="text-gray-600">جميع التنبيهات الخاصة بك</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
          </button>
        )}
      </header>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: `الكل (${notifications.length})` },
          { key: 'unread', label: `غير مقروء (${unreadCount})` },
          { key: 'read', label: `مقروء (${notifications.length - unreadCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border">
          <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl p-4 border shadow-sm transition hover:shadow-md ${
                !n.read ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">{getIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <button onClick={() => handleClick(n)} className="text-right flex-1">
                      <h3 className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {n.title}
                        {!n.read && <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full mr-2" />}
                      </h3>
                      {n.message && (
                        <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                      )}
                    </button>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(n.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {!n.read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> تعليم كمقروء
                      </button>
                    )}
                    {n.link && (
                      <button
                        onClick={() => handleClick(n)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        فتح ←
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mr-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}