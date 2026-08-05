/**
 * Shared source of truth for BCSC test ID **keys** (the argument the app passes to bifold's
 * `testIdWithKey`) and the **prefix** it wraps them in.
 *
 * Deliberately DEPENDENCY-FREE (only `as const` string literals, zero imports) so it can be consumed
 * by both an RN app bundle and the Node/wdio e2e process. Consumers apply the prefix themselves:
 *   - app  →  `testIdWithKey(TestIds.onboarding.intro.continue)`   (bifold re-applies `testIdPrefix`)
 *   - e2e  →  `bcsc(TestIds.onboarding.intro.continue)`            (see screens/core/appId.ts)
 *
 * PILOT SCOPE (step 1–2): this file currently lives in the e2e package and is consumed only by the
 * e2e screen descriptors. In step 3 it MOVES verbatim to a location the app owns (e.g.
 * `app/src/test-ids/` or a `packages/test-ids` workspace package); the app then imports it too and its
 * inline `testIdWithKey('Literal')` call sites are refactored to reference these keys. Because the
 * emitted id string is unchanged (`com.ariesbifold:id/<key>`), that migration is byte-identical.
 *
 * Keep `TESTID_PREFIX` equal to bifold's `testIdPrefix`; a guard test on the app side
 * (`testIdWithKey('x') === TESTID_PREFIX + 'x'`) will catch drift once the app consumes this.
 */

/** Matches bifold's `testIdPrefix` (`@bifold/core` constants). React Native maps a component's
 *  `testID` to the iOS accessibility id and the Android resource-id, so this one string selects on
 *  both platforms. */
export const TESTID_PREFIX = 'com.ariesbifold:id/'

export const TestIds = {
  /** Truly global controls that render identically across screens. */
  common: {
    /** Stack header back button (`headerBackTestID` in every stack's screenOptions). */
    back: 'Back',
    /** Floating help menu button (headerRight on the onboarding/verify stacks). */
    help: 'HelpMenu',
  },

  onboarding: {
    intro: {
      continue: 'Continue',
      settings: 'SettingsMenuButton', // intro header-left → OnboardingSettings (reuses SettingsContent)
    },
    privacyPolicy: {
      continue: 'Continue',
      // In-screen "Learn More" card → in-app OnboardingWebView (return via the header Back button).
      learnMore: 'LearnMore',
    },
    termsOfUse: {
      acceptAndContinue: 'AcceptAndContinue',
      retry: 'RetryTermsOfUse',
    },
    optInAnalytics: {
      accept: 'Accept',
      decline: 'Decline',
    },
    notifications: {
      enable: 'EnableNotifications',
      skip: 'SkipNotifications',
      // The same route renders a `PermissionDisabled` variant INSTEAD of the enable/skip pair once the
      // user has been prompted and the live OS status is denied/blocked. Re-entering re-runs the check.
      openSettings: 'OpenSettings',
      continueWithout: 'ContinueWithoutNotifications',
    },
    secureApp: {
      choosePin: 'ChoosePINButton',
      chooseDeviceAuth: 'ChooseDeviceAuthButton',
    },
    createPin: {
      // `PINEntryForm` renders two PINInput fields; with `creatingNewPIN` the confirm button's key
      // is `CreatePIN`, not the generic `Continue`.
      pin: 'PINInput1',
      confirmPin: 'PINInput2',
      pin1Visibility: 'PINInput1VisibilityButton',
      pin2Visibility: 'PINInput2VisibilityButton',
      understand: 'IUnderstand',
      createPin: 'CreatePIN',
    },
    verifyPrompt: {
      continue: 'Continue',
      skipVerification: 'SkipVerification',
    },
  },

  auth: {
    /** Returning-user landing — the unlock entry every cold start of an onboarded user hits.
     *  `settings` is its header-left menu button → the PRE-authentication `AuthSettings` surface. */
    accountLanding: {
      unlock: 'Unlock',
      settings: 'SettingsMenuButton',
    },
    /** Existing-PIN entry (`EnterPIN`). The PIN auto-submits on the 6th digit; Continue is the manual fallback. */
    enterPin: {
      pin: 'PINInput',
      pinVisibility: 'PINInputVisibilityButton',
      continue: 'Continue',
      getHelp: 'GetHelp',
    },
    /** Timed lockout screen after 5 consecutive wrong PINs (native counter, persisted across relaunches). */
    lockout: {
      removeAccount: 'RemoveAccount',
    },
  },

  verify: {
    /** Add-or-transfer choice (`AccountSetup`) — the first screen after VerifyPrompt Continue. */
    accountSetup: {
      addAccount: 'AddAccount',
      transferAccount: 'TransferAccount',
    },
    /** `TransferInstructions` — the transferee QR instructions reached from AccountSetup's transfer
     *  option. `scanQrCode` (the always-present primary button) is the stable anchor; the visible
     *  "Transfer Instructions" is only the nav-bar title (a `Screens:` key, not findByText-matchable). */
    transferInstructions: {
      scanQrCode: 'ScanQRCode',
    },
    /** `IdentitySelection` — Scan (BCSC path) or use another ID (non-BCSC path). */
    identitySelection: {
      scan: 'Scan',
      otherId: 'OtherID',
    },
    /** Camera scan screen; `EnterManually` is the CI path around the live camera. When the camera
     *  permission is refused the screen renders the shared `PermissionDisabled` body INSTEAD of the
     *  camera — `openSettings` is that fallback's marker (it hands off to the OS settings app, so it
     *  is asserted, never tapped), while `enterManually` renders in BOTH bodies as the way out. */
    scanSerial: {
      enterManually: 'EnterManually',
      openSettings: 'OpenSettings',
    },
    /** Manual serial form (`InputWithValidation id='serial'` → derived input/pressable/subtext ids).
     *  `serialSubtext` is the shared error slot: this screen passes no static subtext, so the element
     *  exists ONLY while an inline validation error is showing, and its text is which rule failed. */
    manualSerial: {
      serialPressable: 'serial-pressable',
      serialInput: 'serial-input',
      serialSubtext: 'serial-subtext',
      continue: 'Continue',
    },
    /** Birthdate form (`DateInput id='birthDate'`, digits progressive-format to YYYY/MM/DD).
     *  Submit fires the backend `authorizeDevice(serial, dob)` that derives the card type. */
    enterBirthdate: {
      birthdatePressable: 'birthDate-pressable',
      birthdateInput: 'birthDate-input',
      continue: 'Continue',
    },
    /** `VerificationCardError` — the authorize-failure screen at the EnterBirthdate submit. The
     *  `MismatchedSerial` variant (CSN/birthdate mismatch or card-not-found — the unhandled-error path)
     *  shows `tryAnother` → IdentitySelection; the `CardExpired` variant shows `getBcsc` (opens a browser). */
    verificationCardError: {
      tryAnother: 'TryAnother',
      getBcsc: 'GetBCSC',
    },
    /** `EnterEmail` — appears after birthdate only when the card provides no verified email (a photo
     *  card that already carries one resumes straight to method selection). `skip` (`SkipEmail`) is
     *  the normalized key (formerly a bare `SkipButton`). */
    enterEmail: {
      inputPressable: 'email-pressable',
      input: 'email-input',
      continue: 'Continue',
      skip: 'SkipEmail',
    },
    /** Verification method selection (`'Verify Options'`). Which of the three method buttons render is
     *  backend-driven (`verificationOptions`) and the title has no testID, so `hoursOfService`
     *  (always rendered) is the screen marker. In-person is the CI completion path; the header-left is
     *  a settings menu, not a back button. */
    methodSelection: {
      hoursOfService: 'HoursOfServiceTitle',
      inPerson: 'InPerson',
      sendVideo: 'SendVideo',
      videoCall: 'VideoCall',
      settingsMenu: 'SettingsMenuButton',
    },
    /** In-person verification (`'Verify In Person Instruction'`) — shows the XXXX-XXXX confirmation
     *  code the SM approval reads; `complete` advances to VerificationSuccess. */
    verifyInPerson: {
      confirmationCode: 'ConfirmationCode',
      complete: 'Complete',
      serviceBcLink: 'ServiceBCLink',
    },
    /** Verification success (`'Setup Complete'`, no header). NOTE: the continue button's key is the
     *  translation-resolved `Continue` (i18n-derived — a candidate for a future stable key); tapping
     *  it exits the verify stack to Home. */
    verificationSuccess: {
      continue: 'Continue',
    },
    /** Selfie-photo instructions (`'Selfie Photo Tips'`) — the first screen of BOTH the send-video and
     *  live-call (open-hours) branches; `takePhoto` enters the camera (out of CI). */
    photoInstructions: {
      takePhoto: 'TakePhoto',
    },
    /** Live-call busy/closed (`'Video Verify Closed'`) — the live-call branch when no agent queue is
     *  free or outside service hours. `callStatusTitle` is the marker; `sendVideo` resets to method
     *  selection. */
    callBusyOrClosed: {
      callStatusTitle: 'CallStatusTitle',
      hoursOfServiceTitle: 'HoursOfServiceTitle',
      reminderTitle: 'ReminderTitle',
      sendVideo: 'SendVideo',
    },
    /** Email confirmation (`'Email Verification'`) — the 6-digit code emailed to the entered address.
     *  A correct `continue` RESETS the stack to EmailVerified. (`ResendCodeLink` / `GoToMyEmailLink`
     *  are BARE testIDs — add them as raw strings, not `bcsc()`-wrapped, if a resend detour needs
     *  them.) */
    emailConfirmation: {
      codeInput: 'EmailConfirmationCodeInput',
      // `CodeInput` renders its error as `<the input's testID>-subtext`, so this one is already
      // prefixed by the app — it is NOT wrapped by `bcsc()` a second time.
      codeError: 'EmailConfirmationCodeInput-subtext',
      continue: 'Continue',
    },
    /** BARE testIDs on EmailConfirmation — written without `testIdWithKey`, so they carry NO prefix.
     *  Pass them to a descriptor as raw strings; `bcsc()` would produce an id that does not exist. */
    emailConfirmationBare: {
      resendCode: 'ResendCodeLink',
      goToMyEmail: 'GoToMyEmailLink',
    },
    /** Email verified (`'Email Verified'`, no header) — success interstitial. Its only testID is the
     *  shared `continue`, so the screen is identified by its title copy ("Your email has been
     *  verified"); `continue` RESETS to VerificationMethodSelection. */
    emailVerified: {
      continue: 'Continue',
    },
    /** `AdditionalIdentificationRequired` ('Photo ID Required') — a non-photo BCSC card must add one
     *  extra photo ID. Only the primary CTA has a testID and it is label-derived (`Continue`); confirm
     *  the screen by heading copy when it matters. */
    additionalIdRequired: {
      continue: 'Continue',
    },
    /** `DualIdentificationRequired` — non-BCSC needs two IDs. CTA is label-derived `Continue`;
     *  `seeAcceptedId` opens the accepted-documents webview. */
    dualIdRequired: {
      continue: 'Continue',
      seeAcceptedId: 'SeeAcceptedID',
    },
    /** `EvidenceTypeList` — the document-type picker. Rows are `EvidenceTypeListItem-<evidence_type>`
     *  where evidence_type is SERVER-PROVIDED (unknown/variable, may contain spaces), so specs select a
     *  row by its visible LABEL via `findByText`, not by testID. `otherOptions` reveals non-photo
     *  document types. */
    evidenceTypeList: {
      otherOptions: 'EvidenceTypeListOtherOptions',
    },
    /** `IDPhotoInformation` ('ID Photo Instructions') — the primer before the document camera. */
    idPhotoInformation: {
      takePhoto: 'IDPhotoInformationTakePhoto',
    },
    /** `EvidenceCapture` — the MaskedCamera document capture. CAMERA-ONLY (needs Sauce image injection;
     *  `injectPhoto` throws off-Sauce). `maskedCamera` is the container marker; `takePhoto` is the
     *  shutter and `cancel` the close — both shared bifold `MaskedCamera` testIDs. */
    evidenceCapture: {
      maskedCamera: 'EvidenceCaptureScreenMaskedCamera',
      takePhoto: 'TakePhoto',
      cancel: 'CancelCamera',
    },
    /** `PhotoReview` — accept/retake a captured document photo (shared bifold component). */
    photoReview: {
      usePhoto: 'UsePhoto',
      retake: 'RetakePhoto',
    },
    /** `EvidenceIDCollection` ('Secondary ID Document Data Entry') — the TYPED document form reached
     *  AFTER the photo capture. `documentNumber` is the number field (InputWithValidation → iOS types
     *  the pressable wrapper). The name/birthdate inputs render only for the first of two non-BCSC
     *  IDs. */
    evidenceIdCollection: {
      documentNumberPressable: 'documentNumber-pressable',
      documentNumberInput: 'documentNumber-input',
      continue: 'EvidenceIDCollectionContinue',
      lastName: 'lastName-input',
      firstName: 'firstName-input',
      middleNames: 'middleNames-input',
      birthdate: 'birthDate-input',
      // The birthdate field carries a STATIC subtext as well as its validation errors, and
      // `InputWithValidation` renders both through the same node — so this element is always present
      // and only its TEXT says whether the value was rejected. Compare it; never assert presence.
      birthdateSubtext: 'birthDate-subtext',
    },
    /** `ResidentialAddress` ('Address Entry') — non-BCSC only, after both documents. Text fields are
     *  InputWithValidation (iOS types the pressable wrapper); `province` is a DropdownWithValidation —
     *  tap `provinceInput` to open the modal, then `provinceOptionBC`. There is no country field. */
    residentialAddress: {
      streetAddress1Pressable: 'streetAddress1-pressable',
      streetAddress1Input: 'streetAddress1-input',
      cityPressable: 'city-pressable',
      cityInput: 'city-input',
      postalCodePressable: 'postalCode-pressable',
      postalCodeInput: 'postalCode-input',
      provinceInput: 'province-input',
      provinceOptionBC: 'province-option-BC',
      continue: 'ResidentialAddressContinue',
    },
  },

  main: {
    /** Bottom tab bar (`tabBarTestID`s in `TabStack`). */
    tabBar: {
      home: 'Home',
      services: 'Services',
      wallet: 'Wallet',
    },
    /** Services catalogue (verified-only; unverified taps redirect to MainVerifyPrompt). `search` is
     *  the always-present sticky-header catalogue search field — the "Services opened, not gated" marker. */
    services: {
      search: 'search',
      loading: 'ServicesLoading',
    },
    /** Header settings (menu) button on the Home/Services tab headers. */
    header: {
      settings: 'SettingsMenuButton',
    },
    /** Home's notification list card (`NotificationActionCard`). For an unverified account with
     *  verification progress this is the Start/Continue-verification card, whose `view` button
     *  re-enters the verify stack at `getResumeStepRoute` — the app's ONLY route back into an
     *  interrupted verification. All four keys are shared by every action card, so which card is
     *  showing is told apart by `headerText`/`bodyText` copy, not by testID. */
    notification: {
      item: 'NotificationListItem',
      headerText: 'HeaderText',
      bodyText: 'BodyText',
      view: 'ViewNotification',
    },
    /** Floating scan FAB (rendered on the Home + Wallet tabs, not verification-gated) → QRCore. */
    scan: {
      fab: 'FloatingScanButton',
    },
    /** No-skip verify prompt (`MainVerifyPrompt`) — the redirect target for unverified Services/
     *  PairingCode taps. Continue is its only testID; disambiguate by its title copy. */
    verifyPrompt: {
      continue: 'Continue',
    },
    /** Wallet tab (Bifold credential stack behind the agent gates). The BCSC empty state. */
    wallet: {
      loading: 'Wallet.Loading',
      empty: 'Wallet.Empty',
      emptyLearnMore: 'Wallet.EmptyLearnMore',
    },
    /** QRCore bottom-tab navigator (opened by the scan FAB). Display tab only exists in dev mode. */
    qrCore: {
      scannerTab: 'ScanQRCode',
      displayTab: 'MyQRCode',
      pairingCodeTab: 'PairingCode',
      torchToggle: 'TorchToggle',
    },
    /** Main settings (minimal — the full screen is modeled later). `profile` is verified-gated. */
    /** Main settings menu (`SettingsContent.tsx`). The `AuthenticatedSection` rows render once
     *  `didAuthenticate`; the `isVerified`-gated rows (profile/editProfile/contacts/addDevice/
     *  myDevices/forgetPairings) are ABSENT unverified. The Help + MoreInfo section rows always render. */
    settings: {
      appSecurity: 'AppSecurity',
      changePin: 'ChangePIN',
      autoLock: 'AutoLock',
      notifications: 'Notifications',
      analyticsOptIn: 'AnalyticsOptIn',
      removeAccount: 'RemoveAccount',
      resetWallet: 'ResetWallet', // distinct destructive row; shared DestructiveConfirmationScreen (confirm = ConfirmDestructiveAction)
      help: 'Help',
      contactUs: 'ContactUs',
      feedback: 'Feedback',
      accessibility: 'Accessibility',
      termsOfUse: 'TermsOfUse',
      privacy: 'Privacy',
      // Hidden until developer mode is enabled — so its absence is itself an assertion.
      developerMode: 'DeveloperMode',
      // verified-only (isVerified-gated): absence-assert unverified, presence when verified
      profile: 'Profile',
      editProfile: 'EditProfile',
      contacts: 'Contacts',
      addDevice: 'AddDevice',
      myDevices: 'MyDevices',
      forgetPairings: 'ForgetPairings',
    },
    /** App Security sub-screen (SecurityMethodSelector). `ChoosePINButton` renders in both post-load
     *  branches, so it is the arrival marker (during the async load the screen is a bare spinner). */
    appSecurity: {
      choosePin: 'ChoosePINButton',
    },
    /** Change-PIN form (reached with `isChangingExistingPIN`). NB `submit` ('ChangePIN') COLLIDES with
     *  the settings row key of the same name — anchor arrival on `current`, never on submit. The
     *  mismatch + unchecked-box errors are untestID'd inline text. */
    changePin: {
      current: 'EnterCurrentPIN',
      newPin: 'EnterNewPIN',
      confirm: 'ReenterNewPIN',
      understand: 'IUnderstand',
      submit: 'ChangePIN',
    },
    /** AutoLock options — `auto-lock-time-<minutes>`; tapping a row saves immediately (no confirm). */
    autoLock: {
      time5: 'auto-lock-time-5',
      time3: 'auto-lock-time-3',
      time1: 'auto-lock-time-1',
    },
    /** Main privacy screen — `LearnMore` (a CardButton; tapping it navigates ONWARD to a webview, so
     *  a back-out detour just asserts it and hits Back). */
    privacyPolicy: {
      learnMore: 'LearnMore',
    },
    /** Contact Us — its `Link`s auto-derive testIDs from their visible text; the toll-free number is
     *  the arrival marker (the running app uses the resolved i18n value). */
    contactUs: {
      tollFree: '1-888-356-2741',
    },
    /** Remove-account confirmation (shared DestructiveConfirmationScreen; header Back = cancel).
     *  `ConfirmDestructiveAction` is also used by Reset Wallet, but is only reached via RemoveAccount here. */
    removeAccount: {
      confirm: 'ConfirmDestructiveAction',
    },
    /** Forget-all-pairings confirmation (verified-only). NB the confirm button `ForgetAllPairings`
     *  differs from the settings ROW key `settings.forgetPairings` ('ForgetPairings'); on success a
     *  native "Success"/OK alert fires, then it returns to Settings. */
    forgetPairingsScreen: {
      confirm: 'ForgetAllPairings',
    },
    /** Edit-nickname form (verified-only; `InputWithValidation` id 'accountNickname'). Validation is
     *  length-only — there is no duplicate-nickname check. Saving updates the Profile-card name. */
    editNickname: {
      input: 'accountNickname-input',
      pressable: 'accountNickname-pressable', // iOS types into the pressable wrapper (InputWithValidation)
      save: 'SaveAndContinue',
      error: 'accountNickname-subtext',
    },
    /** Login-from-computer (verified-only). `logInFromComputer` is the Home PairingCodeCard; the manual
     *  screen's `manualCodeInput` AUTO-SUBMITS at 6 chars (there is NO submit button); PairingConfirmation
     *  exits via `confirmationClose` (it has no header/back) and can bookmark via `bookmark`. */
    pairing: {
      logInFromComputer: 'LogInFromComputer',
      manualCodeInput: 'ManualPairingCodeInput',
      confirmationClose: 'Close',
      bookmark: 'BookmarkService',
    },
    /** Service-login screen (reached when a login deep link opens the app). */
    serviceLogin: {
      continue: 'ServiceLoginContinue',
      cancel: 'ServiceLoginCancel',
    },
    /** Transferer "show a QR to add a device" flow — reached via Settings → `settings.addDevice`
     *  (verified-only, wired only in the Main stack). QR-info (`getQrCode`) → QR-display (`newQrCode`
     *  regenerate). No learn-more webview on main. */
    transfer: {
      getQrCode: 'GetQRCodeButton',
      newQrCode: 'GetNewQRCode',
    },
    /** Contacts feature (`features/contacts/*`, verified-only via Settings → `settings.contacts`). The
     *  list (`ContactsScreen`) is `withAgentReadyGate`-wrapped — a `loading` spinner shows until the
     *  Credo agent is ready — and resolves to its EMPTY state for a verification-only account: the list
     *  shows only filtered DIDComm connections (non-mediator, Completed) and neither identity
     *  verification nor BCSC service-login create one. So CI covers the empty state → WhatAreContacts
     *  info → back. `whatAreContacts` (the empty-state button) is that info screen's ONLY entry point;
     *  `search` renders only in the POPULATED list (its absence ⇒ empty). Seeding a real contact needs
     *  an out-of-band credential connection — out of CI, same constraint as QR scanning. */
    contacts: {
      loading: 'Contacts.Loading',
      whatAreContacts: 'WhatAreContacts',
      search: 'SearchContacts',
    },
    // NB: the WhatAreContacts info screen has NO usable testID — its only one (`ContactsList`) is on an
    // inline <Link> nested in a <ThemedText>, which RN flattens into the paragraph so it is not a
    // separately addressable element on iOS/Android. The journey anchors that screen on its heading copy
    // (findByText) and returns via the header Back, so there is no key here.
    /** AccountDetails (`features/account/AccountDetailsScreen`) — verified-only, reached via Settings →
     *  `settings.profile` (the ProfileCard row is `isVerified`-gated, so absent unverified). Renders a
     *  LoadingScreen until the account loads, then read-only fields + `seeFullDetails` (opens the BCSC
     *  account webview; disabled until the service client loads). `AccountField` edit links are
     *  `<field>-edit`. */
    accountDetails: {
      seeFullDetails: 'SeeFullAccountDetails',
      nicknameField: 'NicknameField',
      nicknameFieldEdit: 'NicknameField-edit',
      appExpiryField: 'AppExpiryDateField',
      accountTypeField: 'AccountTypeField',
      addressField: 'AddressField',
      addressFieldEdit: 'AddressField-edit',
      dateOfBirthField: 'DateOfBirthField',
      emailField: 'EmailAddressField',
    },
  },

  /**
   * The hidden Developer (IAS) menu — ONE shared `Developer` screen registered per stack
   * (`OnboardingDeveloper` / `AuthDeveloper` / `VerifyDeveloper` / `MainDeveloper`). Reached only via
   * the Settings version footer (`helpers/developer.ts`); the app's `DeveloperCounter` trigger is
   * hidden from the accessibility tree and cannot be selected. `Testing` rows are BCSC-mode only.
   */
  developer: {
    /** Always-rendered first row — the reliable "Developer screen mounted" marker. */
    toggleDeveloper: 'ToggleDeveloper',
    /** i18n-DERIVED: `testIdWithKey(t('Developer.Environment').toLowerCase())` — breaks under a locale change. */
    environment: 'environment',
    staleTermsOfUse: 'StaleTermsOfUse',
    /** Clears `hasSeenOnboardingIntro` → the next AuthStack mount opens on the AuthIntro variant. */
    resetOnboardingIntro: 'ResetOnboardingIntro',
    /** Deletes the refresh/registration/access tokens from the native keychain. */
    deleteTokens: 'DeleteTokens',
  },

  /** BC Wallet variant — the Preface + onboarding-carousel intro screens (bifold `com.ariesbifold:id/`
   *  prefix, so `bcsc()` still applies). Used by the `bc-wallet` smoke spec; distinct from the BCSC
   *  `onboarding` stack above. */
  bcwallet: {
    preface: {
      iAgree: 'IAgree',
      continue: 'Continue',
    },
    onboarding: {
      next: 'Next',
      back: 'Back',
      getStarted: 'GetStarted',
    },
  },
} as const
