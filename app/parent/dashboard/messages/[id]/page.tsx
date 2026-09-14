'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowRight, Send, RefreshCw, MessageSquare, Megaphone,
} from 'lucide-react'

type Message = {
  id: string
  sender_user_id: string
  sender_role: string | null
  body: string
  created_at: string
}

type Participant = {
  user_id: string
  role: string | null
}

export default function ParentConversationPage() {
  const params = useParams()
  const conversationId = params?.id as string

  const [userId, setUserId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) return
    loadAll()
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const loadAll = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)

    // 1. Conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conv) {
      setError('المحادثة غير موجودة')
      setLoading(false)
      return
    }
    setConversation(conv)

    // 2. Participants
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('user_id, role')
      .eq('conversation_id', conversationId)
    setParticipants(parts || [])

    // 3. Messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_user_id, sender_role, body, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    // 4. Update last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    setLoading(false)
  }

  const handleSend = async () => {
    if (!userId || !newMessage.trim()) return
    setSending(true)
    setError('')
    const supabase = createClient()

    try {
      const { error: mErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: userId,
          sender_role: 'parent',
          body: newMessage.trim(),
        })
      if (mErr) throw mErr

      // تحديث last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      setNewMessage('')
      await loadAll()
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'اليوم'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'أمس'
    return d.toLocaleDateString('fr-FR')
  }

  const otherParticipants = participants.filter(p => p.user_id !== userId)
  const isBroadcast = conversation?.type === 'broadcast'

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (error && !conversation) return <div className="p-6">{error}</div>

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]" dir="rtl">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
        <Link
          href="/parent/dashboard/messages"
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </Link>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isBroadcast ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {isBroadcast ? <Megaphone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 truncate">
            {conversation?.title || `محادثة مع ${otherParticipants.length} مشاركين`}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>{participants.length} مشارك</span>
            {isBroadcast && (
              <>
                <span>·</span>
                <span className="text-amber-600 font-medium">إعلان</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={loadAll}
          className="p-2 rounded-lg hover:bg-slate-100"
          title="تحديث"
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">لا توجد رسائل بعد</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = m.sender_user_id === userId
            const prevMsg = messages[idx - 1]
            const showDate =
              !prevMsg || formatDate(prevMsg.created_at) !== formatDate(m.created_at)

            return (
              <div key={m.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full">
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] ${
                      isMine ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800'
                    } rounded-2xl px-4 py-2.5 shadow-sm`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="اكتب رسالة..."
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="h-11 w-11 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 px-1">
          اضغط Enter للإرسال · Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  )
}