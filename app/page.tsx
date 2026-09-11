import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronLeft,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'

const features = [
  { icon: Users, title: 'إدارة التلاميذ والأسر', text: 'ملفات منظمة، تسجيل سريع، ومتابعة واضحة لكل أسرة.' },
  { icon: Wallet, title: 'مالية تحت السيطرة', text: 'أقساط، دفعات، مصاريف، وصندوق في مكان واحد.' },
  { icon: BarChart3, title: 'قرارات مبنية على الأرقام', text: 'لوحة قيادة وتقارير عملية لمعرفة وضع المؤسسة فوراً.' },
]

const plans = [
  { name: 'تجريبية', price: '0', description: 'لاكتشاف المنصة', items: ['حتى 50 تلميذاً', 'الوظائف الأساسية', 'دعم عبر البريد'] },
  { name: 'أساسية', price: '250', description: 'للمدارس النامية', items: ['حتى 200 تلميذ', 'تقارير مالية', 'إدارة الأقساط', 'دعم بالأولوية'], featured: true },
  { name: 'احترافية', price: '600', description: 'للمؤسسات الكبيرة', items: ['عدد تلاميذ غير محدود', 'تقارير مخصصة', 'دعم متعدد المدارس'] },
]

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#fbfcfe] text-[#102a43]">
      <div className="relative isolate bg-[#0b2f35] text-white">
        <div className="absolute inset-0 -z-10 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #1b8c77 0, transparent 28%), radial-gradient(circle at 88% 12%, #e9a63a55 0, transparent 23%)' }} />
        <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35] shadow-lg shadow-emerald-950/20"><GraduationCap className="h-6 w-6" /></span>
            <span className="text-xl font-black tracking-tight">مدرستي</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
            <a className="transition hover:text-white" href="#features">المميزات</a>
            <a className="transition hover:text-white" href="#pricing">الأسعار</a>
            <Link className="transition hover:text-white" href="/login">تسجيل الدخول</Link>
          </nav>
          <Link href="/register" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b4c42] transition hover:-translate-y-0.5 hover:bg-emerald-50">ابدأ مجاناً</Link>
        </header>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-14 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-32 lg:pt-20">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100"><Sparkles className="h-4 w-4" /> منصة عصرية للمدارس الخاصة بالمغرب</p>
            <h1 className="text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">تسيير مدرستك،<br /><span className="text-emerald-300">بوضوح وراحة بال.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">كل ما تحتاجه الإدارة في مساحة واحدة: التلاميذ، التسجيل، الأقساط، الصندوق، والتقارير.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="btn-brand bg-emerald-400 px-6 py-3.5 text-[#083a33] shadow-emerald-950/25 hover:bg-emerald-300"><span>أنشئ حساب مؤسستك</span><ArrowLeft className="h-4 w-4" /></Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-bold transition hover:bg-white/10">الدخول إلى المنصة</Link>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> بيانات منظّمة وآمنة</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> تجربة مجانية</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md self-center">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-emerald-400/15 blur-2xl" />
            <div className="rounded-[1.75rem] border border-white/15 bg-white/95 p-4 text-[#102a43] shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div><p className="text-xs font-bold text-emerald-700">نظرة سريعة</p><p className="mt-1 text-lg font-extrabold">ملخص المؤسسة</p></div>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><BarChart3 className="h-5 w-5" /></span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="التلاميذ النشطون" value="248" tone="bg-emerald-50 text-emerald-700" />
                <Metric label="مداخيل هذا الشهر" value="48 500 DH" tone="bg-amber-50 text-amber-700" />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between text-sm"><span className="font-bold">حالة التحصيل</span><span className="text-emerald-700">+12.5%</span></div>
                <div className="flex h-24 items-end gap-2">{[38, 58, 46, 76, 63, 92, 82].map((height, i) => <span key={i} className="flex-1 rounded-t-md bg-emerald-600/80" style={{ height: `${height}%` }} />)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-xl"><p className="page-kicker">كل شيء تحت السيطرة</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">من التسجيل إلى آخر دفعة.</h2><p className="mt-4 leading-7 text-slate-500">واجهة بسيطة لفريق الإدارة، ومعلومات دقيقة تساعدك على اتخاذ القرار بسرعة.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="surface-card group p-7 transition duration-200 hover:-translate-y-1 hover:shadow-xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span><h3 className="mt-6 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-slate-500">{text}</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">اكتشف المزيد <ChevronLeft className="h-4 w-4" /></span></article>)}
        </div>
      </section>

      <section id="pricing" className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="text-center"><p className="page-kicker">أسعار واضحة</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">خطة تناسب حجم مؤسستك</h2></div><div className="mt-11 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`relative rounded-[1.35rem] border p-7 ${plan.featured ? 'border-emerald-600 bg-[#0b4c42] text-white shadow-xl shadow-emerald-900/20' : 'border-slate-200 bg-white'}`}>
          {plan.featured && <span className="absolute -top-3 right-6 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">الأكثر اختياراً</span>}
          <p className={`font-bold ${plan.featured ? 'text-emerald-200' : 'text-emerald-700'}`}>{plan.name}</p><p className="mt-2 text-sm text-slate-400">{plan.description}</p><div className="mt-6 flex items-end gap-1"><span className="text-4xl font-black">{plan.price}</span><span className={`mb-1 text-sm ${plan.featured ? 'text-emerald-100' : 'text-slate-500'}`}>درهم / شهر</span></div>
          <ul className="mt-7 space-y-3">{plan.items.map((item) => <li key={item} className={`flex items-center gap-2 text-sm ${plan.featured ? 'text-white/90' : 'text-slate-600'}`}><Check className="h-4 w-4 text-emerald-400" />{item}</li>)}</ul>
          <Link href="/register" className={`mt-8 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${plan.featured ? 'bg-white text-[#0b4c42] hover:bg-emerald-50' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>اختيار الخطة</Link>
        </article>)}</div></div>
      </section>

      <footer className="bg-[#0b2f35] py-8 text-center text-sm text-slate-300"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 sm:flex-row lg:px-8"><span className="flex items-center gap-2 font-bold text-white"><GraduationCap className="h-5 w-5 text-emerald-300" />مدرستي</span><span>منصة لتسيير المدارس الخاصة</span><span>© {new Date().getFullYear()} مدرستي</span></div></footer>
    </main>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`rounded-2xl p-4 ${tone}`}><p className="text-xs font-medium opacity-75">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>
}
