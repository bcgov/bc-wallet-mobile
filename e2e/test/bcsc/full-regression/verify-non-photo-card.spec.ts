// organize-imports-ignore — import order defines test run order
/**
 * Verify non-photo card BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * non-photo card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --spec test/bcsc/full-regression/verify-non-photo-card.spec.ts
 *
 * NOTE(ONB-1): the onboarding preamble was removed — superseded by `journeys/onboarding/`.
 * This legacy spec is red vs `main` and is pending replacement by the verified card journeys.
 */
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-non-photo-card.js'
import '../verify/components/nickname.spec.js'
import '../verify/components/card-csn.spec.js'
import '../verify/non-photo/additional-id-passport.spec.js'

import '../verify/components/in-person-verification.spec.js'
import '../main/main.spec.js'
