import { BCSCCardProcess, BCSCCardType } from '../types/cards'

/**
 * Get the card process for a given card type.
 *
 * @throws {Error} If the card type is invalid or None.
 * @param {BCSCCardType} cardType - The type of BCSC card.
 * @returns {*} {BCSCCardProcess} The corresponding card process.
 */
export function getCardProcessForCardType(cardType: BCSCCardType): BCSCCardProcess | null {
  switch (cardType) {
    case BCSCCardType.Combined:
      return BCSCCardProcess.BCSC
    case BCSCCardType.Photo:
      return BCSCCardProcess.BCSC
    case BCSCCardType.NonPhoto:
      return BCSCCardProcess.BCSCNonPhoto
    case BCSCCardType.Other:
      return BCSCCardProcess.NonBCSC
    case BCSCCardType.None:
      return null
    default:
      throw new Error(`Unknown card type: ${cardType}`)
  }
}
