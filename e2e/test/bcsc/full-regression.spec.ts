// organize-imports-ignore — import order defines test run order
/**
 * Full-regression BCSC E2E flow: onboarding with transfer detour, setup type
 * interaction, and help detours; non-photo card verification with additional ID
 * evidence; then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite full-regression
 */
import './onboarding/app-launch.spec.js'
import './onboarding/transfer-detour.spec.js'
import './onboarding/add-account.spec.js'
import './onboarding/setup-type-interaction.spec.js'
import './onboarding/consent.spec.js'
import './onboarding/notifications-help.spec.js'
import './onboarding/notifications.spec.js'
import './onboarding/secure-app-help.spec.js'
import './onboarding/pin-auth.spec.js'
import './verify/non-photo-card.spec.js'
import './verify/additional-id-passport.spec.js'
import './verify/in-person-verification.spec.js'
import './main/main.spec.js'
