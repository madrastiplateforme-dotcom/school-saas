# 🎓 GestionEco / Madrasti — Project Context

> **آخر تحديث**: 2026-09-15  
> **Chemin**: D:\school-saas

---

## 🎯 Vue d'ensemble

**Nom**: GestionEco / Madrasti  
**Type**: SaaS de gestion pour écoles privées au Maroc  
**Public**: Écoles privées (maternelle → lycée)  
**Modèle**: 20 élèves gratuits, 1.5 MAD/élève supplémentaire/mois

---

## 🛠️ Stack

- Next.js 16.3.4 (App Router + Turbopack)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- lucide-react (icônes)
- @react-pdf/renderer (PDF)
- xlsx (Excel)
- nodemailer (SMTP)
- recharts (graphiques)

---

## 👥 Rôles (5)

| Rôle | Description | Route |
|---|---|---|
| Super Admin | Gère toutes les écoles | `/admin/*` |
| Directeur | Gère son école | `/dashboard/*` |
| Secrétaire | Inscriptions + Caisse | `/dashboard/secretary/*` |
| **Enseignant** | Espace personnel prof | `/teacher/*` |
| Parent | Suivi de ses enfants | `/parent/*` |

**Règle**: Super Admin en mode assistance = rôle `directeur`

---

## 🌐 Langues

- **AR** (فصحى) par défaut — RTL
- **FR** — switcher — LTR

---

## 📊 État des phases

| Phase | Statut |
|---|---|
| **Phase 1 — Finance** | ✅ 100% |
| **Phase 2 — École** | ✅ 100% |
| **Phase 3A — Business** | 🔄 En cours |
| **Phase 3B — Portail Profs** | ✅ 100% |
| **Phase 3C — Parent Space** | 📅 À faire |
| **Phase 3D — Autres** | 📅 À faire |
| **Phase 4 — Déploiement** | 📅 À faire |

### Phase 3A — Email (reste 3)
- ✅ A1: Welcome Email (nouvelle école)
- ✅ A2: Credentials Email (nouveau staff)
- ⏳ A3: Invoice Email
- ⏳ A4: Password Reset Email
- ⏳ A5: Absence Alert (élève absent)

---

## 🏫 Portail Enseignant (`/teacher/*`)

### Structure
app/teacher/
├── layout.tsx # Sidebar + Bell + Langue
├── dashboard/page.tsx # Stats + حصص اليوم + Quick actions
├── timetable/page.tsx # Emploi hebdo groupé par jour
├── classes/page.tsx # Liste classes (subjects + students count)
├── grades/page.tsx # Saisie notes (classe→matière→évaluation)
├── attendance/page.tsx # Appel (présent/retard/absent)
├── stats/page.tsx # KPIs + BarChart + PieChart
├── profile/page.tsx # Infos + password
├── notifications/page.tsx # Liste notifications
└── messages/
├── page.tsx # Liste conversations
└── [id]/page.tsx # Conversation

### Détection rôle enseignant
- DB: `roles.name = 'Enseignant'` (créé via RPC `get_or_create_role`)
- `staff.type = 'teacher'`
- `user_profiles.role_id` → lié à `roles.id`
- Login redirige vers `/teacher/dashboard` via `window.location.href`

### Protection
- `proxy.ts` protège `/teacher/*` (auth + rôle)
- Autres rôles redirigés vers leurs dashboards
- Super Admin bloqué de `/teacher/*`

---

## 🗄️ Schéma DB critique — Messagerie

### `conversations`
- id, establishment_id, title, type, created_by_user_id
- created_at, updated_at, **last_message_at**

### `conversation_participants`
- id, conversation_id, user_id, role
- joined_at, **last_read_at**

### `messages`
- id, conversation_id
- **sender_user_id** (PAS `sender_id`)
- **sender_role**
- **body** (PAS `content`)
- attachment_url, attachment_name, attachment_type
- created_at, edited_at, **is_deleted**

### Règles de lecture
- **Unread** pour moi = `messages.created_at > ma conversation_participants.last_read_at` AND `messages.sender_user_id != moi`
- **Toujours** filtrer `is_deleted = false`
- `content` n'existe PAS → utiliser `body`
- `read` n'existe PAS par message → utiliser `last_read_at`

---

## 💰 Autres tables clés

### Finance
`establishments`, `admin_users`, `user_profiles`, `roles`
`cash_registers`, `cash_transfers`, `payments`, `expenses`
`contracts`, `contract_items`, `installments`
`families`, `students`, `enrollments`
`services`, `service_level_prices`

### École
`levels`, `classes`, `subjects`, `subject_level_coefficients`
`staff`, `teacher_subjects`
`timetables`, `school_settings`
`attendances`, `evaluations`, `grades`, `evaluation_types`
`bulletins`

### Communication
`notifications`, `conversations`, `conversation_participants`, `messages`

### SaaS / Loi 09-08
`school_subscriptions`, `subscription_invoices`, `subscription_email_log`
`data_consents`, `data_requests`, `email_log`

---

## 📧 Email / SMTP

- Chaque école a **son propre SMTP** avec **fallback global**
- `lib/email.ts` → `sendEmail()` + `testSmtp()`
- `lib/email-templates.ts` → templates retournent `{ subject, html, text }`
- Password chiffré avec **AES-256-GCM** (`lib/email-crypto.ts`)
- Colonnes `establishments`: smtp_host/port/secure/user/password_encrypted, smtp_from_name/email, email_enabled, email_signature, email_notify_*

---

## 🎨 Conventions UI

### Layout pages dashboard
```tsx
<div className="p-6 space-y-6" dir="rtl">
  <header className="flex items-center justify-between flex-wrap gap-3">
    ...
  </header>
</div>