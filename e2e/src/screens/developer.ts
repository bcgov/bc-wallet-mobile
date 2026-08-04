import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * The hidden Developer (IAS) menu — one component registered once per stack (`OnboardingDeveloper` /
 * `AuthDeveloper` / `VerifyDeveloper` / `MainDeveloper`), so this descriptor serves all four.
 * Reached via the Settings version footer (see `helpers/developer.ts`).
 */

const dev = TestIds.developer
const { common } = TestIds

export const DeveloperScreen = defineScreen({
  self: bcsc(dev.toggleDeveloper),
  // Resolves in the Onboarding/Verify/Main stacks, which set `headerBackTestID`. AuthStack does NOT
  // (its back button renders testID `String(undefined)`) — leave `AuthDeveloper` by relaunching.
  back: bcsc(common.back),
  links: {
    /** Opens the IAS environment modal. Switching environments invalidates the session's account. */
    environment: bcsc(dev.environment),
    /** Backdates the accepted terms version → re-acceptance modal on the next MainStack mount. */
    staleTermsOfUse: bcsc(dev.staleTermsOfUse),
    /** Clears `hasSeenOnboardingIntro`; takes effect on the next AuthStack mount, i.e. after a relaunch. */
    resetOnboardingIntro: bcsc(dev.resetOnboardingIntro),
    /** Deletes the native refresh/registration/access tokens. */
    deleteTokens: bcsc(dev.deleteTokens),
  },
})
