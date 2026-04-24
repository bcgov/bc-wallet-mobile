// organize-imports-ignore — import order defines test run order
/**
 * Verify non-photo card BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * non-photo card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --spec test/bcsc/full-regression/verify-non-photo-card.spec.ts
 */
import '../onboarding/onboarding-basic.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-non-photo-card.js'
import '../verify/nickname.spec.js'
import '../verify/card-csn.spec.js'
import '../verify/additional-id-passport.spec.js'
import '../verify/in-person-verification.spec.js'
import '../main/main.spec.js'
