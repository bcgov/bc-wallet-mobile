// organize-imports-ignore — import order defines test run order
/**
 * Video test BCSC E2E flow: onboarding with PIN auth, combined-card verification,
 * send video verification,
 *
 * Run with: yarn wdio ... --spec video-test
 */
import '../onboarding/onboarding-basic.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `../verify/*.spec.js` imports.
import '../verify/card-type/config-combined-card.js'
import '../verify/components/nickname.spec.js'
import '../verify/components/card-csn.spec.js'
import '../verify/components/send-video-verification.spec.js'
