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
 * Completeness depends on the card: single-sided IDs (e.g. Canadian Passport) only need 1 photo,
 * double-sided IDs (e.g. driver's licence, BCSC) need 2. The required count is derived from
 * the card's own `image_sides`. Falling back to 1 keeps this safe if `image_sides` is missing.
 *
 * @param card - The card evidence metadata to check for completeness.
 * @returns True if the card evidence is complete, false otherwise.
 */
export function isCardEvidenceComplete(card?: EvidenceMetadata): boolean {
  if (!card?.evidenceType || !card.documentNumber) {
    return false
  }
  const requiredPhotos = card.evidenceType.image_sides?.length || 1
  return card.metadata.length >= requiredPhotos
}
