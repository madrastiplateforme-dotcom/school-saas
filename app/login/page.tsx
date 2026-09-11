'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useSettings } from '@/lib/SettingsContext'

export default function Login() {
  const router = useRouter()
  const settings = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const platformName = settings.platform_name || 'مدرستي'

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      setLoading(false)
      return
    }

    // 1. Jib l'user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('خطأ في تسجيل الدخول')
      setLoading(false)
      return
    }

    // 2. Super Admin ?
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminData) {
      router.push('/admin')
      router.refresh()
      return
    }

    // 3. Role mn user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single()

    const roleName = ((profile?.roles as any)?.name || '').toLowerCase()

    if (roleName.includes('secr')) {
      router.push('/dashboard/secretary')
    } else if (roleName.includes('parent')) {
      router.push('/parent/dashboard')
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <main dir="rtl" className="grid min-h-screen bg-[#f6f8fc] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#0b2f35] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/15" />
        <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-amber-300/10" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35]">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-xl font-black">{platformName}</span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-sm font-bold text-emerald-300">إدارة مدرسية أسهل</p>
          <h1 className="mt-4 text-5xl font-black leading-tight">كل تفاصيل مؤسستك، في مكان واحد.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-200">
            تابع التسجيلات، الأداءات، والمصاريف بمنصة منظمة وسهلة لفريق الإدارة.
          </p>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-slate-300">
          <ShieldCheck className="h-5 w-5 text-emerald-300" /> مساحة خاصة وآمنة لمؤسستك
        </p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2 text-sm font-bold text-emerald-700 lg:hidden">
            <GraduationCap className="h-5 w-5" />
            {platformName}
          </Link>
          <div>
            <p className="page-kicker">مرحباً بعودتك</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">تسجيل الدخول</h2>
            <p className="mt-2 text-slate-500">أدخل معلوماتك للوصول إلى فضاء المؤسسة.</p>
          </div>
          <form onSubmit={handleLogin} className="surface-card mt-8 space-y-5 p-6 sm:p-8">
            <label className="block text-sm font-bold text-slate-700">
              البريد الإلكتروني
              <div className="relative mt-2">
                <Mail className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  className="auth-input pr-11"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.ma"
                />
              </div>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              كلمة المرور
              <div className="relative mt-2">
                <LockKeyhole className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  className="auth-input pr-11"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </label>
            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-brand w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> جارٍ الدخول…
                </>
              ) : (
                <>
                  دخول إلى المنصة <ArrowLeft className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="font-bold text-emerald-700 hover:text-emerald-900">
              سجّل مؤسستك
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}