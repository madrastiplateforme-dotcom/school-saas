'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2, LockKeyhole, Mail, Phone, School } from 'lucide-react'

export default function Register() {
  const router = useRouter()
  const [schoolName, setSchoolName] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين / Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, schoolPhone, email, password, directorName: '' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'حدث خطأ')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = 'auth-input pr-11'

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f8fc] px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b2f35] text-emerald-300">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-xl font-black text-[#102a43]">مدرستي</span>
          </Link>
          <Link href="/login" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">
            لديك حساب؟ تسجيل الدخول
          </Link>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <aside className="rounded-[1.5rem] bg-[#0b4c42] p-8 text-white">
            <p className="text-sm font-bold text-emerald-200">ابدأ اليوم</p>
            <h1 className="mt-3 text-3xl font-black leading-tight">أنشئ فضاء مؤسستك في دقائق.</h1>
            <p className="mt-4 leading-7 text-emerald-50/85">
              جمعنا الأدوات اليومية للإدارة في واجهة واحدة سهلة الاستعمال.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {['إدارة التلاميذ والأسر', 'الأقساط والدفعات والمصاريف', 'لوحة قيادة وتقارير مالية'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <section>
            <p className="page-kicker">طلب الانضمام</p>
            <h2 className="mt-3 text-3xl font-black text-[#102a43]">سجّل مؤسستك</h2>
            <p className="mt-2 text-slate-500">أدخل معلوماتك الأساسية، وسنقوم بتفعيل حسابك.</p>

            <div className="surface-card mt-6 p-6 sm:p-8">
              {success ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-800">✅ تم إرسال طلبك بنجاح</h3>
                  <p className="text-sm text-emerald-700 font-medium" dir="ltr">
                    ✅ Votre demande a été envoyée avec succès
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right space-y-2">
                    <p className="text-sm text-amber-900 leading-7">
                      <strong>📌 ملاحظة مهمة:</strong>
                      <br />
                      سيتواصل معك صاحب المنصة في أقرب وقت لتفعيل مؤسستك.
                    </p>
                    <p className="text-sm text-amber-900 leading-7" dir="ltr">
                      <strong>📌 Note importante:</strong>
                      <br />
                      Le propriétaire de la plateforme vous contactera prochainement pour activer votre établissement.
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Link
                      href="/login"
                      className="block w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-center"
                    >
                      الذهاب إلى صفحة الدخول / Aller à la connexion
                    </Link>
                    <p className="text-xs text-slate-500">
                      يمكنك تسجيل الدخول الآن، وستظهر لك رسالة "قيد المراجعة"
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="grid gap-5 sm:grid-cols-2">
                  <Field label="اسم المؤسسة" icon={School}>
                    <input
                      className={fieldClass}
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="مدرسة النور الخاصة"
                    />
                  </Field>
                  <Field label="هاتف المؤسسة" icon={Phone}>
                    <input
                      className={fieldClass}
                      type="tel"
                      required
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      placeholder="06 XX XX XX XX"
                    />
                  </Field>
                  <Field label="البريد الإلكتروني" icon={Mail}>
                    <input
                      className={fieldClass}
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@school.ma"
                    />
                  </Field>
                  <Field label="كلمة المرور" icon={LockKeyhole}>
                    <input
                      className={fieldClass}
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="تأكيد كلمة المرور" icon={LockKeyhole}>
                      <input
                        className={fieldClass}
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                      />
                    </Field>
                  </div>

                  {error && (
                    <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand sm:col-span-2 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> جارٍ إنشاء الحساب…
                      </>
                    ) : (
                      <>
                        إنشاء حساب المؤسسة <ArrowLeft className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof School
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="relative mt-2 block">
        <Icon className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
        {children}
      </span>
    </label>
  )
}