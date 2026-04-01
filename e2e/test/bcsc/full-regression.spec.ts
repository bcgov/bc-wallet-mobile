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
import './onboarding/biometric-auth.spec.js'
// Verify: Import `verify/card-type/config-*.js` before any `./verify/*.spec.js` imports.
import './verify/card-type/config-non-photo-card.js'
import './verify/nickname.spec.js'
import './verify/card-csn.spec.js'
import './verify/additional-id-passport.spec.js'
import './verify/in-person-verification.spec.js'
import './main/main.spec.js'
