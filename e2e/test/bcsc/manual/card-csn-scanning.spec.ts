// organize-imports-ignore — import order defines test run order
/**
 * Card scanning BCSC E2E flow: Sauce camera image injection against the live scan screen.
 *
 * Run with: yarn wdio ... --suite card-csn-scanning
 *
 * NOTE(ONB-1): the onboarding preamble was removed — superseded by `journeys/onboarding/`.
 * NOTE(VFY-1): the card-type config + nickname fragments were removed — card type is
 * serial-derived on main. This legacy spec is red vs `main` (the card-scan fragment still anchors
 * on the removed SetupSteps hub) and is pending replacement (`journeys/manual/card-scan`).
 */
import { TestUsers } from '../../../src/constants.js'
import { setTestUser } from '../../../src/support/context.js'
import '../verify/components/card-scan.spec.js'

setTestUser(TestUsers.combined)
