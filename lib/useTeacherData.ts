// lib/useTeacherData.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type TeacherClass = {
  id: string
  name: string
  level_id: string | null
  level_name: string | null
  subjects: { id: string; name: string }[]
}

export type TeacherData = {
  staffId: string | null
  establishmentId: string | null
  classes: TeacherClass[]
  totalStudents: number
}

export async function fetchTeacherData(
  supabase: SupabaseClient,
  userId: string,
): Promise<TeacherData> {
  // 1) Profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('establishment_id')
    .eq('user_id', userId)
    .maybeSingle()

  const establishmentId = profile?.establishment_id || null

  // 2) Staff
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!staffRow?.id) {
    return { staffId: null, establishmentId, classes: [], totalStudents: 0 }
  }

  const staffId = staffRow.id

  // 3) teacher_subjects — SANS JOIN
  const { data: ts } = await supabase
    .from('teacher_subjects')
    .select('subject_id, level_id')
    .eq('teacher_id', staffId)

  if (!ts || ts.length === 0) {
    return { staffId, establishmentId, classes: [], totalStudents: 0 }
  }

  const levelIds = Array.from(
    new Set(ts.map((r: any) => r.level_id).filter(Boolean)),
  )
  const subjectIds = Array.from(
    new Set(ts.map((r: any) => r.subject_id).filter(Boolean)),
  )

  if (levelIds.length === 0) {
    return { staffId, establishmentId, classes: [], totalStudents: 0 }
  }

  // 4) Subjects — query منفصل
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds)

  const subjectsMap = new Map<string, string>()
  ;(subjectsData || []).forEach((s: any) => subjectsMap.set(s.id, s.name))

  // 5) Classes — SANS JOIN على levels
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, level_id')
    .in('level_id', levelIds)

  // 6) Levels — query منفصل
  const { data: levelsData } = await supabase
    .from('levels')
    .select('id, name')
    .in('id', levelIds)

  const levelsMap = new Map<string, string>()
  ;(levelsData || []).forEach((l: any) => levelsMap.set(l.id, l.name))

  // 7) Merge
  const teacherClasses: TeacherClass[] = (classes || []).map((c: any) => {
    const seen = new Set<string>()
    const uniqueSubjects = ts
      .filter((t: any) => t.level_id === c.level_id)
      .map((t: any) => ({
        id: t.subject_id,
        name: subjectsMap.get(t.subject_id) || '—',
      }))
      .filter((s: any) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })

    return {
      id: c.id,
      name: c.name || '—',
      level_id: c.level_id,
      level_name: levelsMap.get(c.level_id) || null,
      subjects: uniqueSubjects,
    }
  })

  // 8) Students count
  const classIds = teacherClasses.map((c) => c.id)
  let totalStudents = 0
  if (classIds.length > 0) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds)
      .eq('status', 'active')
    totalStudents = count || 0
  }

  return { staffId, establishmentId, classes: teacherClasses, totalStudents }
}