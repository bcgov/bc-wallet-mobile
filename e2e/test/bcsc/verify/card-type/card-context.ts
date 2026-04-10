import { TestUser } from '../../../../src/constants.js'
import type { BCSC_TestIDs } from '../../../../src/testIDs.js'

/** Card-type controls on Identity Selection for verify E2E flows (excludes e.g. CheckForServicesCard). */
export type BCSC_IdentitySelectionCardTypeButton = Exclude<
  keyof typeof BCSC_TestIDs.IdentitySelection,
  'CheckForServicesCard'
>

export type ConfiguredVerifyContext = {
  testUser: TestUser
  cardTypeButton: BCSC_IdentitySelectionCardTypeButton
  cardTypeLabel: string
}

/**
 * Shared mutable state for the verify flow.
 * Config modules (e.g. config-combined-card.ts) set these at module evaluation time;
 * downstream specs read them lazily inside `it` blocks.
 */
export const verifyContext: {
  testUser: TestUser | undefined
  cardTypeButton: BCSC_IdentitySelectionCardTypeButton | undefined
  cardTypeLabel: string | undefined
} = {
  testUser: undefined,
  cardTypeButton: undefined,
  cardTypeLabel: undefined,
}

/** Use this when reading context so a missing suite `config-*.ts` import fails with a clear error. */
export function getVerifyContext(): ConfiguredVerifyContext {
  if (!verifyContext.testUser || !verifyContext.cardTypeButton || !verifyContext.cardTypeLabel) {
    throw new Error(
      'verifyContext not configured — import a config-*.ts module (e.g. config-combined-card.js) before this spec'
    )
  }
  return {
    testUser: verifyContext.testUser,
    cardTypeButton: verifyContext.cardTypeButton,
    cardTypeLabel: verifyContext.cardTypeLabel,
  }
}
