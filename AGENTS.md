<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# 📋 CONTEXT — GestionEco / Madrasti

> **آخر تحديث**: 2026-09-14

---

## 🎯 نظرة عامة

**الاسم**: GestionEco / Madrasti  
**النوع**: SaaS لتسيير المدارس الخاصة  
**المسار**: `D:\school-saas`  
**الجمهور**: المدارس الخاصة ف المغرب  

---

## 🛠️ التقنيات

- **Next.js 16.3.4** (App Router + Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + Storage)
- **lucide-react** (أيقونات)
- **@react-pdf/renderer** (PDF)
- **xlsx** (Excel)
- **nodemailer** (Email SMTP)
- **recharts** (رسوم بيانية)

---

## 👥 الأدوار (4)

| الدور | الوصف | المسار |
|---|---|---|
| **Super Admin** | كيدير كل المدارس | `/admin/*` |
| **Directeur** | كيدير مدرستو | `/dashboard/*` |
| **Secrétaire** | تسجيلات + caisse | `/dashboard/secretary` |
| **Parent** | متابعة أبنائه | `/parent/dashboard/*` |

**قاعدة**: Super Admin فـ assistance mode = rôle `directeur`

---

## 🌐 اللغات

- **AR (فصحى)** — افتراضي
- **FR** — switcher
- RTL للعربية، LTR للفرنسية

---

## 💰 التسعير

- **20 تلميذ مجاناً**
- **1.5 د.م / تلميذ إضافي / شهر**
- Formula: `(students - 20) × 1.5`
- **تحويل بنكي** (Super Admin كيأكد يدوياً)

---

## ✅ المراحل المكتملة

### Phase 1 — Finance (100%)
- Caisses (Centrale + Secrétaires + Services)
- Transferts + Notifications
- Paiements + PDF Reçu
- Dépenses (Salaires + Primes + Avances)
- Rapports (Caisse / Service / Élève / Classe)
- Impayés + Relances
- PDF Settlement
- Contrats + PDF
- Users + Reset Password
- Notifications (Bell + Realtime)
- Register école
- Dashboard Directeur

### Phase 2 — École (100%)
- ✅ **17c** Teacher-Subjects (ربط الأساتذة ↔ المواد)
- ✅ **17d** Timetable (Emploi du temps)
  - Drag & Drop
  - Détection conflits
  - Vue par prof + Vue par salle
  - PDF احترافي
  - Auto-generate ذكي
  - Copy from class/year
  - Duplicate day
  - Clear all
- ✅ **18.1** SQL: evaluations, grades, bulletins, evaluation_types
- ✅ **18.2** evaluation-types
- ✅ **18.3** evaluations + Saisie des notes
- ✅ **18.4** Moyennes (معاملات + رتب ex-aequo)
- ✅ **18.5** Bulletins (Liste + Class detail)
- ✅ **18.6** Bulletin PDF

### Phase 3A — Business (قيد التنفيذ)

| # | الميزة | الحالة |
|---|---|---|
| 1 | **Abonnement SaaS** (Super Admin + المدير) | ✅ |
| 2 | **Loi 09-08** (3 صفحات + Cookie + DPO) | ✅ |
| 3 | **Email SMTP** (Nodemailer + Templates) | ✅ |
| 4 | **A1: Welcome Email** (مدرسة جديدة) | ✅ |
| 5 | **A2: Credentials Email** (موظف جديد) | ✅ |
| 6 | **A3: Invoice Email** | ⏳ |
| 7 | **A4: Password Reset Email** | ⏳ |
| 8 | **A5: Absence Alert** (غياب تلميذ) | ⏳ |

### صفحات إضافية مكتملة
- ✅ Landing Page (AR/FR + 10 sections)
- ✅ Parent Dashboard كامل
- ✅ Messagerie (Dashboard + Parent)
- ✅ Enroll (تسجيل + قائمة المسجلين + Smart Delete)
- ✅ Notifications + Bell

---

## 📂 الملفات المهمة

### Landing & Public
- `app/page.tsx` — Landing AR/FR
- `app/layout.tsx` — Root layout
- `app/legal/layout.tsx` — Layout القانوني
- `app/legal/privacy/page.tsx`
- `app/legal/terms/page.tsx`
- `app/legal/loi-09-08/page.tsx`
- `components/CookieBanner.tsx`

### Super Admin
- `app/admin/establishments/page.tsx`
- `app/admin/subscriptions/page.tsx`
- `app/admin/subscriptions/[id]/page.tsx`
- `app/admin/invoices/page.tsx`

### Dashboard (Directeur + Secrétaire)
- `app/dashboard/layout.tsx` — Sidebar + Bell
- `app/dashboard/page.tsx` — Dashboard
- `app/dashboard/enroll/page.tsx` — التسجيلات (New + List)
- `app/dashboard/personnel/page.tsx` — الموظفون
- `app/dashboard/teacher-subjects/page.tsx`
- `app/dashboard/timetable/page.tsx`
- `app/dashboard/timetable/[classId]/page.tsx`
- `app/dashboard/timetable/teacher/[teacherId]/page.tsx`
- `app/dashboard/timetable/room/page.tsx`
- `app/dashboard/timetable/room/[roomName]/page.tsx`
- `app/dashboard/evaluation-types/page.tsx`
- `app/dashboard/evaluations/page.tsx`
- `app/dashboard/evaluations/[id]/page.tsx`
- `app/dashboard/bulletins/page.tsx`
- `app/dashboard/bulletins/[classId]/page.tsx`
- `app/dashboard/school-settings/page.tsx`
- `app/dashboard/settings/email/page.tsx`
- `app/dashboard/settings/privacy/page.tsx`
- `app/dashboard/billing/page.tsx`
- `app/dashboard/messages/page.tsx`
- `app/dashboard/messages/[id]/page.tsx`

### Parent
- `app/parent/dashboard/page.tsx`
- `app/parent/dashboard/children/[id]/page.tsx`
- `app/parent/dashboard/messages/page.tsx`
- `app/parent/dashboard/messages/[id]/page.tsx`
- `app/parent/dashboard/notifications/page.tsx`

### Components
- `components/DateInput.tsx`
- `components/Amount.tsx`
- `components/CookieBanner.tsx`
- `components/pdfs/TimetablePDF.tsx`
- `components/pdfs/BulletinPDF.tsx`
- `components/pdfs/PaymentReceiptPDF.tsx`
- `components/pdfs/MonthlySettlementPDF.tsx`
- `components/pdfs/ContractPDF.tsx`

### Lib
- `lib/supabase.ts` — Client browser
- `lib/supabase-admin.ts` — Client admin (service_role)
- `lib/auth.ts`
- `lib/audit.ts`
- `lib/billing.ts`
- `lib/generate-credentials.ts`
- `lib/useEstablishmentId.ts`
- `lib/useUserRole.ts`
- `lib/useUserPermissions.ts`
- `lib/LanguageContext.tsx`
- `lib/SettingsContext.tsx`
- `lib/email.ts` — sendEmail + testSmtp
- `lib/email-templates.ts` — welcome, credentials, invoice, absenceAlert, passwordReset
- `lib/email-crypto.ts` — تشفير SMTP password
- `lib/legal-content.ts` — محتوى قانوني AR/FR

### API Routes
- `app/api/admin/create-establishment/route.ts` ← **يرسل Welcome Email** ✅
- `app/api/admin/delete-establishment/route.ts`
- `app/api/admin/upload-logo/route.ts`
- `app/api/admin/reset-password/route.ts`
- `app/api/establishment/create-staff/route.ts` ← **يرسل Credentials Email** ✅
- `app/api/establishment/reset-password/route.ts` ← ⏳ (A4)
- `app/api/email/save/route.ts` — حفظ SMTP (Admin Client)
- `app/api/email/test/route.ts`
- `app/api/email/send/route.ts`
- `app/api/email/encrypt/route.ts`

### Config
- `proxy.ts` — حماية المسارات (Middleware)
- `.env.local` — Supabase + SMTP + EMAIL_ENCRYPTION_KEY
- `next.config.ts`

---

## 🗄️ جداول DB الرئيسية

### Finance
`establishments`, `admin_users`, `user_profiles`, `roles`
`cash_registers`, `cash_transfers`
`payments`, `expenses`
`contracts`, `contract_items`, `installments`
`families`, `students`, `enrollments`
`services`, `service_level_prices`

### École
`levels`, `classes`, `subjects`, `subject_level_coefficients`
`staff`, `teacher_subjects`
`timetables` (day_of_week, start_time, end_time, subject_id, teacher_id, room, class_id, academic_year_id)
`school_settings` (period_duration, breaks, days_config, terms_count, term_names)
`attendances` (attendance_date, status, check_in_time, check_out_time, note)
`evaluations`, `grades`
`evaluation_types`
`bulletins` (average, rank, class_size, is_published)

### Communication
`notifications` (user_id, title, message, read, link, type, metadata)
`conversations`, `conversation_participants`, `messages`

### SaaS / Loi 09-08
`school_subscriptions` (plan, status)
`subscription_invoices` (invoice_number, period_month, period_year, students_count, amount, status)
`subscription_email_log`
`data_consents`
`data_requests`
`email_log` (recipient, subject, template, status, error_message, metadata)

### Colonnes جديدة ف establishments (Email)
`smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password_encrypted`
`smtp_from_name, smtp_from_email`
`email_enabled, email_signature`
`email_notify_invoices, email_notify_absences, email_notify_payments, email_notify_messages`
`dpo_name, dpo_email, cndp_registration, privacy_policy_url, data_retention_months`

---

## 🎨 Conventions

### Layout
- كل صفحة dashboard: `<div className="p-6 space-y-6" dir="rtl">`
- Header: `<header className="flex items-center justify-between flex-wrap gap-3">`
- Cards: `bg-white rounded-2xl p-5 border border-gray-100 shadow-sm`
- Buttons primary: `bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700`
- الأرقام ف RTL: لفّهم بـ `<span dir="ltr">` ولا component `<Num>`

### Language
- **العربية الفصحى** ف الواجهة (ماشي دارجة)
- Labels + Hints + Errors كولهم بالعربية

### Email
- Templates كيرجعو `{ subject, html, text }`
- كولهم فـ `lib/email-templates.ts`
- الإرسال عبر `sendEmail()` من `lib/email.ts`

### SMTP
- **كل مدرسة** SMTP ديالها
- **Fallback**: global_settings → env
- password متشفر بـ AES-256-GCM

---

## 🎯 الخطوات المتبقية (مرتبة)

### Phase 3A — Email (باقي 3)
- ⏳ **A3**: Invoice Email → من `/admin/subscriptions/[id]` ملي كيتدار فاتورة
- ⏳ **A4**: Password Reset Email → من `/api/establishment/reset-password`
- ⏳ **A5**: Absence Alert → من `/dashboard/attendance` ملي كيتسجل غياب

### Phase 3B — Portail Profs (أسبوع)
- B1: Dashboard Prof
- B2: Mon Emploi du temps
- B3: Mes Classes
- B4: Saisie des notes (فقط أقسامه)
- B5: Mes Présences (فقط حصصه)
- B6: Mes Statistiques
- B7: Messages
- B8: Mon Profil

### Phase 3C — Parent Space (أسبوع)
- C1-C2: تحسين Dashboard + Children
- C3: Bulletins PDF
- C4: Emploi du temps
- C5: Cahier de textes
- C6: Devoirs
- C7: Bell + Notifications
- C8: Messages (تحسين)
- C9: Profil
- C10: Certificats

### Phase 3D — Autres
- 2FA
- Backup automatique
- PWA + Push
- Massar Integration
- Discipline / Sanctions
- Réunions parents-profs
- Certificats PDF
- Paiement en ligne (CMI)
- Journal de caisse
- Bibliothèque
- Transport
- Cantine

### Phase 4 — Déploiement
- Nettoyage données test
- Backup + Optimisation
- **Déploiement Hetzner (~40 د.م/شهر)** + Domaine
- Tests en production
- Formation Directeurs
- Support + Monitoring

---

## 🔑 Env Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Encryption
EMAIL_ENCRYPTION_KEY=change-me-to-random-32-chars-minimum

# SMTP Fallback (default)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=xxx@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM_NAME=Madrasti
SMTP_FROM_EMAIL=xxx@gmail.com