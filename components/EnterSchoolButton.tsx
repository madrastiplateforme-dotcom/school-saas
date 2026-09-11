'use client'

import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'

export default function EnterSchoolButton({
  schoolId,
  schoolName,
}: {
  schoolId: string
  schoolName: string
}) {
  const router = useRouter()

  const enterSchool = () => {
    // ✅ نضع معرف المؤسسة في sessionStorage
    sessionStorage.setItem('assistance_establishment_id', schoolId)
    // ✅ ننتقل إلى dashboard
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <button
      onClick={enterSchool}
      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
      title={`دخول إلى ${schoolName}`}
    >
      <LogIn className="h-3.5 w-3.5" />
      دخول
    </button>
  )
}