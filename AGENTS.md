# 🎓 GestionEco / Madrasti — Project Context

> **آخر تحديث**: 2026-09-15  
> **Chemin**: D:\school-saas

---

## 🎯 Vue d'ensemble

**Nom**: GestionEco / Madrasti  
**Type**: SaaS de gestion pour écoles privées au Maroc  
**Modèle**: 20 élèves gratuits + 1.5 MAD/élève supplémentaire/mois

---

## 🛠️ Stack

- Next.js 16.3.4 (App Router + Turbopack)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- lucide-react, @react-pdf/renderer, xlsx, nodemailer, recharts

---

## 👥 Rôles (5)

| Rôle | Route |
|---|---|
| Super Admin | `/admin/*` |
| Directeur | `/dashboard/*` |
| Secrétaire | `/dashboard/secretary/*` |
| **Enseignant** | `/teacher/*` |
| Parent | `/parent/*` |

**Règle**: Super Admin en assistance mode = rôle `directeur`

---

## 📊 État des phases

| Phase | Statut |
|---|---|
| **Phase 1 — Finance** | ✅ 100% |
| **Phase 2 — École** | ✅ 100% |
| **Phase 3A — Business** | ✅ 100% |
| **Phase 3B — Portail Profs** | ✅ 100% |
| **Phase 3C — Parent Space** | ✅ 100% |
| **PDFs Redesign (6/6)** | ✅ 100% |
| **Phase 3D — Autres** | 📅 À faire |
| **Phase 4 — Déploiement** | 📅 À faire |

### Phase 3A — Emails (5/5 ✅)
- ✅ A1: Welcome Email (nouvelle école)
- ✅ A2: Credentials Email (nouveau staff)
- ✅ A3: Invoice Email (facture abonnement → directeur)
- ✅ A4: Password Reset Email
- ✅ A5: Absence Alert Email + notification in-app

### Phase 3B — Portail Enseignant ✅
app/teacher/
├── layout.tsx # Sidebar sky-blue + bell
├── dashboard/page.tsx # Stats + حصص اليوم
├── timetable/page.tsx # Emploi hebdo
├── classes/page.tsx # Mes classes
├── grades/page.tsx # Saisie notes
├── attendance/page.tsx # Appel (présent/retard/absent)
├── stats/page.tsx # KPIs + Recharts
├── profile/page.tsx # Infos + password
├── notifications/page.tsx
└── messages/
├── page.tsx # Liste conversations
└── [id]/page.tsx # Conversation

### Phase 3C — Parent Space ✅
app/parent/
├── layout.tsx # Sidebar indigo + bell
└── dashboard/
├── page.tsx # KPIs enfants
├── children/[id]/page.tsx # 4 tabs (overview/grades/payments/attendance)
├── bulletins/page.tsx # Bulletins + PDF
├── timetable/page.tsx # Emploi du temps
├── attendance/page.tsx # الغيابات
├── payments/page.tsx # المدفوعات
├── certificates/page.tsx # الشهادات PDF
├── cahier/page.tsx # دفتر النصوص
├── devoirs/page.tsx # الفروض المنزلية
├── profile/page.tsx # حسابي
├── messages/ # كان
└── notifications/ # كان

---

## 🗄️ Schéma DB critique — Messagerie

### `conversations`
`id`, `establishment_id`, `title`, `type`, `created_by_user_id`, `created_at`, `updated_at`, `last_message_at`

### `conversation_participants`
`id`, `conversation_id`, `user_id`, `role`, `joined_at`, `last_read_at`

### `messages`
`id`, `conversation_id`, **`sender_user_id`** (PAS `sender_id`), `sender_role`, **`body`** (PAS `content`), `attachment_url/name/type`, `created_at`, `edited_at`, `is_deleted`

**Règles**:
- Unread = `created_at > last_read_at AND sender_user_id != moi`
- Filtrer `is_deleted = false`

---

## 🎨 PDFs — Style unifié

Tous les 6 PDFs utilisent:
- **Police Cairo** (4 variants: normal/bold × normal/italic)
- **Cadre double** navy `#1e3a5f` + gold `#b8860b`
- **Bilingue AR/FR** partout
- **Header 3 colonnes**: Royaume du Maroc + École + référence

### Chemin des fonts (IMPORTANT)
```ts
const FONTS_DIR = path.resolve(process.cwd(), 'public', 'fonts')
Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
})
Fichiers PDFs
components/pdfs/SchoolCertificatePDF.tsx

components/pdfs/BulletinPDF.tsx

components/pdfs/ContractPDF.tsx

components/pdfs/PaymentReceiptPDF.tsx

components/pdfs/MonthlySettlementPDF.tsx

components/pdfs/TimetablePDF.tsx

📧 Email / SMTP
Templates dans lib/email-templates.ts → retournent { subject, html, text }

invoiceEmail, passwordResetEmail, absenceAlertEmail, welcomeEmail, credentialsEmail

sendEmail() dans lib/email.ts

Chaque école a son SMTP + fallback global

Password chiffré AES-256-GCM

Routes API email
app/api/admin/invoices/send/route.ts → Invoice Email

app/api/establishment/reset-password/route.ts → Password Reset

app/api/establishment/absence-alert/route.ts → Absence Alert

app/api/establishment/create-staff/route.ts → Credentials

app/api/admin/create-establishment/route.ts → Welcome

🔐 Auth / Middleware
proxy.ts à la racine (middleware Next.js 16)

Matcher: /dashboard/:path*, /admin/:path*, /parent/:path*, /teacher/:path*, /pending

Fallback = /login (PAS /pending dans le matcher)

Login (app/login/page.tsx)
window.location.href (PAS router.push)

Redirige selon rôle: directeur → /dashboard, secretaire → /dashboard/secretary, enseignant → /teacher/dashboard, parent → /parent/dashboard

try/catch + setLoading(false) sur tous les chemins

lib/useUserRole.ts
ts
type UserRole = 'super_admin' | 'directeur' | 'secretaire' | 'enseignant' | 'parent' | null
🔧 Config dev
next.config.ts
ts
const nextConfig = {
  allowedDevOrigins: ['192.168.1.8', 'localhost', '127.0.0.1'],
}
app/layout.tsx
tsx
<html lang="ar" dir="rtl" data-scroll-behavior="smooth">
Règles Next.js 16
❌ JAMAIS 'use client' dans app/api/**/route.ts (server-only)

❌ JAMAIS 'use client' dans components/pdfs/*.tsx (renderToBuffer server-side)

✅ 'use client' dans pages.tsx/layout.tsx avec hooks

🐛 Bugs résolus (ne pas reproduire)
Login loop → window.location.href + branche enseignant + fallback /login

Hydration fail LAN → allowedDevOrigins

Messages schema → sender_user_id / body / last_read_at / is_deleted

'use client' dans route.ts → à retirer

Font path → path.resolve(process.cwd(), 'public', 'fonts')

Cairo italic → enregistrer 4 variants même si pas d'italic réel

scroll-behavior → data-scroll-behavior="smooth" sur <html>

🎯 Prochaines étapes
Phase 3D — Autres features
2FA

Backup automatique

PWA + Push notifications

Massar Integration

Discipline / Sanctions

Réunions parents-profs

Certificats PDF supplémentaires

Paiement en ligne (CMI)

Journal de caisse

Bibliothèque / Transport / Cantine

Phase 4 — Déploiement
Nettoyage données test

Backup + Optimisation

Hetzner (~40 MAD/mois) + Domaine

Tests en production

Formation Directeurs

Support + Monitoring

✅ Milestones
2026-09-15: Phase 3A + 3B + 3C + PDFs Redesign TERMINÉS 🎉

Fin du contexte.

text

---

## 🎬 دير:

### 1️⃣ **Commit** (الأوامر فوق)

### 2️⃣ **بدل `AGENTS.md`** بالمحتوى فوق

### 3️⃣ **قول لي "صافي"** ونختارو شنو نديرو من بعد:
- **3D** (ميزة جديدة)
- **4** (Deploy)
- **نرتاحو**

---

## 📌 ولا بغيتي **نكملو** بلا commit؟

**قول لي "نكملو"** ونختارو شنو نديرو.

🎯
This response is AI-generated, for reference only.

