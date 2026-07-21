// organize-imports-ignore — import order defines test run order
/**
 * Biometric authentication flow: onboarding with biometric auth method selection.
 * This test is run before the full-regression test to ensure that the biometric authentication works.
 *
 * Run with: yarn wdio ... --suite biometrics
 *
 * NOTE(ONB-1): the onboarding preamble (incl. biometric-auth) was removed with the legacy
 * onboarding specs. This spec is red vs `main` pending its replacement
 * (`journeys/manual/biometrics.journey.ts`).
 */

import '../verify/card-type/config-combined-card.js'
import '../verify/components/nickname.spec.js'
