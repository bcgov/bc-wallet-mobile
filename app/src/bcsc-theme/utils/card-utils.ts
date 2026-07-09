import {
  BCSCCardProcess,
  BCSCCardType,
  EvidenceImageSide,
  EvidenceMetadata,
  PhotoMetadata,
} from 'react-native-bcsc-core'

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

/**
 * Legacy label map: the /v1/photos (selfie) endpoint uses lowercase "front"/"back",
 * while /v1/documents expects "FRONT_SIDE"/"BACK_SIDE". Single source of truth for
 * normalizing either form so callers can compare/dedupe labels consistently.
 */
const LEGACY_EVIDENCE_LABEL_MAP: Record<string, string> = { front: 'FRONT_SIDE', back: 'BACK_SIDE' }

/**
 * Normalizes an evidence image label to the /v1/documents form (`FRONT_SIDE`/`BACK_SIDE`),
 * mapping the legacy lowercase `front`/`back` labels used by /v1/photos. Any other label is
 * returned unchanged.
 *
 * @param label - The evidence image label to normalize.
 * @returns The normalized label.
 */
export function normalizeEvidenceImageLabel(label: string): string {
  return LEGACY_EVIDENCE_LABEL_MAP[label] ?? label
}

/**
 * Heals evidence photo metadata that has more entries than the card's defined image sides.
 *
 * A stale local photo can be left behind when the user navigates back from Evidence ID
 * Collection to retake/re-accept an already-captured side, producing an n+1 metadata array
 * (e.g. `[FRONT, BACK, BACK]`) that gets persisted and uploaded 1:1, causing an unrecoverable
 * "unexpected images count" 400 from the server (see issue #4159).
 *
 * This is a read-side heal only — it does not mutate or persist the underlying metadata.
 * Dedupes by normalized label, keeping the LAST occurrence of each label (the most recent
 * capture wins), with the result ordered by each label's first appearance. A final defensive
 * slice guarantees the result never exceeds the expected count even if labels are all distinct.
 *
 * @param metadata - The captured photo metadata, potentially over-count.
 * @param imageSides - The card's defined image sides; determines the expected count.
 * @returns The metadata, healed to at most `imageSides.length` entries.
 */
export function clampEvidenceImagesToSides(
  metadata: PhotoMetadata[],
  imageSides?: EvidenceImageSide[]
): PhotoMetadata[] {
  if (!imageSides?.length || metadata.length <= imageSides.length) {
    return metadata
  }

  const lastByLabel = new Map<string, PhotoMetadata>()
  for (const item of metadata) {
    lastByLabel.set(normalizeEvidenceImageLabel(item.label), item)
  }

  return Array.from(lastByLabel.values()).slice(0, imageSides.length)
}

/**
 * Check whether an evidence entry has all its required photos captured but is still
 * missing a document number — i.e. the user left partway through EvidenceIDCollection.
 *
 * This is the resumable "in-progress" state: distinct from a completed evidence (has a
 * document number) and from an abandoned card selection (no photos, which should be
 * cleaned up rather than resumed). Photos are only persisted to the store once every
 * required side has been captured, so `metadata.length >= requiredPhotos` reliably means
 * capture finished.
 *
 * @param card - The card evidence metadata to check.
 * @returns True if all photos are captured but the document number has not been entered.
 */
export function isEvidenceAwaitingDocumentNumber(card?: EvidenceMetadata): boolean {
  if (!card?.evidenceType || card.documentNumber) {
    return false
  }
  const requiredPhotos = card.evidenceType.image_sides?.length || 1
  return card.metadata.length >= requiredPhotos
}
