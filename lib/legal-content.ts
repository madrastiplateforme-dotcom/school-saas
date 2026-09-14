// ================================================
// المحتوى القانوني (AR + FR)
// ================================================

export type LegalLang = 'ar' | 'fr'

export const LEGAL = {
  ar: {
    dir: 'rtl' as const,
    brand: 'مدرستي',
    backHome: 'الرئيسية',
    backToApp: 'الرجوع للتطبيق',
    lastUpdate: 'آخر تحديث',
    version: 'الإصدار',
    switchLang: 'Français',
    needHelp: 'لديك سؤال؟',
    contact: 'تواصل معنا',
    contactDpo: 'التواصل مع مسؤول حماية البيانات',
    nav: {
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      loi0908: 'القانون 09-08',
      cookies: 'ملفات الكوكيز',
    },
    privacy: {
      title: 'سياسة الخصوصية',
      subtitle: 'كيف نجمع، نستخدم، ونحمي معطياتكم الشخصية',
      sections: [
        {
          title: '1. مقدمة',
          body: `نحن في "مدرستي" نولي أهمية كبيرة لخصوصية مستخدمينا. توضح هذه السياسة كيفية جمعنا، استخدامنا، وحمايتنا للمعطيات الشخصية، وفقاً للقانون المغربي رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، والممارسات الفضلى الدولية.`,
        },
        {
          title: '2. المسؤول عن المعالجة',
          body: `المسؤول عن معالجة المعطيات هو المؤسسة التعليمية المشتركة في المنصة. يمكنكم التواصل مع مسؤول حماية البيانات (DPO) عبر البريد الإلكتروني المذكور أسفله.`,
        },
        {
          title: '3. المعطيات المجمّعة',
          bullets: [
            'معطيات التعريف: الاسم، البريد الإلكتروني، رقم الهاتف',
            'معطيات التلاميذ: الاسم، تاريخ الميلاد، رقم مسار، القسم',
            'معطيات الأولياء: الاسم، العلاقة، معلومات الاتصال',
            'معطيات مالية: المدفوعات، الأقساط، الفواتير',
            'معطيات الاستخدام: سجل الدخول، عنوان IP، نوع المتصفح',
          ],
        },
        {
          title: '4. أغراض المعالجة',
          bullets: [
            'تسيير الحسابات والمصادقة',
            'تسيير العمليات المدرسية (تسجيل، نقط، حضور)',
            'إدارة المدفوعات والفواتير',
            'التواصل مع الأولياء والمعنيين',
            'تحسين جودة الخدمة',
            'الوفاء بالالتزامات القانونية',
          ],
        },
        {
          title: '5. مدة الاحتفاظ',
          body: `نحتفظ بالمعطيات لمدة 60 شهراً بعد آخر استخدام للحساب، أو حسب ما يقتضيه القانون. يمكن حذف الحساب في أي وقت عبر طلب من لوحة التحكم.`,
        },
        {
          title: '6. مشاركة المعطيات',
          body: `لا نشارك معطياتكم مع أطراف ثالثة إلا في الحالات التالية: (أ) بموافقتكم الصريحة، (ب) للوفاء بالتزام قانوني، (ج) مع مزودي الخدمات التقنية (Supabase للاستضافة، Resend للبريد الإلكتروني) وفق عقود تحمي المعطيات.`,
        },
        {
          title: '7. حقوقكم',
          bullets: [
            'حق الوصول: الاطلاع على معطياتكم',
            'حق التصحيح: تعديل المعطيات غير الدقيقة',
            'حق الحذف: حذف معطياتكم (حق النسيان)',
            'حق الاعتراض: الاعتراض على المعالجة',
            'حق النقل: الحصول على نسخة إلكترونية',
          ],
          footer: `لممارسة أي من هذه الحقوق، يمكنكم تقديم طلب عبر لوحة التحكم (الإعدادات ← الخصوصية) أو مراسلة مسؤول حماية البيانات.`,
        },
        {
          title: '8. الأمان',
          body: `نستعمل تقنيات تشفير حديثة (TLS، تشفير البيانات في قاعدة البيانات)، تحكم دقيق في الصلاحيات، نسخ احتياطي تلقائي يومي، ومراقبة مستمرة للوصول.`,
        },
        {
          title: '9. ملفات الكوكيز',
          body: `نستخدم ملفات كوكيز ضرورية لعمل المنصة (المصادقة، الجلسة)، وكوكيز تحليلية اختيارية. يمكنكم إدارتها من إعدادات المتصفح.`,
        },
        {
          title: '10. التعديلات',
          body: `قد نحدّث هذه السياسة من وقت لآخر. سنخبركم بأي تغيير جوهري عبر البريد الإلكتروني أو إشعار في المنصة.`,
        },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      subtitle: 'القواعد والشروط المنظمة لاستعمال المنصة',
      sections: [
        {
          title: '1. قبول الشروط',
          body: `باستخدامكم لمنصة "مدرستي"، فإنكم تقبلون بهذه الشروط. إن كنتم لا توافقون عليها، يُرجى عدم استعمال المنصة.`,
        },
        {
          title: '2. وصف الخدمة',
          body: `"مدرستي" منصة SaaS لتسيير المدارس الخاصة، تشمل إدارة التلاميذ، المالية، النقط، الحضور، جدول الحصص، والتواصل مع الأولياء.`,
        },
        {
          title: '3. الحساب',
          bullets: [
            'يجب أن يكون عمرك 18 سنة على الأقل',
            'المعلومات المقدمة يجب أن تكون صحيحة',
            'أنت مسؤول عن سرية كلمة المرور',
            'ممنوع مشاركة الحساب مع آخرين',
            'يجب إبلاغنا فوراً عن أي استخدام غير مصرح به',
          ],
        },
        {
          title: '4. الاستخدام المقبول',
          bullets: [
            'ممنوع استخدام المنصة لأي غرض غير قانوني',
            'ممنوع محاولة اختراق أو تعطيل الخدمة',
            'ممنوع نسخ أو إعادة بيع الخدمة',
            'ممنوع رفع محتوى ضار أو مخالف',
          ],
        },
        {
          title: '5. الاشتراك والأسعار',
          body: `الخطة المجانية تشمل 20 تلميذاً. ما فوق ذلك بـ 1.5 درهم لكل تلميذ شهرياً. الفواتير تصدر شهرياً ويجب دفعها عبر التحويل البنكي خلال 30 يوماً من تاريخ الإصدار.`,
        },
        {
          title: '6. الإلغاء والاسترجاع',
          body: `يمكنكم إلغاء الاشتراك في أي وقت. لن يتم استرجاع المبالغ المدفوعة للفترة الحالية، ولكن ستحتفظون بالخدمة حتى نهاية الفترة المدفوعة.`,
        },
        {
          title: '7. الملكية الفكرية',
          body: `جميع حقوق المنصة (الكود، التصميم، العلامة) محفوظة لـ "مدرستي". معطياتكم تبقى ملكاً لكم.`,
        },
        {
          title: '8. حدود المسؤولية',
          body: `نبذل قصارى جهدنا لضمان استمرارية الخدمة، لكننا لا نتحمل مسؤولية أي خسائر غير مباشرة أو توقف مؤقت للخدمة لأسباب تقنية.`,
        },
        {
          title: '9. التعليق والإنهاء',
          body: `نحتفظ بحق تعليق أو إلغاء أي حساب يخالف هذه الشروط، بعد إشعار مسبق إلا في حالات الخطر الأمني.`,
        },
        {
          title: '10. القانون المطبق',
          body: `هذه الشروط تخضع للقانون المغربي. أي نزاع يُحل ودياً، وإلا فالمحاكم المغربية هي المختصة.`,
        },
      ],
    },
    loi0908: {
      title: 'التوافق مع القانون 09-08',
      subtitle: 'حماية المعطيات ذات الطابع الشخصي في المغرب',
      intro: `القانون رقم 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، صادر سنة 2009، ويهدف لحماية خصوصية المواطنين في العالم الرقمي.`,
      sections: [
        {
          title: 'أ. مبادئ القانون',
          bullets: [
            'الشرعية: المعالجة يجب أن تكون لغرض مشروع ومحدد',
            'الغرض: المعطيات تُجمع لغرض محدد فقط',
            'الملاءمة: المعطيات يجب أن تكون مناسبة للغرض',
            'الدقة: المعطيات يجب أن تكون صحيحة ومحدثة',
            'مدة الاحتفاظ: لا تتجاوز المدة الضرورية',
            'الأمن: حماية المعطيات من الوصول غير المصرح به',
          ],
        },
        {
          title: 'ب. التزاماتنا',
          bullets: [
            'التصريح بالمعالجة لدى CNDP',
            'الحصول على موافقة صريحة للمستخدمين',
            'ضمان حق الوصول والتصحيح والحذف',
            'حماية المعطيات بتقنيات مشفرة',
            'عدم نقل المعطيات خارج المغرب إلا بضمانات',
            'إشعار CNDP في حالة خرق المعطيات',
          ],
        },
        {
          title: 'ج. حقوقكم',
          bullets: [
            'الحق في الإعلام المسبق',
            'الحق في الوصول',
            'الحق في التصحيح',
            'الحق في الاعتراض',
            'الحق في الحذف',
          ],
        },
        {
          title: 'د. CNDP',
          body: `اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي هي الهيئة المغربية المكلفة بمراقبة تطبيق القانون. يمكنكم التواصل معها عبر:`,
          bullets: [
            'الموقع: www.cndp.ma',
            'البريد: contact@cndp.ma',
            'الهاتف: +212 5 37 57 05 05',
            'العنوان: زاوية شارع المقاومة و شارع النخيل، أكدال، الرباط',
          ],
        },
        {
          title: 'هـ. تقديم شكاية',
          body: `إذا اعتبرتم أن حقوقكم قد انتهكت، يمكنكم تقديم شكاية لـ CNDP أو اللجوء للقضاء المختص.`,
        },
      ],
    },
  },
  fr: {
    dir: 'ltr' as const,
    brand: 'Madrasti',
    backHome: 'Accueil',
    backToApp: 'Retour à l\'application',
    lastUpdate: 'Dernière mise à jour',
    version: 'Version',
    switchLang: 'العربية',
    needHelp: 'Une question ?',
    contact: 'Contactez-nous',
    contactDpo: 'Contacter le DPO',
    nav: {
      privacy: 'Confidentialité',
      terms: 'Conditions',
      loi0908: 'Loi 09-08',
      cookies: 'Cookies',
    },
    privacy: {
      title: 'Politique de Confidentialité',
      subtitle: 'Comment nous collectons, utilisons et protégeons vos données',
      sections: [
        {
          title: '1. Introduction',
          body: `Chez "Madrasti", nous accordons une grande importance à la confidentialité de nos utilisateurs. Cette politique explique comment nous collectons, utilisons et protégeons les données personnelles, conformément à la loi marocaine 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, ainsi qu'aux meilleures pratiques internationales.`,
        },
        {
          title: '2. Responsable du traitement',
          body: `Le responsable du traitement est l'établissement scolaire abonné à la plateforme. Vous pouvez contacter le Délégué à la Protection des Données (DPO) via l'email indiqué ci-dessous.`,
        },
        {
          title: '3. Données collectées',
          bullets: [
            'Données d\'identification : nom, email, téléphone',
            'Données élèves : nom, date de naissance, code Massar, classe',
            'Données parents : nom, lien de parenté, coordonnées',
            'Données financières : paiements, échéances, factures',
            'Données d\'usage : logs de connexion, IP, navigateur',
          ],
        },
        {
          title: '4. Finalités du traitement',
          bullets: [
            'Gestion des comptes et authentification',
            'Gestion des opérations scolaires (inscriptions, notes, présences)',
            'Gestion des paiements et factures',
            'Communication avec les parents et concernés',
            'Amélioration de la qualité de service',
            'Respect des obligations légales',
          ],
        },
        {
          title: '5. Durée de conservation',
          body: `Nous conservons les données 60 mois après la dernière utilisation du compte, ou selon les exigences légales. Le compte peut être supprimé à tout moment via une demande depuis le tableau de bord.`,
        },
        {
          title: '6. Partage des données',
          body: `Nous ne partageons pas vos données avec des tiers, sauf dans les cas suivants : (a) avec votre consentement explicite, (b) pour respecter une obligation légale, (c) avec des prestataires techniques (Supabase pour l'hébergement, Resend pour l'email) sous contrats protecteurs.`,
        },
        {
          title: '7. Vos droits',
          bullets: [
            'Droit d\'accès : consulter vos données',
            'Droit de rectification : corriger les données inexactes',
            'Droit à l\'effacement : supprimer vos données (droit à l\'oubli)',
            'Droit d\'opposition : vous opposer au traitement',
            'Droit à la portabilité : obtenir une copie électronique',
          ],
          footer: `Pour exercer ces droits, vous pouvez soumettre une demande via le tableau de bord (Paramètres → Confidentialité) ou contacter le DPO.`,
        },
        {
          title: '8. Sécurité',
          body: `Nous utilisons des techniques de chiffrement modernes (TLS, chiffrement base de données), un contrôle d'accès granulaire, une sauvegarde automatique quotidienne et une surveillance continue.`,
        },
        {
          title: '9. Cookies',
          body: `Nous utilisons des cookies essentiels (authentification, session) et des cookies analytiques optionnels. Vous pouvez les gérer depuis les paramètres de votre navigateur.`,
        },
        {
          title: '10. Modifications',
          body: `Nous pouvons mettre à jour cette politique. Tout changement substantiel sera notifié par email ou notification dans la plateforme.`,
        },
      ],
    },
    terms: {
      title: 'Conditions d\'Utilisation',
      subtitle: 'Règles et conditions régissant l\'utilisation de la plateforme',
      sections: [
        {
          title: '1. Acceptation',
          body: `En utilisant la plateforme "Madrasti", vous acceptez ces conditions. Si vous n'êtes pas d'accord, veuillez ne pas utiliser la plateforme.`,
        },
        {
          title: '2. Description du service',
          body: `"Madrasti" est une plateforme SaaS de gestion d'écoles privées : élèves, finances, notes, présences, emploi du temps et communication avec les parents.`,
        },
        {
          title: '3. Compte',
          bullets: [
            'Vous devez avoir au moins 18 ans',
            'Les informations fournies doivent être exactes',
            'Vous êtes responsable de la confidentialité de votre mot de passe',
            'Ne pas partager le compte',
            'Signaler immédiatement toute utilisation non autorisée',
          ],
        },
        {
          title: '4. Usage acceptable',
          bullets: [
            'Interdit d\'utiliser pour un usage illégal',
            'Interdit de tenter de pirater ou perturber le service',
            'Interdit de copier ou revendre le service',
            'Interdit de télécharger du contenu nuisible',
          ],
        },
        {
          title: '5. Abonnement et tarifs',
          body: `Le plan gratuit couvre 20 élèves. Au-delà, 1,5 DH par élève par mois. Factures mensuelles à payer par virement bancaire sous 30 jours.`,
        },
        {
          title: '6. Annulation et remboursement',
          body: `Vous pouvez annuler à tout moment. Aucun remboursement pour la période en cours, mais vous gardez le service jusqu'à la fin de la période payée.`,
        },
        {
          title: '7. Propriété intellectuelle',
          body: `Tous les droits de la plateforme (code, design, marque) sont réservés à "Madrasti". Vos données restent votre propriété.`,
        },
        {
          title: '8. Limitation de responsabilité',
          body: `Nous faisons de notre mieux pour assurer la continuité, mais nous ne sommes pas responsables des pertes indirectes ou interruptions temporaires pour raisons techniques.`,
        },
        {
          title: '9. Suspension et résiliation',
          body: `Nous nous réservons le droit de suspendre tout compte violant ces conditions, après préavis sauf en cas de danger sécuritaire.`,
        },
        {
          title: '10. Droit applicable',
          body: `Ces conditions sont régies par le droit marocain. Tout litige est résolu à l'amiable, sinon les tribunaux marocains sont compétents.`,
        },
      ],
    },
    loi0908: {
      title: 'Conformité à la Loi 09-08',
      subtitle: 'Protection des données personnelles au Maroc',
      intro: `La loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, promulguée en 2009, vise à protéger la vie privée des citoyens dans le monde numérique.`,
      sections: [
        {
          title: 'A. Principes de la loi',
          bullets: [
            'Légalité : finalité licite et déterminée',
            'Finalité : données collectées pour un but précis',
            'Pertinence : données adaptées à la finalité',
            'Exactitude : données correctes et à jour',
            'Conservation : ne pas dépasser la durée nécessaire',
            'Sécurité : protection contre accès non autorisé',
          ],
        },
        {
          title: 'B. Nos engagements',
          bullets: [
            'Déclaration du traitement à la CNDP',
            'Consentement explicite des utilisateurs',
            'Droit d\'accès, de rectification et de suppression',
            'Protection par chiffrement',
            'Pas de transfert hors Maroc sans garanties',
            'Notification CNDP en cas de violation',
          ],
        },
        {
          title: 'C. Vos droits',
          bullets: [
            'Droit à l\'information préalable',
            'Droit d\'accès',
            'Droit de rectification',
            'Droit d\'opposition',
            'Droit à l\'effacement',
          ],
        },
        {
          title: 'D. CNDP',
          body: `La Commission Nationale de contrôle de la protection des Données à caractère Personnel est l'organe marocain chargé de contrôler l'application de la loi. Contact :`,
          bullets: [
            'Site : www.cndp.ma',
            'Email : contact@cndp.ma',
            'Tél : +212 5 37 57 05 05',
            'Adresse : Angle Rue Al Maâta et Rue Annakhil, Agdal, Rabat',
          ],
        },
        {
          title: 'E. Réclamation',
          body: `Si vous estimez que vos droits ont été violés, vous pouvez déposer une plainte auprès de la CNDP ou saisir la justice.`,
        },
      ],
    },
  },
} as const

export type LegalContent = typeof LEGAL.ar