'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowUp, BarChart3, Check, ChevronLeft, GraduationCap, ShieldCheck,
  Sparkles, Users, Wallet, Calendar, FileText, MessageSquare, Lock,
  TrendingUp, Clock, BookOpen, Star, Phone, Mail, MapPin, Globe,
  UserCog, HeartHandshake, Zap, PlayCircle,
  Smartphone, ClipboardCheck, Gavel, UserCheck, Send, Palette,
  X, Quote, Rocket, Settings2, PartyPopper, Search,
} from 'lucide-react'

// ============ TRANSLATIONS ============
const T = {
  ar: {
    dir: 'rtl' as const,
    lang: 'ar' as const,
    brand: 'مدرستي',
    nav: { features: 'المميزات', how: 'كيف تبدأ', demo: 'المنصة', pricing: 'الأسعار', faq: 'أسئلة شائعة' },
    login: 'تسجيل الدخول',
    startFree: 'ابدأ مجاناً',
    announcement: 'جديد: دعم كامل لـ WhatsApp Business   ',
    announcementLink: 'اكتشف المزيد',
    welcome: {
      badge: 'مرحباً بك في مدرستي',
      title: 'المنصة رقم 1 لتسيير المدارس الخاصة بالمغرب',
      desc: 'وفّر ساعات من عملك الإداري كل أسبوع. أدر التلاميذ، الأقساط، النقط، والتواصل مع الأولياء — كل شيء في مكان واحد.',
      bullets: [
        'ابدأ مجاناً — حتى 20 تلميذاً بدون أي تكلفة',
        'إعداد في أقل من 10 دقائق، بدون بطاقة بنكية',
        'ثقة أكثر من 100 مؤسسة تعليمية مغربية',
      ],
      cta1: 'ابدأ الآن مجاناً',
      cta2: 'استكشف المنصة',
      ctaSkip: 'تخطي',
    },
    hero: {
      badge: 'منصة عصرية للمدارس الخاصة بالمغرب',
      ministry: 'مطابقة للقانون 09-08 لحماية المعطيات',
      title1: 'تسيير مدرستك،',
      title2: 'بوضوح وراحة بال.',
      desc: 'كل ما تحتاجه الإدارة في مساحة واحدة: التلاميذ، التسجيل، الأقساط، الصندوق، النقط، الحضور، والتواصل مع الأولياء.',
      cta1: 'أنشئ حساب مؤسستك مجاناً',
      cta2: 'شاهد المنصة',
      eyebrowTrust: 'بدون بطاقة بنكية · إعداد في 10 دقائق',
      trust: ['بيانات منظّمة وآمنة', 'تجربة مجانية مدى الحياة', 'بدون بطاقة بنكية'],
    },
    mockup: { kicker: 'نظرة سريعة', title: 'ملخص المؤسسة', students: 'التلاميذ النشطون', revenue: 'مداخيل هذا الشهر', collect: 'حالة التحصيل', remaining: 'المتبقي', success: 'نسبة النجاح' },
    stats: [
      { value: '100+', label: 'مؤسسة تثق بنا' },
      { value: '15,000+', label: 'تلميذ مُدار' },
      { value: '12h', label: 'موفرة أسبوعياً' },
      { value: '24/7', label: 'دعم متواصل' },
    ],
    socialProof: {
      title: 'موثوق بها من طرف مدارس خاصة في المغرب',
      items: ['مدرسة النخبة', 'أكاديمية المستقبل', 'مجموعة الأمل', 'مدرسة الراشدين', 'أكاديمية النجاح'],
    },
    problems: {
      kicker: 'التحديات اليومية',
      title: 'التحديات اليومية لتسيير مدرسة خاصة',
      desc: 'كل مؤسسة تعليمية تواجه تحديات في التسيير اليومي. "مدرستي" صُمّمت لتقديم حلول عملية لكل واحدة منها.',
      items: [
        { title: 'ملفات ورقية متفرقة', text: 'كل معلومة في دفتر أو Excel، والبحث يستغرق وقتاً طويلاً.' },
        { title: 'أقساط ضائعة', text: 'لا تعرف من دفع، من تأخر، ولا المبلغ المتبقي في الصندوق.' },
        { title: 'وقت ضائع في الإدارة', text: 'ساعات في التسجيل، الفواتير، والتقارير بدل التركيز على التعليم.' },
        { title: 'تواصل ضعيف مع الأولياء', text: 'لا وسيلة سريعة لإخبار الآباء بالغيابات، النقط، أو المستجدات.' },
      ],
    },
    comparison: {
      kicker: 'لماذا مدرستي؟',
      title: 'الطريقة القديمة مقابل الطريقة الحديثة',
      desc: 'شوف الفرق بعينيك. نفس المدرسة، تجربة مختلفة تماماً.',
      old: {
        title: 'بدون منصة',
        items: [
          'Excel ودفاتر ورقية متفرقة',
          'بحث يدوي عن كل معلومة',
          'أخطاء في الحسابات والأقساط',
          'غيابات بدون تتبع دقيق',
          'تواصل صعب مع الأولياء',
          'تقارير تُحضّر يدوياً كل شهر',
        ],
      },
      new: {
        title: 'مع مدرستي',
        items: [
          'قاعدة بيانات موحّدة وآمنة',
          'بحث فوري في كل الملفات',
          'حساب تلقائي دقيق للأقساط',
          'تتبع الغيابات + إشعار فوري',
          'رسائل وواتساب وإيميل مباشر',
          'تقارير جاهزة بضغطة واحدة',
        ],
      },
    },
    demo: {
      kicker: 'شاهد المنصة',
      title: 'جولة سريعة داخل المنصة',
      desc: 'صور حقيقية من داخل النظام — كل ما ستراه هو ما ستستعمله يومياً.',
      cta: 'انقر على أي صورة لتكبيرها',
      screenshots: [
        { src: '/images/landing/dashboard.png', title: 'لوحة القيادة', desc: 'ملخص شامل للمؤسسة' },
        { src: '/images/landing/caisse.png', title: 'الصندوق والمالية', desc: 'تتبع الأقساط والمداخيل' },
        { src: '/images/landing/teacher.png', title: 'لوحة الأستاذ', desc: 'النقط والحضور من الهاتف' },
        { src: '/images/landing/parent.png', title: 'فضاء الأولياء', desc: 'متابعة الأبناء في الوقت الحقيقي' },
        { src: '/images/landing/timetable.png', title: 'جدول الحصص', desc: 'إنشاء تلقائي بدون تعارضات' },
        { src: '/images/landing/bulletin.png', title: 'الكشوف والنقط', desc: 'كشوف رسمية PDF بضغطة' },
      ],
    },
    features: {
      kicker: 'الحل المتكامل',
      title: 'إدارة متكاملة لمؤسستك',
      desc: 'من التسجيل إلى آخر دفعة، واجهة موحّدة لفريق الإدارة، ومعلومات دقيقة تساعدك على اتخاذ القرار بثقة.',
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
    howItWorks: {
      kicker: 'كيف تبدأ؟',
      title: 'ابدأ في 3 خطوات بسيطة',
      desc: 'ما عندكش شي حاجة صعبة. ف 10 دقائق تكون جاهز.',
      steps: [
        { title: 'أنشئ حساب مؤسستك', text: 'سجّل بالمعلومات الأساسية — الاسم، العنوان، البريد. بدون بطاقة بنكية.' },
        { title: 'أضف تلاميذك وأقسامك', text: 'استورد قائمتك من Excel أو أدخلها يدوياً. كل شي يتحفظ تلقائياً.' },
        { title: 'ابدأ التسيير اليومي', text: 'سجّل الحضور، الأقساط، النقط، وابعث الإشعارات للأولياء بضغطة.' },
      ],
    },
    advanced: {
      kicker: 'وحدات متقدمة',
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
      kicker: 'مصمم لكل دور',
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
      kicker: 'آراء العملاء',
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
        { q: 'كيف يتم الدعم؟', a: 'دعم عبر البريد الإلكتروني والهاتف والواتساب. الخطط المدفوعة تتمتع بأولوية في الرد (أقل من ساعتين في أوقات العمل).' },
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
      address: 'المملكة المغربية',
      copyright: 'جميع الحقوق محفوظة.',
      madeIn: 'صنع في المغرب بكل فخر',
      emailValue: 'madrasti.plateforme@gmail.com',
    },
  },
  fr: {
    dir: 'ltr' as const,
    lang: 'fr' as const,
    brand: 'Madrasti',
    nav: { features: 'Fonctionnalités', how: 'Comment ça marche', demo: 'Plateforme', pricing: 'Tarifs', faq: 'FAQ' },
    login: 'Connexion',
    startFree: 'Commencer gratuitement',
    announcement: 'Nouveau : support complet WhatsApp Business',
    announcementLink: 'En savoir plus',
    welcome: {
      badge: 'Bienvenue sur Madrasti',
      title: 'La plateforme n°1 de gestion des écoles privées au Maroc',
      desc: 'Économisez des heures de gestion administrative chaque semaine. Gérez élèves, échéances, notes et communication parents — tout en un.',
      bullets: [
        'Commencez gratuitement — jusqu\'à 20 élèves sans frais',
        'Prêt en moins de 10 minutes, sans carte bancaire',
        'La confiance de plus de 100 établissements au Maroc',
      ],
      cta1: 'Commencer gratuitement',
      cta2: 'Découvrir la plateforme',
      ctaSkip: 'Passer',
    },
    hero: {
      badge: 'Plateforme moderne pour les écoles privées au Maroc',
      ministry: 'Conforme à la loi 09-08 sur la protection des données',
      title1: 'Gérez votre école,',
      title2: 'en toute clarté.',
      desc: 'Tout ce dont votre administration a besoin dans un seul espace : élèves, inscriptions, échéances, caisse, notes, présence, et communication avec les parents.',
      cta1: 'Créer mon établissement gratuitement',
      cta2: 'Voir la plateforme',
      eyebrowTrust: 'Sans carte bancaire · Prêt en 10 minutes',
      trust: ['Données organisées et sécurisées', 'Essai gratuit à vie', 'Sans carte bancaire'],
    },
    mockup: { kicker: 'Aperçu rapide', title: 'Résumé de l\'établissement', students: 'Élèves actifs', revenue: 'Revenus ce mois', collect: 'Taux de recouvrement', remaining: 'Restant', success: 'Taux de réussite' },
    stats: [
      { value: '100+', label: 'Écoles nous font confiance' },
      { value: '15,000+', label: 'Élèves gérés' },
      { value: '12h', label: 'Économisées/sem.' },
      { value: '24/7', label: 'Support continu' },
    ],
    socialProof: {
      title: 'Adoptée par des écoles privées au Maroc',
      items: ['École Elites', 'Académie Avenir', 'Groupe Amal', 'École Rachidine', 'Académie Najah'],
    },
    problems: {
      kicker: 'Défis quotidiens',
      title: 'Les défis quotidiens des écoles privées',
      desc: 'Chaque établissement fait face à des défis de gestion au quotidien. Madrasti a été conçue pour y répondre concrètement.',
      items: [
        { title: 'Dossiers papier éparpillés', text: 'Chaque information dans un cahier ou Excel, la recherche prend du temps.' },
        { title: 'Échéances perdues', text: 'Vous ne savez pas qui a payé, qui est en retard, ni le solde de la caisse.' },
        { title: 'Temps perdu en administration', text: 'Des heures en inscriptions, factures et rapports au lieu de se concentrer sur l\'enseignement.' },
        { title: 'Communication faible avec les parents', text: 'Aucun moyen rapide d\'informer les parents des absences, notes ou actualités.' },
      ],
    },
    comparison: {
      kicker: 'Pourquoi Madrasti ?',
      title: 'L\'ancienne méthode vs la moderne',
      desc: 'Voyez la différence. Même école, expérience totalement différente.',
      old: {
        title: 'Sans plateforme',
        items: [
          'Excel et dossiers papier éparpillés',
          'Recherche manuelle de chaque information',
          'Erreurs dans les calculs et échéances',
          'Absences sans suivi précis',
          'Communication difficile avec les parents',
          'Rapports préparés manuellement chaque mois',
        ],
      },
      new: {
        title: 'Avec Madrasti',
        items: [
          'Base de données unifiée et sécurisée',
          'Recherche instantanée dans tous les dossiers',
          'Calcul automatique et précis des échéances',
          'Suivi des absences + notification instantanée',
          'Messages, WhatsApp et email directs',
          'Rapports prêts en un clic',
        ],
      },
    },
    demo: {
      kicker: 'Découvrir',
      title: 'Un tour rapide de la plateforme',
      desc: 'Captures réelles depuis l\'application — ce que vous voyez est ce que vous utiliserez au quotidien.',
      cta: 'Cliquez sur une image pour l\'agrandir',
      screenshots: [
        { src: '/images/landing/dashboard.png', title: 'Tableau de bord', desc: 'Vue d\'ensemble de l\'établissement' },
        { src: '/images/landing/caisse.png', title: 'Caisse & Finance', desc: 'Suivi des échéances et revenus' },
        { src: '/images/landing/teacher.png', title: 'Espace Enseignant', desc: 'Notes et présence depuis le téléphone' },
        { src: '/images/landing/parent.png', title: 'Espace Parent', desc: 'Suivi des enfants en temps réel' },
        { src: '/images/landing/timetable.png', title: 'Emploi du temps', desc: 'Génération auto sans conflits' },
        { src: '/images/landing/bulletin.png', title: 'Bulletins & Notes', desc: 'Bulletins PDF officiels en un clic' },
      ],
    },
    features: {
      kicker: 'La solution intégrée',
      title: 'Une gestion complète, en toute sérénité',
      desc: 'De l\'inscription au dernier paiement, une interface unifiée pour votre équipe et des informations précises pour décider avec confiance.',
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
    howItWorks: {
      kicker: 'Comment démarrer ?',
      title: 'Lancez-vous en 3 étapes simples',
      desc: 'Rien de compliqué. En 10 minutes, vous êtes prêt.',
      steps: [
        { title: 'Créez votre établissement', text: 'Inscrivez-vous avec les informations de base — nom, adresse, email. Sans carte bancaire.' },
        { title: 'Ajoutez vos élèves et classes', text: 'Importez votre liste depuis Excel ou saisissez-la. Tout est sauvegardé automatiquement.' },
        { title: 'Commencez la gestion quotidienne', text: 'Présence, échéances, notes, et envoyez les notifications aux parents en un clic.' },
      ],
    },
    advanced: {
      kicker: 'Modules avancés',
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
      kicker: 'Pensé pour chaque rôle',
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
      kicker: 'Avis clients',
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
        { q: 'Comment fonctionne le support ?', a: 'Support par email, téléphone et WhatsApp. Les offres payantes ont la priorité (moins de 2h en heures ouvrables).' },
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
      address: 'Royaume du Maroc',
      copyright: 'Tous droits réservés.',
      madeIn: 'Fait au Maroc avec fierté',
      emailValue: 'madrasti.plateforme@gmail.com',
    },
  },
} as const

type Lang = 'ar' | 'fr'
type Shot = { src: string; title: string; desc: string }

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

// ============ SCROLL REVEAL HOOK ============
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 700ms cubic-bezier(.2,.7,.3,1) ${delay}ms, transform 700ms cubic-bezier(.2,.7,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ============ PAGE ============
export default function Home() {
  const [lang, setLang] = useState<Lang>('ar')
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lightbox, setLightbox] = useState<Shot | null>(null)
  const [showTop, setShowTop] = useState(false)
  const t = T[lang]

  // Set document lang & dir dynamically
  useEffect(() => {
    document.documentElement.lang = t.lang
    document.documentElement.dir = t.dir
  }, [lang, t.lang, t.dir])

  // Welcome modal — once per visitor
  useEffect(() => {
    setMounted(true)
    try {
      const seen = localStorage.getItem('madrasti_welcomed')
      if (!seen) {
        const timer = setTimeout(() => setWelcomeOpen(true), 400)
        return () => clearTimeout(timer)
      }
    } catch {
      // SSR / privacy mode
    }
  }, [])

  // Back to top button
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ESC key closes modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null)
        if (welcomeOpen) closeWelcome()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeOpen])

  const closeWelcome = () => {
    setWelcomeOpen(false)
    try {
      localStorage.setItem('madrasti_welcomed', '1')
    } catch {}
  }

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <main dir={t.dir} className="min-h-screen overflow-hidden bg-[#fbfcfe] text-[#102a43]">

      {/* ============ GLOBAL KEYFRAMES ============ */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(.9); opacity: .7; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .anim-fade-up { animation: fade-in-up .7s cubic-bezier(.2,.7,.3,1) both; }
        .anim-fade { animation: fade-in .5s ease both; }
        .anim-scale { animation: scale-in .5s cubic-bezier(.2,.7,.3,1) both; }
        .anim-float { animation: float-slow 5s ease-in-out infinite; }
        .shine-text {
          background: linear-gradient(90deg, currentColor 0%, #6ee7b7 50%, currentColor 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 4s linear infinite;
        }
      `}</style>

      {/* ============ WELCOME MODAL ============ */}
      {mounted && welcomeOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 anim-fade"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-[#0b2f35]/70 backdrop-blur-md" onClick={closeWelcome} />

          <div
            dir={t.dir}
            className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/15 bg-white p-7 shadow-2xl anim-scale sm:p-9"
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
            />

            <button
              onClick={closeWelcome}
              className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 rtl:left-auto rtl:right-4"
              aria-label={t.welcome.ctaSkip}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                {t.welcome.badge}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/20">
                  <GraduationCap className="h-8 w-8" />
                </span>
                <div>
                  <p className="text-2xl font-black tracking-tight text-[#102a43]">{t.brand}</p>
                  <p className="text-xs text-slate-500">{t.footer.madeIn}</p>
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                {t.welcome.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">{t.welcome.desc}</p>

              <ul className="mt-5 space-y-2.5">
                {t.welcome.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-700 anim-fade-up"
                    style={{ animationDelay: `${200 + i * 100}ms` }}
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  onClick={closeWelcome}
                  className="inline-flex flex-1 min-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:bg-emerald-600"
                >
                  <Rocket className="h-4 w-4" />
                  {t.welcome.cta1}
                </Link>
                <button
                  onClick={closeWelcome}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {t.welcome.cta2}
                </button>
              </div>

              <button
                onClick={closeWelcome}
                className="mt-5 block w-full text-center text-xs text-slate-400 underline-offset-4 transition hover:text-slate-600 hover:underline"
              >
                {t.welcome.ctaSkip}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ============ STICKY HEADER ============ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b2f35]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35] shadow-lg shadow-emerald-950/20">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-tight text-white">{t.brand}</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/75 lg:flex">
            <a className="transition hover:text-white" href="#features">{t.nav.features}</a>
            <a className="transition hover:text-white" href="#demo">{t.nav.demo}</a>
            <a className="transition hover:text-white" href="#how">{t.nav.how}</a>
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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/20"
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
        </div>
      </header>

      {/* ============ HERO ============ */}
      <div className="relative isolate bg-[#0b2f35] text-white">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #1b8c77 0, transparent 28%), radial-gradient(circle at 88% 12%, #e9a63a55 0, transparent 23%)',
          }}
        />

        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-14 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-32 lg:pt-20">
          <div className="max-w-2xl">
            {/* Ministry badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200 anim-fade-up">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white p-0.5">
                <Image
                  src="/images/ministry-logo.png"
                  alt="Ministère"
                  width={18}
                  height={18}
                  className="rounded-full object-contain"
                  unoptimized
                />
              </span>
              {t.hero.ministry}
            </div>

            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100 anim-fade-up">
              <Sparkles className="h-4 w-4" />
              {t.hero.badge}
            </p>

            <h1
              className="text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl anim-fade-up"
              style={{ animationDelay: '80ms' }}
            >
              {t.hero.title1}
              <br />
              <span className="text-emerald-300 shine-text">{t.hero.title2}</span>
            </h1>

            <p
              className="mt-6 max-w-xl text-lg leading-8 text-slate-200 anim-fade-up"
              style={{ animationDelay: '160ms' }}
            >
              {t.hero.desc}
            </p>

            <div
              className="mt-9 flex flex-wrap gap-3 anim-fade-up"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 font-bold text-[#083a33] shadow-lg shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                <span>{t.hero.cta1}</span>
                <ArrowLeft
                  className={`h-4 w-4 transition group-hover:-translate-x-1 ${
                    lang === 'fr' ? 'rotate-180 group-hover:translate-x-1' : ''
                  }`}
                />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-bold transition hover:bg-white/10"
              >
                <PlayCircle className="h-4 w-4" />
                {t.hero.cta2}
              </a>
            </div>

            <p
              className="mt-4 text-xs text-emerald-200/80 anim-fade-up"
              style={{ animationDelay: '320ms' }}
            >
              {t.hero.eyebrowTrust}
            </p>

            <div
              className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/70 anim-fade-up"
              style={{ animationDelay: '400ms' }}
            >
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
          <div className="relative mx-auto w-full max-w-md self-center anim-fade-up" style={{ animationDelay: '300ms' }}>
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

            <div className={`absolute ${lang === 'ar' ? '-left-8' : '-right-8'} top-32 hidden lg:block anim-float`}>
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

            <div className={`absolute ${lang === 'ar' ? '-right-8' : '-left-8'} bottom-20 hidden lg:block anim-float`} style={{ animationDelay: '1.5s' }}>
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

      {/* ============ SOCIAL PROOF ============ */}
      <Reveal>
        <section className="border-b border-slate-100 bg-white py-12">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.socialProof.title}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
              {t.socialProof.items.map((name, i) => (
                <span
                  key={i}
                  className="text-base font-black tracking-tight text-slate-300 transition hover:text-emerald-500"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ============ PROBLEMS ============ */}
      <Reveal>
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
                <Reveal key={i} delay={i * 80}>
                  <div className="group rounded-2xl border border-rose-100 bg-rose-50/40 p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-100/50">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-100 text-rose-700 transition group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold">{p.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{p.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>
      </Reveal>

      {/* ============ COMPARISON ============ */}
      <Reveal>
        <section className="border-y border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="page-kicker">{t.comparison.kicker}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.comparison.title}</h2>
              <p className="mt-4 leading-7 text-slate-500">{t.comparison.desc}</p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-200 text-slate-500">
                    <X className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-black text-slate-500">{t.comparison.old.title}</h3>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {t.comparison.old.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-500">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      <span className="line-through decoration-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-emerald-500 bg-[#0b4c42] p-7 text-white shadow-2xl shadow-emerald-900/25">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-[#0b2f35]">
                    <Check className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-black text-emerald-200">{t.comparison.new.title}</h3>
                </div>
                <ul className="mt-6 space-y-3.5">
                  {t.comparison.new.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/95">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ============ DEMO / SCREENSHOTS ============ */}
      <Reveal>
        <section id="demo" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">{t.demo.kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.demo.title}</h2>
            <p className="mt-4 leading-7 text-slate-500">{t.demo.desc}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.demo.screenshots.map((shot, i) => (
              <Reveal key={i} delay={i * 80}>
                <button
                  type="button"
                  onClick={() => setLightbox(shot)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-right shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-100"
                >
                  {/* Browser bar */}
                  <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-100/80 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-[10px] font-medium text-slate-400">madrasti.win</span>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Image
                      src={shot.src}
                      alt={shot.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-top transition duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0b2f35]/0 transition group-hover:bg-[#0b2f35]/30">
                      <span className="grid h-12 w-12 scale-75 place-items-center rounded-full bg-white/95 text-[#0b2f35] opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                        <Search className="h-5 w-5" />
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="p-4" dir={t.dir}>
                    <p className="text-sm font-extrabold text-slate-800">{shot.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{shot.desc}</p>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-center text-xs font-medium text-slate-400">{t.demo.cta}</p>
        </section>
      </Reveal>

      {/* ============ FEATURES ============ */}
      <Reveal>
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
                const isLarge = i === 0 || i === 1
                return (
                  <Reveal key={i} delay={i * 60} className={isLarge ? 'sm:col-span-2 lg:col-span-2' : ''}>
                    <article className="group h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
                      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${colorMap[color]} transition group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-base font-extrabold">{f.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{f.text}</p>
                    </article>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ============ HOW IT WORKS ============ */}
      <Reveal>
        <section id="how" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="page-kicker">{t.howItWorks.kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.howItWorks.title}</h2>
            <p className="mt-4 leading-7 text-slate-500">{t.howItWorks.desc}</p>
          </div>

          <div className="relative mt-14 grid gap-8 lg:grid-cols-3">
            <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 lg:block" />

            {t.howItWorks.steps.map((step, i) => {
              const icons = [Rocket, Settings2, PartyPopper]
              const Icon = icons[i]
              return (
                <Reveal key={i} delay={i * 120}>
                  <div className="relative text-center">
                    <div className="relative z-10 mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-900/20">
                      <Icon className="h-9 w-9" />
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      <Num>{i + 1}</Num>
                      <span>خطوة</span>
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-slate-500">{step.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>
      </Reveal>

      {/* ============ ADVANCED MODULES ============ */}
      <Reveal>
        <section className="border-y border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="page-kicker">{t.advanced.kicker}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.advanced.title}</h2>
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
                  <Reveal key={i} delay={i * 60}>
                    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${gradient}`} />
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md transition group-hover:scale-110`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-base font-extrabold">{adv.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{adv.text}</p>
                    </article>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ============ ROLES ============ */}
      <Reveal>
        <section id="roles" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
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
                <Reveal key={i} delay={i * 80}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-xl">
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${gradient}`} />
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md transition group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-extrabold">{r.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{r.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>
      </Reveal>

      {/* ============ TESTIMONIALS ============ */}
      <Reveal>
        <section className="border-y border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="page-kicker">{t.testimonials.kicker}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.testimonials.title}</h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {t.testimonials.items.map((tst, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="relative h-full rounded-2xl border border-slate-100 bg-slate-50/40 p-6 transition hover:shadow-lg">
                    <Quote className="absolute -top-3 right-5 h-8 w-8 text-emerald-200" />
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ============ PRICING ============ */}
      <Reveal>
        <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
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
                <Reveal key={i} delay={i * 100}>
                  <article
                    className={`relative h-full rounded-[1.35rem] border p-7 transition ${
                      featured
                        ? 'border-emerald-600 bg-[#0b4c42] text-white shadow-2xl shadow-emerald-900/25 lg:scale-[1.03]'
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
                </Reveal>
              )
            })}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">{t.pricing.footer}</p>
        </section>
      </Reveal>

      {/* ============ FAQ ============ */}
      <Reveal>
        <section id="faq" className="border-y border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-3xl px-5 lg:px-8">
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
          </div>
        </section>
      </Reveal>

      {/* ============ FINAL CTA ============ */}
      <Reveal>
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
      </Reveal>

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
              <p className="mt-4 text-sm leading-7 text-slate-300">{t.footer.desc}</p>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white p-1">
                  <Image
                    src="/images/ministry-logo.png"
                    alt="Ministère"
                    width={24}
                    height={24}
                    className="object-contain"
                    unoptimized
                  />
                </span>
                <span className="text-xs font-medium text-slate-300">
                  {lang === 'ar' ? 'مطابقة للقانون 09-08' : 'Conforme loi 09-08'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-white">{t.footer.product}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#features" className="transition hover:text-emerald-300">{t.nav.features}</a></li>
                <li><a href="#demo" className="transition hover:text-emerald-300">{t.nav.demo}</a></li>
                <li><a href="#how" className="transition hover:text-emerald-300">{t.nav.how}</a></li>
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
              <p className="text-base font-bold text-white">{t.footer.contact}</p>
              <ul className="mt-4 space-y-3.5 text-sm text-slate-200">
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-300" />
                  <a
                    href={`mailto:${t.footer.emailValue}`}
                    className="font-medium transition hover:text-emerald-300 break-all"
                    dir="ltr"
                  >
                    {t.footer.emailValue}
                  </a>
                </li>

                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="font-medium">{t.footer.address}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-sm font-medium text-slate-200">
              © <Num>{new Date().getFullYear()}</Num> {t.brand}. {t.footer.copyright}
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Globe className="h-4 w-4 text-emerald-300" />
              {t.footer.madeIn}
            </p>
          </div>
        </div>
      </footer>

      {/* ============ LIGHTBOX ============ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0b2f35]/90 p-4 backdrop-blur-md anim-fade"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl anim-scale"
            onClick={(e) => e.stopPropagation()}
            dir={t.dir}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div>
                <p className="font-extrabold text-slate-800">{lightbox.title}</p>
                <p className="text-xs text-slate-500">{lightbox.desc}</p>
              </div>
              <span className="hidden rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 sm:block">
                {t.brand}
              </span>
            </div>
            <div className="relative aspect-[16/10] w-full bg-slate-50">
              <Image
                src={lightbox.src}
                alt={lightbox.title}
                fill
                sizes="90vw"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ BACK TO TOP ============ */}
      {showTop && (
        <button
          onClick={scrollTop}
          className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#0b2f35] text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#0b4c42] anim-scale"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

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