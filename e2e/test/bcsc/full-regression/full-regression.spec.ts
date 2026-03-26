// organize-imports-ignore — import order defines test run order (onboarding → verify → main)
/**
 * Full-regression BCSC E2E flow: onboarding with transfer detour, setup type
 * interaction, and help detours; non-photo card verification with additional ID
 * evidence; then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite full-regression
 */
import './onboarding/onboarding.spec.js'
import './verify/verify.spec.js'
import './main/main.spec.js'
