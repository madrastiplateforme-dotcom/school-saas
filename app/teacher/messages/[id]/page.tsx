'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowRight, Send, RefreshCw, User as UserIcon, MessageSquare,
} from 'lucide-react'

type Msg = {
  id: string
  sender_user_id: string
  body: string
  created_at: string
}

type OtherUser = { id: string; full_name: string }

export default function TeacherConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: conversationId } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [meId, setMeId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('teacher')
  const [messages, setMessages] = useState<Msg[]>([])
  const [others, setOthers] = useState<OtherUser[]>([])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
      setMeId(user.id)

      const { data: myPart } = await supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (myPart?.role) setMyRole(myPart.role)

      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, user_profiles(full_name)')
        .eq('conversation_id', conversationId)

      const othersList: OtherUser[] = (parts || [])
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => ({
          id: p.user_id,
          full_name: p.user_profiles?.full_name || 'مستخدم',
        }))
      setOthers(othersList)

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_user_id, body, created_at')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
      setMessages(msgs || [])

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
    } catch (e: any) {
      console.error('[teacher-conversation]', e)
      setError(e.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !meId) return
    setSending(true)
    setError('')
    const supabase = createClient()
    try {
      const body = text.trim()
      const { data, error: err } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: meId,
          sender_role: myRole,
          body,
        })
        .select('id, sender_user_id, body, created_at')
        .single()

      if (err) throw err
      setMessages((prev) => [...prev, data])
      setText('')

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', meId)
    } catch (e: any) {
      setError(e.message || 'فشل الإرسال')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-MA', {
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'اليوم'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'أمس'
    return d.toLocaleDateString('fr-MA')
  }

  const grouped: { date: string; items: Msg[] }[] = []
  messages.forEach((m) => {
    const date = formatDate(m.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.items.push(m)
    else grouped.push({ date, items: [m] })
  })

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]" dir="rtl">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button
          onClick={() => router.push('/teacher/messages')}
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 transition"
        >
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-sky-800 font-bold">
          {others[0]?.full_name?.slice(0, 1).toUpperCase() || (
            <UserIcon className="h-5 w-5" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate text-sm">
            {others.map((o) => o.full_name).join(', ') || 'محادثة'}
          </p>
          <p className="text-xs text-slate-500">{others.length} مشارك</p>
        </div>
        <button
          onClick={loadData}
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 transition"
        >
          <RefreshCw className="h-4 w-4 text-slate-600" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">لا توجد رسائل بعد</p>
            <p className="text-xs mt-1">ابدأ المحادثة بكتابة رسالة</p>
          </div>
        ) : (
          grouped.map((g, gi) => (
            <div key={gi} className="space-y-2">
              <div className="text-center">
                <span className="inline-block text-xs bg-white text-slate-500 px-3 py-1 rounded-full shadow-sm">
                  {g.date}
                </span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender_user_id === meId
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        mine
                          ? 'bg-sky-600 text-white rounded-tr-sm'
                          : 'bg-white text-slate-800 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          mine ? 'text-sky-100' : 'text-slate-400'
                        }`}
                        dir="ltr"
                      >
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        {error && (
          <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="اكتب رسالتك..."
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition disabled:opacity-50 flex-shrink-0"
          >
            {sending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}