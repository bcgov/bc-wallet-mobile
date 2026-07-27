import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * BC Wallet variant intro screens (the `bcwallet` smoke path). These are bifold screens
 * (`com.ariesbifold:id/` prefix, so `bcsc()` still applies), distinct from the BCSC onboarding stack in
 * `onboarding.ts`. Modeled with the action-based DSL so the `bc-wallet` smoke spec drives them by role.
 */

const bw = TestIds.bcwallet

/**
 * Preface / terms-of-use gate. `self`/`primary` (IAgree) is the arrival marker; after tapping it the
 * `continue` button appears. Both are exposed as links so the smoke spec can wait for each in turn.
 */
export const PrefaceScreen = defineScreen({
  self: bcsc(bw.preface.iAgree),
  primary: bcsc(bw.preface.iAgree),
  links: {
    iAgree: bcsc(bw.preface.iAgree),
    continue: bcsc(bw.preface.continue),
  },
})

/** BC Wallet onboarding carousel — `next` pages through the intro slides, `getStarted` finishes. */
export const BCWalletOnboardingScreen = defineScreen({
  self: bcsc(bw.onboarding.next),
  links: {
    next: bcsc(bw.onboarding.next),
    back: bcsc(bw.onboarding.back),
    getStarted: bcsc(bw.onboarding.getStarted),
  },
})
