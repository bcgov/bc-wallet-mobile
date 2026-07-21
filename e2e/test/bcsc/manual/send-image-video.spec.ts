// organize-imports-ignore — import order defines test run order
/**
 * Video test BCSC E2E flow: send-video verification with Sauce image/video injection.
 *
 * Run with: yarn wdio ... --spec video-test
 *
 * NOTE(ONB-1): the onboarding preamble was removed — superseded by `journeys/onboarding/`.
 * NOTE(VFY-1): the card-type config + nickname/card-csn fragments were removed — card type is
 * serial-derived on main. This legacy spec is red vs `main` (the send-video fragment still anchors
 * on the removed SetupSteps hub) and is pending replacement (`journeys/manual/send-video`).
 */
import { TestUsers } from '../../../src/constants.js'
import { setTestUser } from '../../../src/support/context.js'
import '../verify/components/send-video-verification.spec.js'

setTestUser(TestUsers.combined)
