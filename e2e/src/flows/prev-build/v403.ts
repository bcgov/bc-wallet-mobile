import { TEST_PIN, TestUsers } from '../../constants.js'
import { onboardOnV403 } from '../onboarding-v403.js'
import {
  approveAndCompleteV403,
  authorizeV403,
  captureFirstDocumentOnlyV403,
  completeNicknameStepV403,
  enterSerialV403,
  showInPersonCodeV403,
} from '../verify-v403.js'
import type { PrevBuild } from './types.js'

/**
 * The shipped 4.0.3 release (`BCSC-v4.0.3.*`): pre-rework onboarding and the Setup Steps verify
 * entry, driven by the frozen walks in `flows/onboarding-v403.ts` + `flows/verify-v403.ts`. The
 * send-video and full non-BCSC arranges are not frozen yet, so those scenarios have no 4.0.3 wrapper.
 */
export const v403PrevBuild: PrevBuild = {
  label: '4.0.3',
  pin: TEST_PIN,
  bcscUser: TestUsers.photo,
  nonBcscUser: TestUsers.na,
  // 4.0.3 keyed the rows by display label (today: by type code), so the BCDL row reads differently here.
  nonBcscDocs: { first: "B.C. driver's licence", second: 'Canadian Passport' },

  async onboard(pin, user) {
    await onboardOnV403(pin)
    await completeNicknameStepV403(user.username) // Step 1 gates every later row
  },
  authorize: authorizeV403,
  showInPersonCode: showInPersonCodeV403,
  approveAndComplete: approveAndCompleteV403,
  enterSerial: enterSerialV403,
  captureFirstDocumentOnly: captureFirstDocumentOnlyV403,
}
