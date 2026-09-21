'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { User, Bell, Check, CheckCheck, CheckCircle2, Menu, X } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import {
  AlertCircle, BookOpen, Calendar, ChevronDown, FileText, GraduationCap,
  LayoutDashboard, LogOut, School, Settings, Shield, UserPlus, Users,
  Wallet, Wrench, ArrowLeft, BarChart3, Building2, Send, Link2,
  ClipboardList, ShieldCheck, Mail, MessageSquare, CreditCard,
  ShieldAlert, Award,
} from 'lucide-react'

// ═══════════════════════════════════════════════════
// ADMIN (Directeur) — Sections complètes
// ═══════════════════════════════════════════════════
const adminMenuSections = [
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
      { href: '/dashboard/attendance/reports', key: 'attendanceReports', icon: FileText, label: 'Rapport des absences' },
      { href: '/dashboard/discipline', key: 'discipline', icon: Shield, label: 'Discipline' },
      { href: '/dashboard/meetings', key: 'meetings', icon: Users, label: 'Réunions parents' },
      { href: '/dashboard/evaluations', key: 'evaluations', icon: ClipboardList, label: 'Évaluations & Notes' },
      { href: '/dashboard/bulletins', key: 'bulletins', icon: FileText, label: 'Bulletins' },
      { href: '/dashboard/certificates', key: 'certificates', icon: Award, label: 'الشهادات' },
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

const adminSettingsItems = [
  { href: '/dashboard/academic-years', key: 'academicYears', icon: Calendar, label: 'Années scolaires' },
  { href: '/dashboard/levels', key: 'levels', icon: GraduationCap, label: 'Niveaux' },
  { href: '/dashboard/classes', key: 'classes', icon: BookOpen, label: 'Classes' },
  { href: '/dashboard/subjects', key: 'subjects', icon: BookOpen, label: 'Matières' },
  { href: '/dashboard/teacher-subjects', key: 'teacherSubjects', icon: Link2, label: 'Enseignants ↔ Matières' },
  { href: '/dashboard/timetable', key: 'timetable', icon: Calendar, label: 'Emploi du temps' },
  { href: '/dashboard/evaluation-types', key: 'evalTypes', icon: ClipboardList, label: "Types d'évaluation" },
  { href: '/dashboard/services', key: 'services', icon: Wrench, label: 'Services' },
  { href: '/dashboard/personnel', key: 'personnel', icon: Users, label: 'Personnel' },
  { href: '/dashboard/school-settings', key: 'schoolSettings', icon: Settings, label: 'Gestion de durée' },
  { href: '/dashboard/billing', key: 'billing', icon: CreditCard, label: 'Abonnements' },
  { href: '/dashboard/settings/email', key: 'email', icon: Mail, label: 'Email' },
  { href: '/dashboard/roles', key: 'roles', icon: Shield, label: 'Rôles' },
  { href: '/dashboard/settings', key: 'settings', icon: Settings, label: 'Paramètres' },
  { href: '/dashboard/settings/privacy', key: 'privacy', icon: ShieldCheck, label: 'الخصوصية' },
]

// ═══════════════════════════════════════════════════
// SECRÉTAIRE — Sections administratives (sans settings)
// ═══════════════════════════════════════════════════
const secretaryMenuSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { href: '/dashboard/secretary', key: 'secretary', icon: LayoutDashboard, label: 'Tableau de bord' },
      { href: '/dashboard/enroll', key: 'enroll', icon: UserPlus, label: 'Inscription' },
      { href: '/dashboard/messages', key: 'messages', icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    title: 'SCOLARITÉ',
    items: [
      { href: '/dashboard/students', key: 'students', icon: Users, label: 'Élèves' },
      { href: '/dashboard/families', key: 'families', icon: Users, label: 'Familles' },
      { href: '/dashboard/attendance', key: 'attendance', icon: CheckCircle2, label: 'Absences' },
      { href: '/dashboard/discipline', key: 'discipline', icon: ShieldAlert, label: 'Discipline' },
      { href: '/dashboard/meetings', key: 'meetings', icon: Users, label: 'Réunions parents' },
      { href: '/dashboard/evaluations', key: 'evaluations', icon: ClipboardList, label: 'Évaluations & Notes' },
      { href: '/dashboard/bulletins', key: 'bulletins', icon: FileText, label: 'Bulletins' },
      { href: '/dashboard/timetable', key: 'timetable', icon: Calendar, label: 'Emploi du temps' },
      { href: '/dashboard/certificates', key: 'certificates', icon: Award, label: 'الشهادات' },
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
      { href: '/dashboard/caisse', key: 'caisse', icon: Building2, label: 'صندوقي' },
      { href: '/dashboard/caisse/transfers', key: 'transfers', icon: Send, label: 'التحويلات' },
    ],
  },
]

const secretarySettingsItems = [
  { href: '/dashboard/notifications', key: 'notifications', icon: Bell, label: 'الإشعارات' },
]

// ═══════════════════════════════════════════════════
// Build sections helper
// ═══════════════════════════════════════════════════
function buildSections(isSecretaire: boolean) {
  if (isSecretaire) {
    return [
      ...secretaryMenuSections,
      { title: 'MON COMPTE', items: secretarySettingsItems },
    ]
  }
  return [
    ...adminMenuSections,
    { title: 'PARAMÈTRES', items: adminSettingsItems },
  ]
}

const DEFAULT_OPEN: Record<string, boolean> = {
  PRINCIPAL: true,
  SCOLARITÉ: true,
  FINANCE: true,
  PARAMÈTRES: false,
  'MON COMPTE': true,
}

const STORAGE_KEY_ADMIN = 'dashboard_menu_sections_admin'
const STORAGE_KEY_SECR = 'dashboard_menu_sections_secr'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t } = useLanguage()

  const [userEmail, setUserEmail] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [assistanceName, setAssistanceName] = useState<string | null>(null)
  const [roleName, setRoleName] = useState<string | null>(null)

  // ─── Mobile drawer state ───
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isSecretaire = (roleName || '').toLowerCase().includes('secr')

  const allSections = buildSections(isSecretaire)
  const storageKey = isSecretaire ? STORAGE_KEY_SECR : STORAGE_KEY_ADMIN

  // ─── Menu sections state ───
  const [openSections, setOpenSections] =
    useState<Record<string, boolean>>(DEFAULT_OPEN)
  const prevActiveRef = useRef<string | null>(null)

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // ═══ Mobile drawer: close on route change ═══
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // ═══ Mobile drawer: lock body scroll when open ═══
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // ─── Load saved sections state ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setOpenSections({ ...DEFAULT_OPEN, ...parsed })
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  // ─── Auto-open section containing active page ───
  useEffect(() => {
    const activeSection = allSections.find((sec) =>
      sec.items.some((item) => {
        if (item.href === '/dashboard/secretary' || item.href === '/dashboard') {
          return pathname === item.href
        }
        return pathname.startsWith(item.href)
      }),
    )
    if (activeSection && activeSection.title !== prevActiveRef.current) {
      prevActiveRef.current = activeSection.title
      setOpenSections((prev) => {
        if (prev[activeSection.title]) return prev
        const next = { ...prev, [activeSection.title]: true }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {}
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // ─── Toggle section ───
  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [title]: !prev[title] }
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Close bell outside
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

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          router.push('/login')
          return
        }
        setUserEmail(user.email || '')

        loadNotifications(user.id)

        // Fetch profile + role name (query séparée pour roles)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('establishment_id, role_id')
          .eq('user_id', user.id)
          .maybeSingle()

        // Get role name via separate query (avoid JOIN FK issues)
        let rName = ''
        if (profile?.role_id) {
          const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', profile.role_id)
            .maybeSingle()
          rName = roleData?.name || ''
        }
        setRoleName(rName)

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

        if (profile?.establishment_id) {
          const { data: est } = await supabase
            .from('establishments')
            .select('name')
            .eq('id', profile.establishment_id)
            .single()
          if (est) setSchoolName(est.name)
        }
      })
      .catch((e) => {
        console.error('[dashboard-layout]', e?.message || e)
      })
  }, [pathname, router])

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
    sessionStorage.removeItem('assistance_establishment_id')
    sessionStorage.removeItem('assistance_return_path')
    router.push('/login')
    router.refresh()
  }

  const exitAssistance = () => {
    const returnPath =
      sessionStorage.getItem('assistance_return_path') ||
      '/dashboard/admin/establishments'
    sessionStorage.removeItem('assistance_establishment_id')
    sessionStorage.removeItem('assistance_return_path')
    setAssistanceName(null)
    router.push(returnPath)
    router.refresh()
  }

  const displayName = assistanceName || schoolName

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/dashboard/secretary') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const sectionHasActive = (items: any[]) =>
    items.some((item) => {
      if (item.href === '/dashboard' || item.href === '/dashboard/secretary') {
        return pathname === item.href
      }
      return pathname.startsWith(item.href)
    })

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'دابا'
    if (diff < 3600) return `${Math.floor(diff / 60)} د`
    if (diff < 86400) return `${Math.floor(diff / 3600)} س`
    return `${Math.floor(diff / 86400)} ي`
  }
  // ═══ Colors based on role ═══
  const sidebarBg = isSecretaire ? 'bg-[#3b0764]' : 'bg-[#0b2f35]'
  const accentBg = isSecretaire ? 'bg-violet-400' : 'bg-emerald-400'
  const accentText = isSecretaire ? 'text-[#3b0764]' : 'text-[#0b2f35]'
  const accentTextLight = isSecretaire ? 'text-violet-200' : 'text-emerald-200'
  const accentTextMuted = isSecretaire ? 'text-violet-300/60' : 'text-emerald-300/60'
  const accentTextHover = isSecretaire ? 'hover:text-violet-300' : 'hover:text-emerald-300'
  const accentDot = isSecretaire ? 'bg-violet-400' : 'bg-emerald-400'
  const accentActiveBg = isSecretaire ? '#a78bfa' : '#34d399'
  const accentActiveText = isSecretaire ? '#2e1065' : '#082c27'
  const accentShadow = isSecretaire
    ? 'shadow-violet-950/30'
    : 'shadow-emerald-950/20'
  const headerAccentText = isSecretaire ? 'text-violet-700' : 'text-emerald-700'
  const avatarBg = isSecretaire
    ? 'bg-violet-100 text-violet-800'
    : 'bg-emerald-100 text-emerald-800'
  const roleLabel = isSecretaire ? 'فضاء السكرتيرة' : t('administrationSpace')

  // ═══════════════════════════════════════════════════
  // Sidebar content (shared between desktop + mobile drawer)
  // ═══════════════════════════════════════════════════
  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${accentBg} ${accentText}`}
          >
            <School className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-extrabold">
              {displayName || t('school')}
            </p>
            <p className={`mt-0.5 text-xs ${accentTextLight}`}>{roleLabel}</p>
          </div>
        </div>
        <p className="mt-5 truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
          {userEmail}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {allSections.map((section) => {
          const isOpen = openSections[section.title] ?? false
          const hasActive = sectionHasActive(section.items)

          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] ${accentTextMuted} ${accentTextHover} transition`}
              >
                <span className="flex items-center gap-2">
                  {section.title}
                  {hasActive && !isOpen && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${accentDot} animate-pulse`}
                    />
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`space-y-0.5 overflow-hidden transition-all duration-300 ${
                  isOpen
                    ? 'max-h-[800px] opacity-100 mt-1'
                    : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={
                        active
                          ? {
                              backgroundColor: accentActiveBg,
                              color: accentActiveText,
                            }
                          : undefined
                      }
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                        active
                          ? `shadow-lg ${accentShadow}`
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <Link
          href="/dashboard/profile"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
            isActive('/dashboard/profile')
              ? `${accentBg} ${accentText} font-bold shadow-lg ${accentShadow}`
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
    </>
  )

  return (
    <div className="app-shell flex min-h-screen flex-col">
      {assistanceName && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold">
              وضع المساعدة — أنت الآن تتصفح:{' '}
              <strong className="underline">{assistanceName}</strong>
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
        {/* ═══ DESKTOP SIDEBAR ═══ */}
        <aside
          className={`hidden w-[280px] flex-shrink-0 flex-col ${sidebarBg} text-white lg:flex`}
        >
          {sidebarContent}
        </aside>

        {/* ═══ MOBILE DRAWER ═══ */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Drawer panel */}
            <aside
              className={`absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col ${sidebarBg} text-white shadow-2xl animate-in slide-in-from-right duration-300`}
            >
              {/* Close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute left-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20"
                aria-label="إغلاق القائمة"
              >
                <X className="h-5 w-5" />
              </button>

              {sidebarContent}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f8fc]/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
              {/* ═══ Mobile: Burger + Logo ═══ */}
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
                  aria-label="فتح القائمة"
                >
                  <Menu className="h-5 w-5 text-slate-700" />
                </button>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${sidebarBg} ${accentTextLight}`}
                >
                  <School className="h-5 w-5" />
                </span>
                <span className="max-w-[140px] truncate font-bold">
                  {displayName || t('school')}
                </span>
              </div>

              {/* ═══ Desktop: Header text ═══ */}
              <div className="hidden lg:block">
                <p
                  className={`text-xs font-bold uppercase tracking-[.14em] ${headerAccentText}`}
                >
                  {isSecretaire ? 'ESPACE SECRÉTAIRE' : t('schoolManagement')}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isSecretaire
                    ? 'الفضاء الإداري'
                    : t('schoolManagementSubtitle')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* BELL */}
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
                            <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل
                            كمقروء
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
                  <strong className="block text-sm text-slate-700">
                    {displayName || t('school')}
                  </strong>
                  {userEmail}
                </span>
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full font-bold ${avatarBg}`}
                >
                  {(displayName || 'E').slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mobile quick nav (horizontal scroll) */}
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {allSections[0].items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={
                      active
                        ? {
                            backgroundColor: isSecretaire ? '#0e7490' : '#047857',
                            color: '#ffffff',
                          }
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

          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}