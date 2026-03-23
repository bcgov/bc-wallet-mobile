// organize-imports-ignore — import order defines test run order (onboarding → verify → main)
/**
 * Full BCSC E2E flow: runs onboarding, verify, then main in a single session.
 * Flow mode (E2E_FLOW=simple|advanced) controls the path through each stage.
 *
 * Run with: E2E_FLOW=simple wdio ... --spec test/bcsc/e2e.spec.ts
 */
import { getE2EConfig } from '../../src/e2eConfig.js'

const { flow } = getE2EConfig()

console.log(`Running E2E flow: ${flow}`)

import './onboarding/onboarding.spec.js'
import './verify/verify.spec.js'
import './main/main.spec.js'
