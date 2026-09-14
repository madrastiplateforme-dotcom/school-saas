'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { User, Bell, Check, CheckCheck, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import {
  AlertCircle, BookOpen, Calendar, ChevronDown, FileText, GraduationCap,
  LayoutDashboard, LogOut, School, Settings, Shield, UserPlus, Users,
  Wallet, Wrench, ArrowLeft, BarChart3, Building2, Send, Link2,
  ClipboardList, ShieldCheck, Mail, MessageSquare, CreditCard,
} from 'lucide-react'

const menuSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { href: '/dashboard/enroll', key: 'enroll', icon: UserPlus, label: 'Inscription' },
       { href: '/dashboard/users', key: 'users', icon: Users, label: 'Utilisateurs' },
      { href: '/dashboard/messages', key: 'messages', icon: MessageSquare, label: 'Messages' },
    ],
  },
 {
  title: 'SCOLARITÉ',
  items: [
    { href: '/dashboard/students', key: 'students', icon: Users, label: 'Élèves' },
    { href: '/dashboard/families', key: 'families', icon: Users, label: 'Familles' },
    { href: '/dashboard/attendance', key: 'attendance', icon: CheckCircle2, label: 'Absences' },
    { href: '/dashboard/attendance/reports', key: 'attendanceReports', icon: FileText, label: ' Rapport des absences' },
    { href: '/dashboard/evaluations', key: 'evaluations', icon: ClipboardList, label: 'Évaluations & Notes' }, // ← زيد
    { href: '/dashboard/bulletins', key: 'bulletins', icon: FileText, label: 'Bulletins' }, // ← زيد
  ],
},
  {
    title: 'FINANCE',
    items: [
      { href: '/dashboard/contracts', key: 'contracts', icon: FileText, label: 'Contrats' },
      { href: '/dashboard/installments', key: 'installments', icon: Calendar, label: 'Échéances' },
      { href: '/dashboard/payments', key: 'payments', icon: Wallet, label: 'Paiements' },
      { href: '/dashboard/impayes', key: 'impayes', icon: AlertCircle, label: 'Impayés' },
      { href: '/dashboard/expenses', key: 'expenses', icon: Wallet, label: 'Dépenses' },
      { href: '/dashboard/caisse', key: 'caisse', icon: Building2, label: 'الصندوق' },
      { href: '/dashboard/caisse/transfers', key: 'transfers', icon: Send, label: 'التحويلات' },
      { href: '/dashboard/reports', key: 'reports', icon: BarChart3, label: 'Rapports' },
    ],
  },
]

const settingsItems = [
  { href: '/dashboard/academic-years', key: 'academicYears', icon: Calendar, label: 'Années scolaires' },
  { href: '/dashboard/levels', key: 'levels', icon: GraduationCap, label: 'Niveaux' },
  { href: '/dashboard/classes', key: 'classes', icon: BookOpen, label: 'Classes' },
  { href: '/dashboard/subjects', key: 'subjects', icon: BookOpen, label: 'Matières' },
  { href: '/dashboard/teacher-subjects', key: 'teacherSubjects', icon: Link2, label: 'Enseignants ↔ Matières' },
  { href: '/dashboard/timetable', key: 'timetable', icon: Calendar, label: 'Emploi du temps' },
  { href: '/dashboard/evaluation-types', key: 'evalTypes', icon: ClipboardList, label: 'Types d\'évaluation' }, // ← زيد
  { href: '/dashboard/services', key: 'services', icon: Wrench, label: 'Services' },
  { href: '/dashboard/personnel', key: 'personnel', icon: Users, label: 'Personnel' },
  { href: '/dashboard/school-settings', key: 'schoolSettings', icon: Settings, label: 'Gestion de durée' },
  { href: '/dashboard/billing', key: 'billing', icon: CreditCard, label: 'Abbonnements' },
  { href: '/dashboard/settings/email', key: 'email', icon: Mail, label: 'Email' },
  { href: '/dashboard/roles', key: 'roles', icon: Shield, label: 'Rôles' },
  { href: '/dashboard/settings', key: 'settings', icon: Settings, label: 'Paramètres' },
  { href: '/dashboard/settings/privacy', key: 'privacy', icon: ShieldCheck, label: 'الخصوصية' },
]
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()

  const [userEmail, setUserEmail] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [assistanceName, setAssistanceName] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isInSettings = settingsItems.some((item) => pathname.startsWith(item.href))
    if (isInSettings) setSettingsOpen(true)
  }, [pathname])

  // Close bell mli tclicki berra
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
    const assistId = sessionStorage.getItem('assistance_establishment_id')

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || '')

      // Jib notifications (bla realtime)
      loadNotifications(user.id)

      if (assistId) {
        supabase
          .from('establishments')
          .select('name')
          .eq('id', assistId)
          .single()
          .then(({ data }) => {
            if (data) setAssistanceName(data.name)
          })
        return
      }

      supabase
        .from('user_profiles')
        .select('establishment_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.establishment_id) {
            supabase
              .from('establishments')
              .select('name')
              .eq('id', profile.establishment_id)
              .single()
              .then(({ data }) => {
                if (data) setSchoolName(data.name)
              })
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
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
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
    sessionStorage.removeItem('assistance_establishment_id')
    sessionStorage.removeItem('assistance_return_path')
    router.push('/login')
    router.refresh()
  }

  const exitAssistance = () => {
    const returnPath = sessionStorage.getItem('assistance_return_path') || '/dashboard/admin/establishments'
    sessionStorage.removeItem('assistance_establishment_id')
    sessionStorage.removeItem('assistance_return_path')
    setAssistanceName(null)
    router.push(returnPath)
    router.refresh()
  }

  const displayName = assistanceName || schoolName

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href
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
      {assistanceName && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold">
              وضع المساعدة — أنت الآن تتصفح: <strong className="underline">{assistanceName}</strong>
            </span>
          </div>
          <button
            onClick={exitAssistance}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-amber-600 transition hover:bg-amber-50"
          >
            <ArrowLeft className="h-4 w-4" />
            رجوع إلى الإدارة العامة
          </button>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] flex-shrink-0 flex-col bg-[#0b2f35] text-white lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35]">
                <School className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{displayName || t('school')}</p>
                <p className="mt-0.5 text-xs text-emerald-200">{t('administrationSpace')}</p>
              </div>
            </div>
            <p className="mt-5 truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
              {userEmail}
            </p>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300/60">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={active ? { backgroundColor: '#34d399', color: '#082c27' } : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                          active ? 'shadow-lg shadow-emerald-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

            <div>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between px-3 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300/60 hover:text-emerald-300 transition"
              >
                <span>PARAMÈTRES</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${settingsOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {settingsItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={active ? { backgroundColor: '#34d399', color: '#082c27' } : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                        active ? 'shadow-lg shadow-emerald-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            <Link
              href="/dashboard/profile"
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                isActive('/dashboard/profile')
                  ? 'bg-emerald-400 text-[#082c27] font-bold shadow-lg shadow-emerald-950/20'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              حسابي
            </Link>
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

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f8fc]/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0b2f35] text-emerald-300">
                  <School className="h-5 w-5" />
                </span>
                <span className="max-w-40 truncate font-bold">{displayName || t('school')}</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">
                  {t('schoolManagement')}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{t('schoolManagementSubtitle')}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* BELL ICON */}
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
                    <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50" dir="rtl">
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
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                                      {n.title}
                                    </p>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatTime(n.created_at)}</span>
                                  </div>
                                  {n.message && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setBellOpen(false)}
                        className="block p-3 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 border-t border-slate-100"
                      >
                        عرض كل الإشعارات
                      </Link>
                    </div>
                  )}
                </div>

                <span className="hidden text-right text-xs text-slate-500 sm:block">
                  <strong className="block text-sm text-slate-700">{displayName || t('school')}</strong>
                  {userEmail}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                  {(displayName || 'E').slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {menuSections[0].items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={active ? { backgroundColor: '#047857', color: '#ffffff' } : { backgroundColor: '#ffffff', color: '#334155' }}
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