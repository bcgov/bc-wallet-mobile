/**
 * Central registry of accessibility / resource IDs used by BCSC E2E screen objects.
 */
export const BCSC_TestIDs = {
  AccountSetup: {
    AddAccount: 'com.ariesbifold:id/AddAccount',
    TransferAccount: 'com.ariesbifold:id/TransferAccount',
    DeveloperMode: 'com.ariesbifold:id/DeveloperMode',
  },
  TransferInformation: {
    TransferAccountButton: 'com.ariesbifold:id/TransferAccountButton',
    Back: 'com.ariesbifold:id/Back',
  },
  SetupTypes: {
    Continue: 'com.ariesbifold:id/Continue',
    Cancel: 'com.ariesbifold:id/Cancel',
    MyOwnIdRadioGroup: 'com.ariesbifold:id/MyOwnIdRadioGroup-option-MyOwnID',
    SomeoneElseIdRadioGroup: "com.ariesbifold:id/MyOwnIdRadioGroup-option-SomeoneElse'sID",
    OtherPersonPresentRadioGroupYesOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-Yes',
    OtherPersonPresentRadioGroupNoOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-No',
    Back: 'com.ariesbifold:id/Back',
  },
  IntroCarousel: {
    CarouselNext: 'com.ariesbifold:id/CarouselNext',
    CarouselBack: 'com.ariesbifold:id/CarouselBack',
    WhereToUseButton: 'com.ariesbifold:id/CardButton-Where to use',
  },
  PrivacyPolicy: {
    Continue: 'com.ariesbifold:id/Continue',
    Link: 'com.ariesbifold:id/PrivacyPolicyBCLoginLink',
    LearnMore: 'com.ariesbifold:id/LearnMore',
    Back: 'com.ariesbifold:id/Back',
  },
  OptInAnalytics: {
    Accept: 'com.ariesbifold:id/Accept',
    Decline: 'com.ariesbifold:id/Decline',
    Back: 'com.ariesbifold:id/Back',
    LearnMore: 'com.ariesbifold:id/LearnMore',
  },
  Notifications: {
    Continue: 'com.ariesbifold:id/Continue',
    OpenSettings: 'com.ariesbifold:id/OpenSettings',
    ContinueWithoutNotifications: 'com.ariesbifold:id/ContinueWithoutNotifications',
    Back: 'com.ariesbifold:id/Back',
    Help: 'com.ariesbifold:id/Help',
  },
  TermsOfUse: {
    AcceptAndContinue: 'com.ariesbifold:id/AcceptAndContinue',
    RetryTermsOfUse: 'com.ariesbifold:id/RetryTermsOfUse',
    Back: 'com.ariesbifold:id/Back',
  },
  SecureApp: {
    BiometricAuth: 'com.ariesbifold:id/ChooseDeviceAuthButton',
    PinAuth: 'com.ariesbifold:id/ChoosePINButton',
    LearnMore: 'com.ariesbifold:id/LearnMoreButton',
    Back: 'com.ariesbifold:id/Back',
  },
  CreatePIN: {
    Continue: 'com.ariesbifold:id/Continue',
    IUnderstand: 'com.ariesbifold:id/IUnderstand',
    PINInput1: 'com.ariesbifold:id/PINInput1',
    PINInput2: 'com.ariesbifold:id/PINInput2',
    PINInput1VisibilityButton: 'com.ariesbifold:id/PINInput1VisibilityButton',
    PINInput2VisibilityButton: 'com.ariesbifold:id/PINInput2VisibilityButton',
    Back: 'com.ariesbifold:id/Back',
  },
  Nickname: {
    AccountNicknamePressable: 'com.ariesbifold:id/accountNickname-pressable',
    /** TextInput inside `InputWithValidation` — use for `type()`; the pressable is not editable on Android. */
    AccountNicknameInput: 'com.ariesbifold:id/accountNickname-input',
    SaveAndContinue: 'com.ariesbifold:id/SaveAndContinue',
    Back: 'com.ariesbifold:id/Back',
  },
  TransferInstructions: {
    ScanQRCode: 'com.ariesbifold:id/ScanQRCode',
    Back: 'com.ariesbifold:id/Back',
  },
  TransferQRScanner: {
    Back: 'com.ariesbifold:id/Back',
  },
  IdentitySelection: {
    CombinedCard: 'com.ariesbifold:id/CombinedCard',
    PhotoCard: 'com.ariesbifold:id/PhotoCard',
    NoPhotoCard: 'com.ariesbifold:id/NoPhotoCard',
    CheckForServicesCard: 'com.ariesbifold:id/CheckForServicesCard',
    OtherID: 'com.ariesbifold:id/OtherID',
  },
  SerialInstructions: {
    ScanBarcode: 'com.ariesbifold:id/ScanBarcode',
    EnterManually: 'com.ariesbifold:id/EnterManually',
    Help: 'com.ariesbifold:id/Help',
  },
  ScanSerial: {
    EnterManually: 'com.ariesbifold:id/EnterManually',
    Help: 'com.ariesbifold:id/Help',
  },
  ManualSerial: {
    SerialPressable: 'com.ariesbifold:id/serial-pressable',
    /** TextInput inside `InputWithValidation` — use for `type()`; the pressable is not editable on Android. */
    SerialInput: 'com.ariesbifold:id/serial-input',
    Continue: 'com.ariesbifold:id/Continue',
    Help: 'com.ariesbifold:id/Help',
  },
  EnterBirthdate: {
    BirthdateInputPressable: 'com.ariesbifold:id/birthDate-pressable',
    /** TextInput inside `InputWithValidation` — use for `type()`; the pressable is not editable on Android. */
    BirthdateInput: 'com.ariesbifold:id/birthDate-input',
    Done: 'com.ariesbifold:id/Done',
  },
  VerificationCardError: {
    GetBCSC: 'com.ariesbifold:id/GetBCSC',
  },
  BirthdateLockout: {
    Close: 'com.ariesbifold:id/Close',
  },
  IDPhotoInformation: {
    TakePhoto: 'com.ariesbifold:id/IDPhotoInformationTakePhoto',
    Help: 'com.ariesbifold:id/Help',
  },
  EvidenceCapture: {
    MaskedCamera: 'com.ariesbifold:id/EvidenceCaptureScreenMaskedCamera',
    CancelCamera: 'com.ariesbifold:id/CancelCamera',
    TakePhoto: 'com.ariesbifold:id/TakePhoto',
    ToggleFlash: 'com.ariesbifold:id/ToggleFlash',
    UsePhoto: 'com.ariesbifold:id/UsePhoto',
    RetakePhoto: 'com.ariesbifold:id/RetakePhoto',
    Help: 'com.ariesbifold:id/Help',
  },
  EvidenceIDCollection: {
    Continue: 'com.ariesbifold:id/EvidenceIDCollectionContinue',
    Cancel: 'com.ariesbifold:id/EvidenceIDCollectionCancel',
    DriversLicenseEvidenceOption: `com.ariesbifold:id/EvidenceTypeListItem B.C. driver's licence`,
    PassportEvidenceOption: `com.ariesbifold:id/EvidenceTypeListItem Canadian Passport`,
    DocumentNumberPressable: 'com.ariesbifold:id/documentNumber-pressable',
    DocumentNumberInput: 'com.ariesbifold:id/documentNumber-input',
    LastNameInput: 'com.ariesbifold:id/lastName-input',
    FirstNameInput: 'com.ariesbifold:id/firstName-input',
    MiddleNamesInput: 'com.ariesbifold:id/middleNames-input',
    BirthdateInput: 'com.ariesbifold:id/birthDate-input',
    Help: 'com.ariesbifold:id/Help',
  },
  EvidenceTypeList: {
    CanadianPassport: 'com.ariesbifold:id/EvidenceTypeListItem Canadian Passport',
    OtherOptions: 'com.ariesbifold:id/EvidenceTypeListOtherOptions',
    Help: 'com.ariesbifold:id/Help',
  },
  DualIdentificationRequired: {
    ChooseID: 'com.ariesbifold:id/Choose ID',
    OpenAccountServices: 'com.ariesbifold:id/OpenAccountServices',
    Help: 'com.ariesbifold:id/Help',
  },
  AdditionalIdentificationRequired: {
    ChooseID: 'com.ariesbifold:id/Choose ID',
    OpenAccountServices: 'com.ariesbifold:id/OpenAccountServices',
    Help: 'com.ariesbifold:id/Help',
  },
  ResidentialAddress: {
    Continue: 'com.ariesbifold:id/ResidentialAddressContinue',
    StreetAddress1Input: 'com.ariesbifold:id/streetAddress1-input',
    StreetAddress2Input: 'com.ariesbifold:id/streetAddress2-input',
    CityInput: 'com.ariesbifold:id/city-input',
    ProvinceInput: 'com.ariesbifold:id/province-input',
    PostalCodeInput: 'com.ariesbifold:id/postalCode-input',
    ProvinceOptionBritishColumbia: 'com.ariesbifold:id/province-option-BC',
  },
  EnterEmail: {
    EmailInput: 'com.ariesbifold:id/email-input',
    ContinueButton: 'ContinueButton',
    SkipButton: 'SkipButton',
  },
  EmailConfirmation: {
    CodeInput: 'com.ariesbifold:id/EmailConfirmationCodeInput',
    ContinueButton: 'ContinueButton',
    ResendCodeButton: 'ResendCodeButton',
    GoToEmailButton: 'GoToEmailButton',
  },
  VerificationMethodSelection: {
    SendVideo: 'com.ariesbifold:id/Send a video',
    VideoCall: 'com.ariesbifold:id/Video call',
    InPerson: 'com.ariesbifold:id/In person',
    Help: 'com.ariesbifold:id/Help',
  },
  InformationRequired: {
    TakePhotoAction: 'com.ariesbifold:id/Take Photo',
    RecordVideoAction: 'com.ariesbifold:id/Record Video',
    SendToServiceBCNow: 'SendToServiceBCNow',
  },
  PhotoInstructions: {
    TakePhotoButton: 'TakePhotoButton',
  },
  TakePhoto: {
    CancelCamera: 'com.ariesbifold:id/CancelCamera',
    TakePhoto: 'com.ariesbifold:id/TakePhoto',
    ToggleFlash: 'com.ariesbifold:id/ToggleFlash',
  },
  PhotoReview: {
    UsePhoto: 'com.ariesbifold:id/UsePhoto',
    RetakePhoto: 'com.ariesbifold:id/RetakePhoto',
  },
  VideoInstructions: {
    StartRecordingButton: 'StartRecordingButton',
  },
  TakeVideo: {
    StartRecordingButton: 'StartRecordingButton',
  },
  VideoReview: {
    UseVideo: 'com.ariesbifold:id/UseVideo',
    RetakeVideo: 'com.ariesbifold:id/RetakeVideo',
    TogglePlayPause: 'com.ariesbifold:id/TogglePlayPause',
  },
  VideoTooLong: {
    Cancel: 'Cancel',
  },
  SuccessfullySent: {
    Ok: 'com.ariesbifold:id/Ok',
  },
  BeforeYouCall: {
    BeforeYouCallTitle: 'com.ariesbifold:id/BeforeYouCallTitle',
    HoursOfServiceTitle: 'com.ariesbifold:id/HoursOfServiceTitle',
    Continue: 'com.ariesbifold:id/Continue',
    Assistance: 'com.ariesbifold:id/Assistance',
    Help: 'com.ariesbifold:id/Help',
  },
  StartCall: {
    Help: 'com.ariesbifold:id/Help',
  },
  CallBusyOrClosed: {
    CallStatusTitle: 'com.ariesbifold:id/CallStatusTitle',
    HoursOfServiceTitle: 'com.ariesbifold:id/HoursOfServiceTitle',
    ReminderTitle: 'com.ariesbifold:id/ReminderTitle',
    SendVideo: 'com.ariesbifold:id/SendVideo',
    Help: 'com.ariesbifold:id/Help',
  },
  LiveCall: {
    Mute: 'com.ariesbifold:id/Mute',
    Video: 'com.ariesbifold:id/Video',
    EndCall: 'com.ariesbifold:id/EndCall',
    Cancel: 'com.ariesbifold:id/Cancel',
    TryAgain: 'com.ariesbifold:id/TryAgain',
    GoBack: 'com.ariesbifold:id/GoBack',
  },
  VerifyInPerson: {
    ServiceBCLink: 'com.ariesbifold:id/ServiceBCLink',
    ConfirmationCode: 'com.ariesbifold:id/ConfirmationCode',
    Complete: 'com.ariesbifold:id/Complete',
    Help: 'com.ariesbifold:id/Help',
  },
  SetupSteps: {
    Step1: 'com.ariesbifold:id/Step 1',
    Step2: 'com.ariesbifold:id/Step 2',
    Step3: 'com.ariesbifold:id/Step 3',
    Step4: 'com.ariesbifold:id/Step 4',
    EditEmail: 'com.ariesbifold:id/EditEmail',
    EmailAddress: 'com.ariesbifold:id/EmailAddress',
    Step5: 'com.ariesbifold:id/Step 5',
    SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
    Help: 'com.ariesbifold:id/Help',
  },
  VerificationSuccess: {
    Ok: 'com.ariesbifold:id/Ok',
  },
  PendingReview: {
    Ok: 'com.ariesbifold:id/Ok',
  },
  CancelledReview: {
    SystemModalButton: 'com.ariesbifold:id/SystemModalButton',
  },
  VerifyNotComplete: {
    SendVideo: 'com.ariesbifold:id/SendVideo',
    TryAgain: 'com.ariesbifold:id/TryAgain',
    Trouble: 'com.ariesbifold:id/Trouble',
    Help: 'com.ariesbifold:id/Help',
  },
  VerifySettings: {
    Back: 'com.ariesbifold:id/Back',
  },
  AccountSelector: {
    SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
    ContinueSetup: 'com.ariesbifold:id/ContinueSetup',
  },
  EnterPIN: {
    PINInput: 'com.ariesbifold:id/PINInput',
    Continue: 'com.ariesbifold:id/Continue',
    GetHelp: 'com.ariesbifold:id/GetHelp',
    VisibilityButton: 'com.ariesbifold:id/PINInputVisibilityButton',
  },
  Lockout: {
    RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
  },
  DeviceAuthAppReset: {
    SetUpApp: 'com.ariesbifold:id/SetUpApp',
    LearnMore: 'com.ariesbifold:id/LearnMore',
  },
  DeviceAuthInfo: {
    HideConfirmationCheckbox: 'com.ariesbifold:id/HideConfirmationCheckbox',
    Continue: 'com.ariesbifold:id/Continue',
  },
  AuthPrivacyPolicy: {
    PrivacyPolicyBCLoginLink: 'com.ariesbifold:id/PrivacyPolicyBCLoginLink',
    LearnMoreCardEn: 'com.ariesbifold:id/CardButton-Learn more',
  },
  AuthWebView: {
    Back: 'com.ariesbifold:id/Back',
  },
  AuthDeveloper: {
    Back: 'com.ariesbifold:id/Back',
  },
  PermissionDisabled: {
    OpenSettings: 'com.ariesbifold:id/OpenSettings',
  },
  Home: {
    SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
    Help: 'com.ariesbifold:id/Help',
    WhereToUse: 'com.ariesbifold:id/WhereToUse',
    LogInFromComputer: 'com.ariesbifold:id/LogInFromComputer',
  },
  TabBar: {
    Home: 'com.ariesbifold:id/Home',
    Services: 'com.ariesbifold:id/Services',
    Account: 'com.ariesbifold:id/Account',
    SettingsMenuButton: 'com.ariesbifold:id/SettingsMenuButton',
    HelpButton: 'com.ariesbifold:id/HelpButton',
  },
  ServiceLogin: {
    GoToServiceClient: 'com.ariesbifold:id/GoToServiceClient',
    ReportSuspiciousLink: 'com.ariesbifold:id/ReportSuspiciousLink',
    HelpButton: 'com.ariesbifold:id/HelpButton',
    ReadPrivacyPolicy: 'com.ariesbifold:id/ReadPrivacyPolicy',
    ServiceLoginContinue: 'com.ariesbifold:id/ServiceLoginContinue',
    ServiceLoginCancel: 'com.ariesbifold:id/ServiceLoginCancel',
    Back: 'com.ariesbifold:id/Back',
  },
  ManualPairingCode: {
    Submit: 'com.ariesbifold:id/Submit',
    PairingCodeInput: 'com.ariesbifold:id/ManualPairingCodeInput',
  },
  Services: {
    Search: 'com.ariesbifold:id/search',
    ClearSearch: 'com.ariesbifold:id/clearSearch',
  },
  PairingConfirmation: {
    ToggleBookmark: 'com.ariesbifold:id/ToggleBookmark',
    Close: 'com.ariesbifold:id/Close',
  },
  Account: {
    AccountScreen: 'com.ariesbifold:id/AccountScreen',
    MyDevices: 'com.ariesbifold:id/MyDevices',
    TransferAccount: 'com.ariesbifold:id/TransferAccount',
    AllAccountDetails: 'com.ariesbifold:id/AllAccountDetails',
    RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
  },
  RemoveAccountConfirmation: {
    RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
    Cancel: 'com.ariesbifold:id/Cancel',
  },
  TransferAccountQRInformation: {
    GetQRCodeButton: 'com.ariesbifold:id/GetQRCodeButton',
    LearnMoreButton: 'com.ariesbifold:id/LearnMoreButton',
    Back: 'com.ariesbifold:id/Back',
  },
  TransferAccountQRDisplay: {
    GetNewQRCode: 'com.ariesbifold:id/GetNewQRCode',
    Back: 'com.ariesbifold:id/Back',
  },
  TransferAccountSuccess: {
    TransferSuccessButton: 'com.ariesbifold:id/TransferSuccessButton',
    RemoveAccountButton: 'com.ariesbifold:id/RemoveAccountButton',
  },
  AccountExpired: {
    Renew: 'com.ariesbifold:id/Renew',
    RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
  },
  AccountRenewalFirstWarning: {
    Continue: 'com.ariesbifold:id/Continue',
  },
  AccountRenewalInformation: {
    Continue: 'com.ariesbifold:id/Continue',
    GetNewCard: 'com.ariesbifold:id/InformationGetNewCard',
    TypesOfAcceptedID: 'com.ariesbifold:id/InformationTypesOfAcceptedId',
  },
  AccountRenewalFinalWarning: {
    Renew: 'com.ariesbifold:id/Renew',
  },
  Settings: {
    BackButton: 'com.ariesbifold:id/Back',
    SignOut: 'com.ariesbifold:id/SignOut',
    AppSecurity: 'com.ariesbifold:id/AppSecurity',
    ChangePIN: 'com.ariesbifold:id/ChangePIN',
    EditNickname: 'com.ariesbifold:id/EditNickname',
    AutoLock: 'com.ariesbifold:id/AutoLock',
    ForgetPairings: 'com.ariesbifold:id/ForgetPairings',
    AnalyticsOptIn: 'com.ariesbifold:id/AnalyticsOptIn',
    RemoveAccount: 'com.ariesbifold:id/RemoveAccount',
    Help: 'com.ariesbifold:id/Help',
    Privacy: 'com.ariesbifold:id/Privacy',
    ContactUs: 'com.ariesbifold:id/ContactUs',
    Feedback: 'com.ariesbifold:id/Feedback',
    Accessibility: 'com.ariesbifold:id/Accessibility',
    TermsOfUse: 'com.ariesbifold:id/TermsOfUse',
    Analytics: 'com.ariesbifold:id/Analytics',
    DeveloperMode: 'com.ariesbifold:id/DeveloperMode',
  },
  AutoLock: {
    AutoLockTime5: 'com.ariesbifold:id/auto-lock-time-5',
    AutoLockTime3: 'com.ariesbifold:id/auto-lock-time-3',
    AutoLockTime1: 'com.ariesbifold:id/auto-lock-time-1',
    BackButton: 'com.ariesbifold:id/Back',
  },
  ChangePIN: {
    BackButton: 'com.ariesbifold:id/Back',
    EnterCurrentPIN: 'com.ariesbifold:id/EnterCurrentPIN',
    EnterNewPIN: 'com.ariesbifold:id/EnterNewPIN',
    ReenterNewPIN: 'com.ariesbifold:id/ReenterNewPIN',
    IUnderstand: 'com.ariesbifold:id/IUnderstand',
    ChangePIN: 'com.ariesbifold:id/ChangePIN',
  },
  MainAppSecurity: {
    BackButton: 'com.ariesbifold:id/Back',
    LearnMoreButton: 'com.ariesbifold:id/LearnMoreButton',
    ChoosePINButton: 'com.ariesbifold:id/ChoosePINButton',
    ChooseDeviceAuthButton: 'com.ariesbifold:id/ChooseDeviceAuthButton',
  },
  MainPrivacyPolicy: {
    BackButton: 'com.ariesbifold:id/Back',
    PrivacyPolicyBCLoginLink: 'com.ariesbifold:id/PrivacyPolicyBCLoginLink',
  },
  MainContactUs: {
    BackButton: 'com.ariesbifold:id/Back',
  },
  EditNickname: {
    BackButton: 'com.ariesbifold:id/Back',
    /** Pressable wrapper — use for iOS `tap` and `type`. */
    AccountNicknamePressable: 'com.ariesbifold:id/accountNickname-pressable',
    /** TextInput inside `InputWithValidation` — use for Android `type`. */
    AccountNicknameInput: 'com.ariesbifold:id/accountNickname-input',
    SaveAndContinue: 'com.ariesbifold:id/SaveAndContinue',
    /** Subtext / inline error below the input (rendered by InputWithValidation). */
    AccountNicknameSubtext: 'com.ariesbifold:id/accountNickname-subtext',
  },
  ForgetAllPairings: {
    ForgetAllPairings: 'com.ariesbifold:id/ForgetAllPairings',
  },
  WebView: {
    Back: 'com.ariesbifold:id/Back',
  },
  SystemModal: {
    SystemModalButton: 'com.ariesbifold:id/SystemModalButton',
  },
} as const

export const BCWallet_TestIDs = {
  Preface: {
    IAgree: 'com.ariesbifold:id/IAgree',
    Continue: 'com.ariesbifold:id/Continue',
  },
  Update: {
    UpdateNow: 'com.ariesbifold:id/UpdateNow',
    UpdateLater: 'com.ariesbifold:id/UpdateLater',
  },
  Onboarding: {
    Next: 'com.ariesbifold:id/Next',
    Back: 'com.ariesbifold:id/Back',
    GetStarted: 'com.ariesbifold:id/GetStarted',
  },
} as const
