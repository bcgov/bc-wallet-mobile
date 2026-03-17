export const TestIds = {
  /** Onboarding */
  Onboarding: {
    AccountSetup: {
      DeveloperMode: 'com.ariesbifold:id/DeveloperMode',
      AddAccount: 'com.ariesbifold:id/AddAccount',
      TransferAccount: 'com.ariesbifold:id/TransferAccount',
    },
    SetupTypes: {
      Continue: 'com.ariesbifold:id/Continue',
      Cancel: 'com.ariesbifold:id/Cancel',
      MyOwnIdRadioGroup: 'com.ariesbifold:id/MyOwnIdRadioGroup-option-BCSC.NewSetup.MyOwnID',
      SomeoneElseIdRadioGroup: 'com.ariesbifold:id/MyOwnIdRadioGroup-option-BCSC.NewSetup.SomeoneElsesID',
      OtherPersonPresentRadioGroupYesOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-Yes',
      OtherPersonPresentRadioGroupNoOption: 'com.ariesbifold:id/OtherPersonPresentRadioGroup-option-No',
    },
    IntroCarousel: {
      CarouselNext: 'com.ariesbifold:id/CarouselNext',
      CarouselBack: 'com.ariesbifold:id/CarouselBack',
      WhereToUseButton: 'com.ariesbifold:id/CardButton-WhereToUse',
    },
    PrivacyPolicy: {
      Continue: 'com.ariesbifold:id/Continue',
      LearnMore: 'com.ariesbifold:id/CardButton-LearnMore',
    },
    OptInAnalytics: {
      Accept: 'com.ariesbifold:id/Accept',
      Decline: 'com.ariesbifold:id/Decline',
    },
    TermsOfUse: {
      AcceptAndContinue: 'com.ariesbifold:id/AcceptAndContinue',
      RetryTermsOfUse: 'com.ariesbifold:id/RetryTermsOfUse',
    },
    Notifications: {
      Continue: 'com.ariesbifold:id/Continue',
      OpenSettings: 'com.ariesbifold:id/OpenSettings',
      ContinueWithoutNotifications: 'com.ariesbifold:id/ContinueWithoutNotifications',
    },
    SecureApp: {
      BiometricAuth: 'com.ariesbifold:id/CardButton-Use Device Passcode',
      PinAuth: 'com.ariesbifold:id/CardButton-Create a PIN',
      LearnMore: 'com.ariesbifold:id/CardButton-Learn More',
    },
    CreatePIN: {
      Continue: 'com.ariesbifold:id/Continue',
      IUnderstand: 'com.ariesbifold:id/IUnderstand',
      PINInput1: 'com.ariesbifold:id/PINInput1',
      PINInput2: 'com.ariesbifold:id/PINInput2',
      PINInput1VisibilityButton: 'com.ariesbifold:id/PINInput1VisibilityButton',
      PINInput2VisibilityButton: 'com.ariesbifold:id/PINInput2VisibilityButton',
    },
  },
} as const

export const Timeouts = {
  /** Default wait for an element to appear on screen */
  elementVisible: 15_000,
  /** Wait for a screen transition to complete */
  screenTransition: 20_000,
  /** Initial app launch — generous for cold starts on real devices */
  appLaunch: 30_000,
  /** Per-test timeout (Mocha) */
  testTimeout: 300_000,
  /** WDIO waitforTimeout */
  waitFor: 20_000,
  /** Appium new command timeout */
  newCommand: 180,
  /** WDIO connection retry timeout */
  connectionRetry: 180_000,
} as const
