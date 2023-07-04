const translation = {
  BCID: {
    GetID: 'Get BCID',
    GetDigitalID: 'Get your QC Digital ID',
  },
  Global: {
    EnterPin: 'Enter Pin',
    '6DigitPin': '6 Digit Pin',
    Submit: 'Submit',
    'NoneYet!': 'None yet!',
    Cancel: 'Cancel',
    Confirm: 'Confirm',
    Accept: 'Accept',
    Reject: 'Reject',
    NotNow: 'Not now',
    Share: 'Share',
    Decline: 'Decline',
    Back: 'Back',
    Next: 'Next',
    Continue: 'Continue',
    Info: 'Information',
    'ThisDecisionCannotBeChanged.': 'This decision cannot be changed.',
    Failure: 'Failure',
    Success: 'Success',
    SomethingWentWrong: 'Something went wrong',
    Done: 'Done',
    Skip: 'Skip',
    View: 'View',
    Home: 'Home',
    ErrorCode: 'Error Code',
    Okay: 'Okay',
    Close: 'Close',
  },
  Language: {
    English: 'English',
    French: 'French',
  },
  CameraDisclosure: {
    AllowCameraUse: 'Allow camera use',
    CameraDisclosure:
      'The camera is used to scan QR codes that initiate a credential offer or credential request. No information about the images is stored, used for analytics, or shared.',
    ToContinueUsing: 'To continue using the BC Wallet scan feature, please allow camera permissions.',
    Allow: 'Allow',
    OpenSettings: 'Open settings',
  },
  Biometry: {
    Toggle: 'Toggle Biometrics',
    EnabledText1: "Log in with your phone's biometrics instead of your wallet PIN.",
    EnabledText1Bold: 'you will need to use biometrics to open your QC Wallet.',
    EnabledText2:
      'This means all fingerprint and facial data added on this phone can be used to access your QC Wallet.',
    EnabledText3: 'Anyone who can access your phone with biometrics can access your QC Wallet.',
    EnabledText3Bold: 'Ensure only you have access to your wallet.',
    Warning: '\n\nEnsure only you have access to your wallet.',
    UseToUnlock: 'Use biometrics to unlock wallet?',
  },
  Credentials: {
    AddCredential: 'Add Credential',
    EmptyList: 'Your wallet is empty.',
    CredentialsNotFound: 'Credentials not found',
    AddFirstCredential: 'Add your first credential',
  },
  PersonCredentialNotification: {
    Title: 'Get your Person credential',
    Description: 'Add your Person credential to your wallet and use it to get access to services online.',
    ButtonTitle: 'Start',
  },
  PersonCredential: {
    Issuer: 'Service BC',
    Name: 'Person',
    GivenName: 'Sample Given Name',
    FamilyName: 'Sample Family Name',
    Description:
      "Add your Person credential to your wallet to prove your personal information online and get access to services online.\n\nYou'll need the BC Service Card app set up on this mobile device.",
    LinkDescription: 'Get the BC Services Card app',
    GetCredential: 'Get your Person credential',
    Decline: 'Get this later',
    PageTitle: 'Person Credential',
  },
  Screens: {
    Splash: 'Splash',
    Onboarding: 'Quebec Wallet',
    Terms: 'Terms & Conditions',
    CreatePin: 'Create 6-Digit Pin',
    EnterPin: 'Enter Pin',
    Home: 'Home',
    Scan: 'Scan',
    Credentials: 'Credentials',
    CredentialDetails: 'Credential Details',
    Notifications: 'Notifications',
    CredentialOffer: 'Credential Offer',
    ProofRequest: 'Proof Request',
    ProofRequestAttributeDetails: 'Proof Request Attribute Details',
    Settings: 'Settings',
    Language: 'Language',
    Contacts: 'Contacts',
    ContactDetails: 'Contact Details',
  },
  Error: {
    Title2020: 'Unable to parse invitation',
    Message2020: 'There was a problem parsing the connection invitation.',
    Title2021: 'Unable to receive invitation',
    Message2021: 'There was a problem receiving the invitation to connect.',
    Title2022: 'Unable to find legacy DID',
    Message2022: 'There was a problem extracting the did repository.',
    Title2025: 'BCSC Authentication',
    Message2025: 'There was a problem reported by BCSC.',
    Title2026: 'Oops! Something went wrong',
    Message2026: 'The app has encountered a problem. Try restarting the app.',
    NoMessage: 'No Message',
    Title2024: 'BCSC Authentication',
    Message2024: 'The authentication request was canceled.',
    Title1034: 'Unable to fetch proof request.',
    Message1034: 'Proof request could not be found.',
    Title1035: 'Unable to fetch credential offer.',
    Message1035: 'Credential offer could not be found.',
    Title1036: 'Unable to fetch wallet credentials',
    Message1036: 'Wallet credentials could not be found',
    Title1037: 'Unable to remove contact.',
    Message1037: 'There was a problem while removing the contact. ',
  },
  StatusMessages: {
    InitAgent: 'Initializing agent ..',
  },
  TermsV2: {
    Consent: {
      title: 'Consent',
      body: 'Please read the general conditions for the use of the digital portfolio of the Government of Quebec.',
      PersonalUse: {
        title: 'Exclusive Personal Use',
        body:
          'You are responsible for the confidentiality of your digital portfolio. You must use it exclusively for your own purposes. Do not divulge your access code to anyone and protect your mobile phone adequately.\n' +
          'You will find recommendations in the Security section.',
        subsection: {
          title: 'Acceptable Use',
          body:
            'In connection with your use of the Licensed Application, you shall not take any action that may jeopardise the security, integrity and/or availability of the Licensed Application, including, without limitation:  \n' +
            '\n' +
            'Using the Licensed Application for illegal or improper purposes;  \n' +
            '\n' +
            'Tampering with any part of the Licensed Application;  \n' +
            '\n' +
            'Using the Licensed Application to transmit any virus or other harmful or destructive computer code, files or programs, or to conduct hacking and/or intrusive activities;  \n' +
            '\n' +
            'Attempt to circumvent or subvert any security measures associated with the Licensed Application;  \n' +
            '\n' +
            'Take any action that could reasonably be construed to adversely affect other users of the Licensed Application;  \n' +
            '\n' +
            'Where  \n' +
            '\n' +
            'Remove or alter any proprietary symbols or notices, including any copyright, trademark or logo notices, displayed in connection with the Licensed Application.  ',
        },
      },
      IdentityTheft: {
        title: 'In case of identity theft',
        body: 'If you suspect that the security of your wallet and its contents has been compromised, you must contact *the Identity Quebec Customer Relations Centre* immediately. You will not be held responsible for identity theft as long as you comply with these terms and conditions',
        subsection: {
          title: 'Indemnification',
          body:
            'You agree to indemnify, defend and hold harmless the Province and all of its respective officers, employees and agents from and against any and all claims, demands, obligations, losses, liabilities, costs or debts and expenses (including, without limitation, reasonable legal fees).\n' +
            '\n' +
            ' Arising out of:\n' +
            '\n' +
            ' (a) your use of the Licensed Application;\n' +
            '\n' +
            ' Where\n' +
            '\n' +
            ' (b) your breach of any provision of this EULA',
        },
      },
      Privacy: {
        title: 'Protection and privacy',
        body: "The Government of Quebec is concerned about the protection of your privacy and the personal and confidential information contained in this application. You are responsible for consulting the 'Privacy Policy' to learn about the Government of Quebec's practices in this regard",
        subsection: {
          title: 'Personal Information Protection',
          body:
            'If you visit the website of the application licensed to\n' +
            '\n' +
            'https://www.quebec.ca/gouvernement/ministere/cybersecurite-numerique,\n' +
            '\n' +
            'including accessing the Help Function for the licensed application or related content at https://www.quebec.ca/gouvernement/ministere/cybersecurite-numerique, certain information will be provided to you in accordance with the Province\'s Privacy Statement for Government Websites. Certain information is also collected as part of the licence application as set out in the Quebec Wallet App Privacy Policy (the "Privacy Policy"), which is incorporated by reference into and forms part of this EULA. You consent to the collection by the Licensed App of such information which, together with your Content, is stored locally on your device and is not accessible to the Province, except in cases where you choose to provide information to the Province as set forth in the Privacy Policy. Any information you provide to the Province that is "personal information", as defined in the Quebec Freedom of Information and Protection of Privacy Act ("the Act"), is collected by the Province pursuant to section 26c of the Act, for the purposes set out in the Privacy Policy. Any questions regarding the collection of this information may be directed to the contact person identified in Section 11. The consents you have provided pursuant to this section will continue until you revoke them in writing to the contact person identified in section 11, at which time this EULA will terminate immediately in accordance with section 9.',
        },
      },
      AppAccess: {
        title: 'Right of access to the application',
        body: 'The Government of Quebec may suspend access to this application if you fail to comply with these terms of use. It may also do so for these terms of use. It may also do so for security or administrative purposes',
        subsection: {
          title: 'Limitation of liability',
          body:
            'To the extent permitted by applicable law, in no event shall the Province be liable to any person or entity for any direct, indirect, special, incidental or consequential loss, claim, injury or damage, or for any other loss, claim, injury or damage.  \n' +
            '\n' +
            'If foreseeable or unforeseeable (including claims for limitation of damages for loss of profits or business opportunities, use or misuse of, or inability to use, the Licensed Application, interruptions, deletion or corruption of files, loss of programs or information, errors, defects or delays) arising out of or in any way connected with your use of the Licensed Application, whether based on contract, tort, strict liability or any other legal theory. The preceding sentence shall apply even if the Province has been expressly advised of the possibility of such loss, claim, injury or damage. The parties acknowledge that Apple is not responsible for: \n' +
            '\n' +
            '(a) dealing with any claim you or any third party may have in connection with the Authorized Application;  \n' +
            '\n' +
            'b) your possession and/or use of the Permitted Application.',
        },
      },
      More: {
        body: 'Learn more about *these terms and conditions(*)*',
      },
    },
  },
  PinCreate: {
    UserAuthenticationPin: 'User authentication pin',
    PinMustBe6DigitsInLength: 'Pin must be 6 digits in length',
    PinsEnteredDoNotMatch: 'Pins entered do not match',
    '6DigitPin': '6 Digit Pin',
    ReenterPin: 'Re-Enter Pin',
    Create: 'Create',
    PINDisclaimer:
      'If you forget it, you will have to again : \n   • Configure your wallet.\n    • Request the certificates already issued in your portfolio again.',
  },
  PinEnter: {
    IncorrectPin: 'Incorrect Pin',
  },
  ContactDetails: {
    Created: 'Created',
    ConnectionState: 'Connection State',
    AContact: 'A contact',
    DateOfConnection: 'Date of connection: {{ date }}',
    RemoveTitle: 'Remove this contact',
    RemoveCaption: 'To add credentials, the issuing organization needs to be a contact.',
    UnableToRemoveTitle: 'Unable to remove contact',
    UnableToRemoveCaption:
      'Unable to remove because there are credentials issued by this contact in your wallet. Remove the credentials first then remove this contact.',
    GoToCredentials: 'Go to Credentials',
    ContactRemoved: 'Contact removed',
  },
  WhatAreContacts: {
    Title: 'What are Contacts?',
    Preamble: 'Adding organizations as a Contact will allow you to:',
    ListItemCredentialUpdates: 'Get updates to credentials issued by this organization',
    ListItemNewCredentials: 'Get offered new credentials',
    ListItemProofRequest: 'Fast-track proof requests',
    RemoveContacts: 'You can always remove Contacts at any time from your ',
    ContactsLink: 'Contacts list',
    ContactSharing: 'Use of your credentials is never shared with your Contacts.',
  },
  CredentialDetails: {
    Id: 'Id:',
    CreatedAt: 'Created At:',
    Version: 'Version',
    Issued: 'Issued',
    PrivacyPolicy: 'Privacy policy',
    TermsAndConditions: 'Terms and conditions',
    RemoveFromWallet: 'Remove from wallet',
    Revoked: 'Revoked',
    NewRevoked: 'Credential revoked',
    Choose: 'Choose',
    GetPersonCred: 'Get your Person credential',
    ScanQrCode: 'Scan a QR code',
    CredentialRevokedMessageTitle: 'This certificate is revoked',
    CredentialRevokedMessageBody:
      'This attestation may no longer work for certain proof requests. You will need to update the attestation with the issuer.',
  },
  Home: {
    Welcome: 'Welcome',
    Notifications: 'Notifications',
    NoNewUpdates: 'You have no new notifications.',
    NoCredentials: 'You have no credentials in your wallet.',
    SeeAll: 'See all',
    YouHave: 'You have',
    Credential: 'credential',
    Credentials: 'credentials',
    InYourWallet: 'in your wallet',
  },
  Scan: {
    SuccessfullyAcceptedConnection: 'Successfully Accepted Connection',
    AcceptingConnection: 'Accepting Connection',
    ConnectionRecordIdNotFound: 'Connection record ID not found',
    ConnectionAccepted: 'Connection Accepted',
    ConnectionNotFound: 'Connection not found',
    InvalidQrCode: 'Invalid QR code. Please try again.',
    UnableToHandleRedirection: 'Unable to handle redirection',
  },
  Connection: {
    JustAMoment: 'Just a moment while we make a secure connection...',
  },
  CredentialOffer: {
    ThisIsTakingLongerThanExpected: 'This is taking Longer than expected. Check back later for your new credential.',
    'RejectThisCredential?': 'Reject this Credential?',
    AcceptingCredential: 'Accepting Credential',
    SuccessfullyAcceptedCredential: 'Successfully Accepted Credential',
    RejectingCredential: 'Rejecting Credential',
    SuccessfullyRejectedCredential: 'Successfully Rejected Credential',
    CredentialNotFound: 'Credential not found',
    CredentialAccepted: 'Credential Accepted',
    CredentialRejected: 'Credential Rejected',
    CredentialAddedToYourWallet: 'Credential added to your wallet',
    CredentialDeclined: 'Credential declined',
    CredentialOnTheWay: 'Your credential is on the way',
    CredentialOffer: 'New Credential Offer',
    IsOfferingYouACredential: 'is offering you a credential',
    DeleteOfferTitle: 'Delete this offer?',
    DeleteOfferMessage: 'Deleting this offer will remove the notification from your list.',
    DeleteOfferDescription:
      "Don't recognize the organization? Check your Contacts list. You only receive notifications from contacts you've initiated",
    NewCredentialOffer: 'New Credential Offer',
  },
  ProofRequest: {
    OfferDelay: 'Offer delay',
    'RejectThisProof?': 'Reject this Proof?',
    AcceptingProof: 'Accepting Proof',
    SuccessfullyAcceptedProof: 'Successfully Accepted Proof',
    ProofNotFound: 'Proof not Found',
    RejectingProof: 'Rejecting Proof',
    ProofAccepted: 'Proof Accepted',
    ProofRejected: 'Proof Rejected',
    RequestedCredentialsCouldNotBeFound: 'Requested credentials could not be found',
    ProofRequest: 'New Proof Request',
    NotAvailableInYourWallet: 'Not available in your wallet',
    IsRequestng: 'is requesting',
    IsRequestingSomethingYouDontHaveAvailable: "is requesting something you don't have available",
    IsRequestingYouToShare: 'is requesting you to share',
    WhichYouCanProvideFrom: 'which you can provide from',
    Details: 'Details',
    SendingTheInformationSecurely: 'Sending the information securely',
    InformationSentSuccessfully: 'Information sent successfully',
    ProofRequestDeclined: 'Proof request declined',
  },
  TabStack: {
    Home: 'Home',
    Scan: 'Scan',
    Credentials: 'Credentials',
  },
  RootStack: {
    Contacts: 'Contacts',
    Settings: 'Settings',
  },
  Onboarding: {
    Welcome: 'Welcome',
    WelcomeParagraph1: 'QC Wallet lets you receive, store and use digital credentials.',
    WelcomeParagraph2: 'It is highly secure, and helps protect your privacy online.',
    WelcomeParagraph3:
      'QC Wallet is currently in its early stages and the technology is being explored. Most people will not have a use for QC Wallet yet, because very few digital credentials are available.',
    StoredSecurelyTitle: 'Digital credentials, stored securely',
    StoredSecurelyBody:
      'BC Wallet holds digital credentials—the digital versions of things like licenses, identities and permits.\n\nThey are stored securely, only on this device.',
    UsingCredentialsTitle: 'Receiving and using credentials',
    UsingCredentialsBody:
      'To receive and use credentials you use the “Scan” feature in the app to scan a special QR code.\n\nInformation is sent and received over a private, encrypted connection.',
    PrivacyConfidentiality: 'Privacy and confidentiality',
    PrivacyParagraph:
      'You approve every use of information from your QC Wallet. You also only share what is needed for a situation.\n\nThe Government of Québec is not told when you use your digital credentials.',
    GetStarted: 'Get Started',
    SkipA11y: 'Skip introduction to QC Wallet',
  },
  Record: {
    Hide: 'Hide',
    Show: 'Show',
    HideAll: 'Hide all',
    Hidden: 'Hidden',
  },
  Loading: {
    TakingTooLong: 'This is taking longer than usual. You can return to home or continue waiting.',
    BackToHome: 'Go back to home',
  },
  NetInfo: {
    NoInternetConnectionTitle: 'No internet connection',
    NoInternetConnectionMessage:
      "You're unable to access services using QC Wallet or receive credentials until you're back online.\n\nPlease check your internet connection.",
    LedgerConnectivityIssueTitle: 'Wallet Services',
    LedgerConnectivityIssueMessage: 'A firewall may be preventing you from connecting to wallet related services.',
  },
  OnboardingPages: {
    FirstPageTitle: 'Welcome to the Quebec wallet',
    FirstPageBody1: 'The Quebec wallet allows you to receive, save and use your digital credentials.',
    FirstPageBody2: 'This app is secure and helps protect your online privacy.',
    FirstPageBody3:
      'The Quebec portfolio is currently in the early stages of development and the technology is being explored. Most people will not need the digital wallet since there are only a few credentials currently available.',
    SecondPageTitle: 'A digital credential, secretly saved',
    SecondPageBody:
      'The Quebec wallet protects your digital credentials, a digital version of your permits and identity card. \n\nThey are stored securely, only on your device.',
    ThirdPageTitle: 'Share only what is necessary',
    ThirdPageBody:
      'To receive a credential, you must Capture the QR code that will be presented to you. \n\nThe information will be communicated through a private and protected communication.',
    FourthPageTitle: 'Take control of your information',
    FourthPageBody:
      'You have control over the information that is shared and used from your Quebec wallet. You only share the information required by the situation. \n\nThe Government of Quebec is never made aware of the interactions made when you use a digital certificate.',
    ButtonGetStarted: 'Configure Wallet',
  },
  Settings: {
    Help: 'Help',
    MoreInformation: 'More Information',
    HelpUsingBCWallet: 'Help using BC Wallet',
    GiveFeedback: 'Give feedback',
    ReportAProblem: 'Report A Problem',
    TermsOfUse: 'Terms of use',
    PrivacyStatement: 'Privacy statement',
    VulnerabilityDisclosurePolicy: 'Vulnerability disclosure policy',
    Accessibility: 'Accessibility',
    IntroductionToTheApp: 'Introduction to the app',
    Version: 'Version',
    VersionString: '0.0.0-0',
    AppPreferences: 'App Preferences',
    AboutApp: 'About App',
    Language: 'Language',
  },
  Tour: {
    GuideTitle: 'Welcome to BC Wallet',
    WouldYouLike: 'Would you like some guidance on how to use BC Wallet?',
    UseAppGuides: 'Use app guides',
    DoNotUseAppGuides: "Don't use app guides",
    AddAndShare: 'Add and share credentials',
    AddAndShareDescription: 'To add and use credentials you scan a QR code displayed by the service provider.',
    Notifications: 'Notifications',
    NotificationsDescription:
      'After you scan a QR code, the credential offer or proof request will appear here, as well as other notable events.',
    YourCredentials: 'Your credentials',
    YourCredentialsDescription:
      'Your added digital credentials appear here. You can review credential details and add and delete credentials.',
    Skip: 'Skip',
    Next: 'Next',
    Back: 'Back',
    Done: 'Done',
  },
  Tips: {
    Header: 'Tips',
    GettingReady: 'Getting your wallet ready...',
    Tip1: 'For extra security, BC Wallet locks the app after 5 minutes of inactivity',
    Tip2: 'Unlike showing physical cards, you share only what is necessary from your credentials',
    Tip3: 'Your credentials are stored only on this phone, nowhere else',
    Tip4: 'Information is sent and received over an untraceable encrypted connection',
    Tip5: "Remember your PIN. If you forget it, you'll need to reinstall and re-add your credentials",
    Tip6: 'Skip the PIN and unlock your wallet using your biometrics for a faster experience',
    Tip7: 'Your most recently added credentials are placed at the top',
    Tip8: 'Remove credentials in your wallet from the credential details screen',
    Tip9: 'You can dismiss notifications without opening them by tapping “X” in the top right corner',
    Tip10: 'Need help? Find answers in the help section within the “☰” button on the top left corner',
    Tip11: 'You can turn on the camera flash if the QR code is hard to see',
    Tip12: "If the QR code isn't scanning, try increasing the screen's brightness",
    Tip13: 'Information sent via your wallet is trusted by you and your Contacts you interact with',
    Tip14: "Even revoked or expired credentials can be usable if the organisation doesn't request for it",
  },
  Init: {
    Retry: 'Retry',
    Starting: 'Starting...',
    CheckingAuth: 'Checking authentication...',
    FetchingPreferences: 'Fetching preferences...',
    VerifyingOnboarding: 'Verifying onboarding...',
    GettingCredentials: 'Getting wallet credentials...',
    RegisteringTransports: 'Registering transports...',
    InitializingAgent: 'Initializing agent...',
    ConnectingLedgers: 'Connecting to ledgers...',
    SettingAgent: 'Setting agent...',
    Finishing: 'Finishing...',
  },
  Feedback: {
    GiveFeedback: 'Give Feedback',
  },
}

export default translation
