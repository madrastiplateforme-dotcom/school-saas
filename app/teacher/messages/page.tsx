'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  MessageSquare, RefreshCw, Search, ChevronLeft, User as UserIcon,
} from 'lucide-react'

type Conversation = {
  id: string
  title: string | null
  last_message: string | null
  last_message_at: string | null
  other_names: string[]
  unread_count: number
}

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'دابا'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} ي`
  return d.toLocaleDateString('fr-MA')
}

export default function TeacherMessagesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('غير مصرح')
        setLoading(false)
        return
      }

      const { data: myParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      const convIds = (myParts || []).map((p: any) => p.conversation_id)
      if (convIds.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const myLastRead: Record<string, string | null> = {}
      ;(myParts || []).forEach((p: any) => {
        myLastRead[p.conversation_id] = p.last_read_at || null
      })

      const { data: convs } = await supabase
        .from('conversations')
        .select('id, title, last_message_at, updated_at, created_at')
        .in('id', convIds)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      const { data: allParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, user_profiles(full_name)')
        .in('conversation_id', convIds)

      const namesByConv: Record<string, string[]> = {}
      ;(allParts || []).forEach((p: any) => {
        if (p.user_id === user.id) return
        const name = p.user_profiles?.full_name
        if (!name) return
        if (!namesByConv[p.conversation_id]) namesByConv[p.conversation_id] = []
        namesByConv[p.conversation_id].push(name)
      })

      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, body, created_at, sender_user_id')
        .in('conversation_id', convIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      const lastMsg: Record<string, { body: string; created_at: string }> = {}
      const unread: Record<string, number> = {}
      ;(msgs || []).forEach((m: any) => {
        if (!lastMsg[m.conversation_id]) {
          lastMsg[m.conversation_id] = {
            body: m.body,
            created_at: m.created_at,
          }
        }
        if (m.sender_user_id !== user.id) {
          const lr = myLastRead[m.conversation_id]
          const isUnread = !lr || new Date(m.created_at) > new Date(lr)
          if (isUnread) {
            unread[m.conversation_id] = (unread[m.conversation_id] || 0) + 1
          }
        }
      })

      const list: Conversation[] = (convs || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        last_message: lastMsg[c.id]?.body || null,
        last_message_at:
          lastMsg[c.id]?.created_at || c.last_message_at || c.updated_at,
        other_names: namesByConv[c.id] || [],
        unread_count: unread[c.id] || 0,
      }))

      setItems(list)
    } catch (e: any) {
      console.error('[teacher-messages]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    if (c.title && c.title.toLowerCase().includes(q)) return true
    return c.other_names.some((n) => n.toLowerCase().includes(q))
  })

  if (loading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
        <p className="text-sm text-slate-500 mt-2">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-sky-600" />
            الرسائل
          </h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} محادثة</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المستخدم..."
          className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {items.length === 0 ? 'ما عندكش محادثات' : 'ما لقيناش نتائج'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            المحادثات مع الإدارة والأولياء غادي تبان هنا
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          {filtered.map((c) => {
            const displayName =
              c.other_names.join(', ') || c.title || 'محادثة'
            return (
              <Link
                key={c.id}
                href={`/teacher/messages/${c.id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-50 transition"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-100 text-sky-800 flex-shrink-0 font-bold">
                  {displayName.slice(0, 1).toUpperCase() || (
                    <UserIcon className="h-5 w-5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm truncate ${
                        c.unread_count > 0
                          ? 'font-bold text-slate-900'
                          : 'font-medium text-slate-800'
                      }`}
                    >
                      {displayName}
                    </p>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className={`text-xs truncate ${
                        c.unread_count > 0
                          ? 'text-slate-700 font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      {c.last_message || 'لا توجد رسائل بعد'}
                    </p>
                    {c.unread_count > 0 && (
                      <span className="bg-sky-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}