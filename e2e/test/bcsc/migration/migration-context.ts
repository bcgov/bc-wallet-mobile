import { TestUsers } from '../../../src/constants.js'

/**
 * Migration context — shared state between migration spec files.
 *
 * The v3 onboarding spec sets the PIN; the v4 unlock spec reads it.
 * The upgrade spec reads the v4 app filename from env vars.
 */
export const migrationContext = {
  /** The PIN created in the v3 app, reused to unlock v4 after upgrade. */
  pin: '123456',
  user: TestUsers.combined,
}
