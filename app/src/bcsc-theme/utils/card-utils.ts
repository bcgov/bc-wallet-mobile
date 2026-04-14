import { BCSCCardProcess, BCSCCardType, EvidenceMetadata } from 'react-native-bcsc-core'

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

/**
 * Check if the card evidence is complete by verifying that the evidence type, document number, and metadata are all present and valid.
 *
 * @param card - The card evidence metadata to check for completeness.
 * @returns True if the card evidence is complete, false otherwise.
 */
export function isCardEvidenceComplete(card?: EvidenceMetadata): boolean {
  return Boolean(card?.evidenceType && card.documentNumber && card.metadata.length === 2)
}
