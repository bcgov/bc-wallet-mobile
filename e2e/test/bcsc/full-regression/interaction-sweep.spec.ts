// organize-imports-ignore — import order defines test run order
/**
 * Full-regression Interaction Sweep — composes the stack-level sweeps
 * (verify, main) plus the transferer flow.
 *
 * The onboarding + transferee sweeps were removed — superseded by `journeys/onboarding/` (the
 * transferee entry detour returns with the verify-entry-detours journey). This legacy spec is red
 * vs `main` pending its replacement journeys.
 */
import '../verify/verify-interaction-sweep.spec.js'

import '../main/main-interaction-sweep.spec.js'

import '../main/transferer-flow.spec.js'

import '../main/login-from-deep-link.spec.js'

import '../main/login-from-computer.spec.js'

import '../main/settings/settings.spec.js'
