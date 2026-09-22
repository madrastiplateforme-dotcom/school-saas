'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Clock, LogOut, CheckCircle2, MessageSquare, GraduationCap,
  Mail, ArrowLeft, Sparkles, Home, ChevronDown, HelpCircle,
  ShieldCheck, Zap, Phone, Send,
} from 'lucide-react'

// ============ CONFIG ============
const BRAND_AR = 'مدرستي'
const BRAND_FR = 'Madrasti'
const SUPPORT_EMAIL = 'madrasti.plateforme@gmail.com'
const WHATSAPP_NUMBER = '212667229222'
const WHATSAPP_DISPLAY = '+212 6 67 22 92 22'
const SITE_URL = 'https://madrasti.win'

// ============ STEPS CONFIG ============
const STEPS = [
  { key: 'received', labelAr: 'تم استلام الطلب', labelFr: 'Demande reçue' },
  { key: 'review',   labelAr: 'قيد المراجعة',     labelFr: 'En cours' },
  { key: 'activate', labelAr: 'التفعيل',           labelFr: 'Activation' },
] as const

export default function PendingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [ready, setReady] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setReady(true)
    })
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const waMessage = encodeURIComponent(
    'السلام عليكم، سجلت في منصة مدرستي وأريد معلومات عن حالة حسابي.'
  )
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b2f35] p-5">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
          <p className="text-sm text-slate-300">جارٍ التحميل...</p>
        </div>
      </main>
    )
  }

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#0b2f35] text-white">
      {/* ============ BACKGROUND GRADIENTS ============ */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, #1b8c77 0, transparent 35%), radial-gradient(circle at 85% 15%, #e9a63a55 0, transparent 30%), radial-gradient(circle at 50% 90%, #0b4c42 0, transparent 40%)',
        }}
      />

      {/* ============ KEYFRAMES ============ */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(.9); opacity: .7; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes progress-slide {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .anim-fade-up { animation: fade-in-up .7s cubic-bezier(.2,.7,.3,1) both; }
        .anim-scale { animation: scale-in .5s cubic-bezier(.2,.7,.3,1) both; }
        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          border: 2px solid currentColor;
          animation: pulse-ring 2.4s cubic-bezier(.2,.7,.3,1) infinite;
        }
        .progress-shine {
          background: linear-gradient(90deg, #10b981 0%, #6ee7b7 50%, #10b981 100%);
          background-size: 200% 100%;
          animation: progress-slide 2.5s linear infinite;
        }
      `}</style>

      {/* ============ TOP NAV — BACK TO HOME ============ */}
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35] shadow-lg shadow-emerald-950/20 transition group-hover:scale-110">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight text-white">{BRAND_AR}</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/15"
        >
          <Home className="h-3.5 w-3.5" />
          الرئيسية
        </Link>
      </header>

      {/* ============ MAIN CARD ============ */}
      <div className="relative z-10 mx-auto max-w-2xl px-5 pb-16 lg:px-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/95 shadow-2xl backdrop-blur-xl anim-scale">
          {/* Header band */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0b4c42] to-[#0b2f35] px-7 pb-8 pt-9 text-center sm:px-10 sm:pt-11">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, #10b98188 0, transparent 40%), radial-gradient(circle at 80% 20%, #f59e0b44 0, transparent 35%)',
              }}
            />
            <div className="relative">
              <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-amber-600 pulse-ring anim-fade-up">
                <Clock className="h-10 w-10" />
              </div>

              <h1 className="mt-5 text-2xl font-black leading-tight text-white sm:text-3xl anim-fade-up" style={{ animationDelay: '100ms' }}>
                ⏳ حسابك قيد المراجعة
              </h1>
              <p className="mt-2 text-sm text-emerald-200/90 anim-fade-up" style={{ animationDelay: '180ms' }}>
                Compte en attente de validation
              </p>

              {/* ETA badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-bold text-emerald-200 anim-fade-up" style={{ animationDelay: '260ms' }}>
                <Zap className="h-3.5 w-3.5" />
                عادةً أقل من 24 ساعة
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-8 text-right sm:px-10">
            {/* Message AR */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 anim-fade-up" style={{ animationDelay: '300ms' }}>
              <p className="text-sm font-bold leading-8 text-emerald-950">
                شكراً لتسجيلك في منصة <strong>{BRAND_AR}</strong> 🎉
              </p>
              <p className="mt-2 text-sm leading-8 text-emerald-900/90">
                تم استلام طلبك بنجاح. سيتواصل معك فريقنا في أقرب وقت لتفعيل حسابك
                ومرافقتك في إعداد مؤسستك.
              </p>
            </div>

            {/* Message FR */}
            <div dir="ltr" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-left anim-fade-up" style={{ animationDelay: '360ms' }}>
              <p className="text-sm font-bold leading-7 text-slate-800">
                Merci pour votre inscription sur <strong>{BRAND_FR}</strong> 🎉
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Votre demande a été reçue. Notre équipe vous contactera prochainement
                pour activer votre compte et vous accompagner dans la configuration.
              </p>
            </div>

            {/* ============ PROGRESS BAR ============ */}
            <div className="mt-8 anim-fade-up" style={{ animationDelay: '420ms' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">حالة الطلب</p>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  66% · قيد المراجعة
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="progress-shine h-full w-2/3 rounded-full" />
              </div>

              {/* Steps */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {STEPS.map((step, i) => {
                  const isDone = i === 0
                  const isActive = i === 1
                  const isPending = i === 2
                  return (
                    <div
                      key={step.key}
                      className={`rounded-xl border p-3 text-center transition ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50/80'
                          : isActive
                          ? 'border-amber-200 bg-amber-50/80 ring-2 ring-amber-200'
                          : 'border-slate-200 bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex justify-center">
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : isActive ? (
                          <div className="relative">
                            <Clock className="h-5 w-5 text-amber-600" />
                          </div>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <p className={`mt-1.5 text-[11px] font-bold leading-tight ${
                        isDone ? 'text-emerald-800' : isActive ? 'text-amber-800' : 'text-slate-500'
                      }`}>
                        {step.labelAr}
                      </p>
                      <p className="text-[9px] leading-tight text-slate-400 mt-0.5" dir="ltr">
                        {step.labelFr}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ============ SUPPORT CARD — WHATSAPP ============ */}
            <div className="mt-8 anim-fade-up" style={{ animationDelay: '480ms' }}>
              <p className="mb-3 text-xs font-bold text-slate-700">تحتاج مساعدة؟</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* WhatsApp */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-4 transition hover:-translate-y-0.5 hover:border-[#25D366] hover:bg-[#25D366]/10 hover:shadow-lg"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">واتساب مباشر</p>
                    <p className="truncate text-xs text-slate-500" dir="ltr">{WHATSAPP_DISPLAY}</p>
                  </div>
                  <Send className="h-4 w-4 shrink-0 text-[#25D366] transition group-hover:translate-x-0.5" />
                </a>

                {/* Email */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('استفسار عن تفعيل الحساب')}`}
                  className="group flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-lg"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">البريد الإلكتروني</p>
                    <p className="truncate text-xs text-slate-500" dir="ltr">{SUPPORT_EMAIL}</p>
                  </div>
                  <Send className="h-4 w-4 shrink-0 text-indigo-500 transition group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>

            {/* ============ FAQ MINI ============ */}
            <div className="mt-8 anim-fade-up" style={{ animationDelay: '540ms' }}>
              <div className="mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-bold text-slate-700">أسئلة شائعة</p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    q: 'علاش حسابي قيد المراجعة؟',
                    a: 'بعد التسجيل، يقوم فريقنا بالتحقق من معطيات مؤسستك قبل التفعيل — هادشي باش نضمنوا جودة الخدمة وأمان البيانات.',
                  },
                  {
                    q: 'شحال خاصني نتسنى؟',
                    a: 'عادةً أقل من 24 ساعة. فحالة الضغط، يمكن توصل لـ 48 ساعة كحد أقصى. غادي تتوصل بإيميل فور تفعيل حسابك.',
                  },
                  {
                    q: 'واش يمكن نبدل المعلومات من بعد؟',
                    a: 'أكيد، من بعد التفعيل يمكن ليك تعدّل معطيات مؤسستك، الإعدادات، والموظفين من لوحة التحكم.',
                  },
                ].map((item, i) => {
                  const isOpen = openFaq === i
                  return (
                    <div
                      key={i}
                      className={`overflow-hidden rounded-xl border transition ${
                        isOpen ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="flex w-full items-center justify-between gap-3 p-3.5 text-right text-sm font-bold text-slate-800 transition hover:text-emerald-700"
                      >
                        <span className="flex-1">{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${
                            isOpen ? 'rotate-180 text-emerald-600' : ''
                          }`}
                        />
                      </button>
                      <div
                        className="grid transition-all duration-300 ease-out"
                        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <p className="px-3.5 pb-3.5 text-xs leading-7 text-slate-600">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ============ ACTIONS ============ */}
            <div className="mt-8 space-y-3 anim-fade-up" style={{ animationDelay: '600ms' }}>
              <Link
                href="/"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة إلى الرئيسية</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل الخروج / Déconnexion</span>
              </button>
            </div>

            {/* Security footer */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                مطابق للقانون 09-08
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                {BRAND_AR} · {BRAND_FR}
              </span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[11px] text-white/50">
          © {new Date().getFullYear()} {BRAND_AR} · <span dir="ltr">{SITE_URL.replace('https://', '')}</span>
        </p>
      </div>
    </main>
  )
}