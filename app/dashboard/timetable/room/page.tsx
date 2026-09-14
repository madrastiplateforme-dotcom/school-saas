'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEstablishmentId } from '@/lib/useEstablishmentId'
import { useUserRole } from '@/lib/useUserRole'
import {
  DoorOpen, RefreshCw, ArrowLeft, Search, Clock, AlertTriangle,
} from 'lucide-react'

type RoomStat = {
  name: string
  lessons_count: number
  classes: Set<string>
}

export default function RoomsListPage() {
  const establishmentId = useEstablishmentId()
  const { role, loading: roleLoading } = useUserRole()
  const isDirector = role === 'directeur'

  const [rooms, setRooms] = useState<RoomStat[]>([])
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!establishmentId || !role) return
    loadData()
  }, [establishmentId, role])

  const loadData = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: years } = await supabase
      .from('academic_years')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('is_current', true)
      .maybeSingle()

    if (!years?.id) {
      setError('ما كايناش سنة دراسية حالية')
      setLoading(false)
      return
    }

    const { data: tt } = await supabase
      .from('timetables')
      .select('room, class_id, classes(name)')
      .eq('establishment_id', establishmentId)
      .eq('academic_year_id', years.id)

    const map = new Map<string, RoomStat>()
    let unassigned = 0

    ;(tt || []).forEach((t: any) => {
      if (!t.room || !t.room.trim()) {
        unassigned++
        return
      }
      const key = t.room.trim()
      if (!map.has(key)) map.set(key, { name: key, lessons_count: 0, classes: new Set() })
      const r = map.get(key)!
      r.lessons_count++
      r.classes.add(t.classes?.name || '—')
    })

    setRooms(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar')))
    setUnassignedCount(unassigned)
    setLoading(false)
  }

  if (loading || roleLoading) return <div className="p-6 text-center">Chargement...</div>
  if (!isDirector) return <div className="p-6">ليس لديك صلاحية</div>

  const filtered = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/timetable" className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DoorOpen className="h-6 w-6 text-indigo-600" />
              القاعات
            </h1>
            <p className="text-sm text-gray-500 mt-1">جدول الحصص حسب القاعة</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="relative">
        <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن قاعة..."
          className="w-full h-11 pr-11 pl-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 && unassignedCount === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
          <DoorOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">لا توجد قاعات</p>
          <p className="text-sm text-slate-400 mt-2">زد القاعات ف الجداول باش تبان هنا</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <Link
              key={r.name}
              href={`/dashboard/timetable/room/${encodeURIComponent(r.name)}`}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center shadow-sm">
                  <DoorOpen className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 bg-cyan-50 px-2 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  {r.lessons_count} حصة
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg truncate">{r.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {r.classes.size} قسم مختلف
              </p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-cyan-600 font-medium group-hover:gap-3 transition-all">
                <span>عرض الجدول</span>
                <ArrowLeft className="h-4 w-4" />
              </div>
            </Link>
          ))}

          {unassignedCount > 0 && (
            <Link
              href="/dashboard/timetable/room/__none__"
              className="group bg-amber-50 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  {unassignedCount} حصة
                </span>
              </div>
              <h3 className="font-bold text-amber-900 text-lg">بدون قاعة</h3>
              <p className="text-sm text-amber-700 mt-0.5">حصة ماشي معطيتها قاعة</p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-amber-700 font-medium group-hover:gap-3 transition-all">
                <span>عرض</span>
                <ArrowLeft className="h-4 w-4" />
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}