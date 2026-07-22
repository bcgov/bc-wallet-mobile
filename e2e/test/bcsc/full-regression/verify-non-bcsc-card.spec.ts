// organize-imports-ignore — import order defines test run order
/**
 * Verify non-BCSC card E2E flow: straight-through onboarding (PIN auth, no detours),
 * Other ID verification, then residential address and email collection.
 *
 * Run with: yarn wdio ... --spec test/bcsc/full-regression/verify-non-bcsc-card.spec.ts
 *
 * The onboarding preamble was removed — superseded by `journeys/onboarding/`. The card-type config
 * + nickname fragments were removed too — card type is serial-derived on main, and the entry spine
 * lives in `journeys/verify/verify-entry.journey.ts`. This legacy spec is red vs `main` and is
 * pending replacement by the verified card journeys.
 */
import { TestUsers } from '../../../src/constants.js'
import { setTestUser } from '../../../src/support/context.js'
import '../verify/non-bcsc/non-bcsc-first-id.spec.js'
import '../verify/non-bcsc/non-bcsc-second-id.spec.js'
import '../verify/non-bcsc/residential-address.spec.js'
import '../verify/non-bcsc/email-address.spec.js'
import '../verify/components/in-person-verification.spec.js'
import '../main/main.spec.js'

setTestUser(TestUsers.na)
