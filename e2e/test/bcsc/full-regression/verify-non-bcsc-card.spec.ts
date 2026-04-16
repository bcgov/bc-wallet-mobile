// organize-imports-ignore — import order defines test run order
/**
 * Verify non-photo card BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * non-photo card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --spec test/bcsc/full-regression/verify-non-bcsc-card.spec.ts
 */
import '../onboarding/app-launch.spec.js'
import '../onboarding/add-account.spec.js'
import '../onboarding/consent.spec.js'
import '../onboarding/notifications.spec.js'
import '../onboarding/pin-auth.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-non-bcsc-card.js'
import '../verify/nickname.spec.js'
import '../verify/non-bcsc/non-bcsc-first-id.spec.js'
import '../verify/non-bcsc/non-bcsc-second-id.spec.js'
// import '../verify/additional-id-passport.spec.js'
import '../verify/in-person-verification.spec.js'
import '../main/main.spec.js'
