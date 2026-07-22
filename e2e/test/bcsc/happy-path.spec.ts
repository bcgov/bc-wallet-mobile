// organize-imports-ignore — import order defines test run order
/**
 * Happy-path BCSC E2E flow: straight-through onboarding (PIN auth, no detours),
 * combined-card verification, in-person method, then main tab/settings navigation.
 *
 * Run with: yarn wdio ... --suite happy-path
 *
 * The onboarding preamble was removed — superseded by `journeys/onboarding/`. The card-type config
 * + nickname/card-csn fragments were removed too — card type is serial-derived on main, and the
 * entry spine lives in `journeys/verify/verify-entry.journey.ts`. This legacy spec is red vs `main`
 * and is pending replacement by the verified card journeys.
 */
import { TestUsers } from '../../src/constants.js'
import { setTestUser } from '../../src/support/context.js'
import './verify/components/in-person-verification.spec.js'
import './main/main.spec.js'

setTestUser(TestUsers.combined)
