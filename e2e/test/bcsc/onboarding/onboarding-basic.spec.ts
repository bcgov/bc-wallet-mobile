// organize-imports-ignore — import order defines test run order
/**
 *  Basic onboarding BCSC E2E suite:
 * runs through the onboarding flow up to the point of creating a PIN, then exits.
 * Covers the most common onboarding path and serves as a sanity check for the onboarding flow.
 * Does not cover any edge cases or secondary interactions.
 *
 * Run with: yarn wdio ... --spec e2e/test/bcsc/onboarding/onboarding-basic.spec.ts
 */

import './components/app-launch.spec.js'
import './components/add-account.spec.js'
import './components/consent.spec.js'
import './components/notifications.spec.js'
import './components/pin-auth.spec.js'
