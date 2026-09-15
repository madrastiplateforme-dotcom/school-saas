'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, BarChart3, Check, ChevronLeft, GraduationCap, ShieldCheck,
  Sparkles, Users, Wallet, Calendar, FileText, MessageSquare, Lock,
  TrendingUp, Clock, BookOpen, Star, Phone, Mail, MapPin, Globe,
  UserCog, HeartHandshake, Zap, PlayCircle,
  Smartphone, ClipboardCheck, Gavel, UserCheck, Send, Palette,
} from 'lucide-react'

// ============ TRANSLATIONS ============
const T = {
  ar: {
    dir: 'rtl' as const,
    lang: 'ar' as const,
    brand: 'مدرستي',
    nav: { features: 'المميزات', roles: 'الأدوار', pricing: 'الأسعار', faq: 'أسئلة شائعة' },
    login: 'تسجيل الدخول',
    startFree: 'ابدأ مجاناً',
    announcement: 'جديد: دعم كامل لـ WhatsApp Business   ',
    announcementLink: 'اكتشف المزيد',
    hero: {
      badge: 'منصة عصرية للمدارس الخاصة بالمغرب',
      title1: 'تسيير مدرستك،',
      title2: 'بوضوح وراحة بال.',
      desc: 'كل ما تحتاجه الإدارة في مساحة واحدة: التلاميذ، التسجيل، الأقساط، الصندوق، النقط، الحضور، والتواصل مع الأولياء.',
      cta1: 'أنشئ حساب مؤسستك',
      cta2: 'شاهد عرضاً توضيحياً',
      trust: ['بيانات منظّمة وآمنة', 'تجربة مجانية مدى الحياة', 'بدون بطاقة بنكية'],
    },
    mockup: { kicker: 'نظرة سريعة', title: 'ملخص المؤسسة', students: 'التلاميذ النشطون', revenue: 'مداخيل هذا الشهر', collect: 'حالة التحصيل', remaining: 'المتبقي', success: 'نسبة النجاح' },
    stats: [
      { value: '248', label: 'تلميذ نشط' },
      { value: '98%', label: 'نسبة الرضا' },
      { value: '12h', label: 'موفرة أسبوعياً' },
      { value: '24/7', label: 'دعم متواصل' },
    ],
    problems: {
      kicker: 'المشاكل الشائعة',
      title: 'هل تعاني من هذه المشاكل؟',
      desc: 'كل مدرسة خاصة تواجه تحديات يومية في التسيير. مدرستي وضعت لها حلاً نهائياً.',
      items: [
        { title: 'ملفات ورقية متفرقة', text: 'كل معلومة في دفتر أو Excel، والبحث يستغرق وقتاً طويلاً.' },
        { title: 'أقساط ضائعة', text: 'لا تعرف من دفع، من تأخر، ولا المبلغ المتبقي في الصندوق.' },
        { title: 'وقت ضائع في الإدارة', text: 'ساعات في التسجيل، الفواتير، والتقارير بدل التركيز على التعليم.' },
        { title: 'تواصل ضعيف مع الأولياء', text: 'لا وسيلة سريعة لإخبار الآباء بالغيابات، النقط، أو المستجدات.' },
      ],
    },
    features: {
      kicker: 'الحل',
      title: 'كل شيء تحت السيطرة',
      desc: 'من التسجيل إلى آخر دفعة، واجهة بسيطة لفريق الإدارة، ومعلومات دقيقة تساعدك على اتخاذ القرار بسرعة.',
      items: [
        { title: 'إدارة التلاميذ والأسر', text: 'ملفات كاملة، تسجيل سريع، ومتابعة دقيقة لكل تلميذ.' },
        { title: 'المالية والصندوق', text: 'أقساط، مدفوعات، مصاريف، تحويلات، وتقارير في مكان واحد.' },
        { title: 'لوحة قيادة ذكية', text: 'أرقام حيّة، رسوم بيانية، وقرارات مبنية على البيانات.' },
        { title: 'جدول الحصص', text: 'إنشاء تلقائي، كشف التعارضات، سحب وإفلات، وتصدير PDF.' },
        { title: 'النقط والكشوف', text: 'إدخال النقط، حساب المعدلات، الرتب، وكشوف رسمية PDF.' },
        { title: 'الرسائل والإشعارات', text: 'رسائل داخلية + إشعارات بالبريد الإلكتروني للأولياء.' },
        { title: 'متابعة الغيابات', text: 'حضور يومي، إشعار فوري للأولياء، وتقارير دقيقة.' },
        { title: 'أمان وحماية البيانات', text: 'توافق مع القانون 09-08، تشفير، ونسخ احتياطي تلقائي.' },
      ],
    },
    advanced: {
      kicker: 'حلول متكاملة',
      title: 'كل منصة في مكان واحد',
      desc: 'من القسم إلى ولي الأمر، من الهاتف إلى المكتب — كل ما تحتاجه مدرستك في منصة واحدة.',
      items: [
        { title: 'لوحة الأستاذ', text: 'تسجيل النقط، الحضور، جدول الحصص، والرسائل — من الهاتف مباشرة.' },
        { title: 'فضاء الأولياء', text: 'نقط، غيابات، أقساط، كشوف، شهادات، دفتر النصوص، والفروض — كل شي في التطبيق.' },
        { title: 'الانضباط والسلوك', text: 'تسجيل المخالفات، إشعار الأولياء، ومتابعة السلوك لكل تلميذ.' },
        { title: 'لقاءات الأولياء', text: 'حجز مواعيد اللقاء مع الأساتذة، تأكيد تلقائي وتذكيرات بالإيميل.' },
        { title: 'لوحة ذكية + Widgets', text: 'معلومات فورية: فرض قادم، قسط جاي، غياب اليوم، إشعارات، وأرقام حيّة.' },
        { title: 'تطبيق على الهاتف', text: 'ثبّت المنصة على هاتفك مباشرة كتطبيق (PWA) — بلا متجر.' },
        { title: 'إيميلات تلقائية', text: 'رسائل آلية ب AR/FR: ترحيب، تسجيل دخول، غياب، مخالفة، فاتورة، ومواعيد.' },
        { title: 'PDF احترافي ب AR/FR', text: '6 قوالب PDF رسمية: كشوف، عقود، وصولات، تسويات، جداول، وشهادات.' },
      ],
    },
    roles: {
      kicker: 'مصمم للجميع',
      title: 'واجهة خاصة لكل مستخدم',
      desc: 'كل دور يرى فقط ما يحتاجه، بواجهة مصممة لأداء مهامه بسرعة.',
      items: [
        { title: 'المدير', text: 'تحكم كامل في المؤسسة، التقارير المالية، والقرارات.' },
        { title: 'السكرتيرة', text: 'تسيير التسجيلات، الأقساط، والصندوق اليومي بسلاسة.' },
        { title: 'الأستاذ', text: 'إدخال النقط، تسجيل الحضور، ومتابعة أداء التلاميذ.' },
        { title: 'ولي الأمر', text: 'متابعة أبنائه: النقط، الغيابات، الأقساط، والتواصل.' },
      ],
    },
    testimonials: {
      kicker: 'شهادات',
      title: 'ماذا يقول مديرو المدارس؟',
      items: [
        { name: 'الأستاذ محمد', role: 'مدير مدرسة خاصة - الدار البيضاء', text: 'وفّرنا ساعات من العمل الإداري كل أسبوع، والآباء أصبحوا أكثر تفاعلاً مع المدرسة.' },
        { name: 'الأستاذة سعاد', role: 'مديرة مجموعة مدارس - الرباط', text: 'المنصة سهلة الاستخدام، والتقارير المالية ساعدتنا في اتخاذ قرارات دقيقة.' },
        { name: 'الأستاذ يوسف', role: 'مدير إعدادية - مراكش', text: 'أفضل استثمار قمت به لإدارتي. الدعم سريع والمنصة تتطور باستمرار.' },
      ],
    },
    pricing: {
      kicker: 'أسعار واضحة',
      title: 'ادفع حسب عدد تلاميذك',
      desc: 'ابدأ بـ 20 تلميذاً مجاناً. ثم 1.5 درهم فقط لكل تلميذ إضافي في الشهر.',
      currency: 'د.م / تلميذ / شهر',
      popular: 'الأكثر اختياراً',
      footer: '20 تلميذاً مجاناً · بدون التزام · إلغاء في أي وقت',
      plans: [
        {
          name: 'تجريبية',
          description: 'للتجربة والانطلاق',
          items: ['حتى 20 تلميذاً', 'كل الوظائف الأساسية', 'دعم عبر البريد', 'بدون بطاقة بنكية'],
          cta: 'ابدأ مجاناً',
        },
        {
          name: 'قياسية',
          description: 'للمدارس النامية',
          items: [
            'كل الوظائف الكاملة',
            'المالية، النقط، جدول الحصص',
            'الرسائل والإشعارات',
            'دعم بالأولوية',
          ],
          examples: [
            { students: '100 تلميذ', price: '120 د.م / شهر' },
            { students: '300 تلميذ', price: '420 د.م / شهر' },
          ],
          cta: 'ابدأ الآن',
        },
        {
          name: 'احترافية',
          description: 'للمؤسسات الكبيرة',
          items: [
            'كل ما في القياسية',
            'إشعارات بريد متقدمة (قوالب مخصصة)',
            'دعم متعدد المدارس',
            'مدير حساب مخصص',
          ],
          examples: [
            { students: '500 تلميذ', price: '720 د.م / شهر' },
            { students: '1000 تلميذ', price: '1470 د.م / شهر' },
          ],
          cta: 'اختر الاحترافية',
        },
      ],
    },
    faq: {
      kicker: 'أسئلة شائعة',
      title: 'لديك سؤال؟ عندنا الجواب',
      items: [
        { q: 'هل المنصة مجانية حقاً؟', a: 'نعم، 20 تلميذاً مجاناً إلى الأبد. من بعد، تدفع 1.5 درهم فقط لكل تلميذ إضافي في الشهر. مثال: 100 تلميذ = 120 درهم شهرياً.' },
        { q: 'هل بياناتي آمنة؟', a: 'بياناتك مشفّرة ومحفوظة على خوادم آمنة. نتوافق مع القانون المغربي 09-08 لحماية المعطيات الشخصية، مع نسخ احتياطي يومي.' },
        { q: 'هل يمكنني إلغاء الاشتراك في أي وقت؟', a: 'بالتأكيد. لا توجد أي التزامات طويلة الأمد. يمكنك الإلغاء بنقرة واحدة من لوحة التحكم.' },
        { q: 'هل تدعم المنصة Massar؟', a: 'قريباً، خطة الاحترافية ستشمل التكامل مع منظومة Massar لتبادل معلومات التلاميذ بسهولة.' },
        { q: 'هل هناك تطبيق للهاتف؟', a: 'المنصة تعمل على جميع الأجهزة (حاسوب، لوحي، هاتف) كـ Progressive Web App. يمكنك تثبيتها على شاشة هاتفك الرئيسية.' },
        { q: 'كيف يتم الدعم؟', a: 'دعم عبر البريد الإلكتروني والهاتف. الخطط المدفوعة تتمتع بأولوية في الرد (أقل من ساعتين في أوقات العمل).' },
      ],
    },
    finalCta: {
      title: 'جاهز لتحويل تسيير مدرستك؟',
      desc: 'انضم إلى المدارس التي تعتمد على "مدرستي" لتوفير الوقت، زيادة المداخيل، وتحسين التواصل مع الأولياء.',
      cta1: 'ابدأ مجاناً الآن',
      cta2: 'تسجيل الدخول',
      trust: 'بدون بطاقة بنكية · بدون التزامات · إلغاء في أي وقت',
    },
    footer: {
      desc: 'منصة مغربية عصرية لتسيير المدارس الخاصة. صُممت لتبسيط الإدارة وتقريب المدرسة من الأسرة.',
      product: 'المنصة',
      legal: 'قانوني',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      cookies: 'ملفات الكوكيز',
      law0908: 'القانون 09-08',
      contact: 'تواصل معنا',
      address: 'الدار البيضاء، المملكة المغربية',
      copyright: 'جميع الحقوق محفوظة.',
      madeIn: 'صنع في المغرب بكل فخر',
    },
  },
  fr: {
    dir: 'ltr' as const,
    lang: 'fr' as const,
    brand: 'Madrasti',
    nav: { features: 'Fonctionnalités', roles: 'Rôles', pricing: 'Tarifs', faq: 'FAQ' },
    login: 'Connexion',
    startFree: 'Commencer gratuitement',
    announcement: 'Nouveau : support complet WhatsApp Business',
    announcementLink: 'En savoir plus',
    hero: {
      badge: 'Plateforme moderne pour les écoles privées au Maroc',
      title1: 'Gérez votre école,',
      title2: 'en toute clarté.',
      desc: 'Tout ce dont votre administration a besoin dans un seul espace : élèves, inscriptions, échéances, caisse, notes, présence, et communication avec les parents.',
      cta1: 'Créer mon établissement',
      cta2: 'Voir la démo',
      trust: ['Données organisées et sécurisées', 'Essai gratuit à vie', 'Sans carte bancaire'],
    },
    mockup: { kicker: 'Aperçu rapide', title: 'Résumé de l\'établissement', students: 'Élèves actifs', revenue: 'Revenus ce mois', collect: 'Taux de recouvrement', remaining: 'Restant', success: 'Taux de réussite' },
    stats: [
      { value: '248', label: 'Élèves actifs' },
      { value: '98%', label: 'Satisfaction' },
      { value: '12h', label: 'Économisées/sem.' },
      { value: '24/7', label: 'Support continu' },
    ],
    problems: {
      kicker: 'Problèmes courants',
      title: 'Vous rencontrez ces problèmes ?',
      desc: 'Chaque école privée affronte des défis quotidiens. Madrasti leur apporte une solution définitive.',
      items: [
        { title: 'Dossiers papier éparpillés', text: 'Chaque information dans un cahier ou Excel, la recherche prend du temps.' },
        { title: 'Échéances perdues', text: 'Vous ne savez pas qui a payé, qui est en retard, ni le solde de la caisse.' },
        { title: 'Temps perdu en administration', text: 'Des heures en inscriptions, factures et rapports au lieu de se concentrer sur l\'enseignement.' },
        { title: 'Communication faible avec les parents', text: 'Aucun moyen rapide d\'informer les parents des absences, notes ou actualités.' },
      ],
    },
    features: {
      kicker: 'La solution',
      title: 'Tout sous contrôle',
      desc: 'De l\'inscription au dernier paiement, une interface simple pour l\'équipe et des informations précises pour décider vite.',
      items: [
        { title: 'Gestion élèves & familles', text: 'Dossiers complets, inscription rapide, suivi précis de chaque élève.' },
        { title: 'Finance & caisse', text: 'Échéances, paiements, dépenses, transferts et rapports au même endroit.' },
        { title: 'Tableau de bord intelligent', text: 'Données en direct, graphiques et décisions basées sur les chiffres.' },
        { title: 'Emploi du temps', text: 'Génération automatique, détection de conflits, glisser-déposer, export PDF.' },
        { title: 'Notes & bulletins', text: 'Saisie, calcul des moyennes, classement et bulletins PDF officiels.' },
        { title: 'Messages & notifications', text: 'Messages internes + notifications par email pour les parents.' },
        { title: 'Suivi des absences', text: 'Présence quotidienne, notification instantanée et rapports précis.' },
        { title: 'Sécurité & protection', text: 'Conformité loi 09-08, chiffrement et sauvegarde automatique.' },
      ],
    },
    advanced: {
      kicker: 'Solutions intégrées',
      title: 'Tout-en-un. Pour toute votre école.',
      desc: 'De la classe au parent, du téléphone au bureau — tout ce dont votre école a besoin en une plateforme.',
      items: [
        { title: 'Espace Enseignant', text: 'Saisie des notes, présence, emploi du temps et messages — directement depuis le téléphone.' },
        { title: 'Espace Parent complet', text: 'Notes, absences, paiements, bulletins, certificats, cahier de textes et devoirs — tout dans l\'app.' },
        { title: 'Discipline & Sanctions', text: 'Enregistrez les infractions, notifiez les parents et suivez le comportement de chaque élève.' },
        { title: 'Réunions parents-profs', text: 'Réservation de créneaux en ligne, confirmation automatique et rappels par email.' },
        { title: 'Widgets intelligents', text: 'Infos instantanées : devoir à venir, paiement, absence du jour, notifications et données en direct.' },
        { title: 'Application mobile', text: 'Installez la plateforme sur votre téléphone comme une vraie app (PWA) — sans store.' },
        { title: 'Emails automatiques', text: 'Messages bilingues AR/FR : bienvenue, identifiants, absence, discipline, facture et rendez-vous.' },
        { title: 'PDF pro AR/FR', text: '6 modèles PDF officiels : bulletins, contrats, reçus, régularisations, emplois du temps et certificats.' },
      ],
    },
    roles: {
      kicker: 'Pensé pour tous',
      title: 'Une interface pour chaque utilisateur',
      desc: 'Chaque rôle voit uniquement ce dont il a besoin, avec une interface optimisée.',
      items: [
        { title: 'Directeur', text: 'Contrôle total, rapports financiers et décisions stratégiques.' },
        { title: 'Secrétaire', text: 'Inscriptions, échéances et caisse du jour en toute simplicité.' },
        { title: 'Enseignant', text: 'Saisie des notes, présence et suivi des élèves.' },
        { title: 'Parent', text: 'Suivi de ses enfants : notes, absences, paiements et communication.' },
      ],
    },
    testimonials: {
      kicker: 'Témoignages',
      title: 'Ce que disent les directeurs',
      items: [
        { name: 'M. Mohammed', role: 'Directeur école privée - Casablanca', text: 'Nous avons économisé des heures de travail administratif chaque semaine, et les parents sont plus impliqués.' },
        { name: 'Mme Souad', role: 'Directrice groupe scolaire - Rabat', text: 'La plateforme est simple et les rapports financiers nous aident à prendre des décisions précises.' },
        { name: 'M. Youssef', role: 'Directeur collège - Marrakech', text: 'Le meilleur investissement pour mon administration. Support rapide et plateforme en constante évolution.' },
      ],
    },
    pricing: {
      kicker: 'Tarifs transparents',
      title: 'Payez selon votre nombre d\'élèves',
      desc: 'Commencez avec 20 élèves gratuits. Ensuite, seulement 1,5 DH par élève supplémentaire par mois.',
      currency: 'DH / élève / mois',
      popular: 'Le plus choisi',
      footer: '20 élèves gratuits · Sans engagement · Annulation à tout moment',
      plans: [
        {
          name: 'Gratuit',
          description: 'Pour tester',
          items: ['Jusqu\'à 20 élèves', 'Toutes les fonctions de base', 'Support par email', 'Sans carte bancaire'],
          cta: 'Commencer gratuitement',
        },
        {
          name: 'Standard',
          description: 'Écoles en croissance',
          items: [
            'Toutes les fonctions complètes',
            'Finances, notes, emploi du temps',
            'Messages et notifications',
            'Support prioritaire',
          ],
          examples: [
            { students: '100 élèves', price: '120 DH / mois' },
            { students: '300 élèves', price: '420 DH / mois' },
          ],
          cta: 'Commencer maintenant',
        },
        {
          name: 'Pro',
          description: 'Grands établissements',
          items: [
            'Tout Standard inclus',
            'Notifications email avancées (modèles personnalisés)',
            'Multi-écoles',
            'Gestionnaire dédié',
          ],
          examples: [
            { students: '500 élèves', price: '720 DH / mois' },
            { students: '1000 élèves', price: '1470 DH / mois' },
          ],
          cta: 'Choisir Pro',
        },
      ],
    },
    faq: {
      kicker: 'FAQ',
      title: 'Une question ? Nous avons la réponse',
      items: [
        { q: 'La plateforme est-elle vraiment gratuite ?', a: 'Oui, 20 élèves gratuits à vie. Ensuite, seulement 1,5 DH par élève supplémentaire par mois. Exemple : 100 élèves = 120 DH/mois.' },
        { q: 'Mes données sont-elles sécurisées ?', a: 'Vos données sont chiffrées et hébergées sur des serveurs sécurisés. Conformité à la loi marocaine 09-08, avec sauvegarde quotidienne.' },
        { q: 'Puis-je résilier à tout moment ?', a: 'Absolument. Aucun engagement à long terme. Résiliation en un clic depuis le tableau de bord.' },
        { q: 'La plateforme supporte-t-elle Massar ?', a: 'Bientôt, l\'offre Pro inclura l\'intégration avec Massar pour échanger les informations élèves.' },
        { q: 'Y a-t-il une application mobile ?', a: 'La plateforme fonctionne sur tous les appareils (PC, tablette, mobile) en PWA. Installation possible sur votre écran d\'accueil.' },
        { q: 'Comment fonctionne le support ?', a: 'Support par email et téléphone. Les offres payantes ont la priorité (moins de 2h en heures ouvrables).' },
      ],
    },
    finalCta: {
      title: 'Prêt à transformer votre gestion ?',
      desc: 'Rejoignez les écoles qui utilisent Madrasti pour gagner du temps, augmenter les revenus et améliorer la communication.',
      cta1: 'Commencer gratuitement',
      cta2: 'Connexion',
      trust: 'Sans carte bancaire · Sans engagement · Annulation à tout moment',
    },
    footer: {
      desc: 'Plateforme marocaine moderne pour la gestion des écoles privées. Conçue pour simplifier l\'administration.',
      product: 'Produit',
      legal: 'Légal',
      privacy: 'Confidentialité',
      terms: 'Conditions',
      cookies: 'Cookies',
      law0908: 'Loi 09-08',
      contact: 'Contact',
      address: 'Casablanca, Maroc',
      copyright: 'Tous droits réservés.',
      madeIn: 'Fait au Maroc avec fierté',
    },
  },
} as const

type Lang = 'ar' | 'fr'

// ============ ICONS ============
const problemIcons = [FileText, Wallet, Clock, Users]
const featureIcons = [Users, Wallet, BarChart3, Calendar, FileText, MessageSquare, HeartHandshake, Lock]
const featureColors = ['emerald', 'amber', 'indigo', 'purple', 'rose', 'cyan', 'orange', 'slate']
const roleIcons = [ShieldCheck, UserCog, BookOpen, Users]
const roleGradients = [
  'from-indigo-500 to-indigo-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
]

// ============ PAGE ============
export default function Home() {
  const [lang, setLang] = useState<Lang>('ar')
  const t = T[lang]

  // Set document lang & dir dynamically
  useEffect(() => {
    document.documentElement.lang = t.lang
    document.documentElement.dir = t.dir
  }, [lang, t.lang, t.dir])

  return (
    <main dir={t.dir} className="min-h-screen overflow-hidden bg-[#fbfcfe] text-[#102a43]">

      {/* ============ ANNOUNCEMENT ============ */}
      <div className="bg-[#0b4c42] py-2 px-4 text-center text-xs text-emerald-100">
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          <span>
            {t.announcement}{' '}
            <a href="#pricing" className="underline hover:text-white">
              {t.announcementLink}
            </a>
          </span>
        </span>
      </div>

      {/* ============ HERO WRAPPER ============ */}
      <div className="relative isolate bg-[#0b2f35] text-white">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #1b8c77 0, transparent 28%), radial-gradient(circle at 88% 12%, #e9a63a55 0, transparent 23%)',
          }}
        />

        {/* ============ HEADER ============ */}
        <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35] shadow-lg shadow-emerald-950/20">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-xl font-black tracking-tight">{t.brand}</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
            <a className="transition hover:text-white" href="#features">{t.nav.features}</a>
            <a className="transition hover:text-white" href="#roles">{t.nav.roles}</a>
            <a className="transition hover:text-white" href="#pricing">{t.nav.pricing}</a>
            <a className="transition hover:text-white" href="#faq">{t.nav.faq}</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-white/20 bg-white/5 p-0.5">
              <button
                onClick={() => setLang('ar')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  lang === 'ar' ? 'bg-white text-[#0b2f35]' : 'text-white/70 hover:text-white'
                }`}
                aria-label="العربية"
              >
                ع
              </button>
              <button
                onClick={() => setLang('fr')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  lang === 'fr' ? 'bg-white text-[#0b2f35]' : 'text-white/70 hover:text-white'
                }`}
                aria-label="Français"
              >
                FR
              </button>
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white/90 transition hover:bg-white/10"
            >
              {t.login}
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#0b4c42] transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              {t.startFree}
            </Link>
          </div>
        </header>

        {/* ============ HERO ============ */}
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-14 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-32 lg:pt-20">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100">
              <Sparkles className="h-4 w-4" />
              {t.hero.badge}
            </p>

            <h1 className="text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              {t.hero.title1}
              <br />
              <span className="text-emerald-300">{t.hero.title2}</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">{t.hero.desc}</p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 font-bold text-[#083a33] shadow-lg shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                <span>{t.hero.cta1}</span>
                <ArrowLeft className={`h-4 w-4 ${lang === 'fr' ? 'rotate-180' : ''}`} />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-bold transition hover:bg-white/10"
              >
                <PlayCircle className="h-4 w-4" />
                {t.hero.cta2}
              </Link>
            </div>

            <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/70">
              {t.hero.trust.map((item, i) => {
                const Icon = [ShieldCheck, Check, Zap][i]
                return (
                  <span key={i} className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Mockup */}
          <div className="relative mx-auto w-full max-w-md self-center">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-emerald-400/15 blur-2xl" />
            <div className="rounded-[1.75rem] border border-white/15 bg-white/95 p-4 text-[#102a43] shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-emerald-700">{t.mockup.kicker}</p>
                  <p className="mt-1 text-lg font-extrabold">{t.mockup.title}</p>
                </div>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <BarChart3 className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label={t.mockup.students} value="248" tone="bg-emerald-50 text-emerald-700" />
                <Metric label={t.mockup.revenue} value="48 500 DH" tone="bg-amber-50 text-amber-700" />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="font-bold">{t.mockup.collect}</span>
                  <span className="text-emerald-700">
                    <Num>+12.5%</Num>
                  </span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {[38, 58, 46, 76, 63, 92, 82].map((height, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t-md bg-emerald-600/80"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={`absolute ${lang === 'ar' ? '-left-8' : '-right-8'} top-32 hidden lg:block`}>
              <div className="rounded-2xl bg-white p-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-700">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mockup.remaining}</p>
                    <p className="text-xs font-bold text-rose-600">
                      <Num>2 500 DH</Num>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`absolute ${lang === 'ar' ? '-right-8' : '-left-8'} bottom-20 hidden lg:block`}>
              <div className="rounded-2xl bg-white p-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500">{t.mockup.success}</p>
                    <p className="text-xs font-bold text-emerald-600">
                      <Num>87%</Num>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 lg:grid-cols-4 lg:px-8">
            {t.stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">
                  <Num>{s.value}</Num>
                </p>
                <p className="mt-1 text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ PROBLEMS ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="page-kicker">{t.problems.kicker}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.problems.title}</h2>
          <p className="mt-4 leading-7 text-slate-500">{t.problems.desc}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {t.problems.items.map((p, i) => {
            const Icon = problemIcons[i]
            return (
              <div key={i} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-100 text-rose-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-extrabold">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{p.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">{t.features.kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.features.title}</h2>
            <p className="mt-4 leading-7 text-slate-500">{t.features.desc}</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.items.map((f, i) => {
              const Icon = featureIcons[i]
              const color = featureColors[i]
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-50 text-emerald-700',
                amber: 'bg-amber-50 text-amber-700',
                indigo: 'bg-indigo-50 text-indigo-700',
                purple: 'bg-purple-50 text-purple-700',
                rose: 'bg-rose-50 text-rose-700',
                cyan: 'bg-cyan-50 text-cyan-700',
                orange: 'bg-orange-50 text-orange-700',
                slate: 'bg-slate-100 text-slate-700',
              }
              return (
                <article
                  key={i}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${colorMap[color]}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-base font-extrabold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{f.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ ADVANCED MODULES ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="page-kicker">{t.advanced.kicker}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {t.advanced.title}
          </h2>
          <p className="mt-4 leading-7 text-slate-500">{t.advanced.desc}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.advanced.items.map((adv, i) => {
            const icons = [ClipboardCheck, Users, Gavel, Calendar, BarChart3, Smartphone, Send, Palette]
            const Icon = icons[i]
            const gradients = [
              'from-sky-500 to-sky-700',
              'from-indigo-500 to-indigo-700',
              'from-rose-500 to-rose-700',
              'from-emerald-500 to-emerald-700',
              'from-amber-500 to-amber-700',
              'from-violet-500 to-violet-700',
              'from-cyan-500 to-cyan-700',
              'from-orange-500 to-orange-700',
            ]
            const gradient = gradients[i]
            return (
              <article
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${gradient}`} />
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-base font-extrabold">{adv.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{adv.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ============ ROLES ============ */}
      <section id="roles" className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">{t.roles.kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.roles.title}</h2>
            <p className="mt-4 leading-7 text-slate-500">{t.roles.desc}</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.roles.items.map((r, i) => {
              const Icon = roleIcons[i]
              const gradient = roleGradients[i]
              return (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-xl"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${gradient}`} />
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold">{r.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{r.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="page-kicker">{t.testimonials.kicker}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {t.testimonials.title}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {t.testimonials.items.map((tst, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700">"{tst.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                  {tst.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold">{tst.name}</p>
                  <p className="text-xs text-slate-500">{tst.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="border-y border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <p className="page-kicker">{t.pricing.kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.pricing.title}</h2>
            <p className="mt-4 leading-7 text-slate-500">{t.pricing.desc}</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {t.pricing.plans.map((plan, i) => {
              const featured = i === 1
              const isGratuit = i === 0

              return (
                <article
                  key={i}
                  className={`relative rounded-[1.35rem] border p-7 transition ${
                    featured
                      ? 'border-emerald-600 bg-[#0b4c42] text-white shadow-2xl shadow-emerald-900/25 lg:scale-105'
                      : 'border-slate-200 bg-white hover:border-emerald-200'
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 right-6 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">
                      {t.pricing.popular}
                    </span>
                  )}

                  <p className={`font-bold ${featured ? 'text-emerald-200' : 'text-emerald-700'}`}>
                    {plan.name}
                  </p>
                  <p className={`mt-2 text-sm ${featured ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-end gap-2 flex-wrap">
                    {isGratuit ? (
                      <>
                        <span className="text-4xl font-black">
                          <Num>0</Num>
                        </span>
                        <span className={`mb-1 text-sm ${featured ? 'text-emerald-100' : 'text-slate-500'}`}>
                          درهم
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-black">
                          <Num>1.5</Num>
                        </span>
                        <span className={`mb-1 text-sm ${featured ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {t.pricing.currency}
                        </span>
                      </>
                    )}
                  </div>

                  {!isGratuit && (plan as any).examples && (
                    <div className={`mt-4 rounded-xl p-3 space-y-1.5 ${
                      featured ? 'bg-white/10' : 'bg-slate-50'
                    }`}>
                      {(plan as any).examples.map((ex: any, k: number) => (
                        <div
                          key={k}
                          className={`flex items-center justify-between text-xs ${
                            featured ? 'text-emerald-100' : 'text-slate-600'
                          }`}
                        >
                          <span>{ex.students}</span>
                          <span className="font-bold">
                            <Num>{ex.price}</Num>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item, k) => (
                      <li
                        key={k}
                        className={`flex items-center gap-2 text-sm ${
                          featured ? 'text-white/90' : 'text-slate-600'
                        }`}
                      >
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`mt-8 flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
                      featured
                        ? 'bg-white text-[#0b4c42] hover:bg-emerald-50'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              )
            })}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">{t.pricing.footer}</p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
        <div className="text-center">
          <p className="page-kicker">{t.faq.kicker}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.faq.title}</h2>
        </div>

        <div className="mt-12 space-y-3">
          {t.faq.items.map((f, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-slate-200 bg-white transition open:border-emerald-300 open:bg-emerald-50/30"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-bold text-slate-800 transition hover:text-emerald-700">
                {f.q}
                <ChevronLeft
                  className={`h-5 w-5 shrink-0 transition group-open:-rotate-90 ${
                    lang === 'fr' ? 'rotate-180' : ''
                  }`}
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0b2f35] p-10 text-center text-white lg:p-16">
          <div
            className="absolute inset-0 -z-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, #1b8c77 0, transparent 35%), radial-gradient(circle at 80% 50%, #e9a63a55 0, transparent 35%)',
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.finalCta.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-200">{t.finalCta.desc}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-7 py-3.5 font-bold text-[#083a33] shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                {t.finalCta.cta1}
                <ArrowLeft className={`h-4 w-4 ${lang === 'fr' ? 'rotate-180' : ''}`} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 font-bold transition hover:bg-white/10"
              >
                {t.finalCta.cta2}
              </Link>
            </div>

            <p className="mt-6 text-sm text-white/60">{t.finalCta.trust}</p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0b2f35] text-slate-300">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35]">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <span className="text-xl font-black text-white">{t.brand}</span>
              </Link>
              <p className="mt-4 text-sm leading-7 text-slate-400">{t.footer.desc}</p>

              <div className="mt-5 flex gap-2">
                <a
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-emerald-500 hover:text-white"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-emerald-500 hover:text-white"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-emerald-500 hover:text-white"
                  aria-label="LinkedIn"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t.footer.product}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#features" className="transition hover:text-emerald-300">{t.nav.features}</a></li>
                <li><a href="#roles" className="transition hover:text-emerald-300">{t.nav.roles}</a></li>
                <li><a href="#pricing" className="transition hover:text-emerald-300">{t.nav.pricing}</a></li>
                <li><a href="#faq" className="transition hover:text-emerald-300">{t.nav.faq}</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t.footer.legal}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/legal/privacy" className="transition hover:text-emerald-300">{t.footer.privacy}</Link></li>
                <li><Link href="/legal/terms" className="transition hover:text-emerald-300">{t.footer.terms}</Link></li>
                <li><Link href="/legal/cookies" className="transition hover:text-emerald-300">{t.footer.cookies}</Link></li>
                <li><Link href="/legal/loi-09-08" className="transition hover:text-emerald-300">{t.footer.law0908}</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t.footer.contact}</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-300" />
                  <a href="mailto:contact@madrasti.ma" className="transition hover:text-emerald-300">
                    contact@madrasti.ma
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-300" />
                  <a href="tel:+212500000000" className="transition hover:text-emerald-300" dir="ltr">
                    +212 5 00 00 00 00
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{t.footer.address}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {t.brand}. {t.footer.copyright}
            </p>
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Globe className="h-3.5 w-3.5" />
              {t.footer.madeIn}
            </p>
          </div>
        </div>
      </footer>

    </main>
  )
}

// Renders numbers with LTR direction to prevent flipping in RTL
function Num({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={className}>
      {children}
    </span>
  )
}

// ============ SUB-COMPONENT ============
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-2 text-lg font-black">
        <Num>{value}</Num>
      </p>
    </div>
  )
}