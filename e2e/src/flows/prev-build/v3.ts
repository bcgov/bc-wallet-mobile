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
 * in-person path exists on v3, and a saved serial alone is not resumable after the swap (the current
 * build asks for the setup type first), so the sole v3 scenario is the unapproved in-person request.
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
