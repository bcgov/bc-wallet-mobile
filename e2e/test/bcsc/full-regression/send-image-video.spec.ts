// organize-imports-ignore — import order defines test run order
/**
 * Video test BCSC E2E flow: onboarding with PIN auth, combined-card verification,
 * send video verification,
 *
 * Run with: yarn wdio ... --spec video-test
 */
import '../onboarding/app-launch.spec.js'
import '../onboarding/add-account.spec.js'
import '../onboarding/consent.spec.js'
import '../onboarding/notifications.spec.js'
import '../onboarding/pin-auth.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `../verify/*.spec.js` imports.
import '../verify/card-type/config-combined-card.js'
import '../verify/nickname.spec.js'
import '../verify/card-csn.spec.js'
import '../verify/send-video-verification.spec.js'
