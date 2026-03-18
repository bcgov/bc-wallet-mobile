/**
 * Full BCSC E2E flow: runs onboarding then verify in a single session.
 * Run with: wdio ... --spec test/bcsc/e2e.spec.ts
 *
 * Running the default glob (test/bcsc/** /*.spec.ts) would run this file
 * plus onboarding.spec.ts and verify.spec.ts separately; use this spec
 * when you want one continuous flow (onboarding → verify) in order.
 */
import './onboarding/onboarding.spec.js'
import './verify/verify.spec.js'
