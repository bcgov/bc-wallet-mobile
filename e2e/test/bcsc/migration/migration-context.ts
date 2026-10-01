import { V3_PIN, V3_USER } from '../../../src/flows/onboarding-v3.js'

/**
 * Migration context — shared state between migration spec files.
 *
 * The v3 onboarding spec sets the PIN; the v4 unlock spec reads it. Both values are defined once, on
 * the v3 flow, so the upgrade scenarios that boot v3 use the same ones.
 */
export const migrationContext = {
  /** The PIN created in the v3 app, reused to unlock v4 after upgrade. */
  pin: V3_PIN,
  user: V3_USER,
}
