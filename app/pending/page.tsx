'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Clock, LogOut, CheckCircle2, MessageCircle } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50 flex items-center justify-center p-5">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
            ⏳ حسابك قيد المراجعة
          </h1>
          <p className="text-slate-500 mb-6">
            Compte en attente de validation
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-right">
            <p className="text-amber-900 leading-8 text-sm">
              <strong>📌 شكراً لتسجيلك في منصة "GestionEco"!</strong>
              <br />
              تم استلام طلبك بنجاح. سيتواصل معك فريقنا في أقرب وقت لتفعيل حسابك والبدء في استخدام المنصة.
              <br />
              <span dir="ltr" className="block mt-3 text-left text-amber-800">
                <strong>📌 Merci pour votre inscription sur "GestionEco"!</strong>
                <br />
                Votre demande a été reçue. Notre équipe vous contactera prochainement pour activer votre compte.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-sm">
            <div className="bg-emerald-50 rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-800 font-medium">تم استلام الطلب</p>
              <p className="text-xs text-emerald-600 mt-1">Demande reçue</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 ring-2 ring-amber-300">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              <p className="text-amber-800 font-medium">قيد المراجعة</p>
              <p className="text-xs text-amber-600 mt-1">En cours</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 opacity-50">
              <CheckCircle2 className="h-5 w-5 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">التفعيل</p>
              <p className="text-xs text-slate-400 mt-1">Activation</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full h-12 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج / Déconnexion
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            للاستفسار: support@gestioneco.ma
          </p>
        </div>
      </div>
    </main>
  )
}