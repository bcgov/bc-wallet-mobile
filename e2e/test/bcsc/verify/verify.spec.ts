// organize-imports-ignore — import order defines test run order (combo → in-person → nickname)
/**
 * Verify E2E flow: runs nickname, combo, and in-person verification in a single session.
 * Run with: wdio ... --spec test/bcsc/verify/verify.spec.ts
 */
import './steps/nickname.spec.js'
import './cards/combo.spec.js'
import './verification/in-person.spec.js'
