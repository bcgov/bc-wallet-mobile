// organize-imports-ignore — import order defines test run order
/**
 * Biometric authentication flow: onboarding with biometric auth method selection.
 * This test is run before the full-regression test to ensure that the biometric authentication works.
 *
 * Run with: yarn wdio ... --suite biometrics
 */

import './onboarding/components/app-launch.spec.js'
import './onboarding/components/add-account.spec.js'
import './onboarding/components/consent.spec.js'
import './onboarding/components/notifications.spec.js'
import './onboarding/components/biometric-auth.spec.js'
import './verify/card-type/config-combined-card.js'
import './verify/nickname.spec.js'
