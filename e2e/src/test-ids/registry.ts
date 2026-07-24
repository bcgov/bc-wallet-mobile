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
    /** Returning-user landing — the unlock entry every cold start of an onboarded user hits. */
    accountLanding: {
      unlock: 'Unlock',
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
    /** Camera scan screen; `EnterManually` is the CI path around the live camera. */
    scanSerial: {
      enterManually: 'EnterManually',
    },
    /** Manual serial form (`InputWithValidation id='serial'` → derived input/pressable ids). */
    manualSerial: {
      serialPressable: 'serial-pressable',
      serialInput: 'serial-input',
      continue: 'Continue',
    },
    /** Birthdate form (`DateInput id='birthDate'`, digits progressive-format to YYYY/MM/DD).
     *  Submit fires the backend `authorizeDevice(serial, dob)` that derives the card type. */
    enterBirthdate: {
      birthdatePressable: 'birthDate-pressable',
      birthdateInput: 'birthDate-input',
      continue: 'Continue',
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
      continue: 'Continue',
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
      help: 'Help',
      contactUs: 'ContactUs',
      feedback: 'Feedback',
      accessibility: 'Accessibility',
      termsOfUse: 'TermsOfUse',
      privacy: 'Privacy',
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
  },
} as const
