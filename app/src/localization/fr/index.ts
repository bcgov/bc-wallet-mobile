const translation = {
  Global: {
    EnterPin: 'Saisir le NIP',
    '6DigitPin': 'NIP à 6 chiffres',
    Submit: 'Soumettre',
    'NoneYet!': 'Votre portefeuille est vide. Vos attestations acceptées seront ajoutées ici.',
    Cancel: 'Annuler',
    Confirm: 'Confirmer',
    Accept: 'Accepter',
    Reject: 'Rejeter',
    NotNow: 'Pas maintenant',
    Share: 'Partager',
    Decline: 'Refuser',
    Back: 'Précédent',
    Next: 'Suivant',
    Continue: 'Continuer',
    Info: 'Information',
    ThisDecisionCannotBeChanged: 'Cette décision ne peut être modifiée.',
    Failure: 'Échec',
    Success: 'Succès',
    SomethingWentWrong: 'Un problème est survenu',
    Done: 'Terminé',
    Skip: 'Ignorer',
    View: 'Afficher',
    Home: 'Accueil',
    ErrorCode: "Code d'erreur",
    Okay: 'Ok',
    TryAgain: 'Réessayer',
    GoBack: 'Retourner',
    GetStarted: 'Commencer',
    Dismiss: 'Rejeter',
    On: 'Activé',
    Off: 'Désactivé',
    Close: 'Fermer',
  },
  Language: {
    English: 'Anglais',
    French: 'Français',
  },
  CameraDisclosure: {
    AllowCameraUse: "Autoriser l'utilisation de l'appareil photo",
    CameraDisclosure:
      "La caméra est utilisée pour scanner les codes QR pour un traitement immédiat sur l'appareil. Aucune information sur les images n'est stockée, utilisée à des fins d'analyse ou partagée.",
    ToContinueUsing:
      'Pour continuer à utiliser la fonction de balayage du Portefeuille QC, veuillez autoriser les autorisations de caméra.',
    Allow: 'Autoriser',
    OpenSettings: 'Ourvir Paramètres',
  },
  Biometry: {
    Toggle: 'Basculer la biométrie',
    EnabledText1:
      'Déverrouillez votre portefeuille avec la biométrie de votre appareil au lieu d’utiliser le NIP du portefeuille.',
    EnabledText2:
      'Toute personne qui a des données biométriques enregistrées sur cet appareil pourra déverrouiller votre portefeuille et avoir accès à vos attestations.',
    NotEnabledText1:
      "La biométrie n'est pas actuellement configurée sur cet appareil et ne peut donc pas être activée.",
    NotEnabledText2:
      "Si vous souhaitez activer cette fonctionnalité, activez la biométrie dans les paramètres de l'appareil, puis revenez à cet écran.",
    Warning: '\n\nAssurez-vous que vous seul avez accès à votre portefeuille.',
    UseToUnlock: 'Utiliser la biométrie pour déverrouiller le portefeuille ?',
    NoBiometricsErrorTitle: 'Pas de biométrie',
    NoBiometricsErrorMessage: "La biométrie n'est pas activée sur cet appareil.",
    NoBiometricsErrorDetails: 'Pour résoudre ce problème, activez la biométrie dans les paramètres de votre appareil.',
    UnlockPromptTitle: 'Déverrouillage du portefeuille',
    UnlockPromptDescription: 'Utilisez la biométrie pour déverrouiller votre portefeuille',
    EnabledText1Bold: 'vous devrez utiliser la biométrie pour ouvrir votre portefeuille QC.',
    EnabledText3:
      'Toute personne pouvant accéder à votre téléphone avec la biométrie peut accéder à votre portefeuille QC.',
    EnabledText3Bold: 'Assurez-vous que vous seul avez accès à votre portefeuille.',
  },
  Error: {
    Title2020: "Impossible de traiter l'invitation",
    Message2020: "Un problème est survenu lors du traitement de l'invitation à se connecter.",
    Title2021: "Impossible de recevoir l'invitation",
    Message2021: "Un problème est survenu lors de la réception de l'invitation à se connecter.",
    Title2022: "Impossible de trouver l'ancien DID",
    Message2022: "Un problème est survenu lors de l'extraction du référentiel did.",
    Title2025: 'Authentification BCSC',
    Message2025: 'Un problème a été signalé par BCSC.',
    Title2026: "Oups! Quelque chose s'est mal passé",
    Message2026: "L'application a rencontré un problème. Essayez de redémarrer l'application.",
    NoMessage: 'Pas de message',
    Unknown: 'Erreur inconnue',
    Problem: 'Un problème est survenu',
    Title1034: "Impossible d'obtenir une demande de preuve.",
    Message1034: 'La demande de preuve est introuvable.',
    Title1035: "Impossible de récupérer l'offre de justificatifs d'identité.",
    Message1035: "L'offre de justificatifs d'identité est introuvable.",
    Title1036: "Impossible de récupérer les justificatifs d'identité du portefeuille",
    Message1036: "Les justificatifs d'identité du portefeuille sont introuvables",
    Title1037: 'Impossible de supprimer le contact.',
    Message1037: 'Il y a eu un problème lors de la suppression du contact.',
  },
  Credentials: {
    AddCredential: 'Ajouter une attestation',
    AddFirstCredential: 'Ajouter votre première attestation',
    CredentialsNotFound: 'Attestations introuvables',
    CredentialDetails: 'Détails des attestations',
    EmptyList: 'Votre portefeuille est vide. Vos Justificatifs acceptées seront ajoutées ici.',
  },
  PersonCredentialNotification: {
    Title: 'Obtenez votre identifiant personnel',
    Description:
      'Ajoutez votre identifiant personnel à votre portefeuille et utilisez-le pour accéder aux services en ligne.',
  },
  PersonCredential: {
    Issuer: 'Service C.-B.',
    Name: 'Personne',
    Description:
      "Ajoutez vos justificatifs d’identités à votre portefeuille pour prouver vos informations personnelles en ligne et accéder aux services en ligne.\n\nVous aurez besoin de l'application BC Service Card configurée sur cet appareil mobile.",
    LinkDescription: "Obtenez l'application BC Services Card",
    GetCredential: "Obtenez l'application BC Services Card",
    Decline: 'Obtenez ceci plus tard',
    PageTitle: 'Justificatifs d’identité',
  },
  StatusMessages: {
    InitAgent: "Initialisation de l'agent ...",
  },
  TermsV2: {
    Consent: {
      title: 'Consentement',
      body: "Veuillez prendre connaissance des conditions générales liées à l'utilisation du portefeuille numérique du gouvernement du Québec.",
      PersonalUse: {
        title: 'Usage personnel exclusif',
        body: "Vous êtes responsable de la confidentialité de votre portefeuille numérique. Vous devez le réaliser à votre usage exclusif. Ne divulguez à personne votre code d'accès et protégez adéquatement votre téléphone mobile. Des recommandations vous sont présentées dans la rubrique *Sécurité* .",
        subsection: {
          title: 'Utilisation acceptable',
          body:
            "Dans le cadre de votre utilisation de l'Application sous Licence, vous ne devez prendre aucune mesure susceptible de mettre en péril la sécurité, l'intégrité et/ou la disponibilité de l'Application sous Licence, y compris, sans s'y limiter :\n" +
            '\n' +
            "L’utilisation de l'Application sous Licence à des fins illégales ou inappropriées ;\n" +
            '\n' +
            "L’altération de toute partie de l'Application sous Licence ;\n" +
            '\n' +
            "L’utilisation de l'Application sous Licence pour transmettre tout virus ou tout autre code informatique, fichier ou programme nuisible ou destructeur, ou pour mener des activités de piratage et/ou d'intrusion ;\n" +
            '\n' +
            "Tenter de contourner ou de subvertir toute mesure de sécurité associée à l'Application sous Licence ;\n" +
            '\n' +
            "Entreprendre toute action qui pourrait raisonnablement être interprétée comme susceptible d'affecter négativement les autres utilisateurs de l'Application sous Licence ;\n" +
            '\n' +
            'Où\n' +
            '\n' +
            "Supprimer ou modifier tout symbole ou avis de propriété, y compris tout avis de droit d'auteur, marque ou logo, affiché en relation avec l'Application sous Licence.",
        },
      },
      IdentityTheft: {
        title: "En cas de vol d'identité",
        body: "Si vous soupçonnez que la Sécurité de votre portefeuille et de son contenu a été compromise , vous devez communiquer immédiatement  avec *le Centre de relations de la clientèle d'identité Québec*. Vous ne serez pas tenu responsable en cas de vol d'identité dans la mesure ou vous respectez les présentes conditions.",
        subsection: {
          title: 'Indemnisation',
          body:
            'Vous acceptez d’indemniser, de défendre et de dégager de toute responsabilité la province et tous ses fonctionnaires, employés et agents respectifs à l’égard de toutes les réclamations, demandes, obligations, pertes, passifs, coûts ou dettes et dépenses (y compris, sans s’y limiter, les frais juridiques raisonnables).\n' +
            '\n' +
            ' Découlant :\n' +
            '\n' +
            ' (a) de votre utilisation de l’Application sous licence ;\n' +
            '\n' +
            ' Où\n' +
            '\n' +
            ' (b) de votre violation de toute disposition du présent CLUF',
        },
      },
      Privacy: {
        title: 'Protection et vie privée',
        body: 'Le gouvernement du Québec se préoccupe de la protection de votre vie privée et des renseignements personnels et confidentiels qui sont contenus dans cette application. Vous avez la responsabilité de consulter *la Politique de confidentialité pour connaitre les pratiques du gouvernements du Québec à ce sujet.*',
        subsection: {
          title: 'Protection des informations personnelles',
          body:
            'Si vous visitez le site Web de l’application sous licence à\n' +
            '\n' +
            'https://www.quebec.ca/gouvernement/ministere/cybersecurite-numerique,\n' +
            '\n' +
            "Y compris pour accéder au Fonction d’aide pour l’application sous licence ou le contenu connexe à https://www.quebec.ca/gouvernement/ministere/cybersecurite-numerique, certaines informations vous seront fournies conformément à la Déclaration de confidentialité de la province pour les sites Web du gouvernement. Certains renseignements sont également recueillis dans le cadre de la demande de permis, comme il est indiqué dans la Politique de confidentialité de Quebec Wallet App (la « Politique de confidentialité »), qui est incorporée par renvoi dans le présent CLUF et en fait partie. Vous consentez à la collecte par l’Application sous licence de ces informations qui, avec votre Contenu, sont stockées localement sur votre appareil et n’est pas accessible à la province, sauf dans les cas où vous choisissez de fournir des renseignements à la province, comme il est indiqué dans la politique de confidentialité. Tous les renseignements que vous fournissez à la province qui sont des « renseignements personnels », au sens de la Loi sur l’accès à l’information et la protection de la vie privée du Québec (« la Loi »), sont recueillis par la province en vertu de l’alinéa 26c la Loi, aux fins énoncées dans la Politique de confidentialité. Toute question concernant la collecte de ces renseignements peut être adressée à la personne-ressource indiquée à l'article 11. Les consentements que vous avez fournis conformément au présent article seront maintenus jusqu'à ce que vous les révoquiez par écrit à la personne-ressource mentionnée à l'article 11, auquel cas le présent ALUF prendra fin immédiatement, conformément à l'article 9.",
        },
      },
      AppAccess: {
        title: "Droit d'accès à l'application",
        body: "Le gouvernement du Québec peut suspendre l'accès à cette application si vous ne respectez pas les présentes conditions d'utilisation . Il peut également le faire pour les présentes conditions d'utilisation. Il peut également le faire pour des motifs de sécurité ou à des fins administratives.",
        subsection: {
          title: 'Limitations',
          body:
            'Dans la mesure où la loi applicable le permet, la Province ne sera en aucun cas en aucun cas, la Province ne sera responsable envers toute personne ou entité de toute perte, réclamation, blessure ou dommage direct, indirect, spécial, accessoire ou consécutif, ou de toute autre perte, réclamation, blessure ou dommage.\n' +
            '\n' +
            'Si prévisible ou imprévisible (y compris les demandes de limitation de dommages-intérêts pour perte de profits ou occasions d’affaires, l’utilisation ou l’utilisation abusive ou l’impossibilité d’utiliser , l’application sous licence , les interruptions , la suppression ou la corruption de fichiers , la perte de programmes ou d’informations , les erreurs, les défauts ou les retards ) découlant de votre utilisation de l’application sous licence ou y étant lié de quelque façon que ce soit, qu’il soit fondé sur un contrat, un délit, une responsabilité stricte ou toute autre théorie juridique. La phrase précédente s’appliquera même si la province a été expressément informée de la possibilité d’une telle perte, réclamation, blessure ou dommage. Les parties reconnaissent qu’Apple n’est pas responsable :\n' +
            '\n' +
            'a) traiter toute réclamation que vous ou un tiers de quelque nature que ce soit relativement à la demande autorisée;\n' +
            '\n' +
            'b) votre possession et/ou utilisation de la demande de permis.',
        },
      },
      More: {
        body: 'En savoir plus sur *ces conditions générales(*)*',
      },
    },
  },
  PinCreate: {
    UserAuthenticationPin: "NIP d'authentification de l'utilisateur",
    PinMustBe6DigitsInLength: 'Le NIP doit comporter 6 chiffres',
    PinsEnteredDoNotMatch: 'Les NIP saisis ne correspondent pas',
    '6DigitPin': 'NIP à 6 chiffres',
    ReenterPin: 'Saisir le NIP à nouveau',
    Create: 'Créer',
    PINDisclaimer:
      'Si vous l’oubliez, vous devrez à nouveau : \n• Configurer votre portefeuille.\n• Demander de nouveau les attestations  déjà émises dans votre portefeuille.',
  },
  PinEnter: {
    IncorrectPin: 'NIP erroné',
    Unlock: 'Déverrouiller',
    Or: 'Ou',
    BiometricsUnlock: 'Déverrouiller avec la biométrie',
    LoggedOut: 'Vous êtes déconnecté',
    LoggedOutDescription:
      "Pour protéger vos informations, vous êtes déconnecté de votre portefeuille si vous ne l'avez pas utilisé pendant 5 minutes.",
    RepeatPIN: 'Veuillez réessayer avec votre code NIP.',
    AttemptLockoutWarning:
      "Note: pour votre sécurité, la saisie d'un autre code NIP incorrect verrouillera temporairement le portefeuille.",
  },
  AttemptLockout: {
    Title: 'Votre portefeuille est temporairement verrouillé ',
    Description: 'Vous avez fait trop de tentatives de connexion non réussies.',
    TryAgain: 'Vous pouvez essayer de nouveau dans :',
    Hours: 'heures',
    Minutes: 'minutes',
    Seconds: 'secondes',
  },
  ContactDetails: {
    Created: 'Créé',
    ConnectionState: 'État de la connexion',
    AContact: 'Un contact',
    DateOfConnection: 'Date de connexion : {{ date }}',
    RemoveTitle: 'Supprimer ce contact',
    RemoveCaption: "Pour ajouter des justificatifs d'identité, l'organisation émettrice doit être un contact.",
    UnableToRemoveTitle: 'Impossible de supprimer le contact',
    UnableToRemoveCaption:
      "Impossible de supprimer car il y a des justificatifs d'identité émises par ce contact dans votre portefeuille. Supprimez d'abord les justificatifs d'identité, puis supprimez ce contact.",
    GoToCredentials: "Aller aux justificatifs d'identité",
    ContactRemoved: 'Contact supprimé',
  },
  WhatAreContacts: {
    Title: 'Que sont les contacts?',
    Preamble: "L'ajout d'organisations en tant que contact vous permettra de:",
    ListItemCredentialUpdates: "Obtenir des mises à jour des justificatifs d'identité délivrées par cette organisation",
    ListItemNewCredentials: "Obtenez de nouveaux justificatifs d'identité",
    ListItemProofRequest: 'Demandes de preuves accélérées',
    RemoveContacts: 'Vous pouvez à tout moment supprimer des contacts de votre ',
    ContactsLink: 'liste de contacts',
    ContactSharing: "L'utilisation de vos justificatifs d'identité n'est jamais partagée avec vos contacts.",
  },
  CredentialDetails: {
    Id: 'Identifiant :',
    CreatedAt: 'Créé à :',
    Version: 'Version',
    Issued: 'Délivré',
    PrivacyPolicy: 'Politique de confidentialité',
    TermsAndConditions: "Conditions d'utilisation",
    RemoveFromWallet: 'Retirer du portefeuille',
    Revoked: 'Révoqué',
    Choose: 'Choisir',
    GetPersonCred: 'Obtenez votre identifiant personnel',
    ScanQrCode: 'Scanner un code QR',
    CredentialRevokedMessageTitle: 'Cette attestation est révoquée',
    CredentialRevokedMessageBody:
      "Cette attestation peut ne plus fonctionner pour certaines demandes de preuve. Vous devrez mettre à jour l'attestation avec l'émetteur.",
    NewRevoked: 'Identité révoqué',
  },
  Home: {
    Welcome: 'Bienvenue',
    Notifications: 'Notifications',
    NoNewUpdates: "Vous n'avez pas de nouvelles notifications.",
    NoCredentials: "Vous n'avez pas d'attestation dans votre portefeuille.",
    SeeAll: 'Afficher tout',
    YouHave: 'Vous avez',
    Credential: 'attestation',
    Credentials: 'attestations',
    InYourWallet: 'dans votre portefeuille',
  },
  PrivacyPolicy: {
    Title: 'Politique de confidentialité',
    CameraDisclosure:
      "La caméra est utilisée pour scanner les codes QR pour un traitement immédiat sur l'appareil. Aucune information sur les images n'est stockée, utilisée à des fins d'analyse ou partagée.",
  },
  Scan: {
    SuccessfullyAcceptedConnection: 'Connexion acceptée avec succès',
    AcceptingConnection: 'Acceptation de la connexion',
    ConnectionRecordIdNotFound: "Identifiant de l'enregistrement de connexion introuvable",
    ConnectionAccepted: 'Connexion acceptée',
    ConnectionNotFound: 'Connexion non détectée',
    InvalidQrCode: 'Code QR erroné. Veuillez réessayer.',
    UnableToHandleRedirection: 'Impossible de traiter la redirection',
    Close: 'Fermer',
    Torch: 'Flash',
  },
  Connection: {
    JustAMoment: 'Veuillez patienter pendant que nous établissons une connexion sécurisée...',
    TakingTooLong:
      "Cela prend plus de temps qu'à la normale. Vous pouvez retourner à l'accueil ou continuer à patienter.",
  },
  CredentialOffer: {
    ThisIsTakingLongerThanExpected:
      'Cela prend plus de temps que prévu. Revenez plus tard pour votre nouvelle attestation.',
    'RejectThisCredential?': 'Rejeter cette attestation?',
    AcceptingCredential: "Acceptation de l'attestation",
    SuccessfullyAcceptedCredential: 'Attestation acceptée avec succès',
    RejectingCredential: "Rejet de l'attestation",
    SuccessfullyRejectedCredential: 'Attestation rejetée avec succès',
    CredentialNotFound: 'Attestation introuvable',
    CredentialAccepted: 'Attestation acceptée',
    CredentialRejected: 'Attestation rejetée',
    CredentialAddedToYourWallet: 'Attestation ajoutée à votre portefeuille',
    CredentialDeclined: 'Attestation refusée',
    CredentialOnTheWay: 'Votre attestation est en cours de transmission',
    CredentialOffer: "Nouvelle offre d'attestation",
    IsOfferingYouACredential: 'vous propose un attestation',
    ConfirmDeclineCredential: 'Oui, refuser cette attestation',
    AbortDeclineCredential: 'Non, revenir en arrière',
    DeleteOfferTitle: 'Supprimer cette offre ?',
    DeleteOfferMessage: 'La suppression de cette offre supprimera la notification de votre liste.',
    DeleteOfferDescription:
      "Vous ne reconnaissez pas l'organisation ? Vérifiez votre liste de contacts. Vous ne recevez des notifications que des contacts que vous avez initiés",
    NewCredentialOffer: 'Nouvelle offre de justificatif',
  },
  ConnectionAlert: {
    AddedContacts: 'Ajouté aux contacts',
    WhatAreContacts: 'Que sont les contacts ?',
    NotificationBodyUpper: 'Tu peux trouver ',
    NotificationBodyLower: ' dans vos contacts. Gérez vos contacts dans les paramètres',
    PopupIntro: "L'ajout d'organisations en tant que contact vous permettra de : ",
    PopupPoint1: "Obtenir des mises à jour des informations d'identification émises par cette organisation",
    PopupPoint2: "Obtenez de nouvelles informations d'identification",
    PopupPoint3: 'Demandes de preuves accélérées',
    SettingsLink: 'Réglages',
    SettingsInstruction: 'Vous pouvez toujours supprimer des contacts à tout moment dans ',
    PrivacyMessage: "L'utilisation de vos informations d'identification n'est jamais partagée avec vos contacts.",
    PopupExit: "J'ai compris",
  },
  ProofRequest: {
    OfferDelay: "Retard de l'offre",
    'RejectThisProof?': 'Rejeter cette preuve?',
    AcceptingProof: 'Acceptation de la preuve',
    SuccessfullyAcceptedProof: 'Preuve acceptée avec succès',
    ProofNotFound: 'Preuve introuvable',
    RejectingProof: 'Rejet de la preuve',
    ProofAccepted: 'Preuve acceptée',
    ProofRejected: 'Preuve rejetée',
    RequestedCredentialsCouldNotBeFound: "Les attestations demandées n'ont pas été trouvées",
    ProofRequest: 'Nouvelle demande de preuve',
    NotAvailableInYourWallet: 'Non disponible dans votre portefeuille',
    IsRequesting: 'demande',
    IsRequestingSomethingYouDontHaveAvailable: "demande une information que vous n'avez pas à votre disposition",
    IsRequestingYouToShare: 'vous demande de partager',
    WhichYouCanProvideFrom: 'que vous pouvez fournir à partir de',
    Details: 'Détails',
    SendingTheInformationSecurely: "Envoi sécurisé de l'information",
    InformationSentSuccessfully: 'Informations envoyées avec succès',
    ProofRequestDeclined: 'Demande de preuve refusée',
  },
  TabStack: {
    Home: 'Accueil',
    Scan: 'Lire un code QR',
    Credentials: 'Attestations',
  },
  Onboarding: {
    Welcome: 'Bienvenue',
    WelcomeParagraph1:
      'Le portefeuille QC vous permet de recevoir, de stocker et d’utiliser des attestations numériques.',
    WelcomeParagraph2: 'Il est hautement sécurisé et protège votre vie privée en ligne.',
    WelcomeParagraph3:
      'LE portefeuille QC est en cours de développement. Il est actuellement en version bêta et est disponible pour les tests.',
    StoredSecurelyTitle: 'Attestations numériques, stockées en toute sécurité',
    StoredSecurelyBody:
      'Le portefeuille QC stocke les attestations numériques, les versions numériques de choses comme les permis, les identités et les licences.\n\nElles sont stockées en toute sécurité, uniquement sur cet appareil.',
    UsingCredentialsTitle: 'Recevez et utilisez des attestations',
    UsingCredentialsBody:
      'Pour recevoir et utiliser des attestations, vous utilisez la fonction « Scanner » de l’application pour scanner un code QR spécial.\n\nLes informations sont envoyées et reçues via une connexion privée et chiffrée.',
    PrivacyConfidentiality: 'Vie privée et confidentialité',
    PrivacyParagraph:
      'Vous approuvez chaque utilisation des informations de votre portefeuille QC. Vous ne partagez que ce qui est nécessaire pour une situation donnée.\n\nLe gouvernement du Québec n’est pas informé lorsque vous utilisez vos attestations numériques.',
    GetStarted: 'Commencer',
    SkipA11y: 'Passer l’introduction au portefeuille QC',
  },
  QRScanner: {
    PermissionToUseCamera: "Permission d'utiliser l'appareil photo",
    WeNeedYourPermissionToUseYourCamera: 'Nous avons besoin de votre permission pour utiliser votre appareil photo',
    Ok: 'Ok',
  },
  Record: {
    Hide: 'Masquer',
    Show: 'Afficher',
    HideAll: 'Masquer tout',
    Hidden: 'Masqué',
  },
  Screens: {
    Splash: 'Page de garde',
    Onboarding: 'Portefeuille Québec',
    Terms: "Conditions d'utilisation",
    CreatePin: 'Créer un NIP à 6 chiffres',
    EnterPin: 'Saisir le NIP',
    Home: 'Accueil',
    Scan: 'Lire un code QR',
    Credentials: 'Attestations',
    CredentialDetails: 'Détails des attestations',
    Notifications: 'Notifications',
    CredentialOffer: "Proposition d'attestation",
    ProofRequest: 'Demande de preuve',
    ProofRequestAttributeDetails: 'Détails des attributs de la demande de preuve',
    Settings: 'Paramètres',
    Language: 'Langue',
    Contacts: 'Contacts',
    ContactDetails: 'Coordonnées',
  },
  OnboardingPages: {
    FirstPageTitle: 'Bienvenue dans le portefeuille Québec',
    FirstPageBody1:
      'Le portefeuille Québec vous permet de recevoir, enregistrer et utiliser vos attestations numériques.',
    FirstPageBody2: 'Cette application est sécurisée et aide à protéger votre confidentialité en ligne.',
    FirstPageBody3:
      'Le portefeuille Québec est présentement dans les premières phases de développement et la technologie est en cours d’exploration. La plupart du monde n’auront pas besoin du portefeuille numérique puisqu’il n’y a que quelques attestations présentement disponibles.',
    SecondPageTitle: 'Une attestation numérique, enregistrée secrètement',
    SecondPageBody:
      'Le portefeuille Québec protège vos attestations numériques, une version digitale de vos permis et cartes d’identité.\n\nElles sont enregistrées de manière sécurisée, seulement sur votre appareil.',
    ThirdPageTitle: 'Recevoir et utiliser les attestations',
    ThirdPageBody:
      'Pour recevoir une attestation, vous devez capturer le code QR qui vous sera présenté. \n\nLes informations seront communiquées grace à une communication privée et protégée.',
    FourthPageTitle: 'Confidentialité et protection de la vie privée',
    FourthPageBody:
      'Vous avez le contrôle sur les informations qui sont partagées et utilisées depuis votre portefeuille Québec. Vous ne partagez que les informations requises selon la situation. \n\nLe gouvernement du Québec n’est jamais mis au courant des interactions réalisées lorsque vous utilisez une attestation numérique.',
    ButtonGetStarted: 'Configurer le portefeuille',
  },
  NetInfo: {
    NoInternetConnectionTitle: 'Pas de connexion Internet',
    NoInternetConnectionMessage:
      "Vous ne pouvez pas accéder aux services à l'aide du portefeuille Québec, ni recevoir d'informations d'identification tant que vous n'êtes pas de nouveau en ligne.\n\nVeuillez vérifier votre connexion Internet.",
    LedgerConnectivityIssueTitle: 'Services de portefeuille',
    LedgerConnectivityIssueMessage:
      "Il se peut qu'un pare-feu vous empêche de vous connecter aux services liés au portefeuille.",
  },
  Settings: {
    Help: 'Aide',
    MoreInformation: "Plus d'information",
    HelpUsingBCWallet: "Aide à l'utilisation du portefeuille BC",
    GiveFeedback: 'Donner son avis',
    ReportAProblem: 'Signaler un problème',
    TermsOfUse: "Conditions d'utilisation",
    PrivacyStatement: 'Déclaration de confidentialité',
    VulnerabilityDisclosurePolicy: 'Politique de divulgation des vulnérabilités',
    Accessibility: 'Accessibilité',
    IntroductionToTheApp: "Présentation de l'application",
    Version: 'Version',
    VersionString: '0.0.0-0',
    AppPreferences: 'Préférences',
    AboutApp: 'À propos',
    Language: 'Langue',
    AppSettings: "Paramètres de l'application",
    WhatAreContacts: 'Que sont les contacts?',
    Developer: 'Développeur',
  },
  Tips: {
    Header: 'Conseils',
    GettingReady: 'Préparez votre portefeuille...',
    Tip1: "Pour plus de sécurité, verrouillez l'application Portefeuille QC aprés 5 minutes d'inactivité.",
    Tip2: 'Contrairement à la présentation de cartes physiques, vous ne partagez que ce qui est nécessaire à partir de vos justificatifs',
    Tip3: 'Vos justificatifs sont stockés uniquement sur ce téléphone, nulle part ailleurs',
    Tip4: 'Les informations sont envoyées et reçues via une connexion cryptée intraçable',
    Tip5: "N'oubliez pas votre NIP. Si vous l'oubliez, vous devrez réinstaller et rajouter vos justificatifs",
    Tip6: "Ignorez le code NIP et déverrouillez votre portefeuille à l'aide de vos données biométriques pour une pratique plus rapide",
    Tip7: 'Vos justificatifs les plus récemment ajoutés sont placés en haut',
    Tip8: "Supprimer les justificatifs de votre portefeuille à partir de l'écran des justificatifs",
    Tip9: "Vous pouvez ignorer les notifications sans les ouvrir en appuyant sur 'X' dans le coin supérieur droit",
    Tip10: "Besoin d'aide? Trouvez des réponses dans la section d'aide du bouton '☰' dans le coin supérieur gauche",
    Tip11: "Vous pouvez activer l'éclair de l'appareil photo si le code QR est difficile à voir",
    Tip12: "Si le code QR ne se scanne pas, essayez d'augmenter la luminosité de l'écran",
    Tip13:
      'Les informations envoyées via votre portefeuille sont approuvées par vous et vos contacts avec lesquels vous interagissez',
    Tip14: "Même les justificatifs révoqués ou expirés peuvent être utilisables si l'organisation ne le demande pas",
  },
  Init: {
    Retry: 'Réessayer',
    Starting: 'Débuter...',
    CheckingAuth: 'Vérification de l’authentification...',
    FetchingPreferences: 'Récupération des préférences...',
    VerifyingOnboarding: 'Vérification de l’état de l’application...',
    GettingCredentials: 'Récupération des attestations...',
    RegisteringTransports: 'Enregistrement des transports...',
    InitializingAgent: 'Initialisation de l’agent...',
    ConnectingLedgers: 'Connexion au portefeuille...',
    SettingAgent: 'Configuration de l’agent...',
    Finishing: 'Finalisation...',
  },
  Feedback: {
    GiveFeedback: 'Donnez votre avis',
  },
}

export default translation
