// app/teacher/layout.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/LanguageContext'
import {
  LayoutDashboard, Calendar, BookOpen, ClipboardList, UserCheck,
  BarChart3, MessageSquare, User, Bell, LogOut, School, Check,
  CheckCheck, GraduationCap,
} from 'lucide-react'

const menuItems = [
  { href: '/teacher/dashboard', key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/teacher/timetable', key: 'timetable', icon: Calendar, label: 'Emploi du temps' },
  { href: '/teacher/classes', key: 'classes', icon: BookOpen, label: 'Mes Classes' },
  { href: '/teacher/grades', key: 'grades', icon: ClipboardList, label: 'Saisie des notes' },
  { href: '/teacher/attendance', key: 'attendance', icon: UserCheck, label: 'Mes Présences' },
  { href: '/teacher/stats', key: 'stats', icon: BarChart3, label: 'Mes Statistiques' },
  { href: '/teacher/messages', key: 'messages', icon: MessageSquare, label: 'Messages' },
  { href: '/teacher/profile', key: 'profile', icon: User, label: 'Mon Profil' },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()

  const [userEmail, setUserEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || '')

      // Notifications
      loadNotifications(user.id)

      // Profile + School
      supabase
        .from('user_profiles')
        .select('full_name, establishment_id, establishments(name)')
        .eq('user_id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setFullName(profile.full_name || '')
            const est = (profile as any).establishments
            if (est?.name) setSchoolName(est.name)
          }
        })
    })
  }, [pathname])

  const loadNotifications = async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications(data || [])
    setUnreadCount((data || []).filter((n: any) => !n.read).length)
  }

  const handleMarkAsRead = async (notifId: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', notifId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const handleNotifClick = async (n: any) => {
    if (!n.read) await handleMarkAsRead(n.id)
    setBellOpen(false)
    if (n.link) router.push(n.link)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/teacher/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'دابا'
    if (diff < 3600) return `${Math.floor(diff / 60)} د`
    if (diff < 86400) return `${Math.floor(diff / 3600)} س`
    return `${Math.floor(diff / 86400)} ي`
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <div className="flex min-h-screen">
        {/* ═══════════════ Sidebar ═══════════════ */}
        <aside className="hidden w-[280px] flex-shrink-0 flex-col bg-[#1a2b4a] text-white lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400 text-[#1a2b4a]">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{schoolName || 'المؤسسة'}</p>
                <p className="mt-0.5 text-xs text-sky-200">بوابة الأستاذ</p>
              </div>
            </div>
            {fullName && (
              <p className="mt-5 truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                {fullName}
              </p>
            )}
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
            {menuItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={active ? { backgroundColor: '#38bdf8', color: '#0c1e3d' } : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? 'shadow-lg shadow-sky-950/20'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            <button
              onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {t('language')}
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </button>
          </div>
        </aside>

        {/* ═══════════════ Main ═══════════════ */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f8fc]/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1a2b4a] text-sky-300">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="max-w-40 truncate font-bold">
                  {fullName || 'الأستاذ'}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">
                  بوابة الأستاذ
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  مرحباً {fullName || ''}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Bell */}
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={() => setBellOpen(!bellOpen)}
                    className="relative grid h-10 w-10 place-items-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200 transition"
                  >
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {bellOpen && (
                    <div
                      className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                      dir="rtl"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">الإشعارات</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                          >
                            <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
                          </button>
                        )}
                      </div>

                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">لا توجد إشعارات</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full text-right p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition ${
                                !n.read ? 'bg-indigo-50/50' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                    !n.read ? 'bg-indigo-500' : 'bg-transparent'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={`text-sm ${
                                        !n.read
                                          ? 'font-bold text-slate-800'
                                          : 'font-medium text-slate-700'
                                      }`}
                                    >
                                      {n.title}
                                    </p>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                      {formatTime(n.created_at)}
                                    </span>
                                  </div>
                                  {n.message && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                      {n.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      <Link
                        href="/teacher/notifications"
                        onClick={() => setBellOpen(false)}
                        className="block p-3 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 border-t border-slate-100"
                      >
                        عرض كل الإشعارات
                      </Link>
                    </div>
                  )}
                </div>

                <span className="hidden text-right text-xs text-slate-500 sm:block">
                  <strong className="block text-sm text-slate-700">
                    {fullName || 'الأستاذ'}
                  </strong>
                  {userEmail}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 font-bold text-sky-800">
                  {(fullName || 'E').slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile nav */}
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {menuItems.slice(0, 4).map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={
                      active
                        ? { backgroundColor: '#0c4a6e', color: '#ffffff' }
                        : { backgroundColor: '#ffffff', color: '#334155' }
                    }
                    className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}