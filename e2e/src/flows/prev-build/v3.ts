import { approveInPersonRequest } from '../../helpers/approval.js'
import {
  authorizeOnV3,
  completeApprovedVerification,
  onboardOnV3,
  readConfirmationCode,
  selectInPerson,
  V3_PIN,
  V3_USER,
} from '../onboarding-v3.js'
import { approvalInputForUser } from '../verify.js'
import type { PrevBuild } from './types.js'

/**
 * The legacy native v3 app (`BCSC-v3.*`), driven by the raw selectors in `v3TestIDs.ts`. Only the
 * in-person path is driven. No partial state survives from v3: a typed serial sits in v3's own
 * `add_card_info` file, which the current build never reads (v3 writes the serial into the
 * authorization request only once the birthdate is submitted), and a captured document hydrates but a
 * migrant has no recorded setup type, so the resume re-asks it and the un-numbered evidence is cleaned
 * up on the way back in. So v3 arranges the unapproved in-person request and the verified account.
 */
export const v3PrevBuild: PrevBuild = {
  label: 'v3',
  pin: V3_PIN,
  bcscUser: V3_USER,

  onboard: (pin, user) => onboardOnV3(pin, user.username),
  authorize: (user) => authorizeOnV3(user),

  async showInPersonCode() {
    await selectInPerson()
    return readConfirmationCode()
  },

  async approveAndComplete(user, code) {
    await approveInPersonRequest(code, approvalInputForUser(user))
    await completeApprovedVerification()
  },
}
