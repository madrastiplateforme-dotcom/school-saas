'use client'

import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

type Language = 'fr' | 'ar'
type Dictionary = Record<string, string>

const translations: Record<Language, Dictionary> = {
  fr: {
    dashboard: 'Tableau de bord', enroll: 'Nouvelle inscription', academicYears: 'Années scolaires', levels: 'Niveaux', classes: 'Classes', services: 'Services', families: 'Familles', students: 'Élèves', contracts: 'Contrats', installments: 'Échéances', payments: 'Paiements', impayes: 'Impayés', expenses: 'Dépenses', caisse: 'Caisse', reports: 'Rapports', users: 'Utilisateurs', roles: 'Rôles', settings: 'Paramètres',
    school: 'École', administrationSpace: 'Espace administration', mainMenu: 'Menu principal', schoolManagement: 'Gestion scolaire', schoolManagementSubtitle: 'Un espace simple pour piloter votre établissement', logout: 'Déconnexion', language: 'العربية',
    dashboardKicker: 'TABLEAU DE BORD', dashboardGreeting: 'Bonjour', dashboardIntro: 'Voici l’essentiel de votre activité aujourd’hui.', activeStudents: 'Élèves actifs', registeredStudents: 'inscrits dans l’établissement', monthlyIncome: 'Encaissements ce mois', confirmedPayments: 'paiements confirmés', outstandingAmount: 'Reste à payer', pendingInstallments: 'échéances en attente', availableBalance: 'Solde disponible', positiveSituation: 'situation positive', watchSituation: 'à surveiller', financialOverview: 'Vue financière', cashHealth: 'La santé de votre caisse', cumulativeIncome: 'Encaissements cumulés', cumulativeExpenses: 'Dépenses cumulées', viewReports: 'Voir les rapports', shortcuts: 'Raccourcis', frequentActions: 'Actions fréquentes', recordPayment: 'Enregistrer un paiement', addExpense: 'Ajouter une dépense', viewInstallments: 'Consulter les échéances', loadingSpace: 'Chargement de votre espace…', dashboardLoadError: 'Impossible de charger les indicateurs pour le moment.',
  },
  ar: {
    dashboard: 'لوحة القيادة', enroll: 'تسجيل جديد', academicYears: 'السنوات الدراسية', levels: 'المستويات', classes: 'الأقسام', services: 'الخدمات', families: 'العائلات', students: 'التلاميذ', contracts: 'العقود', installments: 'الأقساط', payments: 'الدفعات', impayes: 'المتأخرون عن الدفع', expenses: 'المصاريف', caisse: 'الصندوق', reports: 'التقارير', users: 'المستخدمون', roles: 'الأدوار', settings: 'الإعدادات',
    school: 'المدرسة', administrationSpace: 'فضاء الإدارة', mainMenu: 'القائمة الرئيسية', schoolManagement: 'تسيير المؤسسة', schoolManagementSubtitle: 'فضاء بسيط لتدبير مؤسستك', logout: 'تسجيل الخروج', language: 'Français',
    dashboardKicker: 'لوحة القيادة', dashboardGreeting: 'مرحباً', dashboardIntro: 'هذه أهم مؤشرات مؤسستك اليوم.', activeStudents: 'التلاميذ النشطون', registeredStudents: 'مسجلون في المؤسسة', monthlyIncome: 'مداخيل هذا الشهر', confirmedPayments: 'دفعات مؤكدة', outstandingAmount: 'المبلغ المتبقي', pendingInstallments: 'أقساط في الانتظار', availableBalance: 'الرصيد المتوفر', positiveSituation: 'وضعية إيجابية', watchSituation: 'تحتاج إلى متابعة', financialOverview: 'نظرة مالية', cashHealth: 'صحة الصندوق', cumulativeIncome: 'إجمالي المداخيل', cumulativeExpenses: 'إجمالي المصاريف', viewReports: 'عرض التقارير', shortcuts: 'اختصارات', frequentActions: 'إجراءات متكررة', recordPayment: 'تسجيل دفعة', addExpense: 'إضافة مصروف', viewInstallments: 'عرض الأقساط', loadingSpace: 'جارٍ تحميل فضاء المؤسسة…', dashboardLoadError: 'تعذر تحميل المؤشرات حالياً.',
  },
}

const LanguageContext = createContext<{ lang: Language; setLang: (language: Language) => void; t: (key: string) => string }>({ lang: 'fr', setLang: () => {}, t: (key) => key })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr')

  useEffect(() => {
    const saved = window.localStorage.getItem('lang')
    const language: Language = saved === 'ar' ? 'ar' : 'fr'
    const timer = window.setTimeout(() => setLangState(language), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (language: Language) => {
    setLangState(language)
    window.localStorage.setItem('lang', language)
  }

  const t = (key: string) => translations[lang][key] || key
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
