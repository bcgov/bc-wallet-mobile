// organize-imports-ignore — import order defines test run order
/**
 * Verify E2E flow: runs setup steps, card entry, and in-person verification.
 * Flow mode (E2E_FLOW=simple|advanced) controls which steps are included.
 *
 * Run with: E2E_FLOW=simple wdio ... --spec test/bcsc/verify/verify.spec.ts
 */
import './steps/step_1.spec.js'
import './cards/combo.spec.js'
import './verification/in-person.spec.js'
