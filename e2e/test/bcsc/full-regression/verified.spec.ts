// organize-imports-ignore — import order defines test run order
/**
 * Verified-state BCSC E2E suite: specs run sequentially with app state
 *
 * Phase 1 — establishes verified state:
 *   Full onboarding + verification flow, leaving the app at the home screen
 *   with a verified account.
 *
 * Phase 2 — runs from verified home state:
 *   Each subsequent spec starts a new session and finds the app already
 *   verified, so it can skip onboarding entirely.
 *
 */

// Phase 1: Onboarding + verification (runs once to establish verified state)
import '../onboarding/app-launch.spec.js'
import '../onboarding/add-account.spec.js'
import '../onboarding/consent.spec.js'
import '../onboarding/notifications.spec.js'
import '../onboarding/pin-auth.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-combined-card.js'
import '../verify/nickname.spec.js'
import '../verify/card-csn.spec.js'
import '../verify/in-person-verification.spec.js'
import '../main/main.spec.js'

// Phase 2: Specs that start from the verified home screen
import '../settings/settings.spec.js'
