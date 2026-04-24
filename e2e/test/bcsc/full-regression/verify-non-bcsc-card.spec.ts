// organize-imports-ignore — import order defines test run order
/**
 * Verify non-BCSC card E2E flow: straight-through onboarding (PIN auth, no detours),
 * Other ID verification, then residential address and email collection.
 *
 * Run with: yarn wdio ... --spec test/bcsc/full-regression/verify-non-bcsc-card.spec.ts
 */
// Onboarding
import '../onboarding/onboarding-basic.spec.js'

// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import '../verify/card-type/config-non-bcsc-card.js'

// Setup Steps 1: Nickname
import '../verify/nickname.spec.js'

// Setup Steps 2: Driver's License & Passport
import '../verify/non-bcsc/non-bcsc-first-id.spec.js'
import '../verify/non-bcsc/non-bcsc-second-id.spec.js'

// Setup Steps 3: Residential Address Form
import '../verify/non-bcsc/residential-address.spec.js'

// Setup Steps 4: Email Address
import '../verify/non-bcsc/email-address.spec.js'

// TODO (MD): In-person verification only supports BC Services Cards, we need to update the "verify" script to allow for Non-BCSC users.
// import '../verify/in-person-verification.spec.js'
// import '../main/main.spec.js'
