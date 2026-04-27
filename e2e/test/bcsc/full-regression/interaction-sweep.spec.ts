// organize-imports-ignore — import order defines test run order
/**
 * Full-regression Interaction Sweep: composes the stack-level interaction
 * sweeps (onboarding, verify, main). Imports the transferee flow
 * (account-transfer detour + notifications deny path) and the onboarding
 * interaction sweep. Verify and main sweeps, and the transferer flow
 * (needs verified-state composition), will be imported below as they land.
 *
 * Run with: yarn wdio ... --spec e2e/test/bcsc/full-regression/interaction-sweep.spec.ts
 */
import '../onboarding/transferee-flow.spec.js'

import '../onboarding/onboarding-interaction-sweep.spec.js'

// import '../verify/verify-interaction-sweep.spec.js'

// import '../main/main-interaction-sweep.spec.js'

// import '../main/transferer-flow.spec.js'
