/**
 * Single source of truth for BCSC test ID **keys** (the argument the app passes to bifold's
 * `testIdWithKey`) and the **prefix** it wraps them in.
 *
 * App-owned: the app declares its ids here, the e2e suite reads the same file. A key renamed or
 * deleted while an e2e descriptor still uses it is a `tsc` error at PR time, not a selector that
 * misses minutes into a Sauce run.
 *
 * Deliberately DEPENDENCY-FREE (only `as const` string literals, zero imports) so it can be consumed
 * by both an RN app bundle and the Node/wdio e2e process. Consumers apply the prefix themselves:
 *   - app  →  `testIdWithKey(TestIds.onboarding.intro.continue)`   (bifold re-applies `testIdPrefix`)
 *   - e2e  →  `bcsc(TestIds.onboarding.intro.continue)`            (see screens/core/appId.ts)
 *
 * Adding an id: register the key here first, then reference it at the call site — eslint rejects a
 * string literal passed to `testIdWithKey` or to a `testIDKey` prop in migrated directories.
 *
 * `TESTID_PREFIX` must equal bifold's `testIdPrefix`; `registry.test.ts` fails if they drift.
 *
 * Two deliberate exceptions to fixed per-element keys:
 *   - SERVER-DERIVED ids (`EvidenceTypeListItem-<type>`, `ServiceButton-<title>`) stay derived —
 *     specs select those rows by their visible label/substring.
 *   - SHARED ids (the notification cards, `ContactRow`) repeat per instance — specs disambiguate by
 *     the card's copy or the row's accessibility label, not by minting per-item keys.
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
    // App-level gates and overlays, not screen controls: the splash/loading body, the two halves of
    // `BCSCLoadingContext`'s overlay, and the retry on the Credo agent gate. Any screen can be behind them.
    loadingScreen: 'LoadingScreenContent',
    loadingOverlay: 'BCSCLoadingProviderOverlay',
    loadingChildren: 'BCSCLoadingProviderChildren',
    agentRetry: 'AgentRetry',
    // `SettingsHeaderButton`, the header-left menu on onboarding, auth and main. The per-mount
    // entries (`onboarding.intro.settings`, `auth.accountLanding.settings`, `main.header.settings`)
    // are the SAME id, kept where specs look for them; this is the one the component references.
    settingsMenu: 'SettingsMenuButton',
  },

  /**
   * The app-wide error modal (`ErrorInfoCard` inside `BCSCErrorModal`) — an overlay ANY screen can
   * raise, which is why its ids live here rather than under a feature.
   *
   * `close` is the only one that is always rendered, so it doubles as the "is it up" marker;
   * `showDetails` needs the error to carry a message. `title`/`body` are bifold-generic ids that
   * collide with other cards — read the screen instead of trusting them.
   */
  errorModal: {
    close: 'CloseButton',
    showDetails: 'ShowDetails',
    details: 'DetailsText', // "Error code N - message", rendered only once ShowDetails is pressed
    title: 'HeaderText',
    body: 'BodyText',
  },

  /**
   * App-wide system modals (`features/modal/`) — like `errorModal`, overlays any screen can raise.
   * `shared.button` is `SystemModal`'s generic CTA, used as-is by DeviceInvalidated, MandatoryUpdate
   * and InternetDisconnected; screens that pass their own testID get their own key below.
   */
  systemModal: {
    shared: {
      button: 'SystemModalButton',
    },
    sessionExpired: {
      button: 'VerificationSessionExpiredButton',
    },
    /** ServiceOutage does NOT use `SystemModal` — it is its own component with two buttons. */
    serviceOutage: {
      helpCentre: 'ServiceOutageHelpCentre',
      checkAgain: 'ServiceOutageCheckAgain',
    },
  },

  /**
   * Ids that shared BCSC components COMPOSE, rather than ids a screen owns. A caller passes an `id`
   * or a title and the component appends/prefixes these, so the emitted string is only knowable at
   * the call site — which is exactly why the pieces belong here instead of being retyped per screen.
   * Where a composed result is stable and specs use it, it ALSO appears spelled out under its screen
   * (e.g. `verify.manualSerial.serialInput` is `'serial'` + `field.input`).
   */
  shared: {
    /** bifold `MaskedCamera` — the selfie capture and the evidence capture mount the same component,
     *  so `verify.selfieCapture` / `verify.evidenceCapture` document these same ids per mount. */
    maskedCamera: {
      takePhoto: 'TakePhoto',
      cancel: 'CancelCamera',
      toggleFlash: 'ToggleFlash',
    },
    /** `AppBanner` composes `<part>-<banner type>`; the type is the banner's variant, not a screen. */
    appBanner: {
      buttonPrefix: 'button-',
      iconPrefix: 'icon-',
      textPrefix: 'text-',
      descriptionPrefix: 'description-',
    },
    /** `InputWithValidation` and `DropdownWithValidation` append these to the caller's `id`. iOS types
     *  into `pressable`, not `input`. `subtext` doubles as the validation-error slot. */
    field: {
      label: '-label',
      pressable: '-pressable',
      input: '-input',
      subtext: '-subtext',
      error: '-error',
      optionPrefix: '-option-',
      modalContent: '-modal-content',
      close: '-close',
    },
    /** `PINInput` appends this to its `testIDKey`, and uses it BARE when no key was passed. */
    pinInput: {
      visibilitySuffix: 'VisibilityButton',
    },
    /** Title-derived row ids. `SectionButton` strips whitespace from the title; `CardButton` does not. */
    cardButtonPrefix: 'CardButton-',
    sectionButtonPrefix: 'SectionButton-',
  },

  /**
   * `ReportProblemModal`, raised from the floating help menu — an overlay, like `errorModal` and
   * `systemModal`. Two phases: the description form (`description` + `submit`), then the receipt
   * (`reportId` + `copyReportId` + `done`). `modal` is the container, `close` the header dismiss.
   * Distinct from `ErrorInfoCard`'s own report controls, which are different ids on a different card.
   */
  reportProblem: {
    modal: 'ReportProblemModal',
    close: 'ReportProblemClose',
    description: 'ReportProblemDescription',
    submit: 'ReportProblemSubmit',
    reportId: 'ReportProblemReportId',
    copyReportId: 'ReportProblemCopyReportId',
    done: 'ReportProblemDone',
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
      // The non-`creatingNewPIN` arm of the same button: the settings device-auth→PIN switch
      // (`ChangePINContent`) reuses this form and falls back to the generic `Continue`.
      continue: 'Continue',
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
    /** Device-auth confirmation info (`ConfirmDeviceAuthInfo`) — the checkbox opts out of showing
     *  this screen again, so a run that ticks it changes what later launches render. */
    confirmDeviceAuthInfo: {
      hideConfirmation: 'HideConfirmationCheckbox',
      continue: 'Continue',
    },
    /** Recovery prompt shown when a session cannot be restored; the button resets app state. */
    sessionRecovery: {
      reset: 'SessionRecoveryReset',
    },
    /** Post-reset landing after device auth is removed OS-side — `learnMore` leaves for the help centre. */
    deviceAuthAppReset: {
      setUpApp: 'SetUpApp',
      learnMore: 'LearnMore',
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
    /** `SerialInstructions` — the primer before the camera; both CTAs lead into the serial flow
     *  (`enterManually` shares its key with the ScanSerial control of the same name). */
    serialInstructions: {
      scanBarcode: 'ScanBarcode',
      enterManually: 'EnterManually',
    },
    /** Camera scan screen; `EnterManually` is the CI path around the live camera and renders in BOTH
     *  bodies. `openSettings` marks the refused-permission `PermissionDisabled` fallback — asserted,
     *  never tapped (it exits to the OS settings app). `scanTorch` is the shared `TorchButton`
     *  component's key (hidden while the camera itself failed). */
    scanSerial: {
      enterManually: 'EnterManually',
      openSettings: 'OpenSettings',
      scanTorch: 'ScanTorch',
      // Rendered only in the camera-failed body, alongside `enterManually`.
      retryCamera: 'RetryCamera',
    },
    /** Manual serial form (`InputWithValidation id='serial'` → derived ids). `serialSubtext` is the
     *  shared error slot: no static subtext here, so it exists only while a validation error shows,
     *  and its text is which rule failed. */
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
    /** `BirthdateLockout` — too many wrong birthdates. `close` just goes back; there is no header. */
    birthdateLockout: {
      close: 'Close',
    },
    /** `VerificationCardError` — the authorize-failure screen at the EnterBirthdate submit. The
     *  `MismatchedSerial` variant (CSN/birthdate mismatch or card-not-found — the unhandled-error path)
     *  shows `tryAnother` → IdentitySelection; the `CardExpired` variant shows `getBcsc` (opens a browser). */
    verificationCardError: {
      tryAnother: 'TryAnother',
      getBcsc: 'GetBCSC',
    },
    /** `DeviceAuthorizationError` — device-authorization failure; its only control is the help link. */
    deviceAuthorizationError: {
      link: 'DeviceAuthorizationErrorLink',
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
    /** `ServicePeriodList` — the video-call hours block, mounted by THREE screens (method selection,
     *  StartCall, CallBusyOrClosed), so these ids do not identify which screen you are on. It renders
     *  `hours` (a single default line) when the period list is empty, otherwise `list` wrapping one
     *  `ServicePeriod` per entry — those rows append server-provided text to the stems below. */
    servicePeriods: {
      hours: 'ServiceHours',
      list: 'ServicePeriodList',
      titleStem: 'ServicePeriodTitle_',
      hoursStem: 'ServicePeriodHours_',
      dateStem: 'ServicePeriodDate_',
    },
    /** In-person verification (`'Verify In Person Instruction'`) — shows the XXXX-XXXX confirmation
     *  code the SM approval reads; `complete` advances to VerificationSuccess. */
    verifyInPerson: {
      confirmationCode: 'ConfirmationCode',
      complete: 'Complete',
      serviceBcLink: 'ServiceBCLink',
    },
    /** Verification success (`'Setup Complete'`, no header). Tapping `continue` exits the verify
     *  stack to Home. */
    verificationSuccess: {
      continue: 'Continue',
    },
    /** Selfie-photo instructions (`'Selfie Photo Tips'`) — the first screen of BOTH the send-video and
     *  live-call (open-hours) branches; `takePhoto` enters the camera (out of CI). */
    photoInstructions: {
      takePhoto: 'TakePhoto',
    },
    /** Selfie camera (`TakePhoto`) — the shared bifold MaskedCamera, front-facing and oval-masked.
     *  CAMERA-ONLY (Sauce injection). NB the shutter key is the SAME `TakePhoto` that PhotoInstructions
     *  uses for its CTA, so `cancel` is the only thing that tells the two screens apart. */
    selfieCapture: {
      takePhoto: 'TakePhoto',
      cancel: 'CancelCamera',
    },
    /** `VideoInstructions` ('Selfie Video Tips') — issues a FRESH prompt set on every focus, and
     *  `startRecording` stays disabled until that lands (a recording is only accepted against the set
     *  the server issued for it). `promptsLoading` is up while the set is being issued;
     *  `retryLoadPrompts` replaces it when that fetch failed. */
    videoInstructions: {
      startRecording: 'StartRecording',
      promptsLoading: 'PromptsLoading',
      retryLoadPrompts: 'RetryLoadPrompts',
    },
    /** `TakeVideo` — recording ARMS ITSELF on focus after a 3-2-1 countdown; there is no start button,
     *  and the screen needs camera AND microphone permission (two sequential dialogs). `nextPrompt` is
     *  disabled for the first 2s of each prompt and its LAST press stops the recording; `cancel`
     *  abandons the recording. */
    takeVideo: {
      nextPrompt: 'NextPrompt',
      cancel: 'CancelRecording',
    },
    /** `VideoReview` — accept or retake the recording. `useVideo` resets the stack to EvidenceUploading. */
    videoReview: {
      useVideo: 'UseVideo',
      retakeVideo: 'RetakeVideo',
      togglePlayPause: 'TogglePlayPause',
    },
    /** `VideoTooLong` — a recording over 30s lands here instead of VideoReview. Screen-prefixed keys
     *  so neither collides with VideoReview's pair (the two are alternates after a recording stops). */
    videoTooLong: {
      retake: 'VideoTooLongRetake',
      cancel: 'VideoTooLongCancel',
    },
    /** `EvidenceUploading` — uploads on mount with no confirm step; `cancelUpload` is its only control. */
    evidenceUploading: {
      cancelUpload: 'CancelUpload',
    },
    /** `SuccessfullySent` — the post-upload confirmation. `goToHome` is the screen's ONLY way out:
     *  hardware back is disabled. */
    successfullySent: {
      goToHome: 'GoToHome',
    },
    /** `PendingReview` — re-checks the request status on EVERY mount, which is what makes re-entering
     *  it the app's own poll for the agent's decision. `chooseAnotherWay` cancels the request
     *  (confirm-gated) and returns to method selection. */
    pendingReview: {
      chooseAnotherWay: 'ChooseAnotherWayToVerify',
    },
    /** `CancelledReview` and its MainStack twin (same component on both stacks). The agent's reason is
     *  body COPY (no testID): assert it by text. NB this screen does NOT render `SystemModal` — it has
     *  its own two buttons; `retryWithNewVideo` is the stable arrival marker. */
    cancelledReview: {
      retryWithNewVideo: 'RetryWithNewVideo',
      restartVerification: 'RestartVerification',
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
    /** `StartCall` — the live-call primer after the selfie (open hours only): user photo, call tips,
     *  the hours list, and the Start button, which requests mic permission and pushes LiveCall. */
    startCall: {
      start: 'StartCall',
      hoursOfServiceTitle: 'HoursOfServiceTitle',
    },
    /** `LiveCall` (headerless) — one route, three faces. CallLoadingView through every pre-connect
     *  state (`cancel` is its only control; WHICH state is copy-only), the in-call controls once an
     *  agent answers, and CallErrorView's pair on a failed setup. The "Call ended" processing view
     *  has no ids. */
    liveCall: {
      cancel: 'Cancel',
      mute: 'Mute',
      video: 'Video',
      endCall: 'EndCall',
      havingTrouble: 'HavingTrouble',
      errorTryAgain: 'TryAgain',
      errorGoBack: 'GoBack',
    },
    /** `VerifyNotComplete` — where an ended-but-unverified live call lands. `sendVideo` and `tryAgain`
     *  BOTH reset to method selection; `trouble` (external help centre) is the screen's only unique id —
     *  `SendVideo` also renders on method selection and CallBusyOrClosed, `TryAgain` on CallErrorView. */
    verifyNotComplete: {
      sendVideo: 'SendVideo',
      tryAgain: 'TryAgain',
      trouble: 'Trouble',
    },
    /** Email confirmation (`'Email Verification'`) — the 6-digit code emailed to the entered address.
     *  A correct `continue` RESETS the stack to EmailVerified. `resendCode` sits on a ThemedText nested
     *  inside another, which RN flattens into the parent paragraph on iOS — see the label fallback in
     *  `flows/verify.ts`. */
    emailConfirmation: {
      codeInput: 'EmailConfirmationCodeInput',
      // `CodeInput` appends `-subtext` to the input's already-prefixed testID, which puts the suffix at
      // the END — so this stays a normal key and IS `bcsc()`-wrapped.
      codeError: 'EmailConfirmationCodeInput-subtext',
      continue: 'Continue',
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
      // Opens the accepted-services webview; the same key renders on `dualIdRequired`.
      whichServices: 'WhichServices',
    },
    /** `DualIdentificationRequired` — non-BCSC needs two IDs. CTA is label-derived `Continue`;
     *  `seeAcceptedId` opens the accepted-documents webview. */
    dualIdRequired: {
      continue: 'Continue',
      seeAcceptedId: 'SeeAcceptedID',
      whichServices: 'WhichServices',
    },
    /** `EvidenceTypeList` — the document-type picker. Rows are `EvidenceTypeListItem-<evidence_type>`
     *  where evidence_type is SERVER-PROVIDED (unknown/variable, may contain spaces), so specs select a
     *  row by its visible LABEL via `findByText`, not by testID. `otherOptions` reveals non-photo
     *  document types. */
    evidenceTypeList: {
      otherOptions: 'EvidenceTypeListOtherOptions',
      itemStem: 'EvidenceTypeListItem-',
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
      // The static subtext and the validation errors share this node, so it is always present and only
      // its TEXT says whether the value was rejected. Compare the text; never assert presence.
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
    /** Home tab. `logInFromComputer` renders TWICE (a card and a SectionButton, different branches)
     *  and is the pairing entry point, so its key lives under `main.pairing`. Saved-service rows are
     *  NAME-DERIVED from the service title minus whitespace, same shape as the services catalogue. */
    home: {
      whereToUse: 'WhereToUse',
      pairingCodeCard: 'PairingCodeCard',
      savedServiceOpenPrefix: 'OpenService-',
      savedServiceRemovePrefix: 'RemoveService-',
    },
    /** Services catalogue (verified-only; unverified taps redirect to MainVerifyPrompt). `search` is
     *  the always-present sticky-header catalogue search field — the "Services opened, not gated" marker. */
    services: {
      search: 'search',
      // Renders only while the query is non-empty (tapping it clears the search).
      clearSearch: 'clearSearch',
      loading: 'ServicesLoading',
      // Per-row ids are NAME-DERIVED: `ServiceButton-<title minus whitespace>` on the row title text and
      // `ServiceButton-Bookmark-<...>` on its bookmark toggle (`ServiceButton.tsx`). Compose them via
      // `helpers/services.ts` — and note the row is a `ListButton` (`accessible`), so iOS flattens these
      // descendants out of the a11y tree: they are Android-only selectors (iOS drives rows by label).
      serviceRowPrefix: 'ServiceButton-',
      serviceBookmarkPrefix: 'ServiceButton-Bookmark-',
    },
    /** Header settings (menu) button on the Home/Services tab headers. */
    header: {
      settings: 'SettingsMenuButton',
    },
    /** Home's notification list card (`NotificationActionCard`). For an unverified account this is the
     *  Start/Continue-verification card, whose `view` re-enters the verify stack at `getResumeStepRoute`
     *  — the ONLY route back into an interrupted verification. All four keys are shared by every action
     *  card, so tell cards apart by `headerText`/`bodyText` copy, not by testID. */
    notification: {
      item: 'NotificationListItem',
      headerText: 'HeaderText',
      bodyText: 'BodyText',
      view: 'ViewNotification',
    },
    /** Home's credential/proof/revocation/message card (`NotificationCard.tsx`) — a DIFFERENT
     *  component from `notification` above (no `ViewNotification`; the whole card is the pressable).
     *  All four card types share these keys, so select by `headerText` COPY ("Credential offer" /
     *  "Proof request" / "Credential revoked") via `helpers/notifications.ts`. NB the ✕ (`dismiss`)
     *  is a REAL decline for offers and pending proofs, not a mere dismiss. */
    notificationCard: {
      pressable: 'NotificationCardPressable',
      item: 'NotificationListItem',
      headerText: 'HeaderText',
      bodyText: 'BodyText',
      timestamp: 'TimestampText',
      dismiss: 'DismissNotification',
      logo: 'NotificationLogo',
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
      emptyIllustration: 'Wallet.EmptyIllustration',
      emptyLearnMore: 'Wallet.EmptyLearnMore',
    },
    /** QRCore bottom-tab navigator (opened by the scan FAB). Display tab only exists in dev mode. */
    qrCore: {
      scannerTab: 'ScanQRCode',
      displayTab: 'MyQRCode',
      pairingCodeTab: 'PairingCode',
      torchToggle: 'TorchToggle',
    },
    /** The `MyQRCode` tab's body (dev-mode only, per `qrCore.displayTab`). `loading` and `error` are
     *  mutually exclusive state containers — neither renders once the code is up. `editNickname` opens
     *  the same nickname form as `main.editNickname`. */
    qrDisplay: {
      walletName: 'WalletName',
      editNickname: 'EditNickname',
      share: 'Share',
      loading: 'QRDisplay.Loading',
      error: 'QRDisplay.Error',
    },
    /** The QR scanner's failed-scan popup (bifold `DismissiblePopupModal`). `okay` is its CTA
     *  (labelled "Dismiss"); `header`/`body` are bifold-generic ids shared with the Home notification
     *  card, so only assert them while the scanner is up. */
    scanError: {
      header: 'HeaderText',
      body: 'BodyText',
      okay: 'Okay',
    },
    /** Main settings (minimal — the full screen is modeled later). `profile` is verified-gated. */
    /** Main settings menu (`SettingsContent.tsx`). The `AuthenticatedSection` rows render once
     *  `didAuthenticate`; the `isVerified`-gated rows (profile/editProfile/addDevice/myDevices/
     *  forgetPairings) are ABSENT unverified. `contacts` is NOT gated — Main settings always wires it.
     *  The Help + MoreInfo section rows always render. */
    settings: {
      appSecurity: 'AppSecurity',
      changePin: 'ChangePIN',
      autoLock: 'AutoLock',
      notifications: 'Notifications',
      analyticsOptIn: 'AnalyticsOptIn',
      removeAccount: 'RemoveAccount',
      resetWallet: 'ResetWallet', // distinct destructive row; shared DestructiveConfirmationScreen (confirm = ConfirmDestructiveAction)
      help: 'Help', // → in-app MainWebView (help centre)
      contactUs: 'ContactUs', // → in-app MainWebView (help-centre contact page); no native Contact Us screen
      feedback: 'Feedback',
      accessibility: 'Accessibility',
      termsOfUse: 'TermsOfUse',
      privacy: 'Privacy',
      // Hidden until developer mode is enabled — so its absence is itself an assertion.
      developerMode: 'DeveloperMode',
      // verified-only (isVerified-gated): absence-assert unverified, presence when verified
      profile: 'Profile',
      editProfile: 'EditProfile',
      contacts: 'Contacts', // NOT verified-gated (the Features row renders whenever Main settings wires it)
      addDevice: 'AddDevice',
      myDevices: 'MyDevices',
      forgetPairings: 'ForgetPairings',
      scanQr: 'ScanQR',
      sendProofRequest: 'SendProofRequest',
      // Collapsible-section toggle — rendered once PER section, so this id repeats down the screen.
      sectionHeaderChevron: 'SectionHeaderChevron',
    },
    /** `ReviewDevices` — the too-many-devices system-check sheet, raised by `NotificationBannerContainer`
     *  rather than reached by navigation. `headerClose` is the X; `close` is the button of the same
     *  name in the footer, so the two are NOT interchangeable. `delete` is destructive. */
    reviewDevices: {
      headerClose: 'CloseReviewDevices',
      manageDevices: 'ManageDevices',
      close: 'Close',
      delete: 'Delete',
    },
    /** App Security sub-screen (SecurityMethodSelector). `ChoosePINButton` renders in both post-load
     *  branches, so it is the arrival marker (during the async load the screen is a bare spinner).
     *  Same component as `onboarding.secureApp` (it branches on `isSettingsContext`), so the app
     *  call sites reference the onboarding keys — identical strings, one set of call sites. */
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
    /** Notification settings (Settings → `settings.notifications`). TWO render branches on "has the
     *  push prompt ever run": UNSET shows `enable` (same id as the ONBOARDING enable button — different
     *  mounts); once prompted it shows the OS-managed view with `openDeviceSettings` (leaves the app).
     *  The ON/OFF status word has no testID — assert the row's a11y label "Notifications are: on/off". */
    notificationSettings: {
      enable: 'EnableNotifications',
      openDeviceSettings: 'OpenNotificationSettings',
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
      // CodeInput renders its inline error as `<input testID>-subtext`. A rejected code (HTTP 404,
      // e.g. a made-up value) ALSO raises a native "Could not verify pairing code" alert.
      codeError: 'ManualPairingCodeInput-subtext',
      confirmationClose: 'Close',
      bookmark: 'BookmarkService',
    },
    /** Service-login screen (`ServiceLogin`) — reached by login deep links, FCM challenges, and
     *  catalogue row taps. Renders ONE of two views: the default (quick-login or pairing-code)
     *  view with `continue`/`cancel`, or the UNAVAILABLE view (`!initiate_login_uri` and no pairing
     *  code) with `goToService`/`cancelUnavailable`/`serviceClientLink`. NB the unavailable cancel is
     *  the bare `Cancel`, a DIFFERENT id from the default view's `ServiceLoginCancel`. */
    serviceLogin: {
      continue: 'ServiceLoginContinue',
      cancel: 'ServiceLoginCancel',
      // Default view extras: in-app "what info is shared" webview; privacy policy (external browser,
      // renders only when the service carries a `policy_uri`); report-suspicious wrapper text (its
      // inner Link is RN-flattened, so the wrapper is assert-only, not tappable).
      help: 'HelpButton',
      readPrivacyPolicy: 'ReadPrivacyPolicy',
      reportSuspicious: 'ReportSuspiciousLink',
      // Unavailable view: external service site (opens the browser); renders only with a `client_uri`.
      goToService: 'GoToServiceClient',
      cancelUnavailable: 'Cancel',
      serviceClientLink: 'ServiceClientLink',
    },
    /** Transferer "show a QR to add a device" flow — reached via Settings → `settings.addDevice`
     *  (verified-only, wired only in the Main stack). QR-info (`getQrCode`) → QR-display (`newQrCode`
     *  regenerate). No learn-more webview on main. */
    transfer: {
      getQrCode: 'GetQRCodeButton',
      newQrCode: 'GetNewQRCode',
    },
    /** Where `settings.addDevice` lands instead when the account holder is under 12. Static copy; the
     *  title is its only testID (the description has none) and the header title is blank. */
    /** `TransferSuccess` — the transferer's confirmation. `done` returns to Home; `removeAccount`
     *  drops the account from THIS device (the point of a transfer-off). */
    transferSuccess: {
      done: 'TransferSuccessButton',
      removeAccount: 'RemoveAccountButton',
    },
    transferAgeRestriction: {
      title: 'AgeRestrictedTransferTitle',
    },
    /** Contacts feature (`features/contacts/*`, Settings → `settings.contacts`). NOT verified-gated:
     *  Main-stack settings always passes `onContacts`, so the row renders for any authenticated user
     *  (the verified-only note that used to sit here predates the current `SettingsContent`). The list
     *  (`ContactsScreen`) is `withAgentReadyGate`-wrapped — a `loading` spinner shows until the Credo
     *  agent is ready — and holds only filtered DIDComm connections (non-mediator, Completed): empty
     *  for a verification-only account, populated once the issuer-driven wallet journey connects.
     *  `whatAreContacts` (the empty-state button) is the info screen's only entry point and does NOT
     *  render populated — so `search` present + `whatAreContacts` absent ⇒ populated, and vice versa.
     *  `clearSearch` renders only while the query is non-empty. `row` is SHARED by every list row —
     *  select a specific contact by a11y label = the contact name (`helpers/a11y.ts`). */
    contacts: {
      loading: 'Contacts.Loading',
      whatAreContacts: 'WhatAreContacts',
      search: 'SearchContacts',
      clearSearch: 'clearSearch',
      row: 'ContactRow',
    },
    /** Contact details (`ContactDetailsScreen`, agent-gated like the list). `pin`/`unpin` are the SAME
     *  button — its id flips with the pinned state, so waiting for the other id IS the toggle assert.
     *  `viewJson` renders only in developer mode (absence-assert in normal runs). */
    contactDetails: {
      loading: 'ContactDetails.Loading',
      message: 'MessageContact',
      pin: 'PinContact',
      unpin: 'UnpinContact',
      editName: 'EditContactName',
      viewJson: 'ViewJSON',
      remove: 'RemoveContact',
    },
    /** Contact chat (`ContactChatScreen`, GiftedChat). `composer` is the message TextInput (editable
     *  only once the Credo agent is ready) and `send` its send button; `viewRequest` renders on
     *  credential/proof event cards that carry an action. */
    contactChat: {
      composer: 'ChatComposer',
      send: 'SendMessage',
      viewRequest: 'ViewRequest',
    },
    /** Edit-contact-name form. `save`/`cancel` are label-derived by `ActionScreenLayout`
     *  (`testIdWithKey(t('Global.Continue'))` etc.), so they break under a locale change — en-only. */
    contactEditName: {
      loading: 'EditContactName.Loading',
      nameInput: 'NameInput',
      save: 'Continue',
      cancel: 'Cancel',
    },
    /** Remove-contact confirmation — a modal with NO header back (`headerLeft: null`); `cancel` is the
     *  only non-destructive exit. The failure branch is an untestID'd native alert. */
    contactRemove: {
      loading: 'RemoveContact.Loading',
      confirm: 'ConfirmRemove',
      cancel: 'CancelRemove',
    },
    /** `WhatAreContacts` info screen. `contactsList` is registered because the app emits it, but it is
     *  NOT usable as a selector: it sits on an inline `Link` nested in a `ThemedText`, which RN flattens
     *  into the paragraph on both platforms. The journey anchors this screen on its heading copy
     *  (findByText) and returns via the header Back. */
    whatAreContacts: {
      contactsList: 'ContactsList',
    },
    /** `AccountRenewalInformation` — the renewal primer. Both ids are inline `Link`s inside paragraphs:
     *  `getNewCard` leaves to an external browser, `typesOfAcceptedId` opens the in-app help webview.
     *  Its primary CTA is label-derived by `ActionScreenLayout`, so it has no key here. */
    accountRenewalInformation: {
      getNewCard: 'InformationGetNewCard',
      typesOfAcceptedId: 'InformationTypesOfAcceptedId',
    },
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
   * Credential lifecycle screens — Bifold's, hosted inside the BCSC Main stack (offer/proof render
   * inside `ConnectionLoading`; details/list under the Wallet tab). Kept as a top-level namespace
   * (like `bcwallet`) because the keys are Bifold's, not BCSC's.
   */
  credential: {
    /** `CredentialOffer` (rendered inline by the connection screen). */
    offer: {
      accept: 'AcceptCredentialOffer',
      decline: 'DeclineCredentialOffer',
      header: 'HeaderText',
    },
    /** `CredentialOfferAccept` full-screen modal, in two mutually exclusive phases: pending
     *  (`onTheWay` + `backToHome`) then completed (`added` + `done`). Only the completed pair is a
     *  reliable marker — pending is skipped outright when issuance is fast. `done` resets to the
     *  Wallet tab; `backToHome` to Home. */
    offerAccept: {
      onTheWay: 'CredentialOnTheWay',
      added: 'CredentialAddedToYourWallet',
      done: 'Done',
      backToHome: 'BackToHome',
    },
    /** A wallet-list credential card (`Card11Pure`). NOT unique per credential — with >1 stored
     *  credential, disambiguate by `name` text. `revoked` renders only on a revoked card. */
    card: {
      card: 'CredentialCard',
      name: 'CredentialName',
      issuer: 'CredentialIssuer',
      revoked: 'RevokedOrNotAvailable',
      showDetails: 'ShowCredentialDetails',
    },
    /** `CredentialDetails` — behind an agent gate (`loading`, not in the shared registry pattern of
     *  Wallet.Loading). `issuedDate` is DEVELOPER-MODE-ONLY (dev builds hide it otherwise);
     *  `revokedDate`/`revocationMessage` render only when the issuer revoked WITH a notification.
     *  `remove` sits at the bottom (scroll to it). */
    details: {
      loading: 'CredentialDetails.Loading',
      issuerName: 'IssuerName',
      issuedDate: 'IssuedDate',
      revokedDate: 'RevokedDate',
      revocationMessage: 'RevocationMessage',
      remove: 'RemoveFromWallet',
    },
    /** `CommonRemoveModal` in its remove-credential usage. */
    removeModal: {
      confirm: 'ConfirmRemoveButton',
      cancel: 'CancelRemoveButton',
    },
    /** `CommonRemoveModal` in its decline-offer usage (confirm → declineOffer + problem report → Home). */
    declineModal: {
      confirm: 'ConfirmDeclineButton',
      cancel: 'CancelDeclineButton',
    },
  },

  /** Proof-request screens (Bifold's, same hosting as `credential`). */
  proof: {
    /** `ProofRequest`. NB `share` is REPLACED by `cancel` when no stored credential satisfies the
     *  request — assert `share` presence before tapping (its absence means a cred-def mismatch). */
    request: {
      share: 'Share',
      decline: 'Decline',
      cancel: 'Cancel',
      loading: 'ProofRequestLoading',
    },
    /** `ProofRequestAccept` full-screen modal — two mutually exclusive phases like the credential
     *  one: `sending` then `sent`; only `sent` is a reliable marker. */
    accept: {
      sending: 'SendingProofRequest',
      sent: 'SentProofRequest',
      backToHome: 'BackToHome',
    },
  },

  /**
   * The hidden Developer (IAS) menu — ONE shared `Developer` screen registered per stack
   * (`OnboardingDeveloper` / `AuthDeveloper` / `VerifyDeveloper` / `MainDeveloper`). Reached only via
   * the Settings version footer (`helpers/developer.ts`); the app's `DeveloperCounter` trigger is
   * hidden from the accessibility tree and cannot be selected. `Testing` rows are BCSC-mode only.
   */
  developer: {
    /** Tap counter on the settings version row (`DeveloperModeTrigger`) that unlocks developer mode. */
    counter: 'DeveloperCounter',
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
