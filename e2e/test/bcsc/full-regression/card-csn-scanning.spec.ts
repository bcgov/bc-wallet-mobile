// organize-imports-ignore — import order defines test run order
/**
 * Card scanning BCSC E2E flow: onboarding with PIN auth, combined-card verification,
 * in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite card-csn-scanning
 */
import '../onboarding/onboarding-basic.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `../verify/*.spec.js` imports.
import '../verify/card-type/config-combined-card.js'
import '../verify/components/nickname.spec.js'
import '../verify/components/card-scan.spec.js'
