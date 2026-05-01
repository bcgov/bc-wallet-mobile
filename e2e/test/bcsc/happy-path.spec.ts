// organize-imports-ignore — import order defines test run order
/**
 * Happy-path BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * combined-card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite happy-path
 */
import './onboarding/onboarding-basic.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import './verify/card-type/config-combined-card.js'
import './verify/components/nickname.spec.js'
import './verify/components/card-csn.spec.js'
import './verify/components/in-person-verification.spec.js'
import './main/main.spec.js'
