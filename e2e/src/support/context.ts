import type { NonBcscUser, NonPhotoCardUser, TestUser } from '../constants.js'

/**
 * Per-journey test context. Replaces the old `verify/card-type` `verifyContext` singleton:
 * card type is serial-derived on main (`authorizeDevice` at EnterBirthdate), so the context carries
 * only WHICH `TestUser` the journey drives — there is no card-type button to remember.
 */

let currentUser: TestUser | undefined
/** The usercode read for the holder's registration, stripped: what the test API's decisions are keyed by. */
let currentUsercode: string | undefined

/** Set the TestUser this journey drives. Call from the journey's root `before()`. */
export function setTestUser(user: TestUser): void {
  currentUser = user
  currentUsercode = undefined
}

/** Keep the usercode read for this journey's registration (`readUsercode` in src/flows/verify.ts). */
export function setUsercode(usercode: string): void {
  currentUsercode = usercode
}

/** The usercode read for this journey's registration. Throws when none was read. */
export function getUsercode(): string {
  if (!currentUsercode) {
    throw new Error('No usercode was read for this journey: readUsercode() reads it from method selection')
  }
  return currentUsercode
}

/** The journey's TestUser. Throws when no journey has called {@link setTestUser} yet. */
export function getTestUser(): TestUser {
  if (!currentUser) {
    throw new Error("No TestUser set — call setTestUser(await arrangeTestUser('<kind>')) in the journey root before()")
  }
  return currentUser
}

/** The journey's TestUser narrowed to one flow, for the fields only that flow carries. */
function getTestUserOf<F extends TestUser['flow']>(flow: F): Extract<TestUser, { flow: F }> {
  const user = getTestUser()
  if (user.flow !== flow) {
    throw new Error(`This journey drives a '${user.flow}' user; it needs a ${flow} one`)
  }
  return user as Extract<TestUser, { flow: F }>
}

/** The journey's TestUser as a non-photo card holder: the flow that adds one photo ID and types its number. */
export function getNonPhotoTestUser(): NonPhotoCardUser {
  return getTestUserOf('non-photo')
}

/** The journey's TestUser as a holder without a card: the flow that collects two documents. */
export function getNonBcscTestUser(): NonBcscUser {
  return getTestUserOf('non-bcsc')
}

/** Clear the context — defensive reset for suites that run multiple journeys in one worker. */
export function clearTestUser(): void {
  currentUser = undefined
  currentUsercode = undefined
}
