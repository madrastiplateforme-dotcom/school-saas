'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  MessageSquare, Search, RefreshCw, Send, Megaphone, Inbox,
  ArrowLeft, Plus, X,
} from 'lucide-react'

type Contact = {
  user_id: string
  display_name: string
  role: string
}

type ConversationRow = {
  id: string
  title: string | null
  type: string
  last_message_at: string
  last_message_body: string | null
  other_participants: string[]
  unread_count: number
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

export default function ParentMessagesPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [establishmentId, setEstablishmentId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  // New message modal
  const [showModal, setShowModal] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

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

    // 1. Establishment ID من user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('establishment_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.establishment_id) {
      setError('لم يتم العثور على المؤسسة')
      setLoading(false)
      return
    }
    setEstablishmentId(profile.establishment_id)

    // 2. Contacts — المدير + السكرتيرة + الأساتذة
    const { data: rolesData } = await supabase
      .from('roles')
      .select('id, name')

    const roleNameMap = new Map<string, string>()
    ;(rolesData || []).forEach((r: any) => {
      roleNameMap.set(r.id, r.name || '')
    })

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role_id')
      .eq('establishment_id', profile.establishment_id)

    const contactsList: Contact[] = (profiles || [])
      .filter((p: any) => p.user_id !== user.id)
      .filter((p: any) => {
        const rn = (roleNameMap.get(p.role_id) || '').toLowerCase()
        return (
          rn.includes('directeur') || rn.includes('مدير') ||
          rn.includes('secr') ||
          rn.includes('prof') || rn.includes('enseignant') || rn.includes('teacher') || rn.includes('أستاذ')
        )
      })
      .map((p: any) => {
        const rn = (roleNameMap.get(p.role_id) || '').toLowerCase()
        let role = 'other'
        if (rn.includes('directeur') || rn.includes('مدير')) role = 'directeur'
        else if (rn.includes('secr')) role = 'secretaire'
        else if (rn.includes('prof') || rn.includes('enseignant') || rn.includes('teacher') || rn.includes('أستاذ')) role = 'teacher'
        return {
          user_id: p.user_id,
          display_name: p.full_name?.trim() || 'مستخدم',
          role,
        }
      })

    setContacts(contactsList)

    // 3. Conversations
    await loadConversations(user.id, contactsList)

    setLoading(false)
  }

  const loadConversations = async (currentUserId: string, contactsList: Contact[]) => {
    const supabase = createClient()

    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUserId)

    if (!myParts || myParts.length === 0) {
      setConversations([])
      return
    }

    const convIds = myParts.map(p => p.conversation_id)
    const lastReadMap = new Map(myParts.map(p => [p.conversation_id, p.last_read_at]))

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, title, type, last_message_at')
      .in('id', convIds)
      .order('last_message_at', { ascending: false })

    const { data: allParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)

    const rows: ConversationRow[] = []

    for (const c of convs || []) {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('body, sender_user_id, created_at')
        .eq('conversation_id', c.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastRead = lastReadMap.get(c.id)
      let unreadQ = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_user_id', currentUserId)
        .eq('is_deleted', false)
      if (lastRead) unreadQ = unreadQ.gt('created_at', lastRead)
      const { count } = await unreadQ

      const otherIds = (allParts || [])
        .filter(p => p.conversation_id === c.id && p.user_id !== currentUserId)
        .map(p => p.user_id)
      const otherNames = otherIds.map(id => {
        const ct = contactsList.find(x => x.user_id === id)
        return ct?.display_name || 'مستخدم'
      })

      rows.push({
        id: c.id,
        title: c.title,
        type: c.type,
        last_message_at: c.last_message_at,
        last_message_body: lastMsg?.body || null,
        other_participants: otherNames,
        unread_count: count || 0,
      })
    }

    setConversations(rows)
  }

  // ============ NEW CONVERSATION ============
  const openCreateModal = () => {
    setSelectedRecipients([])
    setSubject('')
    setBody('')
    setContactSearch('')
    setError('')
    setShowModal(true)
  }

  const handleSend = async () => {
    if (!userId || !establishmentId) return
    if (!body.trim()) { setError('الرسالة فارغة'); return }
    if (selectedRecipients.length === 0) { setError('يرجى اختيار مستلم'); return }

    setSending(true)
    setError('')
    const supabase = createClient()

    try {
      const convId = crypto.randomUUID()

      const { error: convErr } = await supabase
        .from('conversations')
        .insert({
          id: convId,
          establishment_id: establishmentId,
          title: subject.trim() || null,
          type: selectedRecipients.length > 1 ? 'broadcast' : 'direct',
          created_by_user_id: userId,
        })
      if (convErr) throw convErr

      const participants = [
        { conversation_id: convId, user_id: userId, role: 'parent' },
        ...selectedRecipients.map(uid => ({
          conversation_id: convId,
          user_id: uid,
          role: 'other',
        })),
      ]
      const { error: pErr } = await supabase
        .from('conversation_participants')
        .insert(participants)
      if (pErr) throw pErr

      const { error: mErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_user_id: userId,
          sender_role: 'parent',
          body: body.trim(),
        })
      if (mErr) throw mErr

      setShowModal(false)
      setSuccess('تم إرسال الرسالة')
      setTimeout(() => setSuccess(''), 2500)
      router.push(`/parent/dashboard/messages/${convId}`)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ')
    } finally {
      setSending(false)
    }
  }

  const filteredConvs = conversations.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.title || '').toLowerCase().includes(q)
      || c.other_participants.some(n => n.toLowerCase().includes(q))
      || (c.last_message_body || '').toLowerCase().includes(q)
  })

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.display_name.toLowerCase().includes(contactSearch.toLowerCase())
  )

  const toggleRecipient = (uid: string) => {
    setSelectedRecipients(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    )
  }

  if (loading) return <div className="p-6 text-center">جارٍ التحميل...</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            الرسائل
          </h1>
          <p className="text-sm text-gray-500 mt-1">تواصل مع إدارة المؤسسة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => userId && loadConversations(userId, contacts)}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" /> رسالة جديدة
          </button>
        </div>
      </header>

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">{success}</div>
      )}

      <div className="relative bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <Search className="absolute right-7 top-7 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في المحادثات..."
          className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filteredConvs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <Inbox className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium mb-2">
            {conversations.length === 0 ? 'لا توجد محادثات' : 'لا توجد نتائج'}
          </p>
          {conversations.length === 0 && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="h-4 w-4" /> ابدأ محادثة جديدة
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredConvs.map(c => {
            const isBroadcast = c.type === 'broadcast'
            return (
              <Link
                key={c.id}
                href={`/parent/dashboard/messages/${c.id}`}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isBroadcast ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {isBroadcast ? <Megaphone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-800 truncate">
                      {c.title || c.other_participants.join(', ') || 'محادثة'}
                    </p>
                    {isBroadcast && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                        إعلان
                      </span>
                    )}
                  </div>
                  {c.last_message_body && (
                    <p
                      className={`text-sm truncate ${
                        c.unread_count > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {c.last_message_body}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-slate-400">{formatTime(c.last_message_at)}</span>
                  {c.unread_count > 0 && (
                    <span className="min-w-[20px] h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                      {c.unread_count > 99 ? '99+' : c.unread_count}
                    </span>
                  )}
                </div>
                <ArrowLeft className="h-4 w-4 text-slate-300 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">رسالة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المستلمون *</label>
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="بحث..."
                    className="w-full h-10 pr-10 pl-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredContacts.length === 0 ? (
                    <p className="text-center text-slate-400 py-4 text-sm">لا يوجد مستخدمون</p>
                  ) : (
                    filteredContacts.map(c => {
                      const selected = selectedRecipients.includes(c.user_id)
                      return (
                        <button
                          key={c.user_id}
                          type="button"
                          onClick={() => toggleRecipient(c.user_id)}
                          className={`w-full flex items-center gap-3 p-2.5 text-right transition ${
                            selected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                            }`}
                          >
                            {selected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <span className="text-sm text-slate-800">{c.display_name}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع (اختياري)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="عنوان الرسالة..."
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرسالة *</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="اكتب رسالتك..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={handleSend}
                  disabled={sending || !body.trim() || selectedRecipients.length === 0}
                  className="h-11 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'جارٍ الإرسال...' : 'إرسال'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="h-11 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}