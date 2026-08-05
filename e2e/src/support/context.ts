import type { TestUser } from '../constants.js'

/**
 * Per-journey test context. Replaces the old `verify/card-type` `verifyContext` singleton:
 * card type is serial-derived on main (`authorizeDevice` at EnterBirthdate), so the context carries
 * only WHICH `TestUser` the journey drives — there is no card-type button to remember.
 */

let currentUser: TestUser | undefined

/** Set the TestUser this journey drives. Call from the journey's root `before()`. */
export function setTestUser(user: TestUser): void {
  currentUser = user
}

/** The journey's TestUser. Throws when no journey has called {@link setTestUser} yet. */
export function getTestUser(): TestUser {
  if (!currentUser) {
    throw new Error('No TestUser set — call setTestUser(TestUsers.<user>) in the journey root before()')
  }
  return currentUser
}

/**
 * The journey's TestUser, narrowed to the non-BCSC persona — the only one carrying the SECOND set of
 * document fields (`primaryDocumentNumber` / `primaryDocumentTypeId`), because it is the only flow that
 * collects two documents. Use it where those fields are read; `getTestUser()` returns the union, on
 * which they do not exist.
 */
export function getNonBcscTestUser(): Extract<TestUser, { flow: 'non-bcsc' }> {
  const user = getTestUser()
  if (user.flow !== 'non-bcsc') {
    throw new Error(`This journey drives a '${user.flow}' user; it needs the non-bcsc persona`)
  }
  return user
}

/** Clear the context — defensive reset for suites that run multiple journeys in one worker. */
export function clearTestUser(): void {
  currentUser = undefined
}
