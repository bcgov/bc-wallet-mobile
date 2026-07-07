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
      learnMore: 'LearnMore',
    },
    privacyPolicy: {
      continue: 'Continue',
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
      understand: 'IUnderstand',
      createPin: 'CreatePIN',
    },
    verifyPrompt: {
      continue: 'Continue',
      skipVerification: 'SkipVerification',
    },
  },
} as const
