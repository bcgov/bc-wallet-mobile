// organize-imports-ignore — import order defines test run order
/**
 * Full-regression Interaction Sweep — composes the stack-level sweeps
 * (onboarding, verify, main) plus the transferee and transferer flows.
 */
import '../onboarding/transferee-flow.spec.js'

import '../onboarding/onboarding-interaction-sweep.spec.js'

import '../verify/verify-interaction-sweep.spec.js'

import '../main/main-interaction-sweep.spec.js'

import '../main/transferer-flow.spec.js'
