// organize-imports-ignore — import order defines test run order
/**
 * Verified-state BCSC E2E suite: all phases run in a single session
 *
 * Phase 1 — establishes verified state:
 *   Full onboarding + verification flow, leaving the app at the home screen
 *   with a verified account.
 *
 * Phase 2 — runs from verified home state:
 *   Subsequent specs are imported into this same spec file and execute in
 *   the same session, picking up from the verified home screen without
 *   restarting the app.
 *
 */

// Phase 1: Onboarding + verification (runs once to establish verified state)
import '../onboarding/onboarding-basic.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-combined-card.js'
import '../verify/components/nickname.spec.js'
import '../verify/components/card-csn.spec.js'
import '../verify/components/in-person-verification.spec.js'
import '../main/main.spec.js'

// Phase 2: Specs that start from the verified home screen

import '../main/login-from-deep-link.spec.js'
import '../main/login-from-computer.spec.js'

import '../main/settings/settings.spec.js'
