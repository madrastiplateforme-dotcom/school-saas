'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import { useAcademicYear } from '@/lib/AcademicYearContext'
import {
  MessageSquare, Plus, Search, RefreshCw, X, Send, User, Users,
  GraduationCap, Megaphone, Inbox, ArrowLeft, Bell,
} from 'lucide-react'

type Contact = {
  user_id: string
  display_name: string
  role: 'directeur' | 'secretaire' | 'teacher' | 'parent' | 'other'
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

const roleLabel = (r: string) => {
  switch (r) {
    case 'directeur': return 'المدير'
    case 'secretaire': return 'السكرتيرة'
    case 'teacher': return 'أستاذ'
    case 'parent': return 'ولي الأمر'
    default: return 'مستخدم'
  }
}

const roleIcon = (r: string) => {
  switch (r) {
    case 'teacher': return <GraduationCap className="h-3.5 w-3.5" />
    case 'parent': return <Users className="h-3.5 w-3.5" />
    default: return <User className="h-3.5 w-3.5" />
  }
}

const mapRoleName = (name: string): Contact['role'] => {
  const rn = (name || '').toLowerCase()
  if (rn.includes('directeur') || rn.includes('مدير')) return 'directeur'
  if (rn.includes('secr')) return 'secretaire'
  if (rn.includes('prof') || rn.includes('enseignant') || rn.includes('teacher') || rn.includes('أستاذ')) return 'teacher'
  if (rn.includes('parent') || rn.includes('ول')) return 'parent'
  return 'other'
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

export default function MessagesPage() {
  const router = useRouter()
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const { yearId: contextYearId, year: contextYear } = useAcademicYear()
  const isDirector = role === 'directeur' || role === 'secretaire'

  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<'type' | 'recipient' | 'message'>('type')
  const [newType, setNewType] = useState<'direct' | 'broadcast'>('direct')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [broadcastTarget, setBroadcastTarget] = useState<'all_parents' | 'class'>('all_parents')
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [broadcastClassId, setBroadcastClassId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  useEffect(() => {
    if (!establishmentId || !role || !contextYearId) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, role, contextYearId])

  const loadAll = async () => {
    if (!contextYearId) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)

    // Roles map
    const { data: rolesData } = await supabase
      .from('roles')
      .select('id, name')

    const roleNameMap = new Map<string, string>()
    ;(rolesData || []).forEach((r: any) => {
      roleNameMap.set(r.id, r.name || '')
    })

    // User profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role_id')
      .eq('establishment_id', establishmentId)

    const contactsList: Contact[] = (profiles || [])
      .filter((p: any) => p.user_id !== user.id)
      .map((p: any) => ({
        user_id: p.user_id,
        display_name: p.full_name?.trim() || 'مستخدم',
        role: mapRoleName(roleNameMap.get(p.role_id) || ''),
      }))

    setContacts(contactsList)

    // ✅ Classes dyal l'année active (broadcast)
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', contextYearId)
      .order('name')
    setClasses(cls || [])

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
    setModalStep('type')
    setNewType('direct')
    setSelectedRecipients([])
    setBroadcastTarget('all_parents')
    setBroadcastClassId('')
    setSubject('')
    setBody('')
    setContactSearch('')
    setError('')
    setShowModal(true)
  }

  const handleSendNew = async () => {
    if (!establishmentId || !userId || !contextYearId) return
    if (!body.trim()) { setError('الرسالة فارغة'); return }

    if (newType === 'direct' && selectedRecipients.length === 0) {
      setError('يرجى اختيار مستلم واحد على الأقل')
      return
    }
    if (newType === 'broadcast' && broadcastTarget === 'class' && !broadcastClassId) {
      setError('يرجى اختيار القسم')
      return
    }

    setSending(true)
    setError('')
    const supabase = createClient()

    try {
      let recipientUserIds: string[] = []
      let convType: 'direct' | 'broadcast' = 'direct'
      let convTitle: string | null = null

      if (newType === 'direct') {
        recipientUserIds = selectedRecipients
        convType = recipientUserIds.length > 1 ? 'broadcast' : 'direct'
        convTitle = subject.trim() || null
      } else {
        convType = 'broadcast'

        if (broadcastTarget === 'all_parents') {
          // ✅ Parents des élèves ENROLLED dans l'année active
          const { data: enrollmentsData } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('establishment_id', establishmentId)
            .eq('academic_year_id', contextYearId)
            .eq('status', 'active')

          const studentIds = Array.from(
            new Set((enrollmentsData || []).map((e: any) => e.student_id).filter(Boolean))
          ) as string[]

          if (studentIds.length === 0) {
            setError('لا يوجد أولياء في هذه السنة')
            setSending(false)
            return
          }

          const { data: studentsData } = await supabase
            .from('students')
            .select('id, family_id')
            .in('id', studentIds)

          const familyIds = Array.from(
            new Set((studentsData || []).map((s: any) => s.family_id).filter(Boolean))
          ) as string[]

          if (familyIds.length === 0) {
            setError('لا يوجد أولياء في هذه السنة')
            setSending(false)
            return
          }

          const { data: fams } = await supabase
            .from('families')
            .select('id, parent_user_id')
            .in('id', familyIds)
            .eq('establishment_id', establishmentId)

          recipientUserIds = (fams || [])
            .map((f: any) => f.parent_user_id)
            .filter(Boolean)

          convTitle = subject.trim() || `إعلان لكل الأولياء - ${contextYear?.name || ''}`
        } else {
          // ✅ Class → enrollments dyal l'année active
          const { data: enrs } = await supabase
            .from('enrollments')
            .select('student_id, students(family_id)')
            .eq('class_id', broadcastClassId)
            .eq('establishment_id', establishmentId)
            .eq('academic_year_id', contextYearId)

          const familyIds = (enrs || [])
            .map((e: any) => e.students?.family_id)
            .filter(Boolean)

          if (familyIds.length === 0) {
            setError('لا يوجد أولياء في هذا القسم')
            setSending(false)
            return
          }

          const { data: fams } = await supabase
            .from('families')
            .select('id, parent_user_id')
            .in('id', familyIds)
            .eq('establishment_id', establishmentId)

          recipientUserIds = (fams || [])
            .map((f: any) => f.parent_user_id)
            .filter(Boolean)

          const className = classes.find(c => c.id === broadcastClassId)?.name || ''
          convTitle = subject.trim() || `إعلان - ${className}`
        }
      }

      if (recipientUserIds.length === 0) {
        setError('لا يوجد مستلمون')
        setSending(false)
        return
      }

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          establishment_id: establishmentId,
          title: convTitle,
          type: convType,
          created_by_user_id: userId,
        })
        .select()
        .single()
      if (convErr) throw convErr

      const participants = [
        { conversation_id: conv.id, user_id: userId, role: role || 'other' },
        ...recipientUserIds.map(uid => ({
          conversation_id: conv.id,
          user_id: uid,
          role: 'parent',
        })),
      ]
      const { error: pErr } = await supabase
        .from('conversation_participants')
        .insert(participants)
      if (pErr) throw pErr

      const { error: mErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender_user_id: userId,
          sender_role: role || 'other',
          body: body.trim(),
        })
      if (mErr) throw mErr

      setShowModal(false)
      setSuccess('تم إرسال الرسالة')
      setTimeout(() => setSuccess(''), 2500)
      router.push(`/dashboard/messages/${conv.id}`)
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ')
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

  if (loading || roleLoading) return <div className="p-6 text-center">جارٍ التحميل...</div>
  if (!isDirector && role !== 'enseignant') return <div className="p-6">ليس لديك صلاحية</div>

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
            الرسائل
          </h1>
          <p className="text-sm text-gray-500 mt-1">تواصل مع الأولياء والأساتذة</p>
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
                href={`/dashboard/messages/${c.id}`}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">رسالة جديدة</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {(['type', 'recipient', 'message'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      modalStep === s
                        ? 'bg-indigo-600 text-white'
                        : ['type', 'recipient', 'message'].indexOf(modalStep) > i
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className="h-px flex-1 bg-slate-200" />}
                </div>
              ))}
            </div>

            {modalStep === 'type' && (
              <div className="space-y-3">
                <button
                  onClick={() => { setNewType('direct'); setModalStep('recipient') }}
                  className="w-full text-right p-4 border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">محادثة مباشرة</p>
                      <p className="text-xs text-slate-500">مع شخص واحد أو أكثر</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setNewType('broadcast'); setModalStep('recipient') }}
                  className="w-full text-right p-4 border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">إعلان</p>
                      <p className="text-xs text-slate-500">لكل الأولياء أو لقسم معين</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {modalStep === 'recipient' && newType === 'direct' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="بحث..."
                    className="w-full h-10 pr-10 pl-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredContacts.length === 0 ? (
                    <p className="text-center text-slate-400 py-6 text-sm">لا يوجد مستخدمون</p>
                  ) : (
                    filteredContacts.map(c => {
                      const selected = selectedRecipients.includes(c.user_id)
                      return (
                        <button
                          key={c.user_id}
                          onClick={() => toggleRecipient(c.user_id)}
                          className={`w-full flex items-center gap-3 p-3 text-right transition ${
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {c.display_name}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              {roleIcon(c.role)}
                              {roleLabel(c.role)}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <div className="flex justify-between pt-2">
                  <button onClick={() => setModalStep('type')} className="text-sm text-slate-500 hover:text-slate-700">
                    ← رجوع
                  </button>
                  <button
                    onClick={() => setModalStep('message')}
                    disabled={selectedRecipients.length === 0}
                    className="h-10 px-5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
                  >
                    التالي ({selectedRecipients.length})
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'recipient' && newType === 'broadcast' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الفئة المستهدفة
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                        broadcastTarget === 'all_parents' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={broadcastTarget === 'all_parents'}
                        onChange={() => setBroadcastTarget('all_parents')}
                      />
                      <div>
                        <p className="font-medium text-sm">كل الأولياء</p>
                        <p className="text-xs text-slate-500">
                          أولياء التلاميذ المسجلين في {contextYear?.name || 'السنة الحالية'}
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                        broadcastTarget === 'class' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={broadcastTarget === 'class'}
                        onChange={() => setBroadcastTarget('class')}
                      />
                      <div>
                        <p className="font-medium text-sm">قسم معين</p>
                        <p className="text-xs text-slate-500">أولياء تلاميذ قسم واحد</p>
                      </div>
                    </label>
                  </div>
                </div>

                {broadcastTarget === 'class' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <select
                      value={broadcastClassId}
                      onChange={(e) => setBroadcastClassId(e.target.value)}
                      className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— اختر القسم —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setModalStep('type')} className="text-sm text-slate-500 hover:text-slate-700">
                    ← رجوع
                  </button>
                  <button
                    onClick={() => setModalStep('message')}
                    disabled={broadcastTarget === 'class' && !broadcastClassId}
                    className="h-10 px-5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'message' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الموضوع (اختياري)
                  </label>
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

                <div className="flex justify-between pt-2">
                  <button onClick={() => setModalStep('recipient')} className="text-sm text-slate-500 hover:text-slate-700">
                    ← رجوع
                  </button>
                  <button
                    onClick={handleSendNew}
                    disabled={sending || !body.trim()}
                    className="h-10 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'جارٍ الإرسال...' : 'إرسال'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}