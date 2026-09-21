'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  ScrollText,
  Settings,
  X,
} from 'lucide-react'

const menuItems = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/establishments', label: 'Établissements', icon: Building2 },
  { href: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
  { href: '/admin/audit-logs', label: 'Journal d’activité', icon: ScrollText },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)
        .then(({ count }) => setNotificationsCount(count || 0))
    })
  }, [router])

  // ═══ Close drawer on route change ═══
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // ═══ Lock body scroll when drawer open ═══
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

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // ═══ Sidebar content (shared desktop + mobile) ═══
  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-[#102a43]">
            <School className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold">مدرستي</p>
            <p className="text-xs text-amber-200">Platform control center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">
          Plateforme
        </p>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              pathname === item.href
                ? 'bg-amber-400 text-[#102a43]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.href === '/admin/notifications' && notificationsCount > 0 && (
              <span className="mr-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                {notificationsCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <div className="app-shell flex min-h-screen">
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden w-[280px] flex-shrink-0 flex-col bg-[#102a43] text-white lg:flex">
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer panel */}
          <aside className="absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col bg-[#102a43] text-white shadow-2xl">
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
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[#f6f8fc]/90 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            {/* Burger (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100 lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>

            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#102a43] text-amber-300 lg:hidden">
              <School className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">
                Administration SaaS
              </p>
              <p className="text-sm text-slate-500">
                Pilotage global de la plateforme
              </p>
            </div>
          </div>

          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            Super admin
          </span>
        </header>

        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}