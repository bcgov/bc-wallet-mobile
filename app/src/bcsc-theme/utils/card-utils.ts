import { BCSCCardProcess, BCSCCardType } from 'react-native-bcsc-core'

/**
 * Get the card process for a given card type.
 *
 * @param {BCSCCardType | null} cardType - The type of BCSC card, or null if no card.
 * @returns {*} {BCSCCardProcess | null} The corresponding card process.
 */
export function getCardProcessForCardType(cardType: BCSCCardType | null): BCSCCardProcess | null {
  if (cardType === null) {
    return null // No card -> no card process
  }

  switch (cardType) {
    case BCSCCardType.ComboCard:
      return BCSCCardProcess.BCSCPhoto
    case BCSCCardType.PhotoCard:
      return BCSCCardProcess.BCSCPhoto
    case BCSCCardType.NonPhotoCard:
      return BCSCCardProcess.BCSCNonPhoto
    case BCSCCardType.NonBcsc:
      return BCSCCardProcess.NonBCSC
    default:
      return null // Unknown card type -> no card process
  }
}
