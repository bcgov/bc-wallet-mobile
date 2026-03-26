// organize-imports-ignore — import order defines test run order (onboarding → verify → main)
/**
 * Happy-path BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * combined-card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite happy-path
 */
import './onboarding/onboarding.spec.js'
import './verify/verify.spec.js'
import './main/main.spec.js'
