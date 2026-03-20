// organize-imports-ignore — import order defines test run order (onboarding → verify → main)
/**
 * Full BCSC E2E flow: runs onboarding, verify, then main in a single session.
 * Run with: wdio ... --spec test/bcsc/e2e_simple.spec.ts
 *
 * Running the default glob (test/bcsc/** /*.spec.ts) would run this file
 * plus onboarding.spec.ts, verify.simple.spec.ts, and main.spec.ts separately;
 * use this spec when you want one continuous flow (onboarding → verify → main)
 * in order.
 */
import './onboarding/simple.spec.js'
import './verify/simple.spec.js'
import './main/main.spec.js'
