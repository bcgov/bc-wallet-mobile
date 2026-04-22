// organize-imports-ignore — import order defines test run order
/**
 * Full-regression Interaction Sweep: composes the stack-level interaction
 * sweeps (onboarding, verify, main). Only the onboarding stack is
 * implemented today; verify and main sweeps will be imported below as they
 * land.
 *
 * Run with: yarn wdio ... --spec e2e/test/bcsc/full-regression/interaction-sweep.spec.ts
 */
import '../onboarding/onboarding-interaction-sweep.spec.js'
