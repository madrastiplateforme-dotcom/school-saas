// app/api/cron/daily-caisse-email/route.ts
// ═══════════════════════════════════════════════════════════════════════
// 📧 Cron quotidien : envoyer le solde des caisses à tous les propriétaires
// Appelé chaque jour à 00:00 (timezone Morocco)
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { dailyCaisseBalanceEmail, type CaisseRow } from '@/lib/email-templates'

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
]

function formatDateAr(d: Date): string {
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`
}

export async function POST(req: NextRequest) {
  // ── 1) Vérifier le secret ──
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const startedAt = new Date()

  // ── 2) Logger le début ──
  await admin.from('cron_log').insert({
    job_name: 'daily_caisse_email',
    status: 'started',
    details: { started_at: startedAt.toISOString() },
  })

  try {
    const today = startedAt
    const todayISO = today.toISOString().slice(0, 10)
    const dateAr = formatDateAr(today)

    // ── 3) Récupérer TOUS les cash_registers avec owner ──
    const { data: registers, error: regErr } = await admin
      .from('cash_registers')
      .select('id, name, type, owner_user_id, establishment_id, initial_balance')
      .not('owner_user_id', 'is', null)

    if (regErr) throw regErr
    if (!registers || registers.length === 0) {
      await admin.from('cron_log').insert({
        job_name: 'daily_caisse_email',
        status: 'success',
        details: { sent: 0, reason: 'no registers with owner' },
      })
      return NextResponse.json({ success: true, sent: 0 })
    }

    // ── 4) Pour chaque caisse, calculer balance + counts du jour ──
    type CaisseData = CaisseRow & {
      registerId: string
      ownerUserId: string
      establishmentId: string
    }

    const caisseDataById = new Map<string, CaisseData>()

    for (const r of registers) {
      // Balance via RPC (déjà créée)
      const { data: balance } = await admin.rpc('fn_cash_register_balance', {
        p_register_id: r.id,
      })

      // Payments du jour (non supprimés, non refundés)
      const { count: inCount } = await admin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('cash_register_id', r.id)
        .eq('payment_date', todayISO)
        .is('deleted_at', null)

      // Expenses du jour
      const { count: outCount } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('cash_register_id', r.id)
        .eq('expense_date', todayISO)

      caisseDataById.set(r.id, {
        registerId: r.id,
        ownerUserId: r.owner_user_id!,
        establishmentId: r.establishment_id,
        name: r.name,
        type: r.type || 'service',
        balance: Number(balance || 0),
        inCount: inCount || 0,
        outCount: outCount || 0,
      })
    }

    // ── 5) Récupérer établissements + directeurs ──
    const establishmentIds = Array.from(
      new Set(registers.map((r) => r.establishment_id)),
    )

    const { data: establishments } = await admin
      .from('establishments')
      .select('id, name, email')
      .in('id', establishmentIds)

    const establishmentMap = new Map(
      (establishments || []).map((e) => [e.id, e]),
    )

    // ── 6) Pour chaque établissement : identifier le directeur ──
    //  Le directeur reçoit TOUTES les caisses en 1 email
    //  Chaque secrétaire reçoit SA caisse uniquement

    // Charger tous les user_profiles + roles
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, establishment_id, full_name, role_id')
      .in('establishment_id', establishmentIds)

    const roleIds = Array.from(new Set((profiles || []).map((p) => p.role_id).filter(Boolean)))

    const { data: roles } = await admin
      .from('roles')
      .select('id, name')
      .in('id', roleIds)

    const roleMap = new Map((roles || []).map((r) => [r.id, (r.name || '').toLowerCase()]))

    const isDirectorRole = (roleId: string | null) => {
      if (!roleId) return false
      const n = roleMap.get(roleId) || ''
      return n.includes('directeur') || n.includes('director') || n.includes('مدير')
    }

    const directorsByEstablishment = new Map<string, { userId: string; fullName: string }>()
    for (const p of profiles || []) {
      if (isDirectorRole(p.role_id)) {
        directorsByEstablishment.set(p.establishment_id, {
          userId: p.user_id,
          fullName: p.full_name || 'المدير',
        })
      }
    }

    // ── 7) Envoi ──
    let sent = 0
    const errors: string[] = []

    // 7a) Directeurs : toutes les caisses de leur établissement en 1 email
    for (const [estId, dir] of directorsByEstablishment) {
      const est = establishmentMap.get(estId)
      if (!est) continue

      const caisses: CaisseRow[] = registers
        .filter((r) => r.establishment_id === estId)
        .map((r) => {
          const d = caisseDataById.get(r.id)!
          return {
            name: d.name,
            type: d.type,
            balance: d.balance,
            inCount: d.inCount,
            outCount: d.outCount,
          }
        })

      const totalBalance = caisses.reduce((s, c) => s + c.balance, 0)

      // Email
      const { email: directorEmail } = await getEmailForUser(admin, dir.userId)
      if (!directorEmail) {
        errors.push(`No email for director ${dir.userId}`)
        continue
      }

      const content = dailyCaisseBalanceEmail({
        recipientRole: 'directeur',
        recipientName: dir.fullName,
        caisses,
        totalBalance,
        schoolName: est.name,
        date: dateAr,
      })

      const res = await sendEmail({
        to: directorEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: est.email || undefined,
        establishmentId: estId,
        template: 'daily_caisse_balance_directeur',
        metadata: { date: dateAr, caissesCount: caisses.length },
      })

      if (res.ok) sent++
      else errors.push(res.error || 'send failed')
    }

    // 7b) Chaque propriétaire de caisse NON directeur → sa caisse uniquement
    const directorUserIds = new Set(
      Array.from(directorsByEstablishment.values()).map((d) => d.userId),
    )

    for (const r of registers) {
      if (directorUserIds.has(r.owner_user_id!)) continue

      const data = caisseDataById.get(r.id)!
      const est = establishmentMap.get(r.establishment_id)
      if (!est) continue

      // Nom
      const profile = (profiles || []).find((p) => p.user_id === r.owner_user_id)
      const recipientName = profile?.full_name || 'المستخدم'

      const { email } = await getEmailForUser(admin, r.owner_user_id!)
      if (!email) {
        errors.push(`No email for ${r.owner_user_id}`)
        continue
      }

      const content = dailyCaisseBalanceEmail({
        recipientRole: 'secretaire',
        recipientName,
        caisses: [
          {
            name: data.name,
            type: data.type,
            balance: data.balance,
            inCount: data.inCount,
            outCount: data.outCount,
          },
        ],
        totalBalance: data.balance,
        schoolName: est.name,
        date: dateAr,
      })

      const res = await sendEmail({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: est.email || undefined,
        establishmentId: r.establishment_id,
        template: 'daily_caisse_balance_secretaire',
        metadata: { date: dateAr, caisseName: data.name },
      })

      if (res.ok) sent++
      else errors.push(res.error || 'send failed')
    }

    // ── 8) Logger le succès ──
    await admin.from('cron_log').insert({
      job_name: 'daily_caisse_email',
      status: errors.length === 0 ? 'success' : 'failed',
      details: { sent, errors, duration_ms: Date.now() - startedAt.getTime() },
    })

    return NextResponse.json({ success: true, sent, errors })
  } catch (err: any) {
    console.error('[cron/daily-caisse-email]', err?.message || err)
    await admin.from('cron_log').insert({
      job_name: 'daily_caisse_email',
      status: 'failed',
      details: { error: err?.message || 'unknown' },
    })
    return NextResponse.json(
      { success: false, error: err?.message || 'server error' },
      { status: 500 },
    )
  }
}

// ── Helper : email + nom via admin.auth ──
async function getEmailForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ email: string | null }> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    return { email: data?.user?.email || null }
  } catch {
    return { email: null }
  }
}