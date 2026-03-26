// organize-imports-ignore — import order defines test run order
/**
 * Happy-path BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * combined-card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite happy-path
 */
import './onboarding/app-launch.spec.js'
import './onboarding/add-account.spec.js'
import './onboarding/consent.spec.js'
import './onboarding/notifications.spec.js'
import './onboarding/pin-auth.spec.js'
import './verify/combined-card.spec.js'
import './verify/in-person-verification.spec.js'
import './main/main.spec.js'
