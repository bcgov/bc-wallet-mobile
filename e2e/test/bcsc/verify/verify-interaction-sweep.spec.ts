// organize-imports-ignore — import order defines test run order
/**
 * Verify Interaction Sweep — runs the non-photo card verification end-to-end,
 * weaving in every reachable secondary interaction (Help WebViews, Settings
 * detour, evidence-flow camera variants, video review variants, video-call
 * detour) before completing via in-person verification.
 *
 * NOTE(ONB-1): the onboarding preamble was removed — superseded by `journeys/onboarding/`.
 * NOTE(VFY-1): the card-type config + nickname/card-csn fragments were removed — card type is
 * serial-derived on main. This legacy sweep is red vs `main` (it anchors on the removed
 * SetupSteps hub) and is pending replacement by `journeys/verify/` (VFY-2/3/4).
 */
import { TestUsers } from '../../../src/constants.js'
import { setTestUser } from '../../../src/support/context.js'
import './interaction-sweep/verify-initial-detour.spec.js'
import './interaction-sweep/verify-help-detour.spec.js'
import './interaction-sweep/verify-evidence-detour.spec.js'
import './non-photo/additional-id-passport.spec.js'
import './interaction-sweep/verify-video-detour.spec.js'
import './components/in-person-verification.spec.js'

setTestUser(TestUsers.nonPhoto)
