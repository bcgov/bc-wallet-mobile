import { TestUser } from '../../../../src/constants.js'

export type CardTypeButton = 'CombinedCard' | 'PhotoCard' | 'NoPhotoCard' | 'OtherID'

/**
 * Shared mutable state for the verify flow.
 * Config modules (e.g. config-combined-card.ts) set these at module evaluation time;
 * downstream specs read them lazily inside `it` blocks.
 */
export const verifyContext: {
  testUser: TestUser
  cardTypeButton: CardTypeButton
  cardTypeLabel: string
} = {
  testUser: null as unknown as TestUser,
  cardTypeButton: null as unknown as CardTypeButton,
  cardTypeLabel: '',
}
